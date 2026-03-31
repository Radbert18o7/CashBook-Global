import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store/authStore';
import { getOnboardingComplete, onAuthStateChanged } from '@/services/authService';

export default function Index() {
  const { isAuthenticated, isLoading, setLoading, setUser, clearUser, user } = useAuthStore();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    setLoading(true);
    return onAuthStateChanged((u) => {
      setLoading(false);
      if (u) {
        setUser({
          uid: u.uid,
          email: u.email ?? '',
          name: u.displayName ?? '',
          avatar_url: u.photoURL ?? undefined,
          language: 'en',
          currency: 'USD',
          theme: 'system',
        });
      } else {
        clearUser();
      }
    });
  }, [setLoading, setUser, clearUser]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user?.uid) {
        setOnboardingChecked(true);
        setNeedsOnboarding(false);
        return;
      }
      const done = await getOnboardingComplete(user.uid);
      if (cancelled) return;
      setNeedsOnboarding(!done);
      setOnboardingChecked(true);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  if (isLoading || (isAuthenticated && user && !onboardingChecked)) return null;
  if (!isAuthenticated) return <Redirect href="/welcome" />;
  if (needsOnboarding) return <Redirect href="/onboarding" />;
  return <Redirect href="/home/index" />;
}
