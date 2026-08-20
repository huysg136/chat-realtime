import ProfilePage from './ProfilePage';

describe('profile module', () => {
  test('exports its route component', () => {
    expect(typeof ProfilePage).toBe('function');
  });
});
