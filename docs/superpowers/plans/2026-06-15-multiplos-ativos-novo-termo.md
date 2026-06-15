# Múltiplos Ativos no Novo Termo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir gerar termos de responsabilidade para vários ativos de um mesmo colaborador numa única tela, gerando N termos separados (um por chamado) e exportando todos num único PDF, um termo por folha.

**Architecture:** Extrair a lógica pura da lista de ativos para `src/lib/assetRows.ts` e a montagem de HTML/impressão para `src/lib/termDocument.ts` (testáveis isoladamente). `NewTerm.tsx` passa a manter uma lista de `AssetRow` (equipamento + chamado) sobre campos compartilhados (colaborador/setor/analista), e a mutation faz N inserts sequenciais com tolerância a falha parcial. `TermPreviewDialog.tsx` reusa `termDocument.ts` sem mudança visual.

**Tech Stack:** React 18 + TypeScript, Vite, TanStack React Query, Supabase JS, Vitest + Testing Library, shadcn/ui.

---

## File Structure

- **Create** `src/lib/assetRows.ts` — tipo `AssetRow` + funções puras: adicionar por serial, remover, filtrar disponíveis, validar geração.
- **Create** `src/lib/assetRows.test.ts` — testes unit das funções puras.
- **Create** `src/lib/termDocument.ts` — `buildTermBody`, `buildTermsDocumentHtml`, `openPrintWindow` (movidos/extraídos de `TermPreviewDialog`).
- **Create** `src/lib/termDocument.test.ts` — testes unit da montagem de HTML.
- **Modify** `src/components/TermPreviewDialog.tsx` — passa a importar de `termDocument.ts`; remove `buildDocumentHtml` local.
- **Modify** `src/pages/NewTerm.tsx` — UI de lista de ativos + mutation multi-insert + PDF no sucesso.

---

## Task 1: Lógica pura da lista de ativos (`assetRows.ts`)

**Files:**
- Create: `src/lib/assetRows.ts`
- Test: `src/lib/assetRows.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/assetRows.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  addBySerial,
  removeAsset,
  availableEquipment,
  canGenerate,
  type AssetRow,
} from './assetRows';

const equipment = [
  { id: 'e1', serial_number: 'SN123', type: 'Notebook', brand: 'Dell', model: 'Latitude' },
  { id: 'e2', serial_number: 'SN456', type: 'Monitor', brand: 'LG', model: '24"' },
];

describe('addBySerial', () => {
  it('adds a row when serial matches (case-insensitive)', () => {
    const r = addBySerial([], equipment, 'sn123');
    expect(r.status).toBe('added');
    expect(r.assets).toHaveLength(1);
    expect(r.assets[0].equipmentId).toBe('e1');
    expect(r.assets[0].ticketNumber).toBe('');
  });

  it('returns notfound when serial does not match', () => {
    const r = addBySerial([], equipment, 'XXX');
    expect(r.status).toBe('notfound');
    expect(r.assets).toHaveLength(0);
  });

  it('returns duplicate when equipment already in list', () => {
    const first = addBySerial([], equipment, 'SN123').assets;
    const r = addBySerial(first, equipment, 'SN123');
    expect(r.status).toBe('duplicate');
    expect(r.assets).toHaveLength(1);
  });
});

describe('removeAsset', () => {
  it('removes the row with the given id', () => {
    const rows: AssetRow[] = [
      { id: 'a1', equipmentId: 'e1', ticketNumber: '' },
      { id: 'a2', equipmentId: 'e2', ticketNumber: '' },
    ];
    expect(removeAsset(rows, 'a1')).toEqual([{ id: 'a2', equipmentId: 'e2', ticketNumber: '' }]);
  });
});

describe('availableEquipment', () => {
  it('hides equipment already used and applies type filter', () => {
    const rows: AssetRow[] = [{ id: 'a1', equipmentId: 'e1', ticketNumber: '' }];
    expect(availableEquipment(equipment, rows, 'all').map(e => e.id)).toEqual(['e2']);
    expect(availableEquipment(equipment, [], 'Monitor').map(e => e.id)).toEqual(['e2']);
  });
});

describe('canGenerate', () => {
  const shared = { collaboratorName: 'João', sectorName: 'TI', analystId: 'an1' };
  it('false when shared fields missing', () => {
    expect(canGenerate({ ...shared, collaboratorName: '' }, [
      { id: 'a1', equipmentId: 'e1', ticketNumber: 'INC-1' },
    ])).toBe(false);
  });
  it('false when no assets', () => {
    expect(canGenerate(shared, [])).toBe(false);
  });
  it('false when any ticket is empty', () => {
    expect(canGenerate(shared, [
      { id: 'a1', equipmentId: 'e1', ticketNumber: 'INC-1' },
      { id: 'a2', equipmentId: 'e2', ticketNumber: '  ' },
    ])).toBe(false);
  });
  it('true when all valid', () => {
    expect(canGenerate(shared, [
      { id: 'a1', equipmentId: 'e1', ticketNumber: 'INC-1' },
    ])).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/assetRows.test.ts`
