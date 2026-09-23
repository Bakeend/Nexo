import { createChecklistItem, noteBlocksToPlainText, parseNoteBlocks, serializeNoteBlocks } from '@/utils/note-blocks';

describe('note blocks', () => {
  it('migrates the legacy single checklist item format', () => {
    const blocks = parseNoteBlocks(JSON.stringify([{ type: 'checklist', text: 'Comprar SSD', checked: true }]));

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'checklist', items: [{ text: 'Comprar SSD', checked: true }] });
  });

  it('round trips checklist items and attachment blocks', () => {
    const blocks = [
      { type: 'checklist' as const, items: [createChecklistItem('Revisar HTTP')] },
      { type: 'image' as const, attachmentId: 'attachment-1', label: 'quadro.jpg' },
    ];

    expect(parseNoteBlocks(serializeNoteBlocks(blocks))).toEqual(blocks);
  });

  it('keeps plain text notes readable when content is not JSON', () => {
    expect(parseNoteBlocks('Uma nota antiga')).toEqual([{ type: 'text', text: 'Uma nota antiga' }]);
  });

  it('copies readable note content into a task description', () => {
    const blocks = parseNoteBlocks(
      serializeNoteBlocks([
        { type: 'heading', level: 1, text: 'Planejamento' },
        { type: 'checklist', items: [createChecklistItem('Comprar SSD'), createChecklistItem('Revisar orçamento')] },
        { type: 'link', text: 'Referência', url: 'https://example.com' },
        { type: 'image', attachmentId: 'attachment-1', label: 'quadro.jpg' },
      ]),
    );

    expect(noteBlocksToPlainText(blocks)).toBe(
      'Planejamento\n\nComprar SSD\n\nRevisar orçamento\n\nReferência https://example.com\n\nquadro.jpg',
    );
  });

  it('preserves formatting when a note is saved and reopened', () => {
    const blocks = [{ type: 'text' as const, text: 'Olá mundo', marks: [{ start: 4, end: 9, styles: ['bold' as const] }] }];
    expect(parseNoteBlocks(serializeNoteBlocks(blocks))).toEqual(blocks);
  });
});
