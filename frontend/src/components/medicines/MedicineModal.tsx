import { useEffect, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { getErrorMessage } from '../../api/client';
import {
  createMedicine,
  deleteMedicine,
  updateMedicine,
  type Medicine,
  type MedicineInput,
  type MedicineScheduleInput,
} from '../../api/medicines';
import { fetchProfiles, type Profile } from '../../api/profiles';
import { DateTimeField } from '../DateTimeField';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function toDateOnly(iso: string | null): string {
  if (!iso) return '';
  return format(new Date(iso), 'yyyy-MM-dd');
}

function emptySchedule(): MedicineScheduleInput {
  return { timeOfDay: '', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
}

interface MedicineModalProps {
  mode: 'create' | 'edit';
  medicine?: Medicine;
  onClose: () => void;
  onSaved: () => void;
}

export function MedicineModal({ mode, medicine, onClose, onSaved }: MedicineModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [name, setName] = useState(medicine?.name ?? '');
  const [dosage, setDosage] = useState(medicine?.dosage ?? '');
  const [profileId, setProfileId] = useState(medicine?.profileId ?? '');
  const [notes, setNotes] = useState(medicine?.notes ?? '');
  const [startDate, setStartDate] = useState(toDateOnly(medicine?.startDate ?? new Date().toISOString()));
  const [endDate, setEndDate] = useState(toDateOnly(medicine?.endDate ?? null));
  const [schedules, setSchedules] = useState<MedicineScheduleInput[]>(
    medicine?.schedules.map((s) => ({ timeOfDay: s.timeOfDay, daysOfWeek: s.daysOfWeek })) ?? [emptySchedule()],
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProfiles().then(setProfiles);
  }, []);

  function updateSchedule(index: number, next: Partial<MedicineScheduleInput>) {
    setSchedules((current) => current.map((s, i) => (i === index ? { ...s, ...next } : s)));
  }

  function toggleDay(index: number, day: number) {
    setSchedules((current) =>
      current.map((s, i) => {
        if (i !== index) return s;
        const has = s.daysOfWeek.includes(day);
        const daysOfWeek = has ? s.daysOfWeek.filter((d) => d !== day) : [...s.daysOfWeek, day];
        return { ...s, daysOfWeek };
      }),
    );
  }

  function addSchedule() {
    setSchedules((current) => [...current, emptySchedule()]);
  }

  function removeSchedule(index: number) {
    setSchedules((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!startDate) {
      setError('Informe a data de início.');
      return;
    }
    if (schedules.length === 0) {
      setError('Adicione ao menos um horário.');
      return;
    }
    for (const schedule of schedules) {
      if (!schedule.timeOfDay) {
        setError('Preencha o horário de todas as doses.');
        return;
      }
      if (schedule.daysOfWeek.length === 0) {
        setError('Selecione ao menos um dia da semana em cada horário.');
        return;
      }
    }

    const payload: MedicineInput = {
      name,
      dosage,
      profileId: profileId || undefined,
      notes: notes || undefined,
      startDate: new Date(`${startDate}T00:00:00`).toISOString(),
      endDate: endDate ? new Date(`${endDate}T00:00:00`).toISOString() : undefined,
      schedules,
    };

    setSaving(true);
    try {
      if (mode === 'create') {
        await createMedicine(payload);
      } else if (medicine) {
        await updateMedicine(medicine.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!medicine) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteMedicine(medicine.id);
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
          <h2 className="text-2xl font-bold text-slate-800">{mode === 'create' ? 'Novo remédio' : 'Editar remédio'}</h2>
          <button type="button" onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-lg text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Nome do remédio
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
              placeholder="Ex: Losartana"
            />
          </label>

          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Dosagem
            <input
              required
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
              placeholder="Ex: 50mg, 1 comprimido"
            />
          </label>

          <label className="flex flex-col gap-1 text-lg text-slate-700">
            Para quem
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
            >
              <option value="">Toda a família</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <DateTimeField label="Início" value={startDate} onChange={setStartDate} required showTime={false} />
            <DateTimeField label="Fim (opcional)" value={endDate} onChange={setEndDate} showTime={false} />
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-lg font-medium text-slate-700">Horários</p>
              <button type="button" onClick={addSchedule} className="text-blue-600 hover:underline">
                + Adicionar horário
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {schedules.map((schedule, index) => (
                <div key={index} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      required
                      type="time"
                      value={schedule.timeOfDay}
                      onChange={(e) => updateSchedule(index, { timeOfDay: e.target.value })}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
                    />
                    {schedules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSchedule(index)}
                        className="text-red-500 hover:underline"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DAY_LABELS.map((label, day) => (
                      <label
                        key={day}
                        className={`cursor-pointer rounded-full px-3 py-1 text-base ${
                          schedule.daysOfWeek.includes(day)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={schedule.daysOfWeek.includes(day)}
                          onChange={() => toggleDay(index, day)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
