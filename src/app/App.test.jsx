import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./hooks/useApplyTheme', () => jest.fn());
jest.mock('../features/auth/hooks/useAuthInit', () => ({ useAuthInit: jest.fn() }));
jest.mock('../features/chat/hooks/useChatSync', () => ({ useChatSync: jest.fn() }));
jest.mock('../features/auth/store/auth.store', () => ({
  useAuthStore: (selector) => selector({ user: null, isLoading: false }),
}));
jest.mock('./router/AppRouter', () => () => <div>Quik application router</div>);
jest.mock('./overlays/ModalManager', () => () => null);

test('renders the application shell', () => {
  render(<App />);
  expect(screen.getByText('Quik application router')).toBeInTheDocument();
});
