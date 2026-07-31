import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';

// Garante que um perfil foi escolhido antes de mostrar as telas internas.
// Não é autenticação (sem senha) — só evita mostrar "Início" sem saber
// para quem personalizar a tela.
export function RequireProfile({ children }: { children: ReactNode }) {
  const { currentProfile, loading } = useProfile();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-xl text-slate-500">
        Carregando…
      </div>
    );
  }

  if (!currentProfile) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
