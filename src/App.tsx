import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProposalProvider } from "@/contexts/ProposalContext";
import Index from "./pages/Index";
import NewProposal from "./pages/NewProposal";
import Proposals from "./pages/Proposals";
import TermsConditions from "./pages/TermsConditions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ProposalProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/nova-proposta" element={<NewProposal />} />
            <Route path="/propostas" element={<Proposals />} />
            <Route path="/termos" element={<TermsConditions />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ProposalProvider>
  </QueryClientProvider>
);

export default App;
