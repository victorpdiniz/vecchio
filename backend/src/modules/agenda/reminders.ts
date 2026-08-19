import { set, startOfDay, subDays } from 'date-fns';
import type { ReminderUnit } from '../../lib/enums.js';

export interface RelativeReminderSpec {
  kind: 'relative';
  amount: number;
  unit: ReminderUnit;
}

export interface AllDayReminderSpec {
  kind: 'allday';
  daysBefore: number;
  atHour: number;
  atMinute: number;
}

export type ReminderSpec = RelativeReminderSpec | AllDayReminderSpec;

export interface ComputedReminder {
  kind: string;
  amount: number | null;
  unit: string | null;
  daysBefore: number | null;
  atHour: number | null;
  atMinute: number | null;
  triggerAt: Date;
  label: string;
}

const UNIT_MS: Record<ReminderUnit, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
  weeks: 604_800_000,
};

const UNIT_WORDS: Record<ReminderUnit, [string, string]> = {
  minutes: ['minuto', 'minutos'],
  hours: ['hora', 'horas'],
  days: ['dia', 'dias'],
  weeks: ['semana', 'semanas'],
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function relativeLabel(amount: number, unit: ReminderUnit): string {
  if (amount === 0) return 'Na hora do compromisso';
  const [singular, plural] = UNIT_WORDS[unit];
  return `${amount} ${amount === 1 ? singular : plural} antes`;
}

function allDayLabel(daysBefore: number, atHour: number, atMinute: number): string {
  const dayPart = daysBefore === 0 ? 'No dia do compromisso' : daysBefore === 1 ? '1 dia antes' : `${daysBefore} dias antes`;
  return `${dayPart}, às ${pad(atHour)}:${pad(atMinute)}`;
}

// Calcula o horário absoluto de disparo (`triggerAt`) e o texto amigável de
// um lembrete a partir da especificação escolhida pelo usuário — chamado a
// cada create/update, já que mudar o `startAt` do compromisso muda quando
// todos os lembretes devem disparar.
export function computeReminder(spec: ReminderSpec, startAt: Date): ComputedReminder {
  if (spec.kind === 'relative') {
    return {
      kind: 'relative',
      amount: spec.amount,
      unit: spec.unit,
      daysBefore: null,
      atHour: null,
      atMinute: null,
      triggerAt: new Date(startAt.getTime() - spec.amount * UNIT_MS[spec.unit]),
      label: relativeLabel(spec.amount, spec.unit),
    };
  }

  const triggerAt = set(subDays(startOfDay(startAt), spec.daysBefore), {
    hours: spec.atHour,
    minutes: spec.atMinute,
    seconds: 0,
    milliseconds: 0,
  });

  return {
    kind: 'allday',
    amount: null,
    unit: null,
    daysBefore: spec.daysBefore,
    atHour: spec.atHour,
    atMinute: spec.atMinute,
    triggerAt,
    label: allDayLabel(spec.daysBefore, spec.atHour, spec.atMinute),
  };
}
