import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import NewTerm from "./pages/NewTerm";
import TermsControl from "./pages/TermsControl";
import SettingsPage from "./pages/SettingsPage";
import Analysts from "./pages/Analysts";
import AdminClients from "./pages/AdminClients";
import AdminDashboard from "./pages/AdminDashboard";
import History from "./pages/History";
import Playbook from "./pages/Playbook";
import NotFound from "./pages/NotFound";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useTenant();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HomeRoute() {
  const { isAdmin, impersonatedClient, loading } = useTenant();
  if (loading) return null;
  if (isAdmin && !impersonatedClient) return <Navigate to="/admin" replace />;
  return <Dashboard />;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
    <Route path="/" element={<ProtectedRoute><HomeRoute /></ProtectedRoute>} />
    <Route path="/inventario" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
    <Route path="/termos/novo" element={<ProtectedRoute><NewTerm /></ProtectedRoute>} />
    <Route path="/termos" element={<ProtectedRoute><TermsControl /></ProtectedRoute>} />
    <Route path="/configuracoes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    <Route path="/analistas" element={<ProtectedRoute><Analysts /></ProtectedRoute>} />
    <Route path="/historico" element={<ProtectedRoute><History /></ProtectedRoute>} />
    <Route path="/playbook" element={<ProtectedRoute><Playbook /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
    <Route path="/admin/clientes" element={<ProtectedRoute><AdminRoute><AdminClients /></AdminRoute></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  // Mantido em estado para sobreviver a re-renders e não ser recriado
  // a cada HMR no desenvolvimento (o que limparia o cache de queries).
  const [queryClient] = useState(() => new QueryClient());
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <TenantProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TenantProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
