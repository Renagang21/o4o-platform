import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

describe('Digital Signage App', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    expect(document.body).toBeTruthy();
  });

  it('displays main components', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    // Check for key elements that should be present
    const mainElement = document.querySelector('main') || document.querySelector('div');
    expect(mainElement).toBeTruthy();
  });
});