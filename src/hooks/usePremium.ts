import { useWorkspace } from '@/src/app/WorkspaceContext';

export function usePremium() {
  const { isPremium, subscription, activateSimulatedPremium, cancelSimulatedPremium } =
    useWorkspace();

  return {
    isPremium,
    subscription,
    activateSimulatedPremium,
    cancelSimulatedPremium,
  };
}
