import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import { registerErrorHandler } from './plugins/errorHandler.js';
import { registerProfileContext } from './plugins/profileContext.js';
import { profilesController } from './modules/profiles/profiles.controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart);
  await app.register(staticPlugin, {
    root: path.join(__dirname, '..', 'uploads'),
    prefix: '/uploads/',
  });

  registerProfileContext(app);
  registerErrorHandler(app);

  app.get('/api/health', async () => ({ status: 'ok' }));

  await app.register(profilesController);

  return app;
}
