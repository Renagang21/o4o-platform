import { FC } from 'react';
import { Routes, Route } from 'react-router-dom'
import MediaLibrary from './MediaLibrary'
import MediaUpload from './MediaUpload'

const Media: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MediaLibrary />} />
      <Route path="/library" element={<MediaLibrary />} />
      <Route path="/upload" element={<MediaUpload />} />
      {/* Legacy route redirect */}
      <Route path="/new" element={<MediaUpload />} />
    </Routes>
  )
}

export default Media