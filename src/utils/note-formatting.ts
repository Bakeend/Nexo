import type { NoteTextMark, NoteTextStyle } from '@/types/domain';

const styles: NoteTextStyle[] = ['bold', 'italic', 'underline', 'strike'];

function marksForCharacters(text: string, marks: NoteTextMark[] = []): NoteTextStyle[][] {
  const characters = Array.from({ length: text.length }, () => [] as NoteTextStyle[]);
  for (const mark of Array.isArray(marks) ? marks : []) {
    if (!mark || !Array.isArray(mark.styles) || !Number.isInteger(mark.start) || !Number.isInteger(mark.end)) continue;
    const validStyles = mark.styles.filter((style): style is NoteTextStyle => styles.includes(style));
    for (let index = Math.max(0, mark.start); index < Math.min(text.length, mark.end); index += 1) {
      characters[index] = [...new Set([...characters[index], ...validStyles])];
    }
  }
  return characters;
}

function marksFromCharacters(characters: NoteTextStyle[][]): NoteTextMark[] {
  const marks: NoteTextMark[] = [];
  let start = 0;
  while (start < characters.length) {
    const active = styles.filter((style) => characters[start].includes(style));
    let end = start + 1;
    while (end < characters.length && styles.every((style) => characters[end].includes(style) === active.includes(style))) end += 1;
    if (active.length) marks.push({ start, end, styles: active });
    start = end;
  }
  return marks;
}

export function toggleTextStyle(
  text: string,
  marks: NoteTextMark[] | undefined,
  selection: { start: number; end: number },
  style: NoteTextStyle,
) {
  const characters = marksForCharacters(text, marks);
  const start = selection.start === selection.end ? 0 : Math.max(0, Math.min(selection.start, text.length));
  const end = selection.start === selection.end ? text.length : Math.max(start, Math.min(selection.end, text.length));
  if (start === end) return marks || [];
  const remove = characters.slice(start, end).every((active) => active.includes(style));
  for (let index = start; index < end; index += 1) {
    characters[index] = remove ? characters[index].filter((item) => item !== style) : [...new Set([...characters[index], style])];
  }
  return marksFromCharacters(characters);
}

export function updateTextMarks(previous: string, next: string, marks: NoteTextMark[] | undefined): NoteTextMark[] {
  if (!marks?.length || previous === next) return marks || [];
  let prefix = 0;
  while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < previous.length - prefix &&
    suffix < next.length - prefix &&
    previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  )
    suffix += 1;
  const before = marksForCharacters(previous, marks);
  const insertedLength = next.length - prefix - suffix;
  const inherited = before[prefix] || before[prefix - 1] || [];
  const after = [
    ...before.slice(0, prefix),
    ...Array.from({ length: insertedLength }, () => [...inherited]),
    ...before.slice(previous.length - suffix),
  ];
  return marksFromCharacters(after);
}

export function getTextRuns(text: string, marks: NoteTextMark[] | undefined) {
  const characters = marksForCharacters(text, marks);
  const runs: { text: string; styles: NoteTextStyle[] }[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const active = styles.filter((style) => characters[index].includes(style));
    const last = runs[runs.length - 1];
    if (last && styles.every((style) => last.styles.includes(style) === active.includes(style))) last.text += text[index];
    else runs.push({ text: text[index], styles: active });
  }
  return runs;
}
