import { FC } from 'react';
import { Routes, Route } from 'react-router-dom'
import MediaListWordPress from './MediaListWordPress'
import MediaUpload from './MediaUpload'

const Media: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MediaListWordPress />} />
      <Route path="/library" element={<MediaListWordPress />} />
      <Route path="/upload" element={<MediaUpload />} />
      <Route path="/new" element={<MediaUpload />} />
    </Routes>
  )
}

export default Media