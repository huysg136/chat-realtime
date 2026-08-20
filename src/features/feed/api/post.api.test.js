import { apiFetch } from '../../../shared/api/apiClient';
import { getFeed } from './post.api';

jest.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: null }),
}));
jest.mock('../../../shared/firebase/firebaseClient', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../../shared/api/apiClient', () => ({
  apiFetch: jest.fn(),
}));

describe('feed API', () => {
  test('builds feed query parameters', async () => {
    apiFetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ success: true, posts: [] }),
    });

    await getFeed({ filterUserId: 'user-1', searchQuery: 'quik', limit: 10 });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/posts/feed?filterUserId=user-1&searchQuery=quik&limit=10',
      { headers: {} }
    );
  });
});
