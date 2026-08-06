import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getErrorMessage } from '../api/client';
import { fetchMedicines, type Medicine } from '../api/medicines';
import { MedicineModal } from '../components/medicines/MedicineModal';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDays(days: number[]) {
  if (days.length === 7) return 'todos os dias';
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(', ');
}

type ModalState = { mode: 'create' } | { mode: 'edit'; medicine: Medicine } | null;

export function Medicines() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchMedicines()
      .then(setMedicines)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

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
        <h1 className="text-3xl font-bold text-slate-800">Remédios</h1>
        <button
          type="button"
          onClick={() => setModalState({ mode: 'create' })}
          className="rounded-lg bg-blue-600 px-4 py-2 text-lg font-medium text-white hover:bg-blue-700"
        >
          + Novo remédio
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-lg text-red-700">{error}</div>
      )}

      {loading && <p className="mb-2 text-lg text-slate-500">Carregando…</p>}

      {!loading && medicines.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-lg text-slate-500">
          Nenhum remédio cadastrado.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {medicines.map((medicine) => (
          <li
            key={medicine.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div>
              <p className="text-xl font-medium text-slate-800">
                {medicine.name} <span className="text-lg font-normal text-slate-500">— {medicine.dosage}</span>
              </p>
              <p className="text-lg text-slate-600">
                {medicine.profile ? medicine.profile.name : 'Toda a família'} · desde{' '}
                {format(new Date(medicine.startDate), 'dd/MM/yyyy')}
                {medicine.endDate && ` até ${format(new Date(medicine.endDate), 'dd/MM/yyyy')}`}
              </p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {medicine.schedules.map((schedule) => (
                  <li key={schedule.id} className="rounded-full bg-slate-100 px-3 py-1 text-base text-slate-600">
                    {schedule.timeOfDay} · {formatDays(schedule.daysOfWeek)}
                  </li>
                ))}
              </ul>
              {medicine.notes && <p className="mt-1 text-base text-slate-500">{medicine.notes}</p>}
            </div>
            <button
              type="button"
              onClick={() => setModalState({ mode: 'edit', medicine })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg text-slate-700 hover:bg-slate-50"
            >
              Editar
            </button>
          </li>
        ))}
      </ul>

      {modalState && (
        <MedicineModal
          mode={modalState.mode}
          medicine={modalState.mode === 'edit' ? modalState.medicine : undefined}
          onClose={() => setModalState(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
