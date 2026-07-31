import type { FastifyInstance } from 'fastify';
import { notificationsService } from './notifications.service.js';

export async function notificationsController(app: FastifyInstance) {
  app.get('/api/notifications/pending', async (request) => {
    return notificationsService.pending(request.profileId);
  });
}
