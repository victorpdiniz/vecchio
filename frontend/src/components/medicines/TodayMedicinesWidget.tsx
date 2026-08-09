import { useEffect, useState } from 'react';
import { fetchTodayDoses, type TodayDose } from '../../api/medicines';

function currentTimeString() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function TodayMedicinesWidget() {
  const [doses, setDoses] = useState<TodayDose[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayDoses()
      .then(setDoses)
      .finally(() => setLoading(false));
  }, []);

  if (loading || doses.length === 0) return null;

  const now = currentTimeString();

  return (
    <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <h2 className="text-2xl font-semibold text-slate-800">Remédios de hoje</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {doses.map((dose, index) => {
          const taken = dose.timeOfDay < now;
          return (
            <li
              key={`${dose.medicineId}-${dose.timeOfDay}-${index}`}
              className={`flex items-center justify-between rounded-lg bg-white px-4 py-2 text-lg ${
                taken ? 'text-slate-400' : 'text-slate-800'
              }`}
            >
              <span>
                <strong>{dose.timeOfDay}</strong> — {dose.name} ({dose.dosage})
                {dose.profile && <span className="text-slate-500"> · {dose.profile.name}</span>}
              </span>
              {!taken && <span className="text-base font-medium text-blue-600">a seguir</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
