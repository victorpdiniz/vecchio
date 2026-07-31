import type { FastifyInstance } from 'fastify';
import { env } from '../../lib/env.js';
import { AppError } from '../../lib/errors.js';
import { profilesRepository } from '../profiles/profiles.repository.js';
import { googleCallbackQuerySchema } from './google-calendar.schema.js';
import { googleCalendarService } from './google-calendar.service.js';

async function requireAdmin(profileId: string | null) {
  if (!profileId) {
    throw new AppError('Selecione o perfil admin para conectar o Google Agenda.', 400);
  }
  const profile = await profilesRepository.findById(profileId);
  if (!profile || profile.role !== 'admin') {
    throw new AppError('Só o perfil admin pode conectar o Google Agenda.', 403);
  }
  return profile;
}

export async function googleCalendarController(app: FastifyInstance) {
  app.get('/api/google-calendar/status', async () => ({
    configured: googleCalendarService.isConfigured(),
    connected: await googleCalendarService.isConnected(),
  }));

  app.get('/api/google-calendar/auth-url', async (request) => {
    const admin = await requireAdmin(request.profileId);
    return { url: googleCalendarService.getAuthUrl(admin.id) };
  });

  // Alvo do redirect do Google — não é chamado pelo front-end diretamente.
  app.get('/api/google-calendar/callback', async (request, reply) => {
    const { code, state, error } = googleCallbackQuerySchema.parse(request.query);

    if (error || !code || !state) {
      reply.redirect(`${env.FRONTEND_URL}/agenda?google=erro`);
      return;
    }

    try {
      await googleCalendarService.handleCallback(code, state);
      reply.redirect(`${env.FRONTEND_URL}/agenda?google=conectado`);
    } catch (err) {
      app.log.error(err);
      reply.redirect(`${env.FRONTEND_URL}/agenda?google=erro`);
    }
  });

  app.delete('/api/google-calendar/connection', async (request) => {
    await requireAdmin(request.profileId);
    await googleCalendarService.disconnect();
    return { ok: true };
  });
}
