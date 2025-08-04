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
import MedicalRecords from "@/pages/MedicalRecords";
import MedicalAppointments from "@/pages/MedicalAppointments";
import GroomingServices from "@/pages/GroomingServices";
import MobileUpload from "@/pages/MobileUpload";
import FollowUpTasks from "@/pages/FollowUpTasks";
import AdminPaymentGateways from "@/pages/AdminPaymentGateways";
import AdminFollowUpConfig from "@/pages/AdminFollowUpConfig";
import AdminExternalServices from "@/pages/AdminExternalServices";

import WebhookIntegrations from "@/pages/WebhookIntegrations";
import SubscriptionLanding from "@/pages/SubscriptionLanding";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/plans" component={SubscriptionLanding} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/appointments" component={Appointments} />
          <Route path="/booking" component={BookingWizard} />
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
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <TenantProvider>
            <RoleImpersonationProvider>
              <Toaster />
              <Router />
            </RoleImpersonationProvider>
          </TenantProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
