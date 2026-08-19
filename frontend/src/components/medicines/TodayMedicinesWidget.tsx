import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fetchTodayDoses, markDoseTaken, type TodayDose } from '../../api/medicines';

function currentTimeString() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function TodayMedicinesWidget() {
  const [doses, setDoses] = useState<TodayDose[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchTodayDoses()
      .then(setDoses)
      .finally(() => setLoading(false));
  }, []);

  if (loading || doses.length === 0) return null;

  const now = currentTimeString();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  async function toggleTaken(dose: TodayDose) {
    const key = dose.scheduleId;
    setSavingKey(key);
    const nextTaken = !dose.taken;
    setDoses((prev) => prev.map((d) => (d.scheduleId === key ? { ...d, taken: nextTaken } : d)));
    try {
      await markDoseTaken({ scheduleId: dose.scheduleId, doseDate: todayStr, taken: nextTaken });
    } catch {
      // Reverte o otimismo se a chamada falhar.
      setDoses((prev) => prev.map((d) => (d.scheduleId === key ? { ...d, taken: !nextTaken } : d)));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <h2 className="text-2xl font-semibold text-slate-800">Remédios de hoje</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {doses.map((dose) => {
          const isNext = !dose.taken && dose.timeOfDay >= now;
          return (
            <li
              key={dose.scheduleId}
              className={`flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-2 text-lg ${
                dose.taken ? 'text-slate-400' : 'text-slate-800'
              }`}
            >
              <label className="flex flex-1 items-center gap-3">
                <input
                  type="checkbox"
                  checked={dose.taken}
                  disabled={savingKey === dose.scheduleId}
                  onChange={() => toggleTaken(dose)}
                  className="h-5 w-5"
                />
                <span>
                  <strong>{dose.timeOfDay}</strong> — {dose.name} ({dose.dosage})
                  {dose.profile && <span className="text-slate-500"> · {dose.profile.name}</span>}
                </span>
              </label>
              {isNext && <span className="text-base font-medium text-blue-600">a seguir</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
