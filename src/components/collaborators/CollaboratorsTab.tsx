import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Pencil, Eye } from 'lucide-react';
import { useCollaborators, normalizeName, type Collaborator } from '@/hooks/useCollaborators';
import { CollaboratorDetailDialog } from './CollaboratorDetailDialog';
import { RenameCollaboratorDialog } from './RenameCollaboratorDialog';

export function CollaboratorsTab() {
  const { data: collaborators = [], isLoading } = useCollaborators();
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Collaborator | null>(null);
  const [renaming, setRenaming] = useState<Collaborator | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeName(search);
    if (!q) return collaborators;
    return collaborators.filter((c) => c.key.includes(q) || (c.sector ? normalizeName(c.sector).includes(q) : false));
  }, [collaborators, search]);

  return (
    <div className="space-y-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input placeholder="Buscar colaborador ou setor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl bg-card" />
      </div>

      <p className="text-xs text-muted-foreground font-medium">
        {filtered.length} colaborador{filtered.length !== 1 ? 'es' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>

      <div className="pro-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colaborador</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setor</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Equipamentos em posse</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Termos</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm">Carregando...</span>
                </div>
              </TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Users className="h-10 w-10 text-muted-foreground/20" />
                  <span className="text-sm font-medium">Nenhum colaborador encontrado</span>
                </div>
              </TableCell></TableRow>
            ) : filtered.map((c, i) => (
              <TableRow key={c.key} className={i % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}>
                <TableCell className="font-medium text-sm">{c.displayName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.sector || '—'}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[11px] font-semibold">{c.equipmentCount}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[11px] font-semibold">{c.termCount}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" onClick={() => setDetail(c)} title="Ver detalhes" className="h-8 w-8 rounded-lg hover:bg-primary/10"><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setRenaming(c)} title="Editar / Consolidar nome" className="h-8 w-8 rounded-lg hover:bg-primary/10"><Pencil className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {detail && (
        <CollaboratorDetailDialog collaborator={detail} all={collaborators} onClose={() => setDetail(null)} />
      )}

      {renaming && (
        <RenameCollaboratorDialog collaborator={renaming} all={collaborators} onClose={() => setRenaming(null)} />
      )}
    </div>
  );
}