Expected: FAIL — "Failed to resolve import './assetRows'".

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/assetRows.ts`:

```ts
export interface AssetRow {
  id: string;
  equipmentId: string;
  ticketNumber: string;
}

interface EquipmentLike {
  id: string;
  serial_number: string;
  type: string;
}

export interface SharedFields {
  collaboratorName: string;
  sectorName: string;
  analystId: string;
}

export type AddStatus = 'added' | 'notfound' | 'duplicate';

export function addBySerial<T extends EquipmentLike>(
  assets: AssetRow[],
  equipment: T[],
  serial: string,
): { assets: AssetRow[]; status: AddStatus } {
  const needle = serial.trim().toLowerCase();
  if (!needle) return { assets, status: 'notfound' };
  const match = equipment.find(e => e.serial_number.toLowerCase() === needle);
  if (!match) return { assets, status: 'notfound' };
  if (assets.some(a => a.equipmentId === match.id)) return { assets, status: 'duplicate' };
  const row: AssetRow = { id: crypto.randomUUID(), equipmentId: match.id, ticketNumber: '' };
  return { assets: [...assets, row], status: 'added' };
}

export function removeAsset(assets: AssetRow[], id: string): AssetRow[] {
  return assets.filter(a => a.id !== id);
}

export function availableEquipment<T extends EquipmentLike>(
  equipment: T[],
  assets: AssetRow[],
  typeFilter: string,
): T[] {
  const used = new Set(assets.map(a => a.equipmentId));
  return equipment.filter(e => !used.has(e.id) && (typeFilter === 'all' || e.type === typeFilter));
}

