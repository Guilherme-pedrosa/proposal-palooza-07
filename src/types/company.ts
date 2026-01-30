export interface CompanySettings {
  name: string;
  phone: string;
  email: string;
  cnpj: string;
  address: string;
  logo: string | null;
  vision: string;
  mission: string;
  values: string[];
}

export const defaultCompanySettings: CompanySettings = {
  name: 'WeDo Cozinhas',
  phone: '(62) 99446-6458',
  email: '',
  cnpj: '43.572.954/0001-81',
  address: '',
  logo: null,
  vision: 'Ser reconhecida na esfera nacional e internacional como uma empresa de excelência, qualidade e preço justo, em todas as áreas de atuação.',
  mission: 'Dar suporte nas fases essenciais da cadeia de suprimento dos clientes, prestando serviços de qualidade para resolução de problemas adequados à realidade do processo no qual estivermos inseridos.',
  values: ['Segurança', 'Pessoas', 'Meio Ambiente', 'Qualidade', 'Foco no cliente', 'Melhoria Contínua'],
};
