import { Routes, Route } from 'react-router-dom';
import { ViewRenderer } from './view/renderer';

function App() {
  return (
    <Routes>
      <Route path="*" element={<ViewRenderer />} />
    </Routes>
  );
}

export default App;
