export type Language = 'pt' | 'en' | 'es';

export const translations: Record<Language, Record<string, string>> = {
  pt: {
    term_title: 'TERMO DE RESPONSABILIDADE',
    term_date: 'Data',
    term_equipment: 'Equipamento',
    term_serial: 'Nº Série',
    term_patrimony: 'Patrimônio',
    term_collaborator: 'Colaborador',
    term_analyst: 'Analista',
    term_ticket: 'Chamado',
    term_collaborator_sig: 'Colaborador',
    term_analyst_sig: 'Analista',
    term_return: 'Devolução',
    term_returned_at: 'Data de Devolução',
    term_returned_by: 'Devolvido por',
    print: 'Imprimir / PDF',
  },
  en: {
    term_title: 'RESPONSIBILITY TERM',
    term_date: 'Date',
    term_equipment: 'Equipment',
    term_serial: 'Serial No.',
    term_patrimony: 'Asset Tag',
    term_collaborator: 'Collaborator',
    term_analyst: 'Analyst',
    term_ticket: 'Ticket',
    term_collaborator_sig: 'Collaborator',
    term_analyst_sig: 'Analyst',
    term_return: 'Return',
    term_returned_at: 'Return Date',
    term_returned_by: 'Returned by',
    print: 'Print / PDF',
  },
  es: {
    term_title: 'TÉRMINO DE RESPONSABILIDAD',
    term_date: 'Fecha',
    term_equipment: 'Equipo',
    term_serial: 'Nº Serie',
    term_patrimony: 'Patrimonio',
    term_collaborator: 'Colaborador',
    term_analyst: 'Analista',
    term_ticket: 'Ticket',
    term_collaborator_sig: 'Colaborador',
    term_analyst_sig: 'Analista',
    term_return: 'Devolución',
    term_returned_at: 'Fecha de Devolución',
    term_returned_by: 'Devuelto por',
    print: 'Imprimir / PDF',
  },
};

export function t(lang: Language, key: string): string {
  return translations[lang]?.[key] || translations.pt[key] || key;
}
