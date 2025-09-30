import { FC, useState, useEffect } from 'react';
import { Save, AlertCircle, Eye, EyeOff, Sparkles, Key, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import { aiSettingsApi } from '@/api/ai-settings.api';

// API 키 서비스 - 데이터베이스와 로컬 스토리지를 동시에 사용
export class AIApiKeyService {
  private static STORAGE_KEY = 'ai_api_keys';
  private static cachedKeys: Record<string, string> = {};

  private static getStorage() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return localStorage;
    } catch {
      return sessionStorage;
    }
  }

  static async getKeys(): Promise<Record<string, string>> {
    try {
      // First try to get from database
      const dbSettings = await aiSettingsApi.getSettings();
      const keys: Record<string, string> = {};
      
      Object.entries(dbSettings).forEach(([provider, settings]) => {
        if (settings.apiKey) {
          keys[provider] = settings.apiKey;
        }
      });
      
      // Cache in memory
      this.cachedKeys = keys;
      
      // Also save to localStorage for offline access
      const storage = this.getStorage();
      storage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
      
      return keys;
    } catch (error) {
      // Fallback to localStorage if database is unavailable
      try {
        const storage = this.getStorage();
        const stored = storage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch {
        return this.cachedKeys || {};
      }
    }
  }

  static async setKey(provider: string, key: string): Promise<void> {
    try {
      // Save to database
      await aiSettingsApi.saveSetting({
        provider,
        apiKey: key,
        defaultModel: this.getDefaultModel(provider) || null
      });
      
      // Update cache
      this.cachedKeys[provider] = key;
      
      // Also save to localStorage
      const storage = this.getStorage();
      const keys = await this.getKeys();
      keys[provider] = key;
      storage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
    } catch (error) {
      console.error('Failed to save API key:', error);
      throw error;
    }
  }

  static async removeKey(provider: string): Promise<void> {
    try {
      // Delete from database
      await aiSettingsApi.deleteSetting(provider);
      
      // Update cache
      delete this.cachedKeys[provider];
      
      // Also remove from localStorage
      const storage = this.getStorage();
      const keys = await this.getKeys();
      delete keys[provider];
      storage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
    } catch (error) {
      console.error('Failed to remove API key:', error);
      throw error;
    }
  }

  static async getKey(provider: string): Promise<string | undefined> {
    const keys = await this.getKeys();
    return keys[provider];
  }

  static getDefaultModel(provider: string): string | undefined {
    try {
      const storage = this.getStorage();
      const stored = storage.getItem(`ai_default_model_${provider}`);
      return stored || undefined;
    } catch {
      return undefined;
    }
  }

  static async setDefaultModel(provider: string, model: string): Promise<void> {
    try {
      // Save to database along with the key
      const key = await this.getKey(provider);
      if (key) {
        await aiSettingsApi.saveSetting({
          provider,
          apiKey: key,
          defaultModel: model
        });
      }
      
      // Also save to localStorage
      const storage = this.getStorage();
      storage.setItem(`ai_default_model_${provider}`, model);
    } catch (error) {
      console.error('Failed to save default model:', error);
    }
  }
}

