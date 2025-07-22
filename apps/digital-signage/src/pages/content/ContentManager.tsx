import { Routes, Route } from 'react-router-dom';
import SignageContent from '../SignageContent';
import SignageEditor from '../SignageEditor';
import SignageDetail from '../SignageDetail';

export default function ContentManager() {
  return (
    <Routes>
      <Route index element={<SignageContent />} />
      <Route path="new" element={<SignageEditor />} />
      <Route path=":id" element={<SignageDetail />} />
      <Route path=":id/edit" element={<SignageEditor />} />
    </Routes>
  );
}