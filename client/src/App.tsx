import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantProvider } from "@/contexts/TenantContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import SuperAdmin from "@/pages/SuperAdmin";
import AdminSettings from "@/pages/AdminSettings";
import Appointments from "@/pages/Appointments";
import BookingWizard from "@/pages/BookingWizard";
import Clients from "@/pages/Clients";
import Inventory from "@/pages/Inventory";
import DeliveryPlan from "@/pages/DeliveryPlan";
import Billing from "@/pages/Billing";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/appointments" component={Appointments} />
          <Route path="/booking" component={BookingWizard} />
          <Route path="/clients" component={Clients} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/delivery" component={DeliveryPlan} />
          <Route path="/billing" component={Billing} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/superadmin" component={SuperAdmin} />
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
            <Toaster />
            <Router />
          </TenantProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
