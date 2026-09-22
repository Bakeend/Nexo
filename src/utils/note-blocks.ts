import type { NoteBlock } from '@/types/domain';

export function createNoteBlockId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createChecklistItem(text = '') {
  return { id: createNoteBlockId(), text, checked: false };
}

export function parseNoteBlocks(content: string): NoteBlock[] {
  try {
    const parsed = JSON.parse(content) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return [{ type: 'text', text: content }];
    return parsed.flatMap((block) => {
      if (block.type === 'checklist') {
        if (Array.isArray(block.items)) {
          return [
            {
              type: 'checklist',
              items: block.items.map((item) => ({
                id: String(item.id || createNoteBlockId()),
                text: String(item.text || ''),
                checked: Boolean(item.checked),
              })),
            } satisfies NoteBlock,
          ];
        }
        const item = createChecklistItem(String(block.text || ''));
        item.checked = Boolean(block.checked);
        return [{ type: 'checklist', items: [item] } satisfies NoteBlock];
      }
      if (
        block.type === 'text' ||
        block.type === 'heading' ||
        block.type === 'bullet' ||
        block.type === 'link' ||
        block.type === 'image' ||
        block.type === 'file' ||
        block.type === 'audio'
      )
        return [block as NoteBlock];
      return [];
    });
  } catch {
    return [{ type: 'text', text: content }];
  }
}

export function serializeNoteBlocks(blocks: NoteBlock[]) {
  return JSON.stringify(blocks);
}
