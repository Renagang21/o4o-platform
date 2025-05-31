import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AuthContext } from '../context/AuthContext';
import ProfileCard from '../components/ProfileCard'; // ✨ 이 import 문을 깔끔하게 정리했습니다.
import PasswordChangeModal from '../components/PasswordChangeModal';

const ProfilePage: React.FC = () => {
  const user = useAuth(); // useAuth()는 이제 User | null을 직접 반환합니다.
  const { setUser } = React.useContext(AuthContext)!; // AuthContext에서 setUser 함수를 가져옵니다.
  const navigate = useNavigate();
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);

  React.useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleLogout = () => {
    setUser(null); // ✨ logout() 대신 setUser(null)로 변경하여 로그아웃 처리
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
