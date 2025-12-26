import { Layout } from './components';
import { HomePage } from './pages';

/**
 * Neture - 전자상거래 판매자 지원 서비스
 * Phase 2-E: Home 페이지 구현
 */

const SERVICE_NAME = 'Neture';

function App() {
  return (
    <Layout serviceName={SERVICE_NAME}>
      <HomePage />
    </Layout>
  );
}

export default App;
