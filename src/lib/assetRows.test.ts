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
