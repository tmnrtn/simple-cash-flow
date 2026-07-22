import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import { api } from '../api';

vi.mock('../api', () => ({ api: { post: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

test('submits credentials and calls onSuccess', async () => {
  api.post.mockResolvedValue({ authenticated: true });
  const onSuccess = vi.fn();
  const user = userEvent.setup();

  render(<Login onSuccess={onSuccess} />);
  await user.type(screen.getByLabelText('Username'), 'admin');
  await user.type(screen.getByLabelText('Password'), 'secret');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  expect(api.post).toHaveBeenCalledWith('/api/auth/login', {
    username: 'admin',
    password: 'secret',
  });
  expect(onSuccess).toHaveBeenCalled();
});

test('shows an error message when login fails', async () => {
  api.post.mockRejectedValue(new Error('Invalid username or password'));
  const user = userEvent.setup();

  render(<Login onSuccess={vi.fn()} />);
  await user.type(screen.getByLabelText('Username'), 'admin');
  await user.type(screen.getByLabelText('Password'), 'wrong');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
});
