import { useCallback, useEffect, useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { getErrorMessage } from '../api/client';
import { fetchPasswords, type PasswordRecord } from '../api/passwords';
import { PasswordModal } from '../components/passwords/PasswordModal';

type ModalState = { mode: 'create' } | { mode: 'edit'; record: PasswordRecord } | null;

function PasswordRow({ record, isAdmin, onEdit }: { record: PasswordRecord; isAdmin: boolean; onEdit: () => void }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState<'username' | 'password' | null>(null);

  async function copy(value: string, field: 'username' | 'password') {
    await navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xl font-medium text-slate-800">{record.siteName}</p>
        {record.url && <p className="text-base text-slate-400">{record.url}</p>}
        <p className="mt-1 text-lg text-slate-600">
          Usuário: <span className="font-mono">{record.username}</span>{' '}
          <button
            type="button"
            onClick={() => copy(record.username, 'username')}
            className="text-blue-600 hover:underline"
          >
            {copied === 'username' ? 'Copiado!' : 'Copiar'}
          </button>
        </p>
        <p className="text-lg text-slate-600">
          Senha:{' '}
          <span className="font-mono">{visible ? record.password : '••••••••'}</span>{' '}
          <button type="button" onClick={() => setVisible((v) => !v)} className="text-blue-600 hover:underline">
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>{' '}
          <button
            type="button"
            onClick={() => copy(record.password, 'password')}
            className="text-blue-600 hover:underline"
          >
            {copied === 'password' ? 'Copiado!' : 'Copiar'}
          </button>
        </p>
        {record.notes && <p className="mt-1 text-base text-slate-500">{record.notes}</p>}
      </div>
      {isAdmin && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-slate-300 px-3 py-2 text-lg text-slate-700 hover:bg-slate-50"
        >
          Editar
        </button>
      )}
    </li>
  );
}

export function Passwords() {
  const { currentProfile } = useProfile();
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<PasswordRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);

  const isAdmin = currentProfile?.role === 'admin';

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchPasswords(search || undefined)
      .then(setRecords)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    reload();
  }, [reload]);

  function handleSaved() {
    setModalState(null);
    reload();
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Senhas</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setModalState({ mode: 'create' })}
            className="rounded-lg bg-blue-600 px-4 py-2 text-lg font-medium text-white hover:bg-blue-700"
          >
            + Nova senha
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-lg text-red-700">{error}</div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por site…"
        className="mb-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-lg"
      />

      {loading && <p className="mb-2 text-lg text-slate-500">Carregando…</p>}

      {!loading && records.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-lg text-slate-500">
          Nenhuma senha cadastrada.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {records.map((record) => (
          <PasswordRow
            key={record.id}
            record={record}
            isAdmin={isAdmin}
            onEdit={() => setModalState({ mode: 'edit', record })}
          />
        ))}
      </ul>

      {modalState && (
        <PasswordModal
          mode={modalState.mode}
          record={modalState.mode === 'edit' ? modalState.record : undefined}
          onClose={() => setModalState(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
