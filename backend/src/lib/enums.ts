// Valores válidos para os campos "enum-like" (String no schema, porque o
// SQLite não suporta enum nativo no Prisma). Fonte única de verdade,
// usada pelos schemas Zod de cada módulo.

export const PROFILE_ROLES = ['avo', 'avo_f', 'pai', 'admin'] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const AGENDA_CATEGORIES = ['consulta', 'conta', 'remedio', 'outro'] as const;
export type AgendaCategory = (typeof AGENDA_CATEGORIES)[number];

export const BILL_STATUSES = ['pendente', 'pago'] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ['inapp', 'email'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const CHAT_ROLES = ['user', 'model'] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];
