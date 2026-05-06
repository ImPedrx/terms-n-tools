// Tipos agora vêm da tabela equipment_types por cliente.
// Exporta apenas listas estáticas de status e o texto padrão do termo.

export const EQUIPMENT_STATUS = [
  { value: 'disponivel', label: 'Disponível', color: 'bg-success' },
  { value: 'entregue', label: 'Entregue', color: 'bg-primary' },
  { value: 'em_manutencao', label: 'Em Manutenção', color: 'bg-warning' },
  { value: 'reservado', label: 'Reservado', color: 'bg-accent' },
  { value: 'baixado', label: 'Baixado', color: 'bg-destructive' },
] as const;

export const TERM_STATUS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'enviado_para_assinatura', label: 'Enviado para Assinatura' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'cancelado', label: 'Cancelado' },
] as const;

export const DEFAULT_TERM_TEXT = `Declaro, para os devidos fins, que recebi da empresa o equipamento descrito neste documento, comprometendo-me a utilizá-lo exclusivamente para fins profissionais, zelar por sua conservação e devolvê-lo sempre que solicitado ou ao término do vínculo com a empresa. Estou ciente de que sou responsável pelo uso adequado do equipamento e por comunicar qualquer problema, dano ou necessidade de manutenção ao setor responsável.`;
