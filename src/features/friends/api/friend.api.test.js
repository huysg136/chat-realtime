import { apiFetch } from '../../../shared/api/apiClient';
import { sendFriendRequest } from './friend.api';

jest.mock('../../../shared/firebase/firebaseClient', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
}));
jest.mock('../../../shared/api/apiClient', () => ({
  apiFetch: jest.fn(),
}));

describe('friends API', () => {
  test('sends a friend request and returns its id', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true, requestId: 'request-1' }),
    });

    await expect(sendFriendRequest('user-1', 'user-2')).resolves.toBe('request-1');
    expect(apiFetch).toHaveBeenCalledWith('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ fromUid: 'user-1', toUid: 'user-2' }),
    });
  });
});
