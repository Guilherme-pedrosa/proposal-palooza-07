// Re-export do novo gerador via Browserless para manter compatibilidade
// com todos os pontos que já importavam de '@/lib/printProposal'.
export {
  generateProposalPdf,
  openPrintWindow,
  PDF_VARIANT_LABELS,
} from '@/lib/exportProposalPdf';
export type { PdfVariant } from '@/lib/exportProposalPdf';
