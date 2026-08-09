import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import { registerErrorHandler } from './plugins/errorHandler.js';
import { registerProfileContext } from './plugins/profileContext.js';
import { UPLOADS_DIR } from './lib/paths.js';
import { profilesController } from './modules/profiles/profiles.controller.js';
import { agendaController } from './modules/agenda/agenda.controller.js';
import { billsController } from './modules/bills/bills.controller.js';
import { googleCalendarController } from './modules/google-calendar/google-calendar.controller.js';
import { passwordsController } from './modules/passwords/passwords.controller.js';
import { medicinesController } from './modules/medicines/medicines.controller.js';
import { usbController } from './modules/usb/usb.controller.js';
import { chatController } from './modules/chat/chat.controller.js';
import { notificationsController } from './modules/notifications/notifications.controller.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart);
  await app.register(staticPlugin, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
  });

  registerProfileContext(app);
  registerErrorHandler(app);

  app.get('/api/health', async () => ({ status: 'ok' }));

  await app.register(profilesController);
  await app.register(agendaController);
  await app.register(billsController);
  await app.register(googleCalendarController);
  await app.register(passwordsController);
  await app.register(medicinesController);
  await app.register(usbController);
  await app.register(chatController);
  await app.register(notificationsController);

  return app;
}
