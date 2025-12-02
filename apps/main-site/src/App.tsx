import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Performance: Lazy load ViewRenderer
const ViewRenderer = lazy(() =>
  import('./view/renderer').then((module) => ({
    default: module.ViewRenderer,
  }))
);

// Performance: Loading component
function AppLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-gray-600">Loading...</div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<AppLoading />}>
      <Routes>
        <Route path="*" element={<ViewRenderer />} />
      </Routes>
    </Suspense>
  );
}

export default App;
