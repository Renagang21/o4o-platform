import { applyServiceBrandIdentity } from './config/serviceBrandIdentity';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

applyServiceBrandIdentity();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
