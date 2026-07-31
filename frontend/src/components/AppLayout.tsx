import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { NotificationsBanner } from './notifications/NotificationsBanner';

const NAV_ITEMS = [
  { to: '/inicio', label: 'Início' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/contas', label: 'Contas' },
  { to: '/remedios', label: 'Remédios' },
  { to: '/senhas', label: 'Senhas' },
  { to: '/chat', label: 'Chat' },
  { to: '/pendrive', label: 'Pendrive' },
];

export function AppLayout() {
  const { currentProfile, clearProfile } = useProfile();
  const navigate = useNavigate();

  const handleSwitchProfile = () => {
    clearProfile();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <p className="text-2xl font-bold text-slate-800">Vecchio</p>
          {currentProfile && (
            <p className="text-lg text-slate-500">Olá, {currentProfile.name}</p>
          )}
        </div>
        <nav className="flex flex-wrap gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 text-lg font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={handleSwitchProfile}
          className="rounded-lg border border-slate-300 px-4 py-2 text-lg font-medium text-slate-700 hover:bg-slate-100"
        >
          Trocar de perfil
        </button>
      </header>

      <main className="px-6 py-8">
        <NotificationsBanner />
        <Outlet />
      </main>
    </div>
  );
}
