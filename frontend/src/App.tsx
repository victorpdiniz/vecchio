import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { RequireProfile } from './components/RequireProfile';
import { ProfilePicker } from './pages/ProfilePicker';
import { Dashboard } from './pages/Dashboard';
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
        <Route
          path="/agenda"
          element={<PlaceholderPage title="Agenda" description="Compromissos e consultas da família." />}
        />
        <Route
          path="/contas"
          element={<PlaceholderPage title="Contas" description="Contas do mês e do ano." />}
        />
        <Route
          path="/remedios"
          element={<PlaceholderPage title="Remédios" description="Horários e doses dos remédios." />}
        />
        <Route
          path="/senhas"
          element={<PlaceholderPage title="Senhas" description="Lista de senhas guardadas." />}
        />
        <Route
          path="/chat"
          element={<PlaceholderPage title="Chat" description="Perguntas sobre agenda, contas e remédios." />}
        />
        <Route
          path="/pendrive"
          element={<PlaceholderPage title="Pendrive" description="Copiar pastas para um pendrive." />}
        />
      </Route>
    </Routes>
  );
}
