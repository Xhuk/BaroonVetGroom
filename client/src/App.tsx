import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantProvider } from "@/contexts/TenantContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { RoleImpersonationProvider } from "@/hooks/useRoleImpersonation";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import { LandingPage } from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import SuperAdmin from "@/pages/SuperAdmin";
import SuperAdminMonitoring from "@/pages/SuperAdminMonitoring";
import SuperAdminRouteConfig from "@/pages/SuperAdminRouteConfig";
import SuperAdminRBAC from "@/pages/SuperAdminRBAC";
import SuperAdminReports from "@/pages/SuperAdminReports";
import EnterpriseSubscriptionAdmin from "@/pages/EnterpriseSubscriptionAdmin";
import SuperAdminFeaturesAdmin from "@/pages/SuperAdminFeaturesAdmin";
import MobileAdmin from "@/pages/MobileAdmin";
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
import AdminFraccionamientos from "@/pages/AdminFraccionamientos";
import BillingManagement from "@/pages/BillingManagement";
import { VersionedSuperAdminDashboard } from "@/components/VersionedSuperAdminDashboard";
import EmailConfigurationAdmin from "@/pages/EmailConfigurationAdmin";
import SubscriptionCheckout from "@/pages/SubscriptionCheckout";
import CompanyOnboarding from "@/pages/CompanyOnboarding";
import ServiceStore from "@/pages/ServiceStore";

import WebhookIntegrations from "@/pages/WebhookIntegrations";
import SubscriptionLanding from "@/pages/SubscriptionLanding";
import TempLinkHandler from "@/pages/TempLinkHandler";
import DriverRoute from "@/pages/DriverRoute";
import DriverMobile from "@/pages/DriverMobile";
import SalesDelivery from "@/pages/SalesDelivery";
import ReceiptTemplatesAdmin from "@/pages/ReceiptTemplatesAdmin";
import CompanyClinicAdmin from "@/pages/CompanyClinicAdmin";
import { InstantNavigation } from "@/components/InstantNavigation";
import { DebugBanner } from "@/components/DebugBanner";
import { DeviceBlocker } from "@/components/DeviceBlocker";

function Router() {
  const { user, isLoading, error, isAuthenticated } = useAuth();
  
  // Force landing page if there's an auth error (401) or explicit logout
  const shouldShowLandingPage = !isLoading && (!isAuthenticated || error?.message?.includes('401') || error?.message?.includes('Unauthorized'));
  
  // Clear logout flag on successful auth
  if (isAuthenticated && localStorage.getItem('auth_logged_out') === 'true') {
    localStorage.removeItem('auth_logged_out');
  }

  // NEVER show loading spinner on route changes - always render instantly
  // Only show auth loading on initial app load when no route is detected

  return (
    <DeviceBlocker>
      <DebugBanner />
      <Switch>
      {/* INSTANT ROUTING - All routes available immediately, no auth blocking */}
      <Route path="/" component={() => {
        if (isLoading) {
          return (
            <div className="min-h-screen bg-background flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          );
        }
        // Always show landing page if not properly authenticated
        if (shouldShowLandingPage) {
          return <LandingPage />;
        }
        return <Dashboard />;
      }} />
      <Route path="/plans" component={SubscriptionLanding} />
      <Route path="/checkout" component={SubscriptionCheckout} />
      <Route path="/onboarding" component={CompanyOnboarding} />
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
          <Route path="/sales-delivery" component={SalesDelivery} />
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
          <Route path="/admin/fraccionamientos" component={AdminFraccionamientos} />
          <Route path="/admin/receipt-templates" component={ReceiptTemplatesAdmin} />
          <Route path="/admin/company-clinic" component={CompanyClinicAdmin} />
          <Route path="/store" component={ServiceStore} />
          <Route path="/superadmin" component={SuperAdmin} />
          <Route path="/superadmin/monitoring" component={SuperAdminMonitoring} />
          <Route path="/superadmin/route-config" component={SuperAdminRouteConfig} />
          <Route path="/superadmin/rbac" component={SuperAdminRBAC} />
          <Route path="/superadmin/webhook-integrations" component={WebhookIntegrations} />
          <Route path="/superadmin/billing" component={BillingManagement} />
          <Route path="/superadmin/email-config" component={EmailConfigurationAdmin} />
          <Route path="/superadmin/reports" component={SuperAdminReports} />
          <Route path="/superadmin/subscriptions" component={EnterpriseSubscriptionAdmin} />
          <Route path="/superadmin/features" component={SuperAdminFeaturesAdmin} />
          <Route path="/superadmin/deployment" component={() => <VersionedSuperAdminDashboard />} />
        </>
      )}
      <Route path="/mobile-admin" component={MobileAdmin} />
      <Route path="/driver-mobile" component={DriverMobile} />
      <Route path="/driver-dashboard/:driverId" component={DriverMobile} />
      <Route path="/temp/:token" component={TempLinkHandler} />
      <Route component={NotFound} />
      </Switch>
    </DeviceBlocker>
  );
}

import { TimezoneProvider } from "@/contexts/TimezoneContext";

function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
