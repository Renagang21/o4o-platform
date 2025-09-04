import { FC } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Pages from './Pages'; // Use the recent Pages component with bulk actions
import PageForm from '../content/PageForm';
import NewPage from './NewPage';

const PagesRouter: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Pages />} />
      <Route path="/new" element={<NewPage />} />
      <Route path="/:id/edit" element={<PageForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default PagesRouter;