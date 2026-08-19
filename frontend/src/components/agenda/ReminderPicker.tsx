import type { AllDayReminderInput, ReminderInput, ReminderUnit } from '../../api/agenda';

const UNIT_LABELS: Record<ReminderUnit, string> = {
  minutes: 'minutos',
  hours: 'horas',
  days: 'dias',
  weeks: 'semanas',
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function defaultReminder(isAllDay: boolean): ReminderInput {
  return isAllDay
    ? { kind: 'allday', daysBefore: 1, atHour: 9, atMinute: 0 }
    : { kind: 'relative', amount: 30, unit: 'minutes' };
}

interface ReminderPickerProps {
  isAllDay: boolean;
  reminders: ReminderInput[];
  onChange: (reminders: ReminderInput[]) => void;
}

// Lembretes estilo Google Agenda: uma lista de avisos, cada um "N minutos/
// horas/dias/semanas antes" (compromissos com hora) ou "N dias antes, às
// HH:mm" (compromissos de dia inteiro).
export function ReminderPicker({ isAllDay, reminders, onChange }: ReminderPickerProps) {
  function updateAt(index: number, next: ReminderInput) {
    onChange(reminders.map((reminder, i) => (i === index ? next : reminder)));
  }

  function removeAt(index: number) {
    onChange(reminders.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...reminders, defaultReminder(isAllDay)]);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-lg text-slate-700">Lembretes</p>
      {reminders.length === 0 && <p className="text-base text-slate-400">Nenhum lembrete configurado.</p>}
      {reminders.map((reminder, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          {reminder.kind === 'relative' ? (
            <>
              <input
                type="number"
                min="0"
                max="999"
                value={reminder.amount}
                onChange={(e) => updateAt(index, { ...reminder, amount: Number(e.target.value) })}
                className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-lg"
              />
              <select
                value={reminder.unit}
                onChange={(e) => updateAt(index, { ...reminder, unit: e.target.value as ReminderUnit })}
                className="rounded-lg border border-slate-300 px-2 py-2 text-lg"
              >
                {(Object.keys(UNIT_LABELS) as ReminderUnit[]).map((unit) => (
                  <option key={unit} value={unit}>
                    {UNIT_LABELS[unit]}
                  </option>
                ))}
              </select>
              <span className="text-slate-600">antes</span>
            </>
          ) : (
            <>
              <input
                type="number"
                min="0"
                max="60"
                value={reminder.daysBefore}
                onChange={(e) => updateAt(index, { ...reminder, daysBefore: Number(e.target.value) } as AllDayReminderInput)}
                className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-lg"
              />
              <span className="text-slate-600">dia(s) antes, às</span>
              <select
                value={String(reminder.atHour).padStart(2, '0')}
                onChange={(e) => updateAt(index, { ...reminder, atHour: Number(e.target.value) } as AllDayReminderInput)}
                className="rounded-lg border border-slate-300 px-2 py-2 text-lg"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">:</span>
              <select
                value={String(reminder.atMinute).padStart(2, '0')}
                onChange={(e) => updateAt(index, { ...reminder, atMinute: Number(e.target.value) } as AllDayReminderInput)}
                className="rounded-lg border border-slate-300 px-2 py-2 text-lg"
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            type="button"
            onClick={() => removeAt(index)}
            className="ml-1 text-xl text-slate-400 hover:text-red-600"
            aria-label="Remover lembrete"
          >
            ×
          </button>
        </div>
      ))}
      {reminders.length < 5 && (
        <button type="button" onClick={add} className="self-start text-base font-medium text-blue-600 hover:underline">
          + Adicionar lembrete
        </button>
      )}
    </div>
  );
}
