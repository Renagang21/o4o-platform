import { Layout } from './components';
import { HomePage } from './pages';

/**
 * GlycoPharm - 혈당관리 약국 서비스
 * Phase 2-E: Home 페이지 구현
 */

const SERVICE_NAME = 'GlycoPharm';

function App() {
  return (
    <Layout serviceName={SERVICE_NAME}>
      <HomePage />
    </Layout>
  );
}

export default App;
