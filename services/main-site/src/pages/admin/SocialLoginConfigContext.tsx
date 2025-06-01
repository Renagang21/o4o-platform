import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type SocialProvider = 'kakao' | 'naver' | 'facebook' | 'google';

export interface SocialConfig {
  kakao: { restApiKey: string; redirectUri: string; };
  naver: { clientId: string; clientSecret: string; callbackUrl: string; };
  facebook: { appId: string; appSecret: string; redirectUri: string; };
  google: { clientId: string; clientSecret: string; redirectUri: string; };
}

const defaultConfig: SocialConfig = {
  kakao: { restApiKey: '', redirectUri: '' },
  naver: { clientId: '', clientSecret: '', callbackUrl: '' },
  facebook: { appId: '', appSecret: '', redirectUri: '' },
  google: { clientId: '', clientSecret: '', redirectUri: '' },
};

interface SocialLoginConfigContextType {
  config: SocialConfig;
  setConfig: (config: SocialConfig) => void;
  saveConfig: () => void;
  loadConfig: () => void;
}

const SocialLoginConfigContext = createContext<SocialLoginConfigContextType | undefined>(undefined);

export const SocialLoginConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<SocialConfig>(defaultConfig);

  useEffect(() => {
    const saved = localStorage.getItem('socialLoginConfig');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const saveConfig = () => {
    localStorage.setItem('socialLoginConfig', JSON.stringify(config));
  };

  const loadConfig = () => {
    const saved = localStorage.getItem('socialLoginConfig');
    if (saved) setConfig(JSON.parse(saved));
  };

  return (
    <SocialLoginConfigContext.Provider value={{ config, setConfig, saveConfig, loadConfig }}>
      {children}
    </SocialLoginConfigContext.Provider>
  );
};

export const useSocialLoginConfig = () => {
  const ctx = useContext(SocialLoginConfigContext);
  if (!ctx) throw new Error('useSocialLoginConfig must be used within SocialLoginConfigProvider');
  return ctx;
}; 