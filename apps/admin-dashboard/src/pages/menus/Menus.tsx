import { FC } from 'react';
import { Routes, Route } from 'react-router-dom'
import WordPressMenuList from './WordPressMenuList'
import WordPressMenuEditor from './WordPressMenuEditor'

const Menus: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<WordPressMenuList />} />
      <Route path="/new" element={<WordPressMenuEditor />} />
      <Route path="/:id/edit" element={<WordPressMenuEditor />} />
    </Routes>
  )
}

export default Menus