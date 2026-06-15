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
