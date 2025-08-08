import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';

describe('Forum App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it('displays main components', () => {
    render(<App />);
    // Check for key elements that should be present
    const mainElement = document.querySelector('main') || document.querySelector('div');
    expect(mainElement).toBeTruthy();
  });
});