import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

// O processo do backend roda em UTC (padrão da imagem Docker) — `date-fns`
// puro usa o fuso do sistema, então formatar `item.startAt` direto mostra
// hora UTC, não a hora local da família (ex: 20:00 UTC vira "20h" no texto
// em vez de "17h", 3 horas erradas). Usado em qualquer lugar que formata
// datas de compromissos em texto pro usuário (chat, email de lembrete).
export const APP_TIME_ZONE = 'America/Sao_Paulo';

export function formatBR(date: Date, pattern: string): string {
  return formatInTimeZone(date, APP_TIME_ZONE, pattern, { locale: ptBR });
}
