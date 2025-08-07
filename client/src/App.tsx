import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantProvider } from "@/contexts/TenantContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { RoleImpersonationProvider } from "@/hooks/useRoleImpersonation";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import SuperAdmin from "@/pages/SuperAdmin";
import SuperAdminMonitoring from "@/pages/SuperAdminMonitoring";
import SuperAdminRouteConfig from "@/pages/SuperAdminRouteConfig";
import SuperAdminRBAC from "@/pages/SuperAdminRBAC";
import AdminSettings from "@/pages/AdminSettings";
import AdminBusinessHours from "@/pages/AdminBusinessHours";
import AdminBillingConfig from "@/pages/AdminBillingConfig";
import Appointments from "@/pages/Appointments";
import BookingWizard from "@/pages/BookingWizard";
import Clients from "@/pages/Clients";
import Inventory from "@/pages/Inventory";
import DeliveryPlan from "@/pages/DeliveryPlan";
import RoutePlanMap from "@/pages/RoutePlanMap";
import DeliveryTracking from "@/pages/DeliveryTracking";
import AdminVanConfig from "@/pages/AdminVanConfig";
import Billing from "@/pages/Billing";
import Cashier from "@/pages/Cashier";
import MedicalRecords from "@/pages/MedicalRecords";
import MedicalAppointments from "@/pages/MedicalAppointments";
import GroomingServices from "@/pages/GroomingServices";
import MobileUpload from "@/pages/MobileUpload";
import FollowUpTasks from "@/pages/FollowUpTasks";
import AdminPaymentGateways from "@/pages/AdminPaymentGateways";
import AdminFollowUpConfig from "@/pages/AdminFollowUpConfig";
import AdminExternalServices from "@/pages/AdminExternalServices";
import BillingManagement from "@/pages/BillingManagement";
import { VersionedSuperAdminDashboard } from "@/components/VersionedSuperAdminDashboard";

import WebhookIntegrations from "@/pages/WebhookIntegrations";
import SubscriptionLanding from "@/pages/SubscriptionLanding";
import TempLinkHandler from "@/pages/TempLinkHandler";
import DriverRoute from "@/pages/DriverRoute";
import DriverMobile from "@/pages/DriverMobile";
import { InstantNavigation } from "@/components/InstantNavigation";
import { DebugBanner } from "@/components/DebugBanner";
import { DeviceBlocker } from "@/components/DeviceBlocker";
import { ResponsiveNavigation } from "@/components/ResponsiveNavigation";
import { useScreenSize } from "@/hooks/useScreenSize";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isPhone, isSmallTablet, isTablet, isDesktop } = useScreenSize();

  // NEVER show loading spinner on route changes - always render instantly
  // Only show auth loading on initial app load when no route is detected

  return (
    <DeviceBlocker>
      <div className="flex min-h-screen">
        {/* Responsive Navigation - only show for authenticated users on larger screens */}
        {isAuthenticated && !isPhone && <ResponsiveNavigation />}
        
        {/* Main content area with responsive margins */}
        <main 
          className={cn(
            "flex-1 transition-all duration-300",
            isAuthenticated && !isPhone ? (
              isSmallTablet ? "ml-16" : "ml-72"
            ) : "ml-0"
          )}
        >
          <DebugBanner />
          <Switch>
      {/* INSTANT ROUTING - All routes available immediately, no auth blocking */}
      <Route path="/" component={isAuthenticated ? Dashboard : Landing} />
      <Route path="/plans" component={SubscriptionLanding} />
      <Route path="/temp/:token" component={TempLinkHandler} />
      <Route path="/driver-route/:routeId" component={DriverRoute} />
      <Route path="/appointments" component={Appointments} />
      {isAuthenticated && (
        <>
          <Route path="/booking" component={BookingWizard} />
          <Route path="/booking-wizard" component={BookingWizard} />
          <Route path="/clients" component={Clients} />
          <Route path="/medical-records" component={MedicalRecords} />
          <Route path="/medical-appointments" component={MedicalAppointments} />
          <Route path="/grooming-services" component={GroomingServices} />
          <Route path="/follow-up-tasks" component={FollowUpTasks} />
          <Route path="/upload/:type/:appointmentId" component={MobileUpload} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/delivery-plan" component={DeliveryPlan} />
          <Route path="/route-map" component={RoutePlanMap} />
          <Route path="/billing" component={Billing} />
          <Route path="/cashier" component={Cashier} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/business-hours" component={AdminBusinessHours} />
          <Route path="/admin/billing-config" component={AdminBillingConfig} />
          <Route path="/admin/payment-gateways" component={AdminPaymentGateways} />
          <Route path="/admin/follow-up-config" component={AdminFollowUpConfig} />
          <Route path="/admin/van-config" component={AdminVanConfig} />
          <Route path="/admin/external-services" component={AdminExternalServices} />
          <Route path="/superadmin" component={SuperAdmin} />
          <Route path="/superadmin/monitoring" component={SuperAdminMonitoring} />
          <Route path="/superadmin/route-config" component={SuperAdminRouteConfig} />
          <Route path="/superadmin/rbac" component={SuperAdminRBAC} />
          <Route path="/superadmin/webhook-integrations" component={WebhookIntegrations} />
          <Route path="/superadmin/billing" component={BillingManagement} />
          <Route path="/superadmin/deployment" component={() => <VersionedSuperAdminDashboard />} />
        </>
      )}
      <Route path="/driver-mobile" component={DriverMobile} />
      <Route path="/driver-dashboard/:driverId" component={DriverMobile} />
      <Route path="/temp/:token" component={TempLinkHandler} />
      <Route component={NotFound} />
      </Switch>
        </main>
      </div>
    </DeviceBlocker>
  );
}

import { TimezoneProvider } from "@/contexts/TimezoneContext";
import { cn } from "@/lib/utils";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <TimezoneProvider>
            <InstantNavigation />
            <TenantProvider>
              <RoleImpersonationProvider>
                <Toaster />
                <Router />
              </RoleImpersonationProvider>
            </TenantProvider>
          </TimezoneProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
