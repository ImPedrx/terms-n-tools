# Múltiplos Ativos no Novo Termo

**Data:** 2026-06-15
**Arquivo afetado principal:** `src/pages/NewTerm.tsx`

## Objetivo

Numa única tela, gerar termos de responsabilidade para vários ativos de um mesmo
colaborador de uma só vez. Hoje o processo é 1 termo por vez; com 5 ativos o
analista repete o fluxo 5 vezes. Esta feature reduz isso a uma única passagem:
preenche colaborador/setor/analista uma vez, adiciona N ativos (cada um com seu
chamado), e o sistema gera N termos separados — porque cada ativo tem um chamado
distinto — e exporta todos num único PDF, um termo por folha.

## Decisões (definidas no brainstorming)

1. **Campos compartilhados:** Colaborador, Setor, Analista (preenchidos 1 vez).
2. **Campos por ativo:** Equipamento + Número do Chamado.
3. **Entrada principal:** bipar serial adiciona uma linha automaticamente; com
   fallback de adição manual via seletor para quem não usa scanner.
4. **Erro parcial:** salva os termos válidos, avisa quais falharam (não é
   transação tudo-ou-nada).
5. **PDF:** um único arquivo com todos os termos gerados, cada termo numa folha
   separada (`page-break`).

## Estado atual (referência)

`src/pages/NewTerm.tsx` é um form único controlado por `useState`:
- `equipmentId`, `collaboratorName`, `sectorName`, `analystId`, `ticketNumber`.
- `createMutation` faz 1 `insert` em `responsibility_terms`, atualiza o `sector`
  do equipamento, grava audit log, e navega para `/termos`.
- Autocomplete de colaborador (`useCollaborators`) e setor; aviso de
  equipamentos já em posse do colaborador; pré-preenchimento de setor.

`src/components/TermPreviewDialog.tsx` contém `buildDocumentHtml(term, logoUrl, lang)`
que monta o HTML completo de **um** termo e imprime via `window.open` +
`window.print()`. Não existe biblioteca de PDF — o "PDF" é a impressão do
navegador (salvar como PDF).

## Arquitetura da solução

### 1. Estado da tela (`NewTerm.tsx`)

Compartilhado (inalterado): `collaboratorName`, `sectorName`, `analystId`.

Novo — lista de ativos:
```ts
interface AssetRow {
  id: string;            // uuid local (crypto.randomUUID) para key/remover
  equipmentId: string;   // equipamento selecionado
  ticketNumber: string;  // chamado próprio
}
const [assets, setAssets] = useState<AssetRow[]>([]);
```
Removidos do uso single: `equipmentId` e `ticketNumber` de nível superior passam
a viver dentro de cada `AssetRow`. `serialSearch` continua, mas agora **adiciona
linha** em vez de selecionar 1 equipamento.

### 2. Bipar serial

- Input "Bipar serial" + Enter (ou match exato ao digitar, como hoje).
- Busca em `equipment` disponível por `serial_number` (case-insensitive).
  - Achou e ainda não está em `assets` → adiciona `AssetRow` com `equipmentId`
    preenchido e `ticketNumber` vazio. Limpa o input. Toast "Equipamento
    adicionado".
  - Achou mas já está na lista → toast "Já adicionado", não duplica.
  - Não achou → toast "Serial não encontrado".
- **Fallback manual:** botão "+ Adicionar manual" abre o seletor existente
  (filtro de tipo + lista de equipamentos disponíveis); ao escolher, adiciona uma
  `AssetRow`.

### 3. Lista de ativos (render)

Para cada `AssetRow`:
- Descrição do equipamento (marca, modelo, SN, patrimônio) — read-only.
- Input "Número do Chamado" controlado, escreve em `assets[i].ticketNumber`.
- Botão "✕ remover" → tira a linha de `assets`.

Equipamentos já presentes em `assets` são filtrados da lista de disponíveis (do
seletor manual e ignorados no bipar duplicado). A reserva é só na tela; o banco
só é tocado no momento de gerar.

### 4. Geração (mutation)

Validação para habilitar o botão "Gerar N termos":
- `collaboratorName`, `sectorName`, `analystId` preenchidos;
- `assets.length > 0`;
- todo `AssetRow` com `ticketNumber` não-vazio.

