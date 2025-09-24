import { FC } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PageList from './PageList';

const PagesRouter: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<PageList />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default PagesRouter;