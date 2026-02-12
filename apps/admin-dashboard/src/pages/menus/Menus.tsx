import { FC } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminMenuList from './AdminMenuList';
import MenuEditor from './MenuEditor';

const Menus: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AdminMenuList />} />
      <Route path="/new" element={<MenuEditor />} />
      <Route path="/:id/edit" element={<MenuEditor />} />
    </Routes>
  );
};

export default Menus;