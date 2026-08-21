import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { ApiError, GoogleGenAI } from '@google/genai';

// Load environment variables (GEMINI_API_KEY, PORT, APP_URL, NODE_ENV, ...).
dotenv.config();

// Resolve the directory containing this module.
// Production (`node dist/server.cjs`) runs as CJS, where Node provides the
// `__filename` global. Development (`tsx server.ts`) runs as ESM, where the
// path must be derived from `import.meta.url`. (esbuild shims `import.meta`
// to an empty object in CJS output, so it can't be relied on there.)
const isProduction = process.env.NODE_ENV === 'production';
const currentDir =
  typeof __filename !== 'undefined'
    ? path.dirname(__filename)
    : path.dirname(fileURLToPath(import.meta.url));
const MODEL_ID = process.env.GEMINI_MODEL_ID ?? 'gemini-2.5-flash';

/**
 * Resolve the port to listen on.
 * Priority: $PORT env -> port parsed from $APP_URL -> 3000.
 */
function resolvePort(): number {
  const fromPort = Number(process.env.PORT);
  if (Number.isInteger(fromPort) && fromPort > 0 && fromPort < 65536) {
    return fromPort;
  }

  if (process.env.APP_URL) {
    try {
      const parsed = new URL(process.env.APP_URL);
      if (parsed.port) {
        const appPort = Number(parsed.port);
        if (Number.isInteger(appPort) && appPort > 0 && appPort < 65536) {
          return appPort;
        }
      }
    } catch {
      // Ignore malformed APP_URL and fall through to the default.
    }
  }

  return 3000;
}

/**
 * Resolve the host to bind to.
 * Binds to 0.0.0.0 by default. If $APP_URL points at a loopback address
 * (e.g. http://localhost:5173), bind to that hostname instead.
 */
function resolveHost(): string {
  if (process.env.APP_URL) {
    try {
      const hostname = new URL(process.env.APP_URL).hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return hostname;
      }
    } catch {
      // Ignore malformed APP_URL.
    }
  }
  return '0.0.0.0';
}

/** Extract an HTTP status from an arbitrary error, if it carries one. */
function errorStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === 'number') {
      return status;
    }
  }
  return undefined;
}

async function main(): Promise<void> {
  const app = express();

  // Parse JSON request bodies for API endpoints.
  app.use(express.json());

  // --- API routes ---------------------------------------------------------
  // Registered before the Vite/static middleware so they always take priority.

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/ai-explain', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;

    // The API key lives only on the server. If it's not configured, tell the
    // client how to fix it (503) instead of crashing.
    if (!apiKey || apiKey.trim() === '') {
      res.status(503).json({
        ok: false,
        error: 'The AI feature is not configured yet. Set the GEMINI_API_KEY environment variable to enable it.',
      });
      return;
    }

    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt) {
      res.status(400).json({ ok: false, error: 'Missing required "prompt" field in the JSON body.' });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
      });

      res.json({ ok: true, text: response.text ?? '' });
    } catch (err) {
      console.error('Gemini API error:', err);

      // 4xx from the model (e.g. prompt rejected) -> report as a bad request.
      // Anything else (network, quota, 5xx upstream) -> 502 Bad Gateway.
      const status = errorStatus(err);
      const useBadRequest = status !== undefined && status >= 400 && status < 500;
      const httpStatus = err instanceof ApiError && useBadRequest ? 400 : 502;

      res.status(httpStatus).json({
        ok: false,
        error: 'The AI service could not complete your request. Please try again in a moment.',
      });
    }
  });

  // --- SPA + static serving ----------------------------------------------

  if (isProduction) {
    // `node dist/server.cjs` runs with currentDir === dist/, so the static
    // assets built by `vite build` are siblings of the server bundle.
    const distDir = path.basename(currentDir) === 'dist' ? currentDir : path.join(currentDir, 'dist');

    app.use(express.static(distDir));

    // SPA fallback: unknown (non-API) GET paths get index.html.
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ ok: false, error: 'Not found.' });
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    // Development: unknown /api/* routes get a JSON 404 instead of falling
    // through to Vite's SPA index.html fallback.
    app.use('/api', (_req, res) => {
      res.status(404).json({ ok: false, error: 'Not found.' });
    });

    // Development: mount Vite as middleware so HMR works against this server.
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // --- Error handler -------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = errorStatus(err);
    const httpStatus =
      status !== undefined && status >= 400 && status < 600 ? status : 500;
    console.error('Request error:', err);
    res.status(httpStatus).json({
      ok: false,
      error: httpStatus === 400 ? 'Invalid JSON body.' : 'An unexpected error occurred.',
    });
  });

  const host = resolveHost();
  const port = resolvePort();

  app.listen(port, host, () => {
    console.log(`CalmSpace Planner server listening on http://${host}:${port}`);
    console.log(`Environment: ${isProduction ? 'production' : 'development'} | Model: ${MODEL_ID}`);
  });
}

main().catch((err) => {
  console.error('Failed to start CalmSpace Planner server:', err);
  process.exit(1);
});
