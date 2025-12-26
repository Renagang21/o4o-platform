import { Layout } from './components';
import { HomePage } from './pages';

/**
 * K-Cosmetics - 화장품 매장 서비스
 * Phase 2-E: Home 페이지 구현
 */

const SERVICE_NAME = 'K-Cosmetics';

function App() {
  return (
    <Layout serviceName={SERVICE_NAME}>
      <HomePage />
    </Layout>
  );
}

export default App;
