type NoteBlockListener = (noteId: string) => void;

const listeners = new Set<NoteBlockListener>();

export function subscribeToNoteBlockChanges(listener: NoteBlockListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishNoteBlockChange(noteId: string) {
  listeners.forEach((listener) => listener(noteId));
}
