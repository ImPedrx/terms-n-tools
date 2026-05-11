import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

const adminFaq = [
  { q: 'Dashboard Global', a: 'Visão consolidada de todos os clientes da plataforma: total de equipamentos, termos, analistas e alertas. Permite exportar um relatório Excel completo com abas por cliente e selecionar um cliente para impersonar (atuar como se fosse um analista dele).' },
  { q: 'Clientes', a: 'Gerenciamento de clientes da plataforma Auksys. Aqui você cadastra, edita e desativa clientes, define cor primária e logo, gerencia o Playbook de cada cliente e cria contas de analistas (que recebem um e-mail de acesso).' },
  { q: 'Histórico', a: 'Log de auditoria global com todas as ações realizadas no sistema (criações, edições e exclusões de equipamentos, termos, clientes, analistas e procedimentos). Filtros por data, tipo de ação, entidade e usuário.' },
  { q: 'Impersonação', a: 'Ao clicar em "Acessar" em um cliente, você passa a ver o sistema como se fosse um analista daquele cliente — útil para suporte e diagnóstico. Um banner laranja aparece no topo enquanto a impersonação está ativa.' },
];

const analystFaq = [
  { q: 'Dashboard', a: 'Visão geral do inventário do seu cliente: totais por status (disponível, entregue, manutenção), termos pendentes de assinatura e alertas de estoque baixo configurados por tipo de equipamento.' },
  { q: 'Inventário', a: 'Cadastro e gestão de todos os equipamentos do cliente. Você pode adicionar individualmente, em lote, importar planilha, registrar setor, marcar como equipamento legado (já entregue) e exportar a lista para Excel.' },
  { q: 'Novo Termo', a: 'Geração de um Termo de Responsabilidade. Selecione o colaborador, busque o equipamento pelo número de série e gere o PDF para assinatura. O termo é apenas baixado — após assinatura completa, salve manualmente no SharePoint do cliente.' },
  { q: 'Controle de Termos', a: 'Acompanhamento de todos os termos gerados: rascunhos, pendentes de assinatura do colaborador, aguardando assinatura do analista e totalmente assinados. Permite reenviar, baixar e registrar devolução de equipamentos.' },
  { q: 'Playbook', a: 'Biblioteca de procedimentos e boas práticas da empresa. Crie procedimentos com título, categoria e conteúdo formatado (Markdown simples). Use a busca e o filtro de categoria para encontrar rapidamente o que precisa.' },
  { q: 'Analistas', a: 'Gerenciamento dos analistas do cliente — adicionar, editar nome/e-mail e remover. Apenas usuários cadastrados aqui podem assinar termos como analista responsável.' },
  { q: 'Histórico', a: 'Auditoria completa do que aconteceu no seu cliente: quem criou, editou ou excluiu algo, quando e o quê. Filtros por data, ação, entidade e usuário.' },
  { q: 'Configurações', a: 'Ajustes do cliente: tipos de equipamento personalizados, limite mínimo de estoque por tipo (para gerar alertas no Dashboard), texto e modelo do termo de responsabilidade.' },
  { q: 'Tema (claro/escuro)', a: 'Use o botão de sol/lua no topo para alternar entre tema claro e escuro. Sua preferência é salva no navegador.' },
];

export function HelpDialog() {
  const { isAdmin, impersonatedClient } = useTenant();
  const faq = isAdmin && !impersonatedClient ? adminFaq : analystFaq;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Ajuda / FAQ" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Central de Ajuda
          </DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Guia rápido das funcionalidades do Auksys IT Tools.
          </p>
        </DialogHeader>
        <Accordion type="single" collapsible className="w-full">
          {faq.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-sm font-semibold">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="pt-2 text-[11px] text-muted-foreground text-center border-t mt-2 pt-3">
          Precisa de mais ajuda? Entre em contato com o time Auksys.
        </div>
      </DialogContent>
    </Dialog>
  );
}
