import '@testing-library/jest-dom';

// jsdom lacks ResizeObserver, which Recharts' ResponsiveContainer relies on.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
