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

const isoDaysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

const forecast = (start_date) => ({
  start_date,
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

test('shows an onboarding prompt when there is no balance', async () => {
  api.get.mockResolvedValue({ start_date: null, balances: [], receipts: [], payments: [] });

  renderDashboard();

  expect(await screen.findByText('No forecast yet')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /add a balance/i })).toBeInTheDocument();
});

test('renders the forecast once balance data is available', async () => {
  api.get.mockResolvedValue(forecast(isoDaysAgo(0)));

  renderDashboard();

  expect(await screen.findByText('Cash Flow')).toBeInTheDocument();
  expect(screen.queryByText('No forecast yet')).not.toBeInTheDocument();
});

test('warns when the balance anchor is stale', async () => {
  api.get.mockResolvedValue(forecast(isoDaysAgo(20)));

  renderDashboard();

  expect(await screen.findByText(/anchored to your last balance/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /update your balance/i })).toBeInTheDocument();
});

test('shows no staleness warning for a recent balance', async () => {
  api.get.mockResolvedValue(forecast(isoDaysAgo(2)));

  renderDashboard();

  expect(await screen.findByText('Cash Flow')).toBeInTheDocument();
  expect(screen.queryByText(/anchored to your last balance/i)).not.toBeInTheDocument();
});
