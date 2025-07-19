import React from 'react'
import { Routes, Route } from 'react-router-dom'
import MediaLibrary from '../content/MediaLibrary'

const Media: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MediaLibrary />} />
      <Route path="/library" element={<MediaLibrary />} />
    </Routes>
  )
}

export default Media