import { render, screen } from '@testing-library/react';
import App from './App';

test('renders transport tracking system', () => {
  render(<App />);
  const linkElement = screen.getByText(/Transport Tracking System/i);
  expect(linkElement).toBeInTheDocument();
});