export type ItemType = 'note' | 'task' | 'reminder' | 'file' | 'image' | 'audio' | 'quick_capture';
export type Priority = 'none' | 'low' | 'medium' | 'high';
export type NotificationStatus = 'not_scheduled' | 'scheduled' | 'delivered' | 'cancelled' | 'permission_denied' | 'error';

export type RepeatRule =
  | { type: 'daily'; interval: number }
  | { type: 'weekly'; interval: number; daysOfWeek: number[] }
  | { type: 'monthly'; interval: number; dayOfMonth: number }
  | { type: 'yearly'; interval: number; month: number; day: number }
  | { type: 'custom'; interval: number; unit: 'day' | 'week' | 'month'; daysOfWeek?: number[] }
  | null;

export type NoteTextStyle = 'bold' | 'italic' | 'underline' | 'strike';
export type NoteTextMark = { start: number; end: number; styles: NoteTextStyle[] };

export type NoteBlock =
  | { type: 'text'; text: string; marks?: NoteTextMark[] }
  | { type: 'heading'; level: 1 | 2; text: string; marks?: NoteTextMark[] }
  | { type: 'checklist'; items: { id: string; text: string; checked: boolean }[] }
  | { type: 'bullet'; text: string; marks?: NoteTextMark[] }
  | { type: 'link'; text: string; url: string }
  | { type: 'image' | 'file' | 'audio'; attachmentId: string; label?: string };

export type Note = {
  id: string;
  title: string | null;
  content: string;
  contentFormat: 'blocks-v1';
  spaceId: string | null;
  pinned: boolean;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  timezone: string | null;
  priority: Priority;
  completedAt: string | null;
  repeatRule: RepeatRule;
  parentSeriesId: string | null;
  spaceId: string | null;
  relatedNoteId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type Reminder = {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  timezone: string;
  repeatRule: RepeatRule;
  enabled: boolean;
  completedAt: string | null;
  snoozedUntil: string | null;
  notificationId: string | null;
  notificationStatus: NotificationStatus;
  relatedItemId: string | null;
  relatedItemType: 'note' | 'task' | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type Space = {
  id: string;
  name: string;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};
export type Tag = { id: string; name: string; createdAt: string; updatedAt: string };
export type Attachment = {
  id: string;
  itemId: string;
  itemType: ItemType;
  type: 'image' | 'audio' | 'file';
  originalName: string | null;
  localPath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  thumbnailPath: string | null;
  durationMs: number | null;
  createdAt: string;
  deletedAt: string | null;
};
export type InboxItem = {
  id: string;
  itemId: string;
  itemType: ItemType;
  rawText: string | null;
  createdAt: string;
  organizedAt: string | null;
  deletedAt: string | null;
};

export type UnifiedItem = {
  id: string;
  type: ItemType;
  title: string;
  subtitle: string;
  date: string | null;
  spaceName: string | null;
  pinned: boolean;
  source: Note | Task | Reminder | InboxItem;
};
