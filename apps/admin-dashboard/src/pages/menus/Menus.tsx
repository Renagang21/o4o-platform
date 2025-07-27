import { Routes, Route } from 'react-router-dom'
import MenuList from './MenuList'
import MenuBuilder from './MenuBuilder'

const Menus: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MenuList />} />
      <Route path="/new" element={<MenuBuilder />} />
      <Route path="/:id/edit" element={<MenuBuilder />} />
    </Routes>
  )
}

export default Menus