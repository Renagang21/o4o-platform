import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Library from './Library'

const Media: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Library />} />
      <Route path="/library" element={<Library />} />
    </Routes>
  )
}

export default Media