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
