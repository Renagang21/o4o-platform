import { FC } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Pages from './Pages';
import PageForm from '../content/PageForm';

const PagesRouter: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Pages />} />
      <Route path="/new" element={<PageForm />} />
      <Route path="/:id/edit" element={<PageForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default PagesRouter;