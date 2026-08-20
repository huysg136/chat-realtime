import { getOtherUser, useChatStore } from './chat.store';

describe('chat store', () => {
  afterEach(() => useChatStore.getState().resetChatState());

  test('finds the other member of a private room', () => {
    const room = { type: 'private', members: ['user-1', 'user-2'] };
    const users = [
      { uid: 'user-1', displayName: 'Huy' },
      { uid: 'user-2', displayName: 'An' },
    ];

    expect(getOtherUser(room, users, 'user-1')).toEqual(users[1]);
  });

  test('resets transient chat state', () => {
    useChatStore.getState().setSelectedRoomId('room-1');
    useChatStore.getState().setSearchText('hello');
    useChatStore.getState().resetChatState();

    expect(useChatStore.getState().selectedRoomId).toBe('');
    expect(useChatStore.getState().searchText).toBe('');
  });
});
