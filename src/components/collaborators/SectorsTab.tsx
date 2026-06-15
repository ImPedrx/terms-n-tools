import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Building2, Eye, Users, ChevronRight } from 'lucide-react';
import { useCollaborators, normalizeName, type Collaborator } from '@/hooks/useCollaborators';
import { CollaboratorDetailDialog } from './CollaboratorDetailDialog';

interface SectorGroup {
  name: string;            // Display name ("Sem setor" para nulos)
  isNull: boolean;
  collaborators: Collaborator[];
  equipmentCount: number;
}

function groupBySector(collaborators: Collaborator[]): SectorGroup[] {
  const map = new Map<string, SectorGroup>();
  for (const c of collaborators) {
    const key = c.sector?.trim() || '__null__';
    let g = map.get(key);
    if (!g) {
      g = {
        name: c.sector?.trim() || 'Sem setor',
        isNull: !c.sector?.trim(),
        collaborators: [],
        equipmentCount: 0,
      };
      map.set(key, g);
    }
    g.collaborators.push(c);
    g.equipmentCount += c.equipmentCount;
  }
  return [...map.values()].sort((a, b) => {
    if (a.isNull) return 1;
    if (b.isNull) return -1;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

export function SectorsTab() {
  const { data: collaborators = [], isLoading } = useCollaborators();
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<SectorGroup | null>(null);
  const [drilldown, setDrilldown] = useState<Collaborator | null>(null);

  const sectors = useMemo(() => groupBySector(collaborators), [collaborators]);

  const filtered = useMemo(() => {
    const q = normalizeName(search);
    if (!q) return sectors;
    return sectors.filter((s) => normalizeName(s.name).includes(q));
  }, [sectors, search]);

  return (
    <div className="space-y-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input placeholder="Buscar setor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl bg-card" />
      </div>

      <p className="text-xs text-muted-foreground font-medium">
        {filtered.length} setor{filtered.length !== 1 ? 'es' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>

      <div className="pro-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setor</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colaboradores</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Equipamentos em posse</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm">Carregando...</span>
                </div>
              </TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Building2 className="h-10 w-10 text-muted-foreground/20" />
                  <span className="text-sm font-medium">Nenhum setor encontrado</span>
                </div>
              </TableCell></TableRow>
            ) : filtered.map((s, i) => (
              <TableRow key={s.name + i} className={i % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={`font-medium text-sm ${s.isNull ? 'italic text-muted-foreground' : ''}`}>{s.name}</span>
                  </div>
                </TableCell>
                <TableCell><Badge variant="secondary" className="text-[11px] font-semibold">{s.collaborators.length}</Badge></TableCell>
                <TableCell><Badge variant="outline" className="text-[11px] font-semibold">{s.equipmentCount}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setViewing(s)} title="Ver colaboradores" className="h-8 w-8 rounded-lg hover:bg-primary/10">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Lista de colaboradores do setor */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className={viewing.isNull ? 'italic text-muted-foreground' : ''}>{viewing.name}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Colaboradores ({viewing.collaborators.length})
                </h3>
                <div className="rounded-xl border divide-y">
                  {viewing.collaborators.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setDrilldown(c)}
                      className="w-full flex items-center justify-between gap-3 p-3 text-sm text-left hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.equipmentCount} equip. · {c.termCount} termo{c.termCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Detalhe do colaborador empilhado sobre o de setor */}
      {drilldown && (
        <CollaboratorDetailDialog collaborator={drilldown} all={collaborators} onClose={() => setDrilldown(null)} />
      )}
    </div>
  );
}
