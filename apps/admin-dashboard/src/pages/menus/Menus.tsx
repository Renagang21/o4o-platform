import { FC } from 'react';
import { Routes, Route } from 'react-router-dom';
import WordPressMenuList from './WordPressMenuList';
import MenuEditor from './MenuEditor';

const Menus: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<WordPressMenuList />} />
      <Route path="/new" element={<MenuEditor />} />
      <Route path="/:id/edit" element={<MenuEditor />} />
    </Routes>
  );
};

export default Menus;