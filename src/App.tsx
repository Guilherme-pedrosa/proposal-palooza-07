import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProposalProvider } from "@/contexts/ProposalContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { GCProvider } from "@/contexts/GCContext";

// Pages
import Login from "./pages/Login";
import Index from "./pages/Index";
import Hoje from "./pages/Hoje";
import Pipeline from "./pages/Pipeline";
import NewProposal from "./pages/NewProposal";
import EditProposal from "./pages/EditProposal";
import Proposals from "./pages/Proposals";
import ClientesGC from "./pages/ClientesGC";
import ClienteDetail360 from "./pages/ClienteDetail360";
import ClienteForm from "./pages/ClienteForm";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Catalogo from "./pages/Catalogo";
import CatalogoDetail from "./pages/CatalogoDetail";
import OportunidadeNova from "./pages/OportunidadeNova";
import OportunidadeDetail from "./pages/OportunidadeDetail";
import Relatorios from "./pages/Relatorios";
import SyncGC from "./pages/SyncGC";
import TermsConditions from "./pages/TermsConditions";
import CompanySettings from "./pages/CompanySettings";
import PropostaPublica from "./pages/PropostaPublica";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/hoje" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/p/:uuid" element={<PropostaPublica />} />

      {/* Protected */}
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/hoje" element={<ProtectedRoute><Hoje /></ProtectedRoute>} />
      <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/clientes/novo" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/cliente/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
      <Route path="/catalogo" element={<ProtectedRoute><Catalogo /></ProtectedRoute>} />
      <Route path="/catalogo/:id" element={<ProtectedRoute><CatalogoDetail /></ProtectedRoute>} />
      <Route path="/oportunidades/nova" element={<ProtectedRoute><OportunidadeNova /></ProtectedRoute>} />
      <Route path="/oportunidades/:id" element={<ProtectedRoute><OportunidadeDetail /></ProtectedRoute>} />
      <Route path="/propostas" element={<ProtectedRoute><Proposals /></ProtectedRoute>} />
      <Route path="/nova-proposta" element={<ProtectedRoute><NewProposal /></ProtectedRoute>} />
      <Route path="/proposta/:id/editar" element={<ProtectedRoute><EditProposal /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
      <Route path="/sync" element={<ProtectedRoute><SyncGC /></ProtectedRoute>} />
      <Route path="/termos" element={<ProtectedRoute><TermsConditions /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><CompanySettings /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <GCProvider>
          <CompanyProvider>
            <ProposalProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <AppRoutes />
              </TooltipProvider>
            </ProposalProvider>
          </CompanyProvider>
        </GCProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
