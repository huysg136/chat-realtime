import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ROUTER_FUTURE_FLAGS } from '../../../app/router/routerConfig';
import NoAccess from './NoAccess';

describe('admin module', () => {
  test('renders the access denied state', () => {
    render(
      <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
        <NoAccess />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /không có quyền truy cập/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quay lại/i })).toBeInTheDocument();
  });
});
