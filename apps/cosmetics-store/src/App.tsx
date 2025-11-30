import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProductSourcingPage from './pages/ProductSourcingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import RoutineBuilderPage from './pages/RoutineBuilderPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ProductSourcingPage />} />
        <Route path="sourcing" element={<ProductSourcingPage />} />
        <Route path="product/:id" element={<ProductDetailPage />} />
        <Route path="routine-builder" element={<RoutineBuilderPage />} />
      </Route>
    </Routes>
  );
}

export default App;
