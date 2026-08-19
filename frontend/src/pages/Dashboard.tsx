import { Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { TodayMedicinesWidget } from '../components/medicines/TodayMedicinesWidget';

const CARDS = [
  { to: '/agenda', title: 'Agenda', description: 'Consultas, compromissos e a agenda de toda a família.' },
  { to: '/contas', title: 'Contas', description: 'O que precisa ser pago esse mês e esse ano.' },
  { to: '/remedios', title: 'Remédios', description: 'Horários e doses de cada remédio.' },
  { to: '/senhas', title: 'Senhas', description: 'Consultar as senhas guardadas.' },
  { to: '/chat', title: 'Chat', description: 'Fazer perguntas sobre a sua agenda e suas contas.' },
  { to: '/pendrive', title: 'Pendrive', description: 'Copiar pastas para um pendrive.' },
];

export function Dashboard() {
  const { currentProfile } = useProfile();

  return (
    <section>
      <h1 className="text-3xl font-bold text-slate-800">
        Bem-vindo(a), {currentProfile?.name ?? ''}
      </h1>
      <p className="mt-2 text-xl text-slate-600">O que você quer fazer?</p>

      <div className="mt-6">
        <TodayMedicinesWidget />
      </div>

      <div className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h2 className="text-2xl font-semibold text-slate-800">{card.title}</h2>
            <p className="mt-2 text-lg text-slate-600">{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
