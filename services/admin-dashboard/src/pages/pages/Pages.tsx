import React from 'react'
import { Routes, Route } from 'react-router-dom'
import AllPages from './AllPages'
import AddNew from './AddNew'

const Pages: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AllPages />} />
      <Route path="/new" element={<AddNew />} />
      <Route path="/edit/:id" element={<AddNew />} />
    </Routes>
  )
}

export default Pages