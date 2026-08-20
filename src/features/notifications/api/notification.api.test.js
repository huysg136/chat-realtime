import { apiFetch } from '../../../shared/api/apiClient';
import { getUnreadNotificationCount } from './notification.api';

jest.mock('../../../shared/api/apiClient', () => ({
  apiFetch: jest.fn(),
}));

describe('notification API', () => {
  test('returns the unread notification count', async () => {
    apiFetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ success: true, count: 3 }),
    });

    await expect(getUnreadNotificationCount('user-1')).resolves.toEqual({
      success: true,
      count: 3,
    });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/friends/notifications/unread-count?uid=user-1'
    );
  });
});
