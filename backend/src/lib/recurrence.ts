import { addDays, addMonths, addWeeks, addYears, min as minDate } from 'date-fns';
import type { RecurrenceRule } from './enums.js';

const MAX_OCCURRENCES = 200;
const MAX_HORIZON_YEARS = 1;

function advance(date: Date, rule: RecurrenceRule): Date {
  switch (rule) {
    case 'diaria':
      return addDays(date, 1);
    case 'semanal':
      return addWeeks(date, 1);
    case 'mensal':
      return addMonths(date, 1);
    case 'anual':
      return addYears(date, 1);
  }
}

// Gera as datas de início de cada ocorrência de um compromisso recorrente,
// limitado a 1 ano à frente (ou até recurrenceEndDate, o que vier primeiro)
// e a no máximo 200 ocorrências, para não gerar uma quantidade sem limite
// de linhas (ex: recorrência diária sem data final).
export function computeOccurrenceDates(
  start: Date,
  rule: RecurrenceRule,
  endDate: Date | null,
): Date[] {
  const horizon = minDate([endDate ?? addYears(start, MAX_HORIZON_YEARS), addYears(start, MAX_HORIZON_YEARS)]);
  const dates: Date[] = [];
  let current = start;

  while (current <= horizon && dates.length < MAX_OCCURRENCES) {
    dates.push(current);
    current = advance(current, rule);
  }

  return dates;
}