`createMutation` passa a iterar sobre `assets`. Para cada linha, executa a mesma
lógica de hoje (insert do termo + update do `sector` do equipamento + audit log).
Acumula resultados:
```ts
const created: Term[] = [];
const failed: { description: string; reason: string }[] = [];
for (const row of assets) {
  try {
    const term = await insertTerm(row, shared);
    await syncEquipmentSector(row, sector);
    await logAudit(...);
    created.push(term);
  } catch (e) {
    failed.push({ description: equipName(row), reason: messageOf(e) });
  }
}
```
- Inserts são sequenciais (loop `await`), não transacionais — erro de uma linha
  não derruba as outras.

### 5. Resultado

- `created.length > 0` → abre o PDF (ver seção 6) com os termos criados.
- `failed.length === 0` → toast "N termos criados", `invalidateQueries`
  (`terms-all`, `equipment-available`, `equipment`, `collaborators`), navega
  `/termos`.
- `failed.length > 0` → toast destrutivo listando as falhas
  (ex.: "Notebook Dell — chamado duplicado"); **não navega**; mantém em `assets`
  apenas as linhas que falharam para o usuário corrigir e tentar de novo.
- `created.length === 0` (tudo falhou) → toast de erro, mantém a tela.

### 6. PDF único (refator de `TermPreviewDialog`)

Extrair a montagem de HTML para um módulo compartilhado
`src/lib/termDocument.ts`:
- `buildTermBody(term, lang): string` — o conteúdo interno de um termo
  (header + seções + assinaturas + footer) dentro de `<div class="term-page">`.
- `buildTermsDocumentHtml(terms[], logoUrl, lang): string` — documento completo:
  um `<style>` compartilhado (movido de `TermPreviewDialog`) + um `.term-page`
  por termo. CSS:
  ```css
  .term-page { page-break-after: always; }
  .term-page:last-child { page-break-after: auto; }
  ```
- `openPrintWindow(html: string)` — helper com a lógica de `window.open` +
  `document.write` + `onload`/`setTimeout(print)`.

`TermPreviewDialog.handlePrint` passa a chamar
`buildTermsDocumentHtml([term], ...)` — comportamento visual idêntico ao de hoje.

`NewTerm`, no sucesso, chama `buildTermsDocumentHtml(created, logoUrl, lang)` +
`openPrintWindow(...)` → o navegador gera **1 PDF, cada termo numa folha**.

## Escopo / fora de escopo

- **Sem mudança de banco.** N inserts na `responsibility_terms`, idênticos ao
  insert atual. Sem RPC, sem migration.
- **Sem biblioteca de PDF nova.** Continua impressão do navegador.
- Analista único por lote (decisão 1). Analista por ativo fica fora.
- O fluxo de assinatura por token de cada termo é inalterado — cada termo gerado
  é independente, como hoje.

## Estratégia de teste

- **Unit (`termDocument.ts`):** `buildTermsDocumentHtml` com 1 termo (sem
  `page-break` no único `.term-page`), com N termos (N-1 quebras), e que o texto
  de cada termo (descrição, chamado, colaborador) aparece no HTML.
- **Unit (lógica de assets):** adicionar por serial (achou / não achou /
  duplicado), remover linha, filtro de disponíveis, validação de habilitar
  geração (chamado vazio bloqueia).
- **Manual/E2E:** bipar 3 seriais → preencher 3 chamados → gerar → confirmar 3
  termos em `/termos` e PDF com 3 folhas; simular chamado duplicado em 1 ativo →
  confirmar que os outros 2 são criados e a falha é avisada.

## Riscos

- **Pop-up bloqueado:** `window.open` pode ser bloqueado pelo navegador. Já é um
  risco do fluxo atual; manter o mesmo comportamento (a impressão de hoje já
  depende disso).
- **Detecção de duplicata de chamado:** a "razão" da falha depende da mensagem de
  erro do Supabase/constraint. Mapear erro para texto amigável; se não houver
  constraint de unicidade hoje, a falha por duplicata pode não ocorrer — o
  tratamento de erro parcial continua válido para qualquer erro de insert.
