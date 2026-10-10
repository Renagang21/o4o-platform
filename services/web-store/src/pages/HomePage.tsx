import { Navigate } from 'react-router-dom';
import { WORKSPACE_PATHS } from '../config/workspace';

/** Enter the selected store's actual work overview without a separate introduction. */
export default function HomePage() {
  return <Navigate to={WORKSPACE_PATHS.myStore} replace />;
}
