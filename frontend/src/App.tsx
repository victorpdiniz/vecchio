import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { RequireProfile } from './components/RequireProfile';
import { ProfilePicker } from './pages/ProfilePicker';
import { Dashboard } from './pages/Dashboard';
import { Agenda } from './pages/Agenda';
import { Bills } from './pages/Bills';
import { Chat } from './pages/Chat';
import { PlaceholderPage } from './pages/PlaceholderPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ProfilePicker />} />

      <Route
        element={
          <RequireProfile>
            <AppLayout />
          </RequireProfile>
        }
      >
        <Route path="/inicio" element={<Dashboard />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/contas" element={<Bills />} />
        <Route
          path="/remedios"
          element={<PlaceholderPage title="Remédios" description="Horários e doses dos remédios." />}
        />
        <Route
          path="/senhas"
          element={<PlaceholderPage title="Senhas" description="Lista de senhas guardadas." />}
        />
        <Route path="/chat" element={<Chat />} />
        <Route
          path="/pendrive"
          element={<PlaceholderPage title="Pendrive" description="Copiar pastas para um pendrive." />}
        />
      </Route>
    </Routes>
  );
}
