import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '../../api/client';
import {
  createPassword,
  deletePassword,
  updatePassword,
  type PasswordInput,
  type PasswordRecord,
} from '../../api/passwords';

interface PasswordModalProps {
  mode: 'create' | 'edit';
  record?: PasswordRecord;
  onClose: () => void;
  onSaved: () => void;
}

export function PasswordModal({ mode, record, onClose, onSaved }: PasswordModalProps) {
  const [siteName, setSiteName] = useState(record?.siteName ?? '');
  const [url, setUrl] = useState(record?.url ?? '');
  const [username, setUsername] = useState(record?.username ?? '');
  const [password, setPassword] = useState(record?.password ?? '');
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const payload: PasswordInput = {
      siteName,
      url: url || undefined,
      username,
      password,
      notes: notes || undefined,
    };

    setSaving(true);
    try {
      if (mode === 'create') {
        await createPassword(payload);
      } else if (record) {
        await updatePassword(record.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!record) return;
    setDeleting(true);
    setError(null);
    try {
      await deletePassword(record.id);
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
          <h2 className="text-2xl font-bold text-slate-800">{mode === 'create' ? 'Nova senha' : 'Editar senha'}</h2>
          <button type="button" onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-lg text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Site / serviço
            <input
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
              placeholder="Ex: Banco do Brasil"
            />
          </label>

          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Endereço (opcional)
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
              placeholder="Ex: bb.com.br"
            />
          </label>

          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Usuário
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
            />
          </label>

          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Senha
            <div className="flex gap-2">
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-lg"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-lg text-slate-700 hover:bg-slate-50"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Observações
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
            />
          </label>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
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
