import { FC } from 'react';
import { useSocialLoginConfig } from './SocialLoginConfigContext';
import useToast from '../../hooks/useToast';

const SocialLoginConfigPage: FC = () => {
  const { config, setConfig, saveConfig, loadConfig } = useSocialLoginConfig();
  const { showToast } = useToast();

  const handleChange = (provider: string, field: string, value: string) => {
    setConfig({
      ...config,
      [provider]: {
        ...config[provider as keyof typeof config],
        [field]: value,
      },
    });
  };

  const handleSave = () => {
    saveConfig();
    showToast({ type: 'success', message: '설정이 저장되었습니다.' });
  };

  const handleReload = () => {
    loadConfig();
    showToast({ type: 'info', message: '저장된 설정을 불러왔습니다.' });
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">소셜 로그인 설정</h1>
      {/* Kakao */}
      <div className="mb-6 border rounded p-4">
        <h2 className="font-semibold mb-2">Kakao</h2>
        <input
          className="px-3 py-2 border rounded w-full mb-2 dark:bg-gray-700 dark:text-white"
          placeholder="REST API 키"
          value={config.kakao.restApiKey}
          onChange={(e: any) => handleChange('kakao', 'restApiKey', e.target.value)}
        />
        <input
          className="px-3 py-2 border rounded w-full mb-2 dark:bg-gray-700 dark:text-white"
          placeholder="Redirect URI"
          value={config.kakao.redirectUri}
          onChange={(e: any) => handleChange('kakao', 'redirectUri', e.target.value)}
        />
      </div>
      {/* Naver */}
      <div className="mb-6 border rounded p-4">
        <h2 className="font-semibold mb-2">Naver</h2>
        <input
          className="px-3 py-2 border rounded w-full mb-2 dark:bg-gray-700 dark:text-white"
          placeholder="Client ID"
          value={config.naver.clientId}
          onChange={(e: any) => handleChange('naver', 'clientId', e.target.value)}
        />
        <input
          className="px-3 py-2 border rounded w-full mb-2 dark:bg-gray-700 dark:text-white"
          placeholder="Client Secret"
          value={config.naver.clientSecret}
          onChange={(e: any) => handleChange('naver', 'clientSecret', e.target.value)}
        />
        <input
          className="px-3 py-2 border rounded w-full mb-2 dark:bg-gray-700 dark:text-white"
          placeholder="Callback URL"
          value={config.naver.callbackUrl}
          onChange={(e: any) => handleChange('naver', 'callbackUrl', e.target.value)}
        />
      </div>
      {/* Facebook */}
      <div className="mb-6 border rounded p-4">
        <h2 className="font-semibold mb-2">Facebook</h2>
        <input
          className="px-3 py-2 border rounded w-full mb-2 dark:bg-gray-700 dark:text-white"
          placeholder="App ID"
          value={config.facebook.appId}
          onChange={(e: any) => handleChange('facebook', 'appId', e.target.value)}
        />
        <input
          className="px-3 py-2 border rounded w-full mb-2 dark:bg-gray-700 dark:text-white"
          placeholder="App Secret"
          value={config.facebook.appSecret}
          onChange={(e: any) => handleChange('facebook', 'appSecret', e.target.value)}
        />
        <input
          className="px-3 py-2 border rounded w-full mb-2 dark:bg-gray-700 dark:text-white"
          placeholder="Redirect URI"
          value={config.facebook.redirectUri}
          onChange={(e: any) => handleChange('facebook', 'redirectUri', e.target.value)}
        />
      </div>
      {/* Google */}
      <div className="mb-6 border rounded p-4">
        <h2 className="font-semibold mb-2">Google</h2>
        <input
          className="px-3 py-2 border rounded w-full mb-2 dark:bg-gray-700 dark:text-white"
          placeholder="클라이언트 ID"
          value={config.google.clientId}
          onChange={(e: any) => handleChange('google', 'clientId', e.target.value)}
        />
        <input
          className="px-3 py-2 border rounded w-full mb-2 dark:bg-gray-700 dark:text-white"
          placeholder="클라이언트 보안 비밀"
          value={config.google.clientSecret}
          onChange={(e: any) => handleChange('google', 'clientSecret', e.target.value)}
        />
        <input
          className="px-3 py-2 border rounded w-full mb-2 dark:bg-gray-700 dark:text-white"
          placeholder="승인된 리디렉션 URI"
          value={config.google.redirectUri}
          onChange={(e: any) => handleChange('google', 'redirectUri', e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={handleSave}>저장</button>
        <button className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500" onClick={handleReload}>불러오기</button>
      </div>
    </div>
  );
};

export default SocialLoginConfigPage; 