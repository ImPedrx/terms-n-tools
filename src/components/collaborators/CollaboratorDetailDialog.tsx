import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Pencil, Monitor, FileText, RotateCcw, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { EQUIPMENT_STATUS } from '@/lib/constants';
import type { Collaborator } from '@/hooks/useCollaborators';
import { RenameCollaboratorDialog } from './RenameCollaboratorDialog';
import { ReturnEquipmentDialog } from '@/components/ReturnEquipmentDialog';

const termStatusLabel: Record<string, string> = {
  pendente: 'Pendente',
  enviado_para_assinatura: 'Enviado',
  fechado: 'Fechado',
  cancelado: 'Cancelado',
};

interface Props {
  collaborator: Collaborator;
  all: Collaborator[];
  onClose: () => void;
}

export function CollaboratorDetailDialog({ collaborator, all, onClose }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [returningEquipment, setReturningEquipment] = useState<Collaborator['heldEquipment'][number] | null>(null);

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />{collaborator.displayName}
            </DialogTitle>
            {collaborator.sector && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Building2 className="h-3.5 w-3.5" />
                <span>Setor: <strong className="text-foreground/80">{collaborator.sector}</strong></span>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setRenaming(true)} className="rounded-xl gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Editar / Consolidar nome
              </Button>
            </div>

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" /> Equipamentos em posse ({collaborator.heldEquipment.length})
              </h3>
              {collaborator.heldEquipment.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nenhum equipamento atribuído a esta pessoa.</p>
              ) : (
                <div className="rounded-xl border divide-y">
                  {collaborator.heldEquipment.map((e) => {
                    const st = EQUIPMENT_STATUS.find((s) => s.value === e.status);
                    return (
                      <div key={e.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{e.brand} {e.model} <span className="text-muted-foreground font-normal">· {e.type}</span></p>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{e.serial_number}</code>
                        </div>
                        <Badge variant="secondary" className={`${st?.color} text-primary-foreground text-[11px] font-semibold flex-shrink-0`}>{st?.label}</Badge>
                        {e.status === 'entregue' && !e.is_legacy && (
                          <Button variant="outline" size="sm" onClick={() => setReturningEquipment(e)} className="rounded-lg gap-1.5 h-8 flex-shrink-0">
                            <RotateCcw className="h-3.5 w-3.5 text-warning" /> Devolver
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Termos ({collaborator.terms.length})
              </h3>
              {collaborator.terms.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nenhum termo gerado.</p>
              ) : (
                <div className="rounded-xl border divide-y">
                  {collaborator.terms.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{t.equipment_description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{t.ticket_number}</code>
                          <span>{format(new Date(t.created_at), 'dd/MM/yyyy')}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[11px] font-semibold flex-shrink-0">{termStatusLabel[t.status] || t.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {renaming && (
        <RenameCollaboratorDialog collaborator={collaborator} all={all} onClose={() => setRenaming(false)} />
      )}

      {returningEquipment && (
        <ReturnEquipmentDialog equipment={returningEquipment} onClose={() => setReturningEquipment(null)} />
      )}
    </>
  );
}
