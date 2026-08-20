import VideoCallService from './StringeeService';

describe('Stringee call service', () => {
  test('initializes without an active call', () => {
    window.StringeeClient = jest.fn(() => ({ disconnect: jest.fn() }));

    const service = new VideoCallService('token', jest.fn(), jest.fn());

    expect(service.hasActiveCall()).toBe(false);
    expect(service.connected).toBe(false);
  });
});
