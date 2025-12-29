/**
 * Web Server Reference - Entry Point
 * =============================================================================
 * Reference implementation for O4O Web Servers.
 * All new Web Servers should follow this structure.
 *
 * Key Principles (from web-server-architecture.md):
 * 1. Use authClient for all API calls
 * 2. No direct database access
 * 3. No hardcoded API URLs
 * 4. JWT managed via httpOnly cookies (handled by authClient)
 * =============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './stores/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
