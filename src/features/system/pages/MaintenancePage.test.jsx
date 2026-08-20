import MaintenancePage from './MaintenancePage';

describe('system module', () => {
  test('exports the maintenance page', () => {
    expect(typeof MaintenancePage).toBe('function');
  });
});
