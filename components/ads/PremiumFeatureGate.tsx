import { type PropsWithChildren } from 'react';

export function PremiumFeatureGate({ children }: PropsWithChildren) {
  // Scaffold: currently everything is free.
  return <>{children}</>;
}

