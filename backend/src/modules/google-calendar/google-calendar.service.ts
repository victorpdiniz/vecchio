import { google, type calendar_v3 } from 'googleapis';
import { createOAuthClient, isGoogleConfigured, GOOGLE_CALENDAR_SCOPES } from '../../lib/googleCalendarClient.js';
import { googleCalendarRepository } from './google-calendar.repository.js';
import { AppError } from '../../lib/errors.js';

const CALENDAR_SUMMARY = 'Vecchio — Família';
const TIME_ZONE = 'America/Sao_Paulo';

// Formato mínimo que o serviço precisa para espelhar um item da agenda como
// evento do Google — mantido local (em vez de importar o tipo do módulo
// agenda) para não criar uma dependência circular entre os dois módulos.
export interface SyncableAgendaItem {
  title: string;
  description: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date | null;
  googleEventId: string | null;
}

function notConfiguredError() {
  return new AppError(
    'A integração com o Google Agenda ainda não foi configurada. Veja docs/google-calendar-setup.md.',
    503,
  );
}

async function getAuthorizedClient() {
  const connection = await googleCalendarRepository.find();
  if (!connection) return null;

  const client = createOAuthClient();
  client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.expiryDate?.getTime(),
  });

  client.on('tokens', (tokens) => {
    if (tokens.access_token) {
      googleCalendarRepository
        .updateTokens(connection.profileId, tokens.access_token, tokens.expiry_date ? new Date(tokens.expiry_date) : null)
        .catch(() => undefined);
    }
  });

  return { client, calendarId: connection.googleCalendarId };
}

function toGoogleEvent(item: SyncableAgendaItem): calendar_v3.Schema$Event {
  const end = item.endAt ?? new Date(item.startAt.getTime() + 60 * 60 * 1000);
  return {
    summary: item.title,
    description: item.description ?? undefined,
    location: item.location ?? undefined,
    start: { dateTime: item.startAt.toISOString(), timeZone: TIME_ZONE },
    end: { dateTime: end.toISOString(), timeZone: TIME_ZONE },
  };
}

export const googleCalendarService = {
  isConfigured: isGoogleConfigured,

  async isConnected() {
    return (await googleCalendarRepository.find()) !== null;
  },

  getAuthUrl(adminProfileId: string) {
    if (!isGoogleConfigured()) throw notConfiguredError();
    const client = createOAuthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_CALENDAR_SCOPES,
      state: adminProfileId,
    });
  },

  async handleCallback(code: string, adminProfileId: string) {
    if (!isGoogleConfigured()) throw notConfiguredError();
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: client });
    const existing = await googleCalendarRepository.find();
    let calendarId = existing?.googleCalendarId;

    if (!calendarId) {
      const created = await calendar.calendars.insert({
        requestBody: { summary: CALENDAR_SUMMARY, timeZone: TIME_ZONE },
      });
      calendarId = created.data.id ?? undefined;
    }

    if (!calendarId) {
      throw new AppError('Não foi possível criar a agenda dedicada no Google Calendar.', 502);
    }

    await googleCalendarRepository.upsert({
      profileId: adminProfileId,
      accessToken: tokens.access_token ?? existing?.accessToken ?? '',
      refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? '',
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      googleCalendarId: calendarId,
    });

    await this.syncExistingAgendaItems(calendar, calendarId);
  },

  // Compromissos da família (avô, avó, pai etc.) criados antes da conexão
  // com o Google Agenda nunca são enviados sozinhos — sem isso, só os
  // compromissos criados/editados depois de conectar apareceriam lá.
  async syncExistingAgendaItems(calendar: calendar_v3.Calendar, calendarId: string) {
    const items = await googleCalendarRepository.findUnsyncedAgendaItems();
    for (const item of items) {
      try {
        const res = await calendar.events.insert({ calendarId, requestBody: toGoogleEvent(item) });
        if (res.data.id) {
          await googleCalendarRepository.markAgendaItemSynced(item.id, res.data.id);
        }
      } catch (error) {
        console.warn('[google-calendar] falha ao sincronizar compromisso existente:', error);
      }
    }
  },

  async disconnect() {
    await googleCalendarRepository.deleteAll();
  },

  // As três funções abaixo "falham em silêncio": um problema ao sincronizar
  // com o Google nunca deve impedir o usuário de salvar um compromisso local.
  async createEvent(item: SyncableAgendaItem): Promise<string | null> {
    try {
      const ctx = await getAuthorizedClient();
      if (!ctx) return null;
      const calendar = google.calendar({ version: 'v3', auth: ctx.client });
      const res = await calendar.events.insert({ calendarId: ctx.calendarId, requestBody: toGoogleEvent(item) });
      return res.data.id ?? null;
    } catch (error) {
      console.warn('[google-calendar] falha ao criar evento:', error);
      return null;
    }
  },

  async updateEvent(item: SyncableAgendaItem): Promise<void> {
    if (!item.googleEventId) return;
    try {
      const ctx = await getAuthorizedClient();
      if (!ctx) return;
      const calendar = google.calendar({ version: 'v3', auth: ctx.client });
      await calendar.events.update({
        calendarId: ctx.calendarId,
        eventId: item.googleEventId,
        requestBody: toGoogleEvent(item),
      });
    } catch (error) {
      console.warn('[google-calendar] falha ao atualizar evento:', error);
    }
  },

  async deleteEvent(googleEventId: string): Promise<void> {
    try {
      const ctx = await getAuthorizedClient();
      if (!ctx) return;
      const calendar = google.calendar({ version: 'v3', auth: ctx.client });
      await calendar.events.delete({ calendarId: ctx.calendarId, eventId: googleEventId });
    } catch (error) {
      console.warn('[google-calendar] falha ao remover evento:', error);
    }
  },
};
