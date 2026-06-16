import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import OfflineBanner from "@/components/offline-banner";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import ZoningRecords from "@/pages/zoning-records/index";
import ZoningRecordDetail from "@/pages/zoning-records/detail";
import ZoningRecordFormView from "@/pages/zoning-records/form-view";
import MapPage from "@/pages/map";
import Kobo from "@/pages/kobo";
import Approvals from "@/pages/approvals";
import Users from "@/pages/users";
import AuditLogs from "@/pages/audit-logs";
import Notifications from "@/pages/notifications";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Reports from "@/pages/reports";

const queryClient = new QueryClient();

function canAccessPath(allowedPaths: string[] | "all", path: string): boolean {
  if (allowedPaths === "all") return true;
  return allowedPaths.some((p) => path === p || path.startsWith(p + "/"));
}

function ProtectedRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { user, allowedPaths } = useAuth();
  if (!canAccessPath(allowedPaths, path)) {
    return <Redirect to="/dashboard" />;
  }
  return <>{children}</>;
}

function Router() {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (location === "/login") return <Login />;
    return <Redirect to="/login" />;
  }

  if (location === "/login") return <Redirect to="/dashboard" />;

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/zoning-records/:id/form">
        <ProtectedRoute path="/zoning-records">
          <Layout><ZoningRecordFormView /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/zoning-records/:id">
        <ProtectedRoute path="/zoning-records">
          <Layout><ZoningRecordDetail /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/:rest*">
        <Layout>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/zoning-records">
              <ProtectedRoute path="/zoning-records"><ZoningRecords /></ProtectedRoute>
            </Route>
            <Route path="/map">
              <ProtectedRoute path="/map"><MapPage /></ProtectedRoute>
            </Route>
            <Route path="/kobo">
              <ProtectedRoute path="/kobo"><Kobo /></ProtectedRoute>
            </Route>
            <Route path="/approvals">
              <ProtectedRoute path="/approvals"><Approvals /></ProtectedRoute>
            </Route>
            <Route path="/users">
              <ProtectedRoute path="/users"><Users /></ProtectedRoute>
            </Route>
            <Route path="/audit-logs">
              <ProtectedRoute path="/audit-logs"><AuditLogs /></ProtectedRoute>
            </Route>
            <Route path="/notifications">
              <ProtectedRoute path="/notifications"><Notifications /></ProtectedRoute>
            </Route>
            <Route path="/reports">
              <ProtectedRoute path="/reports"><Reports /></ProtectedRoute>
            </Route>
            <Route path="/settings">
              <ProtectedRoute path="/settings"><Settings /></ProtectedRoute>
            </Route>
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
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
          <OfflineBanner />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
