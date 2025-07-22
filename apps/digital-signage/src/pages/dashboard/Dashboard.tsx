import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the enhanced dashboard
    navigate('/signage/dashboard', { replace: true });
  }, [navigate]);

  return null;
}