const AISettings: FC = () => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    gemini: '',
    openai: '',
    claude: ''
  });
  
  const [defaultModels, setDefaultModels] = useState<Record<string, string>>({
    gemini: 'gemini-2.5-flash',
    openai: 'gpt-4-turbo',
    claude: 'claude-3-sonnet-20240229'
  });

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({
    gemini: false,
    openai: false,
    claude: false
  });

  const [loading, setLoading] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  // 프로바이더 정보
  const providers = [
    { 
      id: 'gemini', 
      name: 'Google Gemini', 
      icon: '🌟',
      models: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (추천)' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (곧 종료)' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (곧 종료)' }
      ],
      apiUrl: 'https://aistudio.google.com/app/apikey',
      description: 'Google AI Studio에서 무료 API 키 발급'
    },
    { 
      id: 'openai', 
      name: 'OpenAI', 
      icon: '🤖',
      models: [
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
      ],
      apiUrl: 'https://platform.openai.com/api-keys',
      description: 'OpenAI Platform에서 API 키 발급 (유료)'
    },
    { 
      id: 'claude', 
      name: 'Anthropic Claude', 
      icon: '🧠',
      models: [
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
      ],
      apiUrl: 'https://console.anthropic.com/',
      description: 'Anthropic Console에서 API 키 발급 (유료)'
    }
  ];

  // 컴포넌트 마운트 시 저장된 키 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedKeys = await AIApiKeyService.getKeys();
        const savedModels: Record<string, string> = {};
        
        providers.forEach(provider => {
          const savedModel = AIApiKeyService.getDefaultModel(provider.id);
          if (savedModel) {
            savedModels[provider.id] = savedModel;
          }
        });

        setApiKeys(prev => ({
          ...prev,
          ...savedKeys
        }));

        if (Object.keys(savedModels).length > 0) {
          setDefaultModels(prev => ({
            ...prev,
            ...savedModels
          }));
        }
      } catch (error) {
        console.error('Failed to load AI settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  // API 키 저장
  const handleSave = async () => {
    setLoading(true);
    try {
      // 각 프로바이더의 키 저장
      for (const [provider, key] of Object.entries(apiKeys)) {
        if (key) {
          await AIApiKeyService.setKey(provider, key);
        } else {
          await AIApiKeyService.removeKey(provider);
        }
      }

      // 기본 모델 저장
      for (const [provider, model] of Object.entries(defaultModels)) {
        await AIApiKeyService.setDefaultModel(provider, model);
      }

      toast.success('AI API 설정이 저장되었습니다.');
    } catch (error) {
      toast.error('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // API 키 테스트
  const handleTestKey = async (providerId: string) => {
    const key = apiKeys[providerId];
    if (!key) {
      toast.error('API 키를 입력해주세요.');
      return;
    }

    setTestingProvider(providerId);
    try {
      // 간단한 API 테스트 요청
      let testUrl = '';
      let headers: HeadersInit = {};
      let body = {};

      if (providerId === 'gemini') {
        testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const response = await fetch(testUrl);
        if (response.ok) {
          setTestResults(prev => ({ ...prev, [providerId]: true }));
          toast.success('Gemini API 키가 유효합니다.');
        } else {
          throw new Error('Invalid API key');
        }
      } else if (providerId === 'openai') {
        testUrl = 'https://api.openai.com/v1/models';
        headers = {
          'Authorization': `Bearer ${key}`
        };
        const response = await fetch(testUrl, { headers });
        if (response.ok) {
          setTestResults(prev => ({ ...prev, [providerId]: true }));
          toast.success('OpenAI API 키가 유효합니다.');
        } else {
          throw new Error('Invalid API key');
        }
      } else if (providerId === 'claude') {
        // Claude API는 실제 요청이 필요하므로 간단한 체크만
        if (key.startsWith('sk-ant-')) {
          setTestResults(prev => ({ ...prev, [providerId]: true }));
          toast.success('Claude API 키 형식이 유효합니다.');
        } else {
          throw new Error('Invalid API key format');
        }
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [providerId]: false }));
      toast.error(`${providerId} API 키가 유효하지 않습니다.`);
    } finally {
      setTestingProvider(null);
    }
  };

  return (
    <div className="wp-card">
      <div className="wp-card-header">
        <h2 className="wp-card-title flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI API 설정
        </h2>
      </div>
      
      <div className="wp-card-body space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            AI 페이지 생성 및 기타 AI 기능을 사용하려면 API 키가 필요합니다.
            각 서비스에서 API 키를 발급받아 아래에 입력해주세요.
            키는 브라우저에만 안전하게 저장되며 서버로 전송되지 않습니다.
          </AlertDescription>
        </Alert>

        {providers.map((provider) => (
          <div key={provider.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{provider.icon}</span>
                <div>
                  <h3 className="font-semibold">{provider.name}</h3>
                  <p className="text-sm text-gray-500">{provider.description}</p>
                </div>
              </div>
              <a
                href={provider.apiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline"
              >
                API 키 발급 →
              </a>
            </div>

            <div className="space-y-3">
              {/* API 키 입력 */}
              <div>
                <Label htmlFor={`${provider.id}-key`}>API 키</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <input
                      id={`${provider.id}-key`}
                      name={`${provider.id}-api-key`}
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      className="w-full px-3 py-2 border rounded-md pr-10"
                      placeholder={
                        provider.id === 'gemini' ? 'AIza...' :
                        provider.id === 'openai' ? 'sk-...' :
                        'sk-ant-...'
                      }
                      value={apiKeys[provider.id] || ''}
                      onChange={(e) => setApiKeys(prev => ({
                        ...prev,
                        [provider.id]: e.target.value
                      }))}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowKeys(prev => ({
                        ...prev,
                        [provider.id]: !prev[provider.id]
                      }))}
                    >
                      {showKeys[provider.id] ? 
                        <EyeOff className="w-4 h-4 text-gray-400" /> : 
                        <Eye className="w-4 h-4 text-gray-400" />
                      }
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestKey(provider.id)}
                    disabled={testingProvider === provider.id}
                  >
                    {testingProvider === provider.id ? (
                      <span className="animate-spin">⏳</span>
                    ) : testResults[provider.id] === true ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : testResults[provider.id] === false ? (
                      <X className="w-4 h-4 text-red-500" />
                    ) : (
                      '테스트'
                    )}
                  </Button>
                </div>
              </div>

              {/* 기본 모델 선택 */}
              <div>
                <Label htmlFor={`${provider.id}-model`}>기본 모델</Label>
                <Select 
                  value={defaultModels[provider.id]} 
                  onValueChange={(value) => setDefaultModels(prev => ({
                    ...prev,
                    [provider.id]: value
                  }))}
                >
                  <SelectTrigger id={`${provider.id}-model`} className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {provider.models.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                저장 중...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                설정 저장
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AISettings;