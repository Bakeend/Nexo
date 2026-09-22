import { createChecklistItem, parseNoteBlocks, serializeNoteBlocks } from '@/utils/note-blocks';

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
});
