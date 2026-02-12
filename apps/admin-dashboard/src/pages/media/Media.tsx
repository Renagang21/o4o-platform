import { FC } from 'react';
import { Routes, Route } from 'react-router-dom'
import MediaLibraryAdmin from './MediaLibraryAdmin'
import MediaUpload from './MediaUpload'

const Media: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MediaLibraryAdmin />} />
      <Route path="/library" element={<MediaLibraryAdmin />} />
      <Route path="/upload" element={<MediaUpload />} />
      <Route path="/new" element={<MediaUpload />} />
    </Routes>
  )
}

export default Media
