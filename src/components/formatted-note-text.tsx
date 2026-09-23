import { Text, type StyleProp, type TextStyle } from 'react-native';
import type { NoteTextMark } from '@/types/domain';
import { getTextRuns } from '@/utils/note-formatting';

export function FormattedNoteText({ text, marks, style }: { text: string; marks?: NoteTextMark[]; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={style}>
      {getTextRuns(text, marks).map((run, index) => (
        <Text
          key={index}
          style={{
            fontWeight: run.styles.includes('bold') ? '700' : undefined,
            fontStyle: run.styles.includes('italic') ? 'italic' : undefined,
            textDecorationLine: run.styles.includes('underline')
              ? run.styles.includes('strike')
                ? 'underline line-through'
                : 'underline'
              : run.styles.includes('strike')
                ? 'line-through'
                : undefined,
          }}
        >
          {run.text}
        </Text>
      ))}
    </Text>
  );
}
