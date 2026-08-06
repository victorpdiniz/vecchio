import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { RequireProfile } from './components/RequireProfile';
import { ProfilePicker } from './pages/ProfilePicker';
import { Dashboard } from './pages/Dashboard';
import { Agenda } from './pages/Agenda';
import { Bills } from './pages/Bills';
import { Medicines } from './pages/Medicines';
import { Passwords } from './pages/Passwords';
import { Chat } from './pages/Chat';
import { UsbTransfer } from './pages/UsbTransfer';
import { useArrowKeyNavigation } from './hooks/useArrowKeyNavigation';

export function App() {
  useArrowKeyNavigation();

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
        <Route path="/remedios" element={<Medicines />} />
        <Route path="/senhas" element={<Passwords />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/pendrive" element={<UsbTransfer />} />
      </Route>
    </Routes>
  );
}
