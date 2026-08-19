import { prisma } from '../../lib/prisma.js';

// Linha única (por admin) — Vecchio só tem um perfil admin, então nunca há
// mais de uma conexão Google ativa.
export const googleCalendarRepository = {
  find() {
    return prisma.googleCalendarConnection.findFirst();
  },

  upsert(data: {
    profileId: string;
    accessToken: string;
    refreshToken: string;
    expiryDate: Date | null;
    googleCalendarId: string;
  }) {
    return prisma.googleCalendarConnection.upsert({
      where: { profileId: data.profileId },
      create: data,
      update: data,
    });
  },

  updateTokens(profileId: string, accessToken: string, expiryDate: Date | null) {
    return prisma.googleCalendarConnection.update({
      where: { profileId },
      data: { accessToken, expiryDate },
    });
  },

  deleteAll() {
    return prisma.googleCalendarConnection.deleteMany();
  },

  // Compromissos de qualquer perfil da família (avô, avó, pai etc.) que
  // ainda não têm um evento correspondente no Google — cria quando o
  // compromisso foi feito antes da conta admin conectar o Google Agenda.
  findUnsyncedAgendaItems() {
    return prisma.agendaItem.findMany({
      where: { googleEventId: null },
    });
  },

  markAgendaItemSynced(id: string, googleEventId: string) {
    return prisma.agendaItem.update({ where: { id }, data: { googleEventId } });
  },
};
