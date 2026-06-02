import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import ZoningRecords from "@/pages/zoning-records/index";
import ZoningRecordDetail from "@/pages/zoning-records/detail";
import MapPage from "@/pages/map";
import Kobo from "@/pages/kobo";
import Approvals from "@/pages/approvals";
import Users from "@/pages/users";
import AuditLogs from "@/pages/audit-logs";
import Notifications from "@/pages/notifications";
import Settings from "@/pages/settings";
import Login from "@/pages/login";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/:rest*">
        <Layout>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/zoning-records" component={ZoningRecords} />
            <Route path="/zoning-records/:id" component={ZoningRecordDetail} />
            <Route path="/map" component={MapPage} />
            <Route path="/kobo" component={Kobo} />
            <Route path="/approvals" component={Approvals} />
            <Route path="/users" component={Users} />
            <Route path="/audit-logs" component={AuditLogs} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
