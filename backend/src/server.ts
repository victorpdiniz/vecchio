import { env } from './lib/env.js';
import { buildApp } from './app.js';
import { startNotificationsScheduler } from './modules/notifications/notifications.service.js';

async function main() {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`Vecchio backend rodando na porta ${env.PORT}`);
  startNotificationsScheduler();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
