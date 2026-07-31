import type { FastifyInstance } from 'fastify';
import { profileIdParamSchema, updateProfileSchema } from './profiles.schema.js';
import { profilesService } from './profiles.service.js';

// Rotas dos 4 perfis fixos da família (avô, avó, pai, admin). Não existe
// criação/remoção de perfil pela API — só leitura e edição de e-mail/aparência.
export async function profilesController(app: FastifyInstance) {
  app.get('/api/profiles', async () => {
    return profilesService.list();
  });

  app.get('/api/profiles/:id', async (request) => {
    const { id } = profileIdParamSchema.parse(request.params);
    return profilesService.getById(id);
  });

  app.patch('/api/profiles/:id', async (request) => {
    const { id } = profileIdParamSchema.parse(request.params);
    const data = updateProfileSchema.parse(request.body);
    return profilesService.update(id, data);
  });
}