export function canGenerate(shared: SharedFields, assets: AssetRow[]): boolean {
  if (!shared.collaboratorName.trim() || !shared.sectorName.trim() || !shared.analystId) return false;
  if (assets.length === 0) return false;
  return assets.every(a => a.ticketNumber.trim().length > 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/assetRows.test.ts`
Expected: PASS (all assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/assetRows.ts src/lib/assetRows.test.ts
git commit -m "feat: pure helpers for multi-asset rows in new term"
```

---

## Task 2: Montagem de documento e impressão (`termDocument.ts`)

**Files:**
- Create: `src/lib/termDocument.ts`
- Test: `src/lib/termDocument.test.ts`
- Reference: `src/components/TermPreviewDialog.tsx:15-89` (HTML atual a extrair)

- [ ] **Step 1: Write the failing test**

Create `src/lib/termDocument.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildTermsDocumentHtml } from './termDocument';

const term = (over: Partial<Record<string, unknown>> = {}) => ({
  created_at: '2026-06-15T12:00:00Z',
  equipment_description: 'Dell Latitude (Notebook)',
  serial_number: 'SN123',
  patrimony: 'PAT-9',
  collaborator_name: 'João Silva',
  analyst_name: 'Maria',
  ticket_number: 'INC-101',
  term_text: 'Texto do termo.',
  ...over,
});

describe('buildTermsDocumentHtml', () => {
  it('renders the content of a single term', () => {
    const html = buildTermsDocumentHtml([term()], '', 'pt');
    expect(html).toContain('Dell Latitude (Notebook)');
    expect(html).toContain('INC-101');
    expect(html).toContain('João Silva');
    expect(html).toContain('class="term-page"');
  });

  it('single term has no forced page break (last-child rule)', () => {
    const html = buildTermsDocumentHtml([term()], '', 'pt');
    expect(html).toContain('.term-page:last-child { page-break-after: auto; }');
    expect((html.match(/class="term-page"/g) || []).length).toBe(1);
  });

  it('renders one term-page per term for multiple terms', () => {
    const html = buildTermsDocumentHtml(
      [term({ ticket_number: 'INC-1' }), term({ ticket_number: 'INC-2' }), term({ ticket_number: 'INC-3' })],
      '',
      'pt',
    );
    expect((html.match(/class="term-page"/g) || []).length).toBe(3);
    expect(html).toContain('INC-1');
    expect(html).toContain('INC-2');
    expect(html).toContain('INC-3');
  });

  it('includes the logo img only when logoUrl is provided', () => {
    expect(buildTermsDocumentHtml([term()], 'http://logo.png', 'pt')).toContain('<img src="http://logo.png"');
    expect(buildTermsDocumentHtml([term()], '', 'pt')).not.toContain('<img');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/termDocument.test.ts`
Expected: FAIL — "Failed to resolve import './termDocument'".

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/termDocument.ts` (estilo movido de `TermPreviewDialog`, com `.term-page` e regra de quebra adicionados):

```ts
import { format } from 'date-fns';
import { t, type Language } from '@/lib/i18n';

const STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; line-height: 1.5; }
  .term-page { padding: 48px 56px; max-width: 210mm; margin: 0 auto; page-break-after: always; }
  .term-page:last-child { page-break-after: auto; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1565C0; padding-bottom: 16px; margin-bottom: 32px; }
  .header-logo img { max-height: 60px; max-width: 180px; }
  .header-title { text-align: right; }
  .header-title h1 { font-size: 18px; font-weight: 700; color: #1565C0; letter-spacing: 1px; }
  .header-title .date { font-size: 11px; color: #666; margin-top: 4px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1565C0; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin-bottom: 12px; }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .field { display: flex; gap: 6px; font-size: 13px; }
  .field-label { font-weight: 600; color: #333; white-space: nowrap; }
  .field-value { color: #555; }
  .term-text { font-size: 13px; text-align: justify; line-height: 1.8; color: #333; background: #f8f9fa; border-left: 3px solid #1565C0; padding: 16px 20px; border-radius: 0 4px 4px 0; white-space: pre-line; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 60px; }
  .sig-block { text-align: center; }
  .sig-line { border-top: 1px solid #333; margin: 0 16px; padding-top: 8px; }
  .sig-role { font-size: 12px; color: #333; font-weight: 600; }
  .sig-note { font-size: 10px; color: #999; margin-top: 2px; }
  .footer { margin-top: 48px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #e0e0e0; padding-top: 8px; }
  @media print { .term-page { padding: 24px 32px; } }
`;

export function buildTermBody(term: any, logoUrl: string, lang: Language): string {
  return `<div class="term-page">
    <div class="header">
      <div class="header-logo">${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ''}</div>
      <div class="header-title">
        <h1>${t(lang, 'term_title')}</h1>
        <div class="date">${t(lang, 'term_date')}: ${format(new Date(term.created_at), 'dd/MM/yyyy')}</div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">${t(lang, 'term_equipment')}</div>
      <div class="fields">
        <div class="field"><span class="field-label">${t(lang, 'term_equipment')}:</span> <span class="field-value">${term.equipment_description}</span></div>
        <div class="field"><span class="field-label">${t(lang, 'term_serial')}:</span> <span class="field-value">${term.serial_number}</span></div>
        ${term.patrimony ? `<div class="field"><span class="field-label">${t(lang, 'term_patrimony')}:</span> <span class="field-value">${term.patrimony}</span></div>` : ''}
      </div>
    </div>
    <div class="section">
      <div class="section-title">${t(lang, 'term_collaborator')}</div>
      <div class="fields">
        <div class="field"><span class="field-label">${t(lang, 'term_collaborator')}:</span> <span class="field-value">${term.collaborator_name}</span></div>
        <div class="field"><span class="field-label">${t(lang, 'term_analyst')}:</span> <span class="field-value">${term.analyst_name}</span></div>
        <div class="field"><span class="field-label">${t(lang, 'term_ticket')}:</span> <span class="field-value">${term.ticket_number}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="term-text">${term.term_text}</div>
    </div>
    <div class="signatures">
      <div class="sig-block">
        <div style="min-height: 60px;"></div>
        <div class="sig-line">
          <div class="sig-role">${t(lang, 'term_collaborator_sig')}</div>
          <div class="sig-note">${term.collaborator_name}</div>
        </div>
      </div>
      <div class="sig-block">
        <div style="min-height: 60px;"></div>
        <div class="sig-line">
          <div class="sig-role">${t(lang, 'term_analyst_sig')}</div>
          <div class="sig-note">${term.analyst_name}</div>
        </div>
      </div>
    </div>
    <div class="footer">Documento gerado eletronicamente — ${t(lang, 'term_ticket')}: ${term.ticket_number}</div>
  </div>`;
}

export function buildTermsDocumentHtml(terms: any[], logoUrl: string, lang: Language): string {
  const bodies = terms.map(term => buildTermBody(term, logoUrl, lang)).join('\n');
  return `<html><head><title>${t(lang, 'term_title')}</title>
    <style>${STYLES}</style></head><body>${bodies}</body></html>`;
}

export function openPrintWindow(html: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 300);
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/termDocument.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/termDocument.ts src/lib/termDocument.test.ts
git commit -m "feat: extract term document builder with page-break per term"
```

---

## Task 3: Refatorar `TermPreviewDialog` para reusar `termDocument.ts`

**Files:**
- Modify: `src/components/TermPreviewDialog.tsx`

- [ ] **Step 1: Remove the local builder and import from termDocument**

Em `src/components/TermPreviewDialog.tsx`:

1. Apague toda a função `buildDocumentHtml` (linhas 15-89).
2. No topo, adicione o import:

```ts
import { buildTermsDocumentHtml, openPrintWindow } from '@/lib/termDocument';
```

3. Substitua o corpo de `handlePrint` por:

```ts
  const handlePrint = () => {
    openPrintWindow(buildTermsDocumentHtml([term], logoUrl, lang));
  };
```

Mantenha o import de `format`/`t` somente se ainda forem usados no restante do arquivo; se não, remova-os (o ESLint acusa imports não usados).

- [ ] **Step 2: Verify build/lint and existing render**

Run: `npm run lint && npm run build`
Expected: sem erros. O preview de um termo continua idêntico (mesmo HTML/estilo).

- [ ] **Step 3: Commit**

```bash
git add src/components/TermPreviewDialog.tsx
git commit -m "refactor: TermPreviewDialog uses shared termDocument builder"
```

---

## Task 4: UI de múltiplos ativos + mutation multi-insert + PDF (`NewTerm.tsx`)

**Files:**
- Modify: `src/pages/NewTerm.tsx`
- Reference: `src/lib/assetRows.ts`, `src/lib/termDocument.ts`

Esta task reescreve a parte de equipamento/chamado e a mutation. Os campos compartilhados (colaborador/setor/analista) e seus autocompletes permanecem como hoje.

- [ ] **Step 1: Trocar estado single por lista de ativos**

Em `NewTerm.tsx`, remova os estados `equipmentId` e `ticketNumber`. Adicione os imports e o estado da lista:

```ts
import { addBySerial, removeAsset, availableEquipment, canGenerate, type AssetRow } from '@/lib/assetRows';
import { buildTermsDocumentHtml, openPrintWindow } from '@/lib/termDocument';
import { X, Plus } from 'lucide-react';
```

```ts
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
```

Remova o estado `equipmentId`/`selectedEquipment` single. `serialSearch` continua.

- [ ] **Step 2: Bipar serial adiciona linha**

Substitua o handler do input de serial pela lógica de adicionar linha:

```ts
  const handleSerialEnter = () => {
    const { assets: next, status } = addBySerial(assets, equipment || [], serialSearch);
    if (status === 'added') {
      setAssets(next);
      setSerialSearch('');
      toast({ title: 'Equipamento adicionado' });
    } else if (status === 'duplicate') {
      toast({ title: 'Equipamento já adicionado', variant: 'destructive' });
    } else {
      toast({ title: 'Serial não encontrado', variant: 'destructive' });
    }
  };
```

No JSX do input de serial, dispare no Enter:

```tsx
  <Input
    value={serialSearch}
    onChange={(e) => setSerialSearch(e.target.value)}
    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSerialEnter(); } }}
    placeholder="Bipar / digitar serial e pressionar Enter..."
    className="pl-9 rounded-xl"
  />
```

- [ ] **Step 3: Seletor manual adiciona linha**

Substitua o bloco de filtro de tipo + select de equipamento por um seletor que adiciona à lista. Use `availableEquipment(equipment || [], assets, typeFilter)` na lista:

```tsx
  <div className="flex gap-2">
    <Select value={typeFilter} onValueChange={setTypeFilter}>
      <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Tipo" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os tipos</SelectItem>
        {types.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select
      value=""
      onValueChange={(id) => {
        if (assets.some(a => a.equipmentId === id)) return;
        setAssets([...assets, { id: crypto.randomUUID(), equipmentId: id, ticketNumber: '' }]);
      }}
    >
      <SelectTrigger className="flex-1 rounded-xl"><SelectValue placeholder="+ Adicionar equipamento manualmente" /></SelectTrigger>
      <SelectContent>
        {availableEquipment(equipment || [], assets, typeFilter).map(eq => (
          <SelectItem key={eq.id} value={eq.id}>{eq.brand} {eq.model} — SN: {eq.serial_number}</SelectItem>
        ))}
        {availableEquipment(equipment || [], assets, typeFilter).length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">Nenhum equipamento disponível</div>
        )}
      </SelectContent>
    </Select>
  </div>
```

- [ ] **Step 4: Renderizar a lista de ativos com chamado por linha**

Adicione abaixo do seletor (substituindo o antigo bloco `selectedEquipment`):

```tsx
  {assets.length > 0 && (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Ativos ({assets.length})
      </Label>
      <div className="space-y-2">
        {assets.map((row) => {
          const eq = equipment?.find(e => e.id === row.equipmentId);
          return (
            <div key={row.id} className="flex items-center gap-2 rounded-xl border bg-accent/30 p-3">
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-semibold truncate">{eq ? `${eq.brand} ${eq.model}` : 'Equipamento'}</p>
                <p className="text-xs text-muted-foreground truncate">SN: {eq?.serial_number}{eq?.patrimony ? ` — Pat: ${eq.patrimony}` : ''}</p>
              </div>
              <Input
                value={row.ticketNumber}
                onChange={(e) => setAssets(assets.map(a => a.id === row.id ? { ...a, ticketNumber: e.target.value } : a))}
                placeholder="Nº do chamado"
                className="w-40 rounded-xl"
              />
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg flex-shrink-0" onClick={() => setAssets(removeAsset(assets, row.id))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  )}
```

- [ ] **Step 5: Reescrever a mutation para N inserts com falha parcial + PDF**

Substitua `createMutation` por:

```ts
  const lang = (settings?.language || 'pt') as import('@/lib/i18n').Language;
  const logoUrl = settings?.company_logo_url || '';

  const createMutation = useMutation({
    mutationFn: async () => {
      const sector = sectorName.trim();
      const created: any[] = [];
      const failed: { description: string; reason: string }[] = [];

      for (const row of assets) {
        const eq = equipment?.find(e => e.id === row.equipmentId);
        if (!eq) { failed.push({ description: 'Equipamento removido', reason: 'não encontrado' }); continue; }
        const description = `${eq.brand} ${eq.model} (${eq.type})`;
        try {
          const { data: term, error } = await supabase.from('responsibility_terms').insert({
            equipment_id: eq.id,
            equipment_description: description,
            serial_number: eq.serial_number,
            patrimony: eq.patrimony,
            collaborator_name: collaboratorName,
            collaborator_sector: sector || null,
            analyst_id: analystId,
            analyst_name: selectedAnalyst?.name,
            ticket_number: row.ticketNumber.trim(),
            status: 'pendente' as const,
            term_text: settings?.term_text || 'Termo de responsabilidade.',
          }).select().single();
          if (error) throw error;

          if (sector) await supabase.from('equipment').update({ sector }).eq('id', eq.id);

          const { logAudit } = await import('@/lib/audit');
          await logAudit({ action: 'create', entity_type: 'term', entity_id: term?.id, description: `Termo criado para ${collaboratorName} (${eq.brand} ${eq.model})` });
          created.push(term);
        } catch (e) {
          failed.push({ description, reason: e instanceof Error ? e.message : 'erro ao salvar' });
        }
      }
      return { created, failed };
    },
    onSuccess: ({ created, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['terms-all'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-available'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });

      if (created.length > 0) {
        openPrintWindow(buildTermsDocumentHtml(created, logoUrl, lang));
      }

      if (failed.length === 0) {
        toast({ title: `${created.length} termo(s) criado(s) com sucesso!` });
        navigate('/termos');
      } else {
        const createdIds = new Set(created.map((t) => t.equipment_id));
        setAssets(prev => prev.filter(a => !createdIds.has(a.equipmentId)));
        toast({
          title: `${created.length} criado(s), ${failed.length} com falha`,
          description: failed.map(f => `${f.description}: ${f.reason}`).join(' · '),
          variant: 'destructive',
        });
      }
    },
    onError: () => toast({ title: 'Erro ao criar termos', variant: 'destructive' }),
  });
```

- [ ] **Step 6: Atualizar validação e botão de submit**

Substitua `missingFields`/`disabled` pela checagem de `canGenerate`:

```ts
  const ready = canGenerate({ collaboratorName, sectorName, analystId }, assets);
```

Botão:

```tsx
  {!ready && (
    <p className="text-xs text-muted-foreground text-center">
      Preencha colaborador, setor, analista e o chamado de cada ativo para continuar.
    </p>
  )}
  <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-md shadow-primary/20 text-sm" disabled={createMutation.isPending || !ready}>
    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
    Gerar {assets.length > 0 ? `${assets.length} ` : ''}Termo(s) de Responsabilidade
  </Button>
```

Remova referências remanescentes a `selectedEquipment`, `missingFields`, `equipmentId`, `ticketNumber` (o ESLint/TS acusam). O bloco antigo "Detalhes do equipamento" (linhas 201-214 originais) foi substituído pela lista de ativos.

- [ ] **Step 7: Verificar lint, build e testes**

Run: `npm run lint && npm run build && npm run test`
Expected: sem erros; testes de Task 1 e 2 passam.

- [ ] **Step 8: Verificação manual**

Run: `npm run dev` (porta 8080). No `/termos/novo`:
1. Selecione colaborador, setor, analista.
2. Bipe/digite um serial válido + Enter → vira linha. Repita com 2 outros (ou use "+ Adicionar manualmente").
3. Preencha o chamado de cada linha.
4. Clique "Gerar 3 Termo(s)" → abre 1 PDF (janela de impressão) com 3 folhas; em `/termos` aparecem 3 termos.
5. Repita forçando 1 chamado duplicado (se houver constraint) → confirme que os válidos são criados e a falha é avisada, com a linha que falhou permanecendo na tela.

- [ ] **Step 9: Commit**

```bash
git add src/pages/NewTerm.tsx
git commit -m "feat: gerar múltiplos termos por ativo numa tela com PDF único"
```

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** campos compartilhados/por-ativo (Task 4 steps 1-4); bipar serial + manual (steps 2-3); chamado por linha (step 4); N inserts com falha parcial (step 5); validação de geração (steps 1/6); PDF único com page-break (Task 2 + step 5); refator de TermPreviewDialog (Task 3); sem mudança de banco (nenhuma migration no plano). ✔
- **Placeholders:** nenhum "TBD/TODO"; todo passo de código mostra o código. ✔
- **Consistência de tipos:** `AssetRow { id, equipmentId, ticketNumber }`, `SharedFields { collaboratorName, sectorName, analystId }`, `addBySerial/removeAsset/availableEquipment/canGenerate` usados com as mesmas assinaturas em Task 1 e Task 4; `buildTermsDocumentHtml(terms, logoUrl, lang)`/`openPrintWindow(html)` idênticos em Task 2/3/4. ✔
- **Risco conhecido:** mensagem de falha depende do erro do Supabase; se não houver constraint de unicidade de chamado, a falha por duplicata simplesmente não ocorre — o tratamento parcial cobre qualquer erro de insert.
