import SettingsModal from './SettingsModal';

describe('settings module', () => {
  test('exports the settings modal', () => {
    expect(typeof SettingsModal).toBe('function');
  });
});
