import { useState, type ChangeEvent, type FocusEvent } from 'react';

interface MaskedDateTimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Quando false, oculta hora/minuto e emite só "yyyy-MM-dd". */
  showTime?: boolean;
}

interface Parts {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
}

function partsFrom(digits: string): Parts {
  return {
    day: digits.slice(0, 2),
    month: digits.slice(2, 4),
    year: digits.slice(4, 8),
    hour: digits.slice(8, 10),
    minute: digits.slice(10, 12),
  };
}

// Reverso de `toValue` — usado só para popular o campo ao abrir em modo de
// edição, a partir do valor que o pai já tem.
function toDigits(value: string): string {
  if (!value) return '';
  const [datePart = '', timePart = ''] = value.split('T');
  const [year = '', month = '', day = ''] = datePart.split('-');
  const [hour = '', minute = ''] = timePart ? timePart.split(':') : [];
  return `${day}${month}${year}${hour}${minute}`;
}

function toValue(digits: string, showTime: boolean): string {
  const { day, month, year, hour, minute } = partsFrom(digits);
  const datePart = `${year}-${month}-${day}`;
  return showTime ? `${datePart}T${hour}:${minute}` : datePart;
}

function formatDisplay(digits: string, showTime: boolean): string {
  if (!digits) return '';
  const { day, month, year, hour, minute } = partsFrom(digits);
  let out = day;
  if (digits.length > 2) out += `/${month}`;
  if (digits.length > 4) out += `/${year}`;
  if (showTime && digits.length > 8) out += ` ${hour}`;
  if (showTime && digits.length > 10) out += `:${minute}`;
  return out;
}

function isValid(digits: string, showTime: boolean): boolean {
  const { day, month, year, hour, minute } = partsFrom(digits);
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1)) return false;
  if (!showTime) return true;
  const h = Number(hour);
  const mi = Number(minute);
  return h >= 0 && h <= 23 && mi >= 0 && mi <= 59;
}

// Campo único de texto com máscara (dd/mm/aaaa[ hh:mm]) no lugar de cinco
// controles separados (dia/mês/ano/hora/minuto) — digita-se a data inteira
// de uma vez, sem precisar clicar em cada parte nem ficar incrementando o
// campo de ano manualmente. Mesma "API" do DateTimeField (mesmo formato de
// `value`/`onChange`), então quem consome não precisa mudar nada — mas é um
// componente à parte porque essa mudança é só para a agenda, DateTimeField
// continua igual para Contas e Remédios.
export function MaskedDateTimeField({ label, value, onChange, required, showTime = true }: MaskedDateTimeFieldProps) {
  const [digits, setDigits] = useState(() => toDigits(value));
  const maxDigits = showTime ? 12 : 8;
  const complete = digits.length === maxDigits;
  const showError = complete && !isValid(digits, showTime);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value.replace(/\D/g, '').slice(0, maxDigits);
    setDigits(raw);
    onChange(raw.length === maxDigits && isValid(raw, showTime) ? toValue(raw, showTime) : '');
  }

  // O campo costuma abrir já preenchido (ex: data/hora atual, ao criar um
  // compromisso) — sem selecionar tudo ao focar, digitar por cima insere no
  // meio do valor existente em vez de substituí-lo, o que é bem confuso.
  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    event.target.select();
  }

  return (
    <label className="flex flex-col gap-1 text-lg text-slate-700">
      {label}
      <input
        type="text"
        inputMode="numeric"
        required={required}
        value={formatDisplay(digits, showTime)}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={showTime ? 'dd/mm/aaaa hh:mm' : 'dd/mm/aaaa'}
        className={`w-56 rounded-lg border px-3 py-2 text-lg ${showError ? 'border-red-400' : 'border-slate-300'}`}
      />
      {showError && <span className="text-base text-red-600">Data inválida.</span>}
    </label>
  );
}
