/**
 * App - K-Cosmetics
 * WO-KCOS-HOME-UI-V1
 *
 * 라우팅 설정:
 * - / : 홈 (한국어 고정)
 * - /stores : 매장 디렉토리 (영어 기본, 다국어)
 * - /stores/:storeSlug : 개별 매장 (한국어 기본, 다국어)
 * - /tourists : 관광객 안내
 * - /partners : 파트너 안내
 * - /about : 플랫폼 소개
 * - /contact : 문의
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components';
import {
  HomePage,
  StoresPage,
  StoreDetailPage,
  TouristsPage,
  PartnersPage,
  AboutPage,
  ContactPage,
} from './pages';

const SERVICE_NAME = 'K-Cosmetics';

function App() {
  return (
    <BrowserRouter>
      <Layout serviceName={SERVICE_NAME}>
        <Routes>
          {/* 메인 홈 */}
          <Route path="/" element={<HomePage />} />

          {/* 매장 디렉토리 */}
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/stores/:storeSlug" element={<StoreDetailPage />} />

          {/* 관광객 안내 */}
          <Route path="/tourists" element={<TouristsPage />} />

          {/* 파트너 안내 */}
          <Route path="/partners" element={<PartnersPage />} />

          {/* 플랫폼 소개 */}
          <Route path="/about" element={<AboutPage />} />

          {/* 문의 */}
          <Route path="/contact" element={<ContactPage />} />

          {/* 404 - 홈으로 리다이렉트 */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
