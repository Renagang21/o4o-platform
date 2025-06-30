import React from 'react'
import { Routes, Route } from 'react-router-dom'
import AllFieldGroups from './AllFieldGroups'
import AddNew from './AddNew'

const CustomFields: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AllFieldGroups />} />
      <Route path="/new" element={<AddNew />} />
      <Route path="/edit/:id" element={<AddNew />} />
    </Routes>
  )
}

export default CustomFields