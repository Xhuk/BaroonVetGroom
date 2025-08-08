import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TimezoneProvider } from "./contexts/TimezoneContext";
import { TenantProvider } from "./contexts/TenantContext";
import { DeviceBlocker } from "./components/DeviceBlocker";
import { useAuth } from "./hooks/useAuth";
import { useScreenSize } from "./hooks/useScreenSize";

// Pages
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import Clients from "./pages/Clients";
import MedicalAppointments from "./pages/MedicalAppointments";
import GroomingServices from "./pages/GroomingServices";
import Inventory from "./pages/Inventory";
import FollowUpTasks from "./pages/FollowUpTasks";
import DeliveryPlan from "./pages/DeliveryPlan";
import Cashier from "./pages/Cashier";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/not-found";

// Admin Pages
import AdminSettings from "./pages/AdminSettings";
import AdminBusinessHours from "./pages/AdminBusinessHours";
import AdminVanConfig from "./pages/AdminVanConfig";
import AdminFollowUpConfig from "./pages/AdminFollowUpConfig";
import AdminPaymentGateways from "./pages/AdminPaymentGateways";
import AdminBillingConfig from "./pages/AdminBillingConfig";
import AdminExternalServices from "./pages/AdminExternalServices";

// SuperAdmin Pages
import SuperAdminMonitoring from "./pages/SuperAdminMonitoring";
import SuperAdminRBAC from "./pages/SuperAdminRBAC";
import SuperAdminReports from "./pages/SuperAdminReports";
import SuperAdminRouteConfig from "./pages/SuperAdminRouteConfig";
import EnterpriseSubscriptionAdmin from "./pages/EnterpriseSubscriptionAdmin";
import TenantBillingAdmin from "./pages/TenantBillingAdmin";
import EmailConfigurationAdmin from "./pages/EmailConfigurationAdmin";

// Other specialized pages
import BookingWizard from "./pages/BookingWizard";
import BillingManagement from "./pages/BillingManagement";
import Billing from "./pages/Billing";
import MedicalRecords from "./pages/MedicalRecords";
import CompanyOnboarding from "./pages/CompanyOnboarding";
import CompanyClinicAdmin from "./pages/CompanyClinicAdmin";
import SubscriptionCheckout from "./pages/SubscriptionCheckout";
import SubscriptionLanding from "./pages/SubscriptionLanding";
import MobileAdmin from "./pages/MobileAdmin";
import DriverMobile from "./pages/DriverMobile";
import DriverRoute from "./pages/DriverRoute";
import DeliveryTracking from "./pages/DeliveryTracking";
import SalesDelivery from "./pages/SalesDelivery";
import ServiceStore from "./pages/ServiceStore";
import WebhookIntegrations from "./pages/WebhookIntegrations";
import ReceiptTemplatesAdmin from "./pages/ReceiptTemplatesAdmin";
import BrochureEditor from "./pages/BrochureEditor";
import MobileUpload from "./pages/MobileUpload";
import TempLinkHandler from "./pages/TempLinkHandler";
import RoutePlanMap from "./pages/RoutePlanMap";
import ServiceUsageWidget from "./pages/ServiceUsageWidget";

// Layout Components
import { ResponsiveNavigation } from "./components/ResponsiveNavigation";
import { ResponsiveLayout } from "./components/ResponsiveLayout";
import { Header } from "./components/Header";
import { RibbonNavigation } from "./components/RibbonNavigation";
import { Toaster } from "./components/ui/toaster";
import { DebugBanner } from "./components/DebugBanner";

