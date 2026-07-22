import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { api } from '../api';

vi.mock('../api', () => ({ api: { get: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

test('shows an onboarding prompt when there is no balance', async () => {
  api.get.mockResolvedValue({ balances: [], receipts: [], payments: [] });

  renderDashboard();

  expect(await screen.findByText('No forecast yet')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /add a balance/i })).toBeInTheDocument();
});

test('renders the forecast once balance data is available', async () => {
  api.get.mockResolvedValue({
    balances: [
      {
        week_number: 1,
        week_end: '2026-01-11',
        start_balance: 1000,
        net_change: 400,
        end_balance: 1400,
      },
    ],
    receipts: [],
    payments: [],
  });

  renderDashboard();

  expect(await screen.findByText('Cash Flow')).toBeInTheDocument();
  expect(screen.queryByText('No forecast yet')).not.toBeInTheDocument();
});
