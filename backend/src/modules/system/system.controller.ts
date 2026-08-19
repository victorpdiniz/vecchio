import type { FastifyInstance } from 'fastify';
import { systemService } from './system.service.js';

// Sem gate de admin de propósito — qualquer perfil da família pode checar e
// aplicar atualizações.
export async function systemController(app: FastifyInstance) {
  app.get('/api/system/update-status', async () => {
    return systemService.getStatus();
  });

  app.post('/api/system/update', async (_request, reply) => {
    const result = await systemService.requestUpdate();
    reply.status(202);
    return result;
  });
}