// Router component with authentication and responsive layout
function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { isTabletLandscape } = useScreenSize();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return <Landing />;
  }

  // Main authenticated app with responsive layout
  return (
    <div className="min-h-screen bg-background">
      <DebugBanner />
      <Header />
      
      {/* Tablet landscape ribbon navigation */}
      {isTabletLandscape && <RibbonNavigation />}
      
      {/* Desktop/tablet portrait navigation */}
      <ResponsiveNavigation />
      
      <ResponsiveLayout>
        <Switch>
          {/* Main Dashboard */}
          <Route path="/" component={Dashboard} />
          
          {/* Core Modules */}
          <Route path="/appointments" component={Appointments} />
          <Route path="/clients" component={Clients} />
          <Route path="/medical-appointments" component={MedicalAppointments} />
          <Route path="/grooming-services" component={GroomingServices} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/follow-up-tasks" component={FollowUpTasks} />
          <Route path="/delivery-plan" component={DeliveryPlan} />
          <Route path="/cashier" component={Cashier} />
          
          {/* Booking and Billing */}
          <Route path="/booking-wizard" component={BookingWizard} />
          <Route path="/billing" component={Billing} />
          <Route path="/billing-management" component={BillingManagement} />
          <Route path="/medical-records" component={MedicalRecords} />
          
          {/* Admin Routes */}
          <Route path="/admin" component={Admin} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/business-hours" component={AdminBusinessHours} />
          <Route path="/admin/van-config" component={AdminVanConfig} />
          <Route path="/admin/follow-up-config" component={AdminFollowUpConfig} />
          <Route path="/admin/payment-gateways" component={AdminPaymentGateways} />
          <Route path="/admin/billing-config" component={AdminBillingConfig} />
          <Route path="/admin/external-services" component={AdminExternalServices} />
          
          {/* SuperAdmin Routes */}
          <Route path="/superadmin" component={SuperAdmin} />
          <Route path="/superadmin/monitoring" component={SuperAdminMonitoring} />
          <Route path="/superadmin/rbac" component={SuperAdminRBAC} />
          <Route path="/superadmin/reports" component={SuperAdminReports} />
          <Route path="/superadmin/route-config" component={SuperAdminRouteConfig} />
          <Route path="/superadmin/enterprise-subscription" component={EnterpriseSubscriptionAdmin} />
          <Route path="/superadmin/tenant-billing" component={TenantBillingAdmin} />
          <Route path="/superadmin/email-config" component={EmailConfigurationAdmin} />
          
          {/* Company Management */}
          <Route path="/company-onboarding" component={CompanyOnboarding} />
          <Route path="/company-clinic-admin" component={CompanyClinicAdmin} />
          
          {/* Subscription Management */}
          <Route path="/subscription-checkout" component={SubscriptionCheckout} />
          <Route path="/subscription-landing" component={SubscriptionLanding} />
          
          {/* Mobile Routes */}
          <Route path="/mobile-admin" component={MobileAdmin} />
          <Route path="/driver-mobile" component={DriverMobile} />
          <Route path="/driver-route" component={DriverRoute} />
          <Route path="/mobile-upload" component={MobileUpload} />
          
          {/* Delivery and Transportation */}
          <Route path="/delivery-tracking" component={DeliveryTracking} />
          <Route path="/sales-delivery" component={SalesDelivery} />
          <Route path="/route-plan-map" component={RoutePlanMap} />
          
          {/* Service Management */}
          <Route path="/service-store" component={ServiceStore} />
          <Route path="/service-usage-widget" component={ServiceUsageWidget} />
          
          {/* Configuration and Templates */}
          <Route path="/webhook-integrations" component={WebhookIntegrations} />
          <Route path="/receipt-templates-admin" component={ReceiptTemplatesAdmin} />
          <Route path="/brochure-editor" component={BrochureEditor} />
          
          {/* Temporary and Utility Routes */}
          <Route path="/temp-link-handler" component={TempLinkHandler} />
          
          {/* Catch-all 404 */}
          <Route component={NotFound} />
        </Switch>
      </ResponsiveLayout>
      
      <Toaster />
    </div>
  );
}

// Main App component with all providers
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TimezoneProvider>
          <TenantProvider>
            <DeviceBlocker>
              <Router />
            </DeviceBlocker>
          </TenantProvider>
        </TimezoneProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}