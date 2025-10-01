import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { simpleAIGenerator, AI_MODELS, type AIModel, type Block } from '@/services/ai/SimpleAIGenerator';

interface SimpleAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (blocks: Block[]) => void;
}

export const SimpleAIModal: React.FC<SimpleAIModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
}) => {
  const [prompt, setPrompt] = useState('');
  const [template, setTemplate] = useState<'landing' | 'about' | 'product' | 'blog'>('landing');
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'claude'>('gemini');
  const [model, setModel] = useState<AIModel>('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 프로바이더별 모델 필터링
  const getModelsForProvider = (selectedProvider: string) => {
    return Object.entries(AI_MODELS).filter(([key]) => {
      switch (selectedProvider) {
        case 'openai':
          return key.startsWith('gpt-');
        case 'gemini':
          return key.startsWith('gemini-');
        case 'claude':
          return key.startsWith('claude-');
        default:
          return false;
      }
    });
  };

  // 프로바이더 변경 시 첫 번째 모델로 자동 선택
  const handleProviderChange = (newProvider: 'openai' | 'gemini' | 'claude') => {
    setProvider(newProvider);
    const models = getModelsForProvider(newProvider);
    if (models.length > 0) {
      setModel(models[0][0] as AIModel);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('페이지 내용을 입력해주세요.');
      return;
    }

    if (!apiKey.trim()) {
      setError('API 키를 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setProgressMessage('준비 중...');

    try {
      const blocks = await simpleAIGenerator.generatePage({
        prompt,
        template,
        config: {
          provider,
          model,
          apiKey
        },
        onProgress: (progress, message) => {
          setProgress(progress);
          setProgressMessage(message);
        }
      });

      onGenerate(blocks);
      onClose();
      
      // 성공 후 초기화
      setPrompt('');
      setProgress(0);
      setProgressMessage('');
    } catch (err: any) {
      setError(err.message || 'AI 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const templates = [
    { key: 'landing', name: '랜딩 페이지', description: '제품이나 서비스를 소개하는 페이지' },
    { key: 'about', name: '회사 소개', description: '회사나 팀을 소개하는 페이지' },
    { key: 'product', name: '제품 소개', description: '제품의 특징과 장점을 설명' },
    { key: 'blog', name: '블로그 포스트', description: '블로그 형식의 글' },
  ];

  const providers = [
    { key: 'gemini', name: 'Google Gemini (권장)', description: '빠르고 정확한 최신 모델' },
    { key: 'openai', name: 'OpenAI GPT', description: 'GPT-5 시리즈 지원' },
    { key: 'claude', name: 'Anthropic Claude', description: 'Claude 4 시리즈 지원' },
  ];

  const examplePrompts = {
    landing: '혁신적인 AI 기반 웹사이트 빌더를 소개하는 랜딩 페이지를 만들어주세요.',
    about: '창의적이고 혁신적인 기술 스타트업 회사 소개 페이지를 만들어주세요.',
    product: '차세대 AI 콘텐츠 생성 도구를 소개하는 제품 페이지를 만들어주세요.',
    blog: '2025년 AI와 웹 개발의 미래 트렌드에 대한 블로그 포스트를 작성해주세요.',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI 페이지 생성 (2025)
          </DialogTitle>
          <DialogDescription>
            최신 AI 모델로 자동으로 페이지 콘텐츠를 생성합니다.
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          // 진행 중 화면
          <div className="space-y-4 py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
              <p className="text-sm font-medium">{progressMessage}</p>
            </div>
            
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-600">{progress}%</p>
            </div>
          </div>
        ) : (
          // 입력 화면
          <div className="space-y-4 py-4">
            {/* 템플릿 선택 */}
            <div className="space-y-2">
              <Label>템플릿</Label>
              <Select value={template} onValueChange={(v: any) => setTemplate(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-gray-500">{t.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AI 프로바이더 선택 */}
            <div className="space-y-2">
              <Label>AI 서비스</Label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 모델 선택 */}
            <div className="space-y-2">
              <Label>모델</Label>
              <Select value={model} onValueChange={(v: AIModel) => setModel(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getModelsForProvider(provider).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      <div className="text-sm">
                        <div className="font-medium">{key}</div>
                        <div className="text-xs text-gray-500">{name}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* API 키 */}
            <div className="space-y-2">
              <Label>API 키</Label>
              <input
                type="password"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm"
                placeholder={`${provider === 'openai' ? 'sk-...' : provider === 'claude' ? 'sk-ant-...' : 'AIza...'}`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                {provider === 'openai' && 'OpenAI API 키를 입력하세요'}
                {provider === 'gemini' && 'Google AI Studio에서 발급받은 API 키를 입력하세요'}
                {provider === 'claude' && 'Anthropic Console에서 발급받은 API 키를 입력하세요'}
              </p>
            </div>

            {/* 프롬프트 입력 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>페이지 내용 설명</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrompt(examplePrompts[template])}
                >
                  예시 사용
                </Button>
              </div>
              <Textarea
                placeholder="어떤 페이지를 만들까요? 자세히 설명해주세요..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                페이지의 목적, 타겟 고객, 주요 내용 등을 자세히 설명하면 더 좋은 결과를 얻을 수 있습니다.
              </p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {!isGenerating && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button onClick={handleGenerate} disabled={!prompt.trim() || !apiKey.trim()}>
              <Sparkles className="mr-2 h-4 w-4" />
              페이지 생성
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};