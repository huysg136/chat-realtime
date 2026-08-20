import axios from 'axios';
import { apiClient } from '../../../shared/api/apiClient';
import { uploadToR2 } from './upload.api';

jest.mock('axios', () => ({
  __esModule: true,
  default: { put: jest.fn() },
}));
jest.mock('../../../shared/api/apiClient', () => ({
  apiClient: { post: jest.fn() },
}));

describe('upload API', () => {
  test('uploads using the presigned URL and returns the public URL', async () => {
    const file = { name: 'photo.png', type: 'image/png', size: 128 };
    apiClient.post.mockResolvedValue({
      data: {
        uploadUrl: 'https://upload.example/photo.png',
        fileUrl: 'https://cdn.example/photo.png',
      },
    });
    axios.put.mockResolvedValue({});

    await expect(uploadToR2(file, 'posts')).resolves.toBe(
      'https://cdn.example/photo.png'
    );
    expect(apiClient.post).toHaveBeenCalledWith('/api/get-upload-url', {
      fileName: 'photo.png',
      fileType: 'image/png',
      folder: 'posts',
      fileSize: 128,
    });
  });
});
