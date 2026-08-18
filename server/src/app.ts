import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiRouter } from './modules/router.js';

export function createApp() {
  const app = express();

  // Trust the platform proxy so req.ip (rate limiting) and secure cookies work.
  if (env.isProd) app.set('trust proxy', 1);

  app.use(
    helmet({
      // The SPA is same-origin, so a tight policy is easy. Disabled in dev
      // because Vite serves the client from its own origin.
      contentSecurityPolicy: env.isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:'],
              fontSrc: ["'self'", 'data:'],
              connectSrc: ["'self'", 'ws:', 'wss:'],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, env: env.NODE_ENV, uptime: Math.round(process.uptime()) });
  });

  app.use('/api', apiRouter);

  // Anything under /api that fell through is a 404 JSON, not the SPA shell.
  app.use('/api', notFoundHandler);

  // In production this process also serves the built client.
  if (fs.existsSync(env.clientDist)) {
    app.use(express.static(env.clientDist, { index: false, maxAge: '1h' }));
    app.get('*splat', (_req, res) => {
      res.sendFile(path.join(env.clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
