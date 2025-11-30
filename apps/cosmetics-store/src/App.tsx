import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ProductSourcingPage from './pages/ProductSourcingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import RoutineBuilderPage from './pages/RoutineBuilderPage';
import MyProductsPage from './pages/MyProductsPage';
import InfluencerListPage from './pages/InfluencerListPage';
import InfluencerRoutineDetailPage from './pages/InfluencerRoutineDetailPage';
import PartnerDashboardPage from './pages/PartnerDashboardPage';
import PartnerRoutinesPage from './pages/PartnerRoutinesPage';
import PartnerRoutineCreatePage from './pages/partner/PartnerRoutineCreatePage';
import PartnerRoutineEditPage from './pages/partner/PartnerRoutineEditPage';

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
        <Route path="influencers" element={<InfluencerListPage />} />
        <Route path="influencer-routine/:id" element={<InfluencerRoutineDetailPage />} />
        <Route path="partner/dashboard" element={<PartnerDashboardPage />} />
        <Route path="partner/routines" element={<PartnerRoutinesPage />} />
        <Route path="partner/routines/new" element={<PartnerRoutineCreatePage />} />
        <Route path="partner/routine/:id/edit" element={<PartnerRoutineEditPage />} />
      </Route>
    </Routes>
  );
}

export default App;
