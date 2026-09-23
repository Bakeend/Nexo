import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Animated, Text } from 'react-native';
import { LongPressItem } from '@/components/long-press-item';

const mockSequenceCallbacks: Array<(result: { finished: boolean }) => void> = [];
const mockShowItemActions = jest.fn();
const mockPlayUISound = jest.fn();
const mockColors = { accent: '#4B6FF3', accentSoft: '#EAF0FF' };
let mockReducedMotion = false;

jest.mock('@/components/visual', () => ({
  useItemActions: () => ({ showItemActions: mockShowItemActions }),
}));

jest.mock('@/design/theme', () => ({
  useThemeColors: () => mockColors,
  useThemeStyles: (factory: (colors: typeof mockColors) => unknown) => factory(mockColors),
}));

jest.mock('@/motion/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}));

jest.mock('@/services/ui-sound-service', () => ({
  playUISound: (...args: Parameters<typeof mockPlayUISound>) => mockPlayUISound(...args),
}));

const createActions = () => [
  { label: 'Editar', onPress: jest.fn() },
  { label: 'Excluir', destructive: true, onPress: jest.fn() },
];

const finishedAnimation = () => ({
  start: (callback?: (result: { finished: boolean }) => void) => callback?.({ finished: true }),
  stop: jest.fn(),
  reset: jest.fn(),
});

async function renderItem(onPress = jest.fn()) {
  const actions = createActions();
  const selectedStyle = { backgroundColor: 'purple' };
  const result = await render(
    <LongPressItem title="A tarefa" actions={actions} onPress={onPress} selectedStyle={selectedStyle}>
      <Text>Conteúdo</Text>
    </LongPressItem>,
  );

  return { ...result, actions, onPress, selectedStyle };
}

function getSelectedStyle(item: ReturnType<typeof screen.getByRole>, selectedStyle: object) {
  const style = item.props.style;
  const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style;
  return Array.isArray(resolvedStyle) && resolvedStyle.includes(selectedStyle);
}

async function longPress(item: ReturnType<typeof screen.getByRole>) {
  await fireEvent(item, 'longPress');
}

beforeEach(() => {
  mockReducedMotion = false;
  mockSequenceCallbacks.length = 0;
  mockShowItemActions.mockReset();
  mockPlayUISound.mockReset();
  jest.spyOn(Animated, 'timing').mockImplementation(() => finishedAnimation() as ReturnType<typeof Animated.timing>);
  jest.spyOn(Animated, 'spring').mockImplementation(() => finishedAnimation() as ReturnType<typeof Animated.spring>);
  jest.spyOn(Animated, 'parallel').mockImplementation(() => finishedAnimation() as ReturnType<typeof Animated.parallel>);
  jest.spyOn(Animated, 'sequence').mockImplementation(
    () =>
      ({
        start: (callback?: (result: { finished: boolean }) => void) => {
          if (callback) mockSequenceCallbacks.push(callback);
        },
        stop: jest.fn(),
        reset: jest.fn(),
      }) as ReturnType<typeof Animated.sequence>,
  );
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

describe('LongPressItem', () => {
  it('keeps ordinary presses on the normal onPress path', async () => {
    const rendered = await renderItem();

    await fireEvent.press(rendered.getByRole('button', { name: 'A tarefa' }));

    expect(rendered.onPress).toHaveBeenCalledTimes(1);
    expect(mockShowItemActions).not.toHaveBeenCalled();
    expect(mockPlayUISound).not.toHaveBeenCalled();
  });

  it('opens the exact action sheet after the selection animation and resets selection on close', async () => {
    const rendered = await renderItem();
    const { actions, selectedStyle } = rendered;
    await longPress(rendered.getByRole('button', { name: 'A tarefa' }));

    expect(mockPlayUISound).not.toHaveBeenCalled();
    expect(mockShowItemActions).not.toHaveBeenCalled();
    expect(getSelectedStyle(rendered.getByRole('button', { name: 'A tarefa' }), selectedStyle)).toBe(true);
    expect(mockSequenceCallbacks).toHaveLength(1);

    await act(async () => mockSequenceCallbacks[0]({ finished: true }));

    expect(mockPlayUISound).toHaveBeenCalledTimes(1);
    expect(mockPlayUISound).toHaveBeenCalledWith('selection-click');
    expect(mockShowItemActions).toHaveBeenCalledTimes(1);
    const [title, shownActions, onClose] = mockShowItemActions.mock.calls[0];
    expect(title).toBe('A tarefa');
    expect(shownActions).toBe(actions);
    expect(onClose).toEqual(expect.any(Function));

    await act(async () => onClose());

    expect(getSelectedStyle(rendered.getByRole('button', { name: 'A tarefa' }), selectedStyle)).toBe(false);
  });

  it('clears selection and skips the sheet when the selection animation is interrupted', async () => {
    const rendered = await renderItem();
    const { selectedStyle } = rendered;
    await longPress(rendered.getByRole('button', { name: 'A tarefa' }));

    await act(async () => mockSequenceCallbacks[0]({ finished: false }));

    expect(getSelectedStyle(rendered.getByRole('button', { name: 'A tarefa' }), selectedStyle)).toBe(false);
    expect(mockPlayUISound).not.toHaveBeenCalled();
    expect(mockShowItemActions).not.toHaveBeenCalled();
  });

  it('uses the reduced-motion path without waiting for an animation', async () => {
    mockReducedMotion = true;
    const rendered = await renderItem();
    const { selectedStyle } = rendered;
    await longPress(rendered.getByRole('button', { name: 'A tarefa' }));

    expect(mockPlayUISound).toHaveBeenCalledWith('selection-click');
    expect(mockShowItemActions).toHaveBeenCalledTimes(1);
    expect(mockSequenceCallbacks).toHaveLength(0);
    expect(getSelectedStyle(rendered.getByRole('button', { name: 'A tarefa' }), selectedStyle)).toBe(true);

    const onClose = mockShowItemActions.mock.calls[0][2];
    await act(async () => onClose());
    expect(getSelectedStyle(rendered.getByRole('button', { name: 'A tarefa' }), selectedStyle)).toBe(false);
  });

  it('does not open actions or play sound when an animation callback arrives after unmount', async () => {
    const rendered = await renderItem();
    await longPress(rendered.getByRole('button', { name: 'A tarefa' }));
    const completeSelection = mockSequenceCallbacks[0];

    await rendered.unmount();
    await act(async () => completeSelection({ finished: true }));

    expect(mockPlayUISound).not.toHaveBeenCalled();
    expect(mockShowItemActions).not.toHaveBeenCalled();
  });

  it('ignores a late action-sheet close callback after unmount', async () => {
    const setValue = jest.spyOn(Animated.Value.prototype, 'setValue');
    const rendered = await renderItem();
    await longPress(rendered.getByRole('button', { name: 'A tarefa' }));
    await act(async () => mockSequenceCallbacks[0]({ finished: true }));
    const onClose = mockShowItemActions.mock.calls[0][2];
    setValue.mockClear();

    await rendered.unmount();
    await act(async () => onClose());

    expect(setValue).not.toHaveBeenCalled();
    setValue.mockRestore();
  });
});
