import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setApiProfileId } from '../api/client';
import { fetchProfiles, type Profile } from '../api/profiles';

const STORAGE_KEY = 'vecchio.profileId';

interface ProfileContextValue {
  profiles: Profile[];
  currentProfile: Profile | null;
  loading: boolean;
  selectProfile: (profileId: string) => void;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles()
      .then(setProfiles)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setApiProfileId(currentProfileId);
  }, [currentProfileId]);

  const selectProfile = (profileId: string) => {
    localStorage.setItem(STORAGE_KEY, profileId);
    setCurrentProfileId(profileId);
  };

  const clearProfile = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentProfileId(null);
  };

  const currentProfile = useMemo(
    () => profiles.find((profile) => profile.id === currentProfileId) ?? null,
    [profiles, currentProfileId],
  );

  return (
    <ProfileContext.Provider value={{ profiles, currentProfile, loading, selectProfile, clearProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile precisa ser usado dentro de um ProfileProvider.');
  }
  return context;
}
