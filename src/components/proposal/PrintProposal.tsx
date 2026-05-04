import { useCallback } from 'react';
import { Proposal } from '@/types/proposal';
import { CompanySettings } from '@/types/company';
import { generateProposalPdf } from '@/lib/printProposal';

interface PrintProposalProps {
  proposal: Partial<Proposal>;
  company: CompanySettings;
  onPrintComplete?: () => void;
}

export function usePrintProposal() {
  const printProposal = useCallback(async (proposal: Partial<Proposal>, company: CompanySettings) => {
    await generateProposalPdf(proposal, company);
  }, []);

  return { printProposal };
}

export function PrintProposalButton({ 
  proposal, 
  company, 
  className,
  children 
}: PrintProposalProps & { className?: string; children: React.ReactNode }) {
  const { printProposal } = usePrintProposal();

  const handlePrint = async () => {
    await printProposal(proposal, company);
  };

  return (
    <button onClick={handlePrint} className={className}>
      {children}
    </button>
  );
}
