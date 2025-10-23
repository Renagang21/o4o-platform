import React, { useState, useEffect } from 'react';
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
import { AppSystemKeyService } from '@/services/app-system-keys.service';

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
  const [model, setModel] = useState<AIModel>('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // 모달이 열릴 때 저장된 API 키 자동 로드 (App System에서)
  useEffect(() => {
    const loadSavedSettings = async () => {
      if (isOpen) {
        try {
          // Check if Gemini app is installed
          const installed = await AppSystemKeyService.isGeminiInstalled();
          setIsAppInstalled(installed);

          if (installed) {
            // Load API key and model from App System
            const savedApiKey = await AppSystemKeyService.getGeminiKey();
            const savedModel = await AppSystemKeyService.getGeminiModel();

            if (savedApiKey) {
              setApiKey(savedApiKey);
            }

            if (savedModel) {
              setModel(savedModel as AIModel);
            }
          }
        } catch (error) {
          // API 키 로드 실패 시 무시 (사용자가 직접 입력 가능)
          // Error is logged for debugging but not shown to user
        }
      }
    };

    loadSavedSettings();
  }, [isOpen]);

  // Gemini 모델만 필터링
  const geminiModels = Object.entries(AI_MODELS).filter(([key]) => key.startsWith('gemini-'));

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
    setElapsedTime(0);

    // Start elapsed time counter
    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    try {
      const blocks = await simpleAIGenerator.generatePage({
        prompt,
        template,
        config: {
          provider: 'gemini',
          model
        },
        onProgress: (progress, message) => {
          setProgress(progress);
          setProgressMessage(message);
        }
      });

      clearInterval(intervalId);

      if (!blocks || blocks.length === 0) {
        throw new Error('생성된 블록이 없습니다. AI 응답을 확인하세요.');
      }

      onGenerate(blocks);
      onClose();

      // 성공 후 초기화
      setPrompt('');
      setProgress(0);
      setProgressMessage('');
      setElapsedTime(0);
    } catch (err: any) {
      clearInterval(intervalId);
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
              <p className="text-center text-lg font-mono text-gray-700">
                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-center text-xs text-gray-500">
                {elapsedTime < 30 ? 'AI 응답 생성 중...' : '조금만 더 기다려주세요...'}
              </p>
            </div>
          </div>
        ) : (
          // 입력 화면
          <form
            className="space-y-4 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerate();
            }}
          >
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

            {/* AI 서비스 정보 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Google Gemini AI 사용</span>
              </div>
              {!isAppInstalled && (
                <p className="text-xs text-blue-700 mt-1">
                  💡 <a href="/admin/settings/app-services" target="_blank" className="underline hover:no-underline">
                    AI Services 설정
                  </a>에서 Gemini 앱을 먼저 설치하세요.
                </p>
              )}
            </div>

            {/* 모델 선택 */}
            <div className="space-y-2">
              <Label>Gemini 모델</Label>
              <Select value={model} onValueChange={(v) => setModel(v as AIModel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {geminiModels.map(([key, name]) => (
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
              <Label>Google Gemini API 키</Label>
              <input
                type="password"
                autoComplete="off"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm"
                placeholder="AIza..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <div className="text-xs text-gray-500 space-y-1">
                <p>Google AI Studio에서 발급받은 API 키를 입력하세요</p>
                {!apiKey && (
                  <p className="text-blue-600">
                    💡 <a href="/admin/settings/app-services" target="_blank" className="underline hover:no-underline">
                      AI Services 설정
                    </a>에서 API 키를 미리 저장하면 자동으로 입력됩니다.
                  </p>
                )}
              </div>
            </div>

            {/* 프롬프트 입력 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>페이지 내용 설명</Label>
                <Button
                  type="button"
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

            {/* Submit handler - hidden */}
            <button type="submit" className="hidden" />
          </form>
        )}

        {!isGenerating && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="button" onClick={handleGenerate} disabled={!prompt.trim() || !apiKey.trim()}>
              <Sparkles className="mr-2 h-4 w-4" />
              페이지 생성
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};