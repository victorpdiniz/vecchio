import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { format } from 'date-fns';
import { getErrorMessage } from '../../api/client';
import {
  createBill,
  deleteBill,
  deleteBillAttachment,
  fetchBill,
  updateBill,
  uploadBillAttachment,
  type BillCategory,
  type BillInput,
  type BillRecord,
  type RecurrenceRule,
} from '../../api/bills';
import { fetchProfiles, type Profile } from '../../api/profiles';
import { DateTimeField } from '../DateTimeField';

export const CATEGORY_LABELS: Record<BillCategory, string> = {
  luz: 'Luz',
  agua: 'Água',
  internet: 'Internet',
  telefone: 'Telefone',
  aluguel: 'Aluguel',
  saude: 'Saúde',
  mercado: 'Mercado',
  outro: 'Outro',
};

const RECURRENCE_LABELS: Record<RecurrenceRule, string> = {
  diaria: 'Diariamente',
  semanal: 'Semanalmente',
  mensal: 'Mensalmente',
  anual: 'Anualmente',
};

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3333';

function toDateOnly(iso: string | null): string {
  if (!iso) return '';
  return format(new Date(iso), 'yyyy-MM-dd');
}

interface BillModalProps {
  mode: 'create' | 'edit';
  bill?: BillRecord;
  onClose: () => void;
  onSaved: () => void;
}

export function BillModal({ mode, bill, onClose, onSaved }: BillModalProps) {
  const [currentBill, setCurrentBill] = useState<BillRecord | undefined>(bill);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [description, setDescription] = useState(bill?.description ?? '');
  const [category, setCategory] = useState<BillCategory>(bill?.category ?? 'outro');
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '');
  const [dueDate, setDueDate] = useState(toDateOnly(bill?.dueDate ?? null));
  const [payerProfileId, setPayerProfileId] = useState(bill?.payerProfileId ?? '');
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | ''>('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProfiles().then(setProfiles);
  }, []);

  async function refreshBill() {
    if (!currentBill) return;
    try {
      const fresh = await fetchBill(currentBill.id);
      setCurrentBill(fresh);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!dueDate) {
      setError('Informe a data de vencimento.');
      return;
    }

    const payload: BillInput = {
      description,
      category,
      amount: Number(amount),
      dueDate: new Date(`${dueDate}T00:00:00`).toISOString(),
      payerProfileId: payerProfileId || undefined,
    };

    if (mode === 'create' && recurrenceRule) {
      payload.recurrence = {
        rule: recurrenceRule,
        endDate: recurrenceEndDate ? new Date(`${recurrenceEndDate}T00:00:00`).toISOString() : undefined,
      };
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        await createBill(payload);
      } else if (currentBill) {
        await updateBill(currentBill.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!currentBill) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteBill(currentBill.id);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentBill) return;
    if (file.type !== 'application/pdf') {
      setError('Só é possível anexar arquivos PDF.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await uploadBillAttachment(currentBill.id, file);
      await refreshBill();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAttachment(attachmentId: string) {
    setError(null);
    try {
      await deleteBillAttachment(attachmentId);
      await refreshBill();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">{mode === 'create' ? 'Nova conta' : 'Editar conta'}</h2>
          <button type="button" onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-lg text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Descrição
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
              placeholder="Ex: Conta de luz"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-lg text-slate-700">
              Categoria
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BillCategory)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

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
          </div>

          <DateTimeField label="Vencimento" value={dueDate} onChange={setDueDate} required showTime={false} />

          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Quem paga
            <select
              value={payerProfileId}
              onChange={(e) => setPayerProfileId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
            >
              <option value="">Não definido</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>

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

          {mode === 'edit' && currentBill && (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-lg font-medium text-slate-700">Documentos anexados</p>
              <ul className="mb-3 flex flex-col gap-2">
                {currentBill.attachments.length === 0 && (
                  <li className="text-base text-slate-400">Nenhum documento anexado.</li>
                )}
                {currentBill.attachments.map((attachment) => (
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
                Anexar PDF (ex: boleto, fatura)
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
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg border border-red-300 px-4 py-2 text-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Excluir
                </button>
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
