import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ProductSourcingPage from './pages/ProductSourcingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import RoutineBuilderPage from './pages/RoutineBuilderPage';
import MyProductsPage from './pages/MyProductsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="sourcing" element={<ProductSourcingPage />} />
        <Route path="product/:id" element={<ProductDetailPage />} />
        <Route path="routine-builder" element={<RoutineBuilderPage />} />
        <Route path="my-products" element={<MyProductsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
