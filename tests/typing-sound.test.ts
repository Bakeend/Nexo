import { isSingleTypedCharacter } from '@/utils/typing-sound';

describe('optional typing sound', () => {
  it('plays for one typed character, including accents and emoji', () => {
    expect(isSingleTypedCharacter('nota', 'notas')).toBe(true);
    expect(isSingleTypedCharacter('olá', 'olá!')).toBe(true);
    expect(isSingleTypedCharacter('a', 'a🙂')).toBe(true);
  });

  it('stays silent for paste, deletion and unchanged text', () => {
    expect(isSingleTypedCharacter('', 'texto colado')).toBe(false);
    expect(isSingleTypedCharacter('texto', 'text')).toBe(false);
    expect(isSingleTypedCharacter('texto', 'texto')).toBe(false);
  });
});
