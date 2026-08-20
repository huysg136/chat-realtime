import { useAuthStore } from './auth.store';

jest.mock('../../../shared/firebase/firebaseClient', () => ({
  __esModule: true,
  default: {},
  rtdb: {},
}));
jest.mock('firebase/auth', () => ({
  getAuth: () => ({ signOut: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn().mockResolvedValue(undefined),
}));

describe('auth store', () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, isLoading: true, currentUserDocId: null });
  });

  test('updates the authenticated user', () => {
    useAuthStore.getState().setUser({ uid: 'user-1' });
    expect(useAuthStore.getState().user).toEqual({ uid: 'user-1' });
  });
});
