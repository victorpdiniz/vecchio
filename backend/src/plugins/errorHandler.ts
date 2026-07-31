import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

// Handler central de erros: toda rota valida a entrada com Zod (fail fast) e
// qualquer erro de negócio deve ser lançado como AppError — nenhuma rota
// precisa formatar respostas de erro manualmente.
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({
        message: 'Dados inválidos.',
        issues: error.issues.map((issue) => ({
          campo: issue.path.join('.'),
          erro: issue.message,
        })),
      });
      return;
    }

    if (error instanceof AppError) {
      reply.status(error.statusCode).send({ message: error.message });
      return;
    }

    app.log.error(error);
    reply.status(500).send({ message: 'Erro interno do servidor.' });
  });
}
