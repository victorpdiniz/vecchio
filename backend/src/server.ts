import { env } from './lib/env.js';
import { buildApp } from './app.js';

async function main() {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`Vecchio backend rodando na porta ${env.PORT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
