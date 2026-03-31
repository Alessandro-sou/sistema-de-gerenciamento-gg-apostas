import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/Dashboard";
import Mediadores from "@/pages/Mediadores";
import Financeiro from "@/pages/Financeiro";
import EnviarMensagem from "@/pages/EnviarMensagem";
import Cargos from "@/pages/Cargos";
import Configuracoes from "@/pages/Configuracoes";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { checkFrameProtection, logSecurityEvent } from "@/lib/security";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// Proteção global contra iframes (clickjacking)
function FrameGuard() {
  useEffect(() => {
    if (!checkFrameProtection()) {
      logSecurityEvent("CLICKJACKING_BLOCKED", {});
      window.top!.location.href = window.self.location.href;
    }
  }, []);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-muted-foreground text-sm">Carregando...</span>
      </div>
    );
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FrameGuard />
      <BrowserRouter>
        <Routes>
          {/* Rota pública - Login */}
          <Route path="/login" element={<Login />} />
          
          {/* Todas as outras rotas são protegidas por autenticação */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/mediadores" element={<Mediadores />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/mensagem" element={<EnviarMensagem />} />
            <Route path="/cargos" element={<Cargos />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
          
          {/* 404 - Qualquer rota não encontrada */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;