import UpgradePlanModal from './UpgradePlanModal';

describe('billing module', () => {
  test('exports the upgrade plan modal', () => {
    expect(typeof UpgradePlanModal).toBe('function');
  });
});
