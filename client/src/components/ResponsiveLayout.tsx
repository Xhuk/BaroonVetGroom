import { ResponsiveNavigation } from "@/components/ResponsiveNavigation";
import { RibbonNavigation } from "@/components/RibbonNavigation";
import { Header } from "@/components/Header";
import { useScreenSize } from "@/hooks/useScreenSize";
import { cn } from "@/lib/utils";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

export function ResponsiveLayout({ children, showNavigation = true }: ResponsiveLayoutProps) {
  const { shouldCollapseNavigation, deviceType, isSmallTablet, isTabletLandscape, shouldUseRibbonNavigation, shouldHideBottomRibbon } = useScreenSize();

  const getMainContentClasses = () => {
    if (!showNavigation) return "";
    
    // In tablet landscape, no sidebar navigation (ribbon takes over)
    if (isTabletLandscape) {
      return "pl-0";
    }
    
    if (shouldCollapseNavigation) {
      return "pl-16"; // Account for collapsed navigation (64px)
    }
    return "pl-72"; // Account for full navigation (288px)
  };

  const getContentPadding = () => {
    if (isTabletLandscape) {
      return "pt-20 pb-20"; // Padding for ribbon at bottom
    }
    if (isSmallTablet) {
      return "pt-20 pb-4"; // Reduced padding for small tablets
    }
    return "pt-24 pb-6"; // Original padding for larger screens
  };

  console.log(`📱 ResponsiveLayout: Device ${deviceType}, landscape: ${isTabletLandscape}, useRibbon: ${shouldUseRibbonNavigation}, hideRibbon: ${shouldHideBottomRibbon}`);

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
      
      {/* Ribbon Navigation for tablet landscape mode */}
      {shouldUseRibbonNavigation && !shouldHideBottomRibbon && <RibbonNavigation />}
    </div>
  );
}