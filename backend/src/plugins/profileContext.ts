import type { FastifyInstance, FastifyRequest } from 'fastify';

// Não há autenticação em Vecchio (só a família usa a máquina). O header
// x-profile-id só identifica QUEM está perguntando, para personalizar a
// resposta (ex: agenda privada do admin, destinatário de notificação) —
// não é um mecanismo de segurança.
declare module 'fastify' {
  interface FastifyRequest {
    profileId: string | null;
  }
}

export function registerProfileContext(app: FastifyInstance) {
  app.decorateRequest('profileId', null);

  app.addHook('onRequest', async (request: FastifyRequest) => {
    const header = request.headers['x-profile-id'];
    request.profileId = typeof header === 'string' && header.length > 0 ? header : null;
  });
}
