import { getTextRuns, toggleTextStyle, updateTextMarks } from '@/utils/note-formatting';

describe('note text formatting', () => {
  it('formats a selected word and combines styles without changing the rest', () => {
    const bold = toggleTextStyle('uma palavra aqui', [], { start: 4, end: 11 }, 'bold');
    const combined = toggleTextStyle('uma palavra aqui', bold, { start: 4, end: 11 }, 'italic');

    expect(getTextRuns('uma palavra aqui', combined)).toEqual([
      { text: 'uma ', styles: [] },
      { text: 'palavra', styles: ['bold', 'italic'] },
      { text: ' aqui', styles: [] },
    ]);
    expect(toggleTextStyle('uma palavra aqui', combined, { start: 4, end: 11 }, 'bold')).toEqual([
      { start: 4, end: 11, styles: ['italic'] },
    ]);
  });

  it('formats the entire block when no text is selected', () => {
    expect(toggleTextStyle('nota', [], { start: 2, end: 2 }, 'underline')).toEqual([{ start: 0, end: 4, styles: ['underline'] }]);
  });

  it('keeps formatting in the right place after text is inserted or removed', () => {
    const marks = [{ start: 4, end: 8, styles: ['bold' as const] }];
    expect(updateTextMarks('abc defg', 'abc XYZdefg', marks)).toEqual([{ start: 4, end: 11, styles: ['bold'] }]);
    expect(updateTextMarks('abc defg', 'abc fg', marks)).toEqual([{ start: 4, end: 6, styles: ['bold'] }]);
  });
});
