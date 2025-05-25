import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import ProfileCard from '../components/ProfileCard';
import PasswordChangeModal from '../components/PasswordChangeModal';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);

  React.useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handlePasswordChange = () => {
    setPasswordModalOpen(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <ProfileCard user={user} onLogout={handleLogout} onPasswordChange={handlePasswordChange} />
      <PasswordChangeModal open={isPasswordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </div>
  );
};

export default ProfilePage; 