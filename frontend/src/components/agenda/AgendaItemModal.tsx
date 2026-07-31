import { useState, type ChangeEvent, type FormEvent } from 'react';
import { format } from 'date-fns';
import { getErrorMessage } from '../../api/client';
import {
  createAgendaItem,
  deleteAgendaItem,
  deleteAgendaSeries,
  deleteAttachment,
  fetchAgendaItem,
  updateAgendaItem,
  uploadAttachment,
  type AgendaCategory,
  type AgendaItem,
  type AgendaItemInput,
  type RecurrenceRule,
} from '../../api/agenda';
import type { Profile } from '../../api/profiles';

const CATEGORY_LABELS: Record<AgendaCategory, string> = {
  consulta: 'Consulta',
  exame: 'Exame',
  conta: 'Conta',
  remedio: 'Remédio',
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

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3333';

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
function DateTimeField({ label, value, onChange, required }: DateTimeFieldProps) {
  const [parts, setParts] = useState<DateTimeParts>(() => parseDateTimeParts(value));

  function apply(next: Partial<DateTimeParts>) {
    const merged = { ...parts, ...next };
    setParts(merged);
    const { year, month, day, hour, minute } = merged;
    onChange(year && month && day ? `${year}-${month}-${day}T${hour || '00'}:${minute || '00'}` : '');
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
      </div>
    </label>
  );
}

interface AgendaItemModalProps {
  mode: 'create' | 'edit';
  item?: AgendaItem;
  defaultStart?: Date;
  currentProfile: Profile;
  onClose: () => void;
  onSaved: () => void;
}

export function AgendaItemModal({ mode, item, defaultStart, currentProfile, onClose, onSaved }: AgendaItemModalProps) {
  const [currentItem, setCurrentItem] = useState<AgendaItem | undefined>(item);

  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState<AgendaCategory>(item?.category ?? 'outro');
  const [location, setLocation] = useState(item?.location ?? '');
  const [startAt, setStartAt] = useState(toDateTimeLocal(item?.startAt ?? defaultStart?.toISOString() ?? null));
  const [endAt, setEndAt] = useState(toDateTimeLocal(item?.endAt ?? null));
  const [isPrivate, setIsPrivate] = useState(item?.isPrivate ?? false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(
    item?.reminderDaysBefore != null ? String(item.reminderDaysBefore) : '',
  );
  const [amount, setAmount] = useState(item?.bill ? String(item.bill.amount) : '');
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | ''>('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = currentProfile.role === 'admin';

  async function refreshItem() {
    if (!currentItem) return;
    try {
      const fresh = await fetchAgendaItem(currentItem.id);
      setCurrentItem(fresh);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!startAt) {
      setError('Informe a data e hora de início.');
      return;
    }

    const payload: AgendaItemInput = {
      title,
      description: description || undefined,
      category,
      location: location || undefined,
      startAt: new Date(startAt).toISOString(),
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      isPrivate,
      reminderDaysBefore: reminderDaysBefore !== '' ? Number(reminderDaysBefore) : undefined,
      amount: category === 'conta' ? Number(amount) : undefined,
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
      } else if (currentItem) {
        await updateAgendaItem(currentItem.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!currentItem) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAgendaItem(currentItem.id);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  async function handleDeleteSeries() {
    if (!currentItem?.recurrenceGroupId) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAgendaSeries(currentItem.recurrenceGroupId);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentItem) return;
    if (file.type !== 'application/pdf') {
      setError('Só é possível anexar arquivos PDF.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await uploadAttachment(currentItem.id, file);
      await refreshItem();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAttachment(attachmentId: string) {
    setError(null);
    try {
      await deleteAttachment(attachmentId);
      await refreshItem();
    } catch (err) {
      setError(getErrorMessage(err));
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

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-lg text-red-700">{error}</div>
        )}

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

          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Local
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
              placeholder="Ex: Clínica São Lucas"
            />
          </label>

          <div className="flex flex-col gap-4">
            <DateTimeField label="Início" value={startAt} onChange={setStartAt} required />
            <DateTimeField label="Fim (opcional)" value={endAt} onChange={setEndAt} />
          </div>

          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Descrição
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
            />
          </label>

          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Avisar quantos dias antes
            <input
              type="number"
              min="0"
              max="30"
              value={reminderDaysBefore}
              onChange={(e) => setReminderDaysBefore(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
              placeholder={category === 'consulta' ? '3 (padrão)' : 'sem aviso'}
            />
          </label>

          {isAdmin && (
            <label className="flex items-center gap-2 text-lg text-slate-700">
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              Só aparece pra mim (agenda privada do Admin)
            </label>
          )}

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

          {mode === 'edit' && currentItem && (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-lg font-medium text-slate-700">Documentos anexados</p>
              <ul className="mb-3 flex flex-col gap-2">
                {currentItem.attachments.length === 0 && (
                  <li className="text-base text-slate-400">Nenhum documento anexado.</li>
                )}
                {currentItem.attachments.map((attachment) => (
                  <li key={attachment.id} className="flex items-center justify-between gap-2 text-base">
                    <a
                      href={`${API_BASE}/uploads/${attachment.storagePath}`}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-blue-600 hover:underline"
                    >
                      {attachment.filename}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="text-red-500 hover:underline"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
              <label className="text-base text-slate-600">
                Anexar PDF (ex: recomendações do exame)
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="mt-1 block text-base"
                />
              </label>
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
                  {currentItem?.recurrenceGroupId && (
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
