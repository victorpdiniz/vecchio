import { useState } from 'react';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Fev' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Abr' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Ago' },
  { value: '09', label: 'Set' },
  { value: '10', label: 'Out' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dez' },
];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface DateTimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Quando false, oculta hora/minuto e emite só "yyyy-MM-dd" (ex: vencimento de conta). */
  showTime?: boolean;
}

interface DateTimeParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

function parseDateTimeParts(value: string): DateTimeParts {
  const [datePart = '', timePart = ''] = value ? value.split('T') : [];
  const [year = '', month = '', day = ''] = datePart ? datePart.split('-') : [];
  const [hour = '', minute = ''] = timePart ? timePart.split(':') : [];
  return { year, month, day, hour, minute };
}

// Usa <select>/<input> próprios em vez dos widgets nativos de date e
// datetime-local porque eles seguem o idioma do sistema operacional (não
// o lang="pt-BR" da página), podendo exibir mm/dd/aaaa e AM/PM mesmo aqui.
//
// Mantém os campos (dia/mês/ano/hora/minuto) em estado local próprio, em
// vez de derivá-los só do `value` do pai: enquanto a data está incompleta
// (ex: usuário só escolheu o dia), o pai recebe '' — se os selects
// mostrassem o `value` do pai diretamente, essa string vazia apagaria a
// escolha do usuário a cada campo preenchido, um de cada vez.
export function DateTimeField({ label, value, onChange, required, showTime = true }: DateTimeFieldProps) {
  const [parts, setParts] = useState<DateTimeParts>(() => parseDateTimeParts(value));

  function apply(next: Partial<DateTimeParts>) {
    const merged = { ...parts, ...next };
    setParts(merged);
    const { year, month, day, hour, minute } = merged;
    if (!(year && month && day)) {
      onChange('');
      return;
    }
    onChange(showTime ? `${year}-${month}-${day}T${hour || '00'}:${minute || '00'}` : `${year}-${month}-${day}`);
  }

  const hasDate = Boolean(parts.year && parts.month && parts.day);

  return (
    <label className="flex flex-col gap-1 text-lg text-slate-700">
      {label}
      <div className="flex flex-wrap items-center gap-2">
        <select
          required={required}
          value={parts.day}
          onChange={(e) => apply({ day: e.target.value })}
          className="rounded-lg border border-slate-300 px-2 py-2 text-lg"
        >
          <option value="" disabled>
            dd
          </option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <span className="text-slate-400">/</span>
        <select
          required={required}
          value={parts.month}
          onChange={(e) => apply({ month: e.target.value })}
          className="rounded-lg border border-slate-300 px-2 py-2 text-lg"
        >
          <option value="" disabled>
            mês
          </option>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <span className="text-slate-400">/</span>
        <input
          required={required}
          type="number"
          inputMode="numeric"
          placeholder="aaaa"
          value={parts.year}
          onChange={(e) => apply({ year: e.target.value })}
          className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-lg"
        />
        {showTime && (
          <>
            <select
              required={required}
              value={parts.hour}
              onChange={(e) => apply({ hour: e.target.value })}
              disabled={!hasDate}
              className="ml-2 rounded-lg border border-slate-300 px-2 py-2 text-lg"
            >
              <option value="" disabled>
                hh
              </option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span className="text-slate-400">:</span>
            <select
              required={required}
              value={parts.minute}
              onChange={(e) => apply({ minute: e.target.value })}
              disabled={!hasDate}
              className="rounded-lg border border-slate-300 px-2 py-2 text-lg"
            >
              <option value="" disabled>
                mm
              </option>
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </label>
  );
}
