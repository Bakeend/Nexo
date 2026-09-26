import { redirectSystemPath } from '../app/+native-intent';

describe('native intent routing', () => {
  it('sends the expo-sharing intent to the Inbox', () => {
    expect(redirectSystemPath({ path: 'nexo://expo-sharing', initial: true })).toBe('/inbox');
  });

  it('preserves regular Nexo deep links', () => {
    expect(redirectSystemPath({ path: 'nexo://home', initial: false })).toBe('nexo://home');
    expect(redirectSystemPath({ path: '/settings/storage', initial: false })).toBe('/settings/storage');
  });
});
