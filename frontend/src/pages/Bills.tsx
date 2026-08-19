import { useCallback, useEffect, useState } from 'react';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getErrorMessage } from '../api/client';
import {
  fetchBills,
  fetchBillsSummary,
  setBillPaid,
  type BillRecord,
  type BillsSummary,
  type BillCategory,
  type BillStatus,
} from '../api/bills';
import { CATEGORY_LABELS } from '../components/bills/BillModal';
import { BillModal } from '../components/bills/BillModal';

const STATUS_FILTERS: { value: BillStatus | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'pago', label: 'Pagas' },
];

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

type ModalState = { mode: 'create' } | { mode: 'edit'; bill: BillRecord } | null;

export function Bills() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [summary, setSummary] = useState<BillsSummary>({ total: 0, count: 0, byCategory: [] });
  const [statusFilter, setStatusFilter] = useState<BillStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<BillCategory | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    const from = startOfMonth(month);
    const to = endOfMonth(month);
    Promise.all([
      fetchBills({
        from,
        to,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      }),
      fetchBillsSummary(from, to),
    ])
      .then(([billsResult, summaryResult]) => {
        setBills(billsResult);
        setSummary(summaryResult);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [month, statusFilter, categoryFilter]);

  useEffect(() => {
    reload();
  }, [reload]);

  function handleSaved() {
    setModalState(null);
    reload();
  }

  async function handleTogglePaid(bill: BillRecord) {
    setError(null);
    try {
      await setBillPaid(bill.id, bill.status !== 'pago');
      reload();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Contas</h1>
        <button
          type="button"
          onClick={() => setModalState({ mode: 'create' })}
          className="rounded-lg bg-blue-600 px-4 py-2 text-lg font-medium text-white hover:bg-blue-700"
        >
          + Nova conta
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-lg text-red-700">{error}</div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setMonth((current) => addMonths(current, -1))}
          className="rounded-lg bg-white px-3 py-2 text-lg text-slate-700 hover:bg-slate-100"
        >
          ← Mês anterior
        </button>
        <span className="text-xl font-medium capitalize text-slate-800">
          {format(month, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button
          type="button"
          onClick={() => setMonth((current) => addMonths(current, 1))}
          className="rounded-lg bg-white px-3 py-2 text-lg text-slate-700 hover:bg-slate-100"
        >
          Próximo mês →
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-lg text-slate-700">
          Total do mês: <strong>{formatCurrency(summary.total)}</strong>{' '}
          <span className="text-slate-400">
            ({summary.count} conta{summary.count === 1 ? '' : 's'})
          </span>
        </p>
        {summary.byCategory.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.byCategory.map((row) => (
              <span
                key={row.category}
                className="rounded-full bg-slate-100 px-3 py-1 text-base text-slate-600"
              >
                {CATEGORY_LABELS[row.category as BillCategory] ?? row.category}: {formatCurrency(row.total)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-lg px-4 py-2 text-lg font-medium ${
                statusFilter === filter.value ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as BillCategory | '')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
        >
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="mb-2 text-lg text-slate-500">Carregando…</p>}

      {!loading && bills.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-lg text-slate-500">
          Nenhuma conta encontrada neste período.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {bills.map((bill) => (
          <li
            key={bill.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div>
              <p className="text-xl font-medium text-slate-800">{bill.description}</p>
              <p className="text-lg text-slate-500">
                {CATEGORY_LABELS[bill.category] ?? bill.category} · Vence em{' '}
                {format(new Date(bill.dueDate), 'dd/MM/yyyy')}
                {bill.payerProfile && ` · ${bill.payerProfile.name}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold text-slate-800">{formatCurrency(bill.amount)}</span>
              <span
                className={`rounded-full px-3 py-1 text-base font-medium ${
                  bill.status === 'pago' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {bill.status === 'pago' ? 'Paga' : 'Pendente'}
              </span>
              <button
                type="button"
                onClick={() => handleTogglePaid(bill)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-lg text-slate-700 hover:bg-slate-50"
              >
                {bill.status === 'pago' ? 'Marcar pendente' : 'Marcar paga'}
              </button>
              <button
                type="button"
                onClick={() => setModalState({ mode: 'edit', bill })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-lg text-slate-700 hover:bg-slate-50"
              >
                Editar
              </button>
            </div>
          </li>
        ))}
      </ul>

      {modalState && (
        <BillModal
          mode={modalState.mode}
          bill={modalState.mode === 'edit' ? modalState.bill : undefined}
          onClose={() => setModalState(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
