import { FC } from 'react';
import { Routes, Route } from 'react-router-dom'
import MediaLibrary from '../content/MediaLibrary'
import MediaNew from './MediaNew'

const Media: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MediaLibrary />} />
      <Route path="/library" element={<MediaLibrary />} />
      <Route path="/new" element={<MediaNew />} />
    </Routes>
  )
}

export default Media