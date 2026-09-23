import { createLikeSearchPattern, dedupeSearchMatches } from '@/features/search/search-helpers';

describe('search helpers', () => {
  it('escapes SQL LIKE wildcards and the escape character in a literal substring query', () => {
    expect(createLikeSearchPattern('  50%_\\off  ')).toBe('%50\\%\\_\\\\off%');
  });

  it('deduplicates repeated matches by item type and id while preserving the first result', () => {
    const first = { id: '1', type: 'note', title: 'First' };
    expect(dedupeSearchMatches([first, { ...first, title: 'Duplicate' }, { id: '1', type: 'task', title: 'Task' }])).toEqual([
      first,
      { id: '1', type: 'task', title: 'Task' },
    ]);
  });
});
