import { Layout } from './components';
import { HomePage } from './pages';

/**
 * KPA Society - 약사회 서비스
 * Phase 2-E: Home 페이지 구현
 */

const SERVICE_NAME = 'KPA Society';

function App() {
  return (
    <Layout serviceName={SERVICE_NAME}>
      <HomePage />
    </Layout>
  );
}

export default App;
