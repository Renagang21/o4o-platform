import { FC, useState, useEffect } from 'react';
import { Save, AlertCircle, Eye, EyeOff, Sparkles, Key, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import { aiSettingsApi } from '@/api/ai-settings.api';

// API 키 서비스 - 데이터베이스만 사용 (캐시 제거)
export class AIApiKeyService {
  static async getKeys(): Promise<Record<string, string>> {
    try {
      const dbSettings = await aiSettingsApi.getSettings();
      
      const keys: Record<string, string> = {};
      
      Object.entries(dbSettings).forEach(([provider, settings]) => {
        if (settings.apiKey && settings.apiKey.trim()) {
          keys[provider] = settings.apiKey;
        }
      });
      return keys;
    } catch (error) {
      console.error('❌ API 키 로딩 실패:', error);
      return {};
    }
  }

  static async setKey(provider: string, key: string): Promise<void> {
    try {
      const defaultModel = await this.getDefaultModel(provider);
      await aiSettingsApi.saveSetting({
        provider,
        apiKey: key,
        defaultModel: defaultModel || null
      });
    } catch (error) {
      // Failed to save API key
      throw error;
    }
  }

  static async removeKey(provider: string): Promise<void> {
    try {
      await aiSettingsApi.deleteSetting(provider);
    } catch (error) {
      // Failed to remove API key
      throw error;
    }
  }

  static async getKey(provider: string): Promise<string | undefined> {
    const keys = await this.getKeys();
    return keys[provider];
  }

  static async getDefaultModel(provider: string): Promise<string | undefined> {
    try {
      const dbSettings = await aiSettingsApi.getSettings();
      return dbSettings[provider]?.defaultModel;
    } catch {
      return undefined;
    }
  }

  static async setDefaultModel(provider: string, model: string): Promise<void> {
    try {
      const key = await this.getKey(provider);
      await aiSettingsApi.saveSetting({
        provider,
        apiKey: key || null,
        defaultModel: model
      });
    } catch (error) {
      // Failed to save default model
      throw error;
    }
  }
}

const AISettings: FC = () => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  
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
  const [testResults, setTestResults] = useState<Record<string, boolean | undefined>>({});

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
        
        // Load default models from database
        for (const provider of providers) {
          const savedModel = await AIApiKeyService.getDefaultModel(provider.id);
          if (savedModel) {
            savedModels[provider.id] = savedModel;
          }
        }

        // 실제로 키가 있는 프로바이더만 설정
        setApiKeys(savedKeys);

        if (Object.keys(savedModels).length > 0) {
          setDefaultModels(prev => ({
            ...prev,
            ...savedModels
          }));
        }
      } catch (error) {
        // Failed to load AI settings
        // 에러가 발생해도 기본값 유지
      }
    };
    
    loadSettings();
  }, []);

  // API 키 저장
  const handleSave = async () => {
    setLoading(true);
    try {
      // 각 프로바이더의 키와 모델을 함께 저장
      const savePromises = [];
      
      for (const provider of providers) {
        const key = apiKeys[provider.id];
        const model = defaultModels[provider.id];
        
        if (key) {
          // API 키가 있으면 저장
          savePromises.push(
            aiSettingsApi.saveSetting({
              provider: provider.id,
              apiKey: key,
              defaultModel: model,
              settings: {}
            })
          );
        }
      }
      
      // 모든 저장 작업을 병렬로 처리
      const results = await Promise.all(savePromises);
      
      // 모든 저장이 성공했는지 확인
      if (results.every(result => result)) {
        toast.success('AI API 설정이 저장되었습니다.');
      } else {
        toast.error('일부 설정 저장에 실패했습니다.');
      }
    } catch (error) {
      // Error saving settings
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
      // Backend API를 통해 테스트
      const result = await aiSettingsApi.testApiKey(providerId, key);
      
      if (result.valid) {
        setTestResults(prev => ({ ...prev, [providerId]: true }));
        toast.success(result.message || `${providerId} API 키가 유효합니다.`);
      } else {
        setTestResults(prev => ({ ...prev, [providerId]: false }));
        toast.error(result.message || `${providerId} API 키가 유효하지 않습니다.`);
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [providerId]: false }));
      toast.error(`API 키 테스트 중 오류가 발생했습니다.`);
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
            키는 데이터베이스에 안전하게 암호화되어 저장됩니다.
          </AlertDescription>
        </Alert>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {providers.map((provider) => (
            <div key={provider.id} className="border rounded-lg p-4 space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{provider.name}</h3>
                      {apiKeys[provider.id]?.trim() ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          설정됨
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          미설정
                        </span>
                      )}
                    </div>
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
                      {/* Hidden username field for accessibility */}
                      <input
                        type="text"
                        name={`${provider.id}-username`}
                        autoComplete="username"
                        style={{ display: 'none' }}
                        aria-hidden="true"
                        value={provider.id}
                        readOnly
                      />
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
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setApiKeys(prev => ({
                            ...prev,
                            [provider.id]: newValue
                          }));
                          // API 키가 변경되면 테스트 결과 초기화
                          setTestResults(prev => ({
                            ...prev,
                            [provider.id]: undefined
                          }));
                        }}
                        autoComplete="current-password"
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
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestKey(provider.id)}
                      disabled={testingProvider === provider.id || !apiKeys[provider.id]?.trim()}
                    >
                      {testingProvider === provider.id ? (
                        <span className="animate-spin">⏳</span>
                      ) : (!apiKeys[provider.id]?.trim()) ? (
                        '키 입력 필요'
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
            <Button type="submit" disabled={loading}>
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
        </form>
      </div>
    </div>
  );
};

export default AISettings;