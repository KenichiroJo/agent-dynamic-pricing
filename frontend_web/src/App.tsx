import { SidebarProvider } from '@/components/ui/sidebar';
import Pages from '@/pages';
import { PricingModeContext, usePricingModeState } from '@/hooks/use-pricing-mode';

export function App() {
  const pricingMode = usePricingModeState();

  return (
    <PricingModeContext.Provider value={pricingMode}>
      <SidebarProvider>
        <Pages />
      </SidebarProvider>
    </PricingModeContext.Provider>
  );
}
