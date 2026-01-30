import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProposalProvider } from "@/contexts/ProposalContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import Index from "./pages/Index";
import NewProposal from "./pages/NewProposal";
import EditProposal from "./pages/EditProposal";
import Proposals from "./pages/Proposals";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import TermsConditions from "./pages/TermsConditions";
import CompanySettings from "./pages/CompanySettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CompanyProvider>
      <ProposalProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/nova-proposta" element={<NewProposal />} />
              <Route path="/proposta/:id/editar" element={<EditProposal />} />
              <Route path="/propostas" element={<Proposals />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/cliente/:id" element={<ClientDetail />} />
              <Route path="/termos" element={<TermsConditions />} />
              <Route path="/configuracoes" element={<CompanySettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ProposalProvider>
    </CompanyProvider>
  </QueryClientProvider>
);

export default App;
