import { useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { getErrorMessage } from '../../api/client';
import { DateTimeField } from '../DateTimeField';
import { ReminderPicker } from './ReminderPicker';
import {
  createAgendaItem,
  deleteAgendaItem,
  deleteAgendaSeries,
  updateAgendaItem,
  type AgendaCategory,
  type AgendaItem,
  type AgendaItemInput,
  type AgendaReminder,
  type ReminderInput,
  type RecurrenceRule,
} from '../../api/agenda';

const CATEGORY_LABELS: Record<AgendaCategory, string> = {
  consulta: 'Consulta',
  exame: 'Exame',
  conta: 'Conta',
  remedio: 'Remédio',
  viagem: 'Viagem',
  outro: 'Outro',
};

const RECURRENCE_LABELS: Record<RecurrenceRule, string> = {
  diaria: 'Diariamente',
  semanal: 'Semanalmente',
  mensal: 'Mensalmente',
  anual: 'Anualmente',
};

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return '';
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

function toDateOnlyLocal(iso: string | null): string {
  if (!iso) return '';
  return format(new Date(iso), 'yyyy-MM-dd');
}

// `value` é sempre um horário local (vindo do DateTimeField, nunca de um
// fuso alheio) no formato "yyyy-MM-dd" ou "yyyy-MM-ddTHH:mm" — monta a Date
// campo a campo em vez de usar `new Date(value)` porque strings só-data são
// interpretadas como UTC pelo JS, o que jogaria compromissos de dia inteiro
// para o dia anterior em fusos negativos como o do Brasil.
function parseLocalDateTime(value: string): Date {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  if (timePart) {
    const [hour, minute] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute);
  }
  return new Date(year, month - 1, day);
}

function defaultReminders(isAllDay: boolean): ReminderInput[] {
  return [isAllDay ? { kind: 'allday', daysBefore: 1, atHour: 9, atMinute: 0 } : { kind: 'relative', amount: 30, unit: 'minutes' }];
}

function toReminderInput(reminder: AgendaReminder): ReminderInput {
  return reminder.kind === 'relative'
    ? { kind: 'relative', amount: reminder.amount!, unit: reminder.unit! }
    : { kind: 'allday', daysBefore: reminder.daysBefore!, atHour: reminder.atHour!, atMinute: reminder.atMinute! };
}

interface AgendaItemModalProps {
  mode: 'create' | 'edit';
  item?: AgendaItem;
  defaultStart?: Date;
  onClose: () => void;
  onSaved: () => void;
}

export function AgendaItemModal({ mode, item, defaultStart, onClose, onSaved }: AgendaItemModalProps) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [category, setCategory] = useState<AgendaCategory>(item?.category ?? 'outro');
  const [isAllDay, setIsAllDay] = useState(item?.isAllDay ?? false);
  const [startAt, setStartAt] = useState(
    item?.isAllDay
      ? toDateOnlyLocal(item.startAt)
      : toDateTimeLocal(item?.startAt ?? defaultStart?.toISOString() ?? null),
  );
  const [endAt, setEndAt] = useState(item?.isAllDay ? toDateOnlyLocal(item.endAt) : toDateTimeLocal(item?.endAt ?? null));
  const [amount, setAmount] = useState(item?.bill ? String(item.bill.amount) : '');
  const [reminders, setReminders] = useState<ReminderInput[]>(
    item ? item.reminders.map(toReminderInput) : defaultReminders(false),
  );
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | ''>('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleAllDayChange(next: boolean) {
    setIsAllDay(next);
    setStartAt((current) => (current ? current.slice(0, 10) : current));
    setEndAt((current) => (current ? current.slice(0, 10) : current));
    setReminders(defaultReminders(next));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!startAt) {
      setError('Informe a data de início.');
      return;
    }

    const payload: AgendaItemInput = {
      title,
      category,
      isAllDay,
      startAt: parseLocalDateTime(startAt).toISOString(),
      endAt: endAt ? parseLocalDateTime(endAt).toISOString() : undefined,
      amount: category === 'conta' ? Number(amount) : undefined,
      reminders,
    };

    if (mode === 'create' && recurrenceRule) {
      payload.recurrence = {
        rule: recurrenceRule,
        endDate: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : undefined,
      };
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        await createAgendaItem(payload);
      } else if (item) {
        await updateAgendaItem(item.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAgendaItem(item.id);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  async function handleDeleteSeries() {
    if (!item?.recurrenceGroupId) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAgendaSeries(item.recurrenceGroupId);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">
            {mode === 'create' ? 'Novo compromisso' : 'Editar compromisso'}
          </h2>
          <button type="button" onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-lg text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Título
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-lg text-slate-700">
              Categoria
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AgendaCategory)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            {category === 'conta' && (
              <label className="flex flex-col gap-1 text-lg text-slate-700">
                Valor (R$)
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
                />
              </label>
            )}
          </div>

          <label className="flex items-center gap-2 text-lg text-slate-700">
            <input type="checkbox" checked={isAllDay} onChange={(e) => handleAllDayChange(e.target.checked)} />
            Dia inteiro
          </label>

          <div className="flex flex-col gap-4">
            <DateTimeField label="Início" value={startAt} onChange={setStartAt} required showTime={!isAllDay} />
            <DateTimeField label="Fim (opcional)" value={endAt} onChange={setEndAt} showTime={!isAllDay} />
          </div>

          <ReminderPicker isAllDay={isAllDay} reminders={reminders} onChange={setReminders} />

          {mode === 'create' && (
            <div className="rounded-lg border border-slate-200 p-3">
              <label className="flex flex-col gap-1 text-lg text-slate-700">
                Repetir
                <select
                  value={recurrenceRule}
                  onChange={(e) => setRecurrenceRule(e.target.value as RecurrenceRule | '')}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
                >
                  <option value="">Não se repete</option>
                  {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {recurrenceRule && (
                <label className="mt-3 flex flex-col gap-1 text-lg text-slate-700">
                  Repetir até (opcional, no máximo 1 ano)
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
                  />
                </label>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {mode === 'edit' && (
                <>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-lg border border-red-300 px-4 py-2 text-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Excluir
                  </button>
                  {item?.recurrenceGroupId && (
                    <button
                      type="button"
                      onClick={handleDeleteSeries}
                      disabled={deleting}
                      className="rounded-lg border border-red-300 px-4 py-2 text-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Excluir toda a série futura
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-lg text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-lg font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
