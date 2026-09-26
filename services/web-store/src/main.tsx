import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { installStoreOrganizationHeader } from './lib/storeOrganizationHeader';

// 선택 매장을 API 요청에 싣는다(CHECK-O4O-URL-FIRST-CENSUS-V1 §21-14)
installStoreOrganizationHeader();

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
