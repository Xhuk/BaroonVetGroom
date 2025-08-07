import { ResponsiveNavigation } from "@/components/ResponsiveNavigation";
import { Header } from "@/components/Header";
import { useScreenSize } from "@/hooks/useScreenSize";
import { cn } from "@/lib/utils";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

export function ResponsiveLayout({ children, showNavigation = true }: ResponsiveLayoutProps) {
  const { shouldCollapseNavigation, deviceType, isSmallTablet } = useScreenSize();

  const getMainContentClasses = () => {
    if (!showNavigation) return "";
    
    if (shouldCollapseNavigation) {
      return "pl-16"; // Account for collapsed navigation (64px)
    }
    return "pl-72"; // Account for full navigation (288px)
  };

  const getContentPadding = () => {
    if (isSmallTablet) {
      return "pt-20 pb-4"; // Reduced padding for small tablets
    }
    return "pt-24 pb-6"; // Original padding for larger screens
  };

  console.log(`📱 ResponsiveLayout: Device ${deviceType}, collapse nav: ${shouldCollapseNavigation}`);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {showNavigation && <ResponsiveNavigation />}
      <main className={cn(
        "transition-all duration-300",
        getMainContentClasses(),
        getContentPadding(),
        "tablet-container" // Apply responsive padding classes
      )}>
        {children}
      </main>
    </div>
  );
}