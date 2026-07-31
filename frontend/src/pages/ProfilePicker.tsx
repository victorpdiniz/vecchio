import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';

const AVATAR_EMOJI: Record<string, string> = {
  grandpa: '👴',
  grandma: '👵',
  dad: '🧑',
  admin: '🛠️',
};

export function ProfilePicker() {
  const { profiles, loading, selectProfile } = useProfile();
  const navigate = useNavigate();

  const handleSelect = (profileId: string) => {
    selectProfile(profileId);
    navigate('/inicio');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-10 bg-slate-50 px-6 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-800">Vecchio</h1>
        <p className="mt-2 text-xl text-slate-600">Quem está usando o sistema agora?</p>
      </div>

      {loading && <p className="text-lg text-slate-500">Carregando perfis…</p>}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => handleSelect(profile.id)}
            className="flex flex-col items-center gap-3 rounded-2xl border-4 border-transparent bg-white px-8 py-10 text-center shadow-md transition hover:-translate-y-1 hover:shadow-xl focus-visible:border-blue-600"
            style={{ borderColor: 'transparent' }}
          >
            <span className="text-6xl" aria-hidden="true">
              {AVATAR_EMOJI[profile.avatarIcon] ?? '🙂'}
            </span>
            <span className="text-2xl font-semibold text-slate-800">{profile.name}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
