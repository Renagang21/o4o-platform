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
import { Loader2, Sparkles, AlertCircle, Link2, FileText } from 'lucide-react';
import { simpleAIGenerator, AI_MODELS, type AIModel, type Block, type GenerateResult } from '@/services/ai/SimpleAIGenerator';
import { AppSystemKeyService } from '@/services/app-system-keys.service';
import { authClient } from '@o4o/auth-client';

interface SimpleAIModalProps {
  isOpen: boolean;
  mode?: 'new' | 'edit';
  currentBlocks?: Block[];
  onClose: () => void;
  onGenerate: (result: GenerateResult) => void;
  onBackup?: () => void;
  onRestore?: () => void;
}

export const SimpleAIModal: React.FC<SimpleAIModalProps> = ({
  isOpen,
  mode = 'new',
  currentBlocks = [],
  onClose,
  onGenerate,
  onBackup,
  onRestore,
}) => {
  const [prompt, setPrompt] = useState('');
  const [template, setTemplate] = useState<'landing' | 'about' | 'product' | 'blog'>('landing');
  const [editMode, setEditMode] = useState<'enhance' | 'rewrite' | 'summarize' | 'translate'>('enhance');
  const [model, setModel] = useState<AIModel>('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // WO-O4O-AI-BLOCK-GENERATION-V1: URL 모드 상태
  const [sourceMode, setSourceMode] = useState<'prompt' | 'url'>('prompt');
  const [urlInput, setUrlInput] = useState('');
  const [urlContentType, setUrlContentType] = useState<'document' | 'explanatory'>('document');
  const [urlTone, setUrlTone] = useState<'normal' | 'professional' | 'store'>('normal');

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

  // WO-O4O-AI-BLOCK-GENERATION-V1: URL → Block[] 생성
  const handleGenerateFromUrl = async () => {
    if (!urlInput.trim()) {
      setError('URL을 입력해주세요.');
      return;
    }
    try {
      new URL(urlInput.trim());
    } catch {
      setError('올바른 URL 형식이 아닙니다. (예: https://example.com)');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(10);
    setProgressMessage('URL 콘텐츠 분석 중...');
    setElapsedTime(0);

    const startTime = Date.now();
    const intervalId = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      setProgress(30);
      setProgressMessage('AI 블록 생성 중...');

      const response = await authClient.api.post('/ai/url-to-blocks', {
        url: urlInput.trim(),
        contentType: urlContentType,
        tone: urlTone,
      });

      clearInterval(intervalId);

      const data = response.data as { success: boolean; blocks?: Block[]; error?: string };

      if (!data.success || !data.blocks || data.blocks.length === 0) {
        throw new Error(data.error || '블록 생성 결과가 없습니다.');
      }

      setProgress(100);
      setProgressMessage('완료!');

      onGenerate({ blocks: data.blocks });
      onClose();
      setUrlInput('');
      setProgress(0);
      setProgressMessage('');
      setElapsedTime(0);
    } catch (err: any) {
      clearInterval(intervalId);
      const message = err?.response?.data?.error || err.message || 'URL 블록 생성 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError(mode === 'new' ? '페이지 내용을 입력해주세요.' : '편집 요청 사항을 입력해주세요.');
      return;
    }

    // Sprint 2: API key check removed - server proxy handles authentication
    // API key is optional and only used for App System settings

    // Backup current blocks before editing
    if (mode === 'edit' && onBackup) {
      onBackup();
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
      let finalPrompt = prompt;

      // 편집 모드와 신규 모드를 완전히 다르게 처리
      if (mode === 'edit') {
        // 편집 모드: 사용자의 요청만 사용 (기존 내용 포함하지 않음)
        // 예: "상단에 제목으로 '테스트' 추가해줘" → AI가 해당 블록만 생성
        finalPrompt = prompt;
      } else {
        // 신규 모드: 프롬프트를 그대로 사용하여 전체 페이지 생성
        finalPrompt = prompt;
      }

      // 프롬프트 길이 체크 및 차단
      if (finalPrompt.length > 5000) {
        clearInterval(intervalId);
        setIsGenerating(false);
        setError(
          mode === 'edit'
            ? `편집할 내용이 너무 많습니다 (${finalPrompt.length}자). 페이지를 나누거나 일부 내용을 먼저 삭제한 후 다시 시도해주세요.`
            : `프롬프트가 너무 깁니다 (${finalPrompt.length}자). 더 짧게 요청해주세요.`
        );
        return;
      }

      const result = await simpleAIGenerator.generatePage({
        prompt: finalPrompt,
        template: mode === 'new' ? template : 'blog', // Use blog template for edit mode
        config: {
          provider: 'gemini',
          model,
          // Don't specify maxTokens here - let SimpleAIGenerator use its defaults
          // (16384 for Gemini, 8192 for others)
        },
        onProgress: (progress, message) => {
          setProgress(progress);
          setProgressMessage(message);
        }
      });

      clearInterval(intervalId);

      if (!result.blocks || result.blocks.length === 0) {
        throw new Error('생성된 블록이 없습니다. AI 응답을 확인하세요.');
      }

      onGenerate(result);
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

  const editModes = [
    { key: 'enhance', name: '내용 보완', description: '기존 내용을 유지하면서 보완하고 개선' },
    { key: 'rewrite', name: '전체 재작성', description: '기존 내용을 완전히 새롭게 작성' },
    { key: 'summarize', name: '요약', description: '기존 내용을 간결하게 요약' },
    { key: 'translate', name: '번역', description: '다른 언어로 번역' },
  ];

  const examplePrompts = {
    landing: '혁신적인 AI 기반 웹사이트 빌더를 소개하는 랜딩 페이지를 만들어주세요.',
    about: '창의적이고 혁신적인 기술 스타트업 회사 소개 페이지를 만들어주세요.',
    product: '차세대 AI 콘텐츠 생성 도구를 소개하는 제품 페이지를 만들어주세요.',
    blog: '2025년 AI와 웹 개발의 미래 트렌드에 대한 블로그 포스트를 작성해주세요.',
  };

  // 편집 모드 예시 - 위치 기반 블록 추가/수정 요청
  const editExamplePrompt = '상단에 제목으로 "환영합니다" 추가하고, 그 아래에 소개 문구 단락을 추가해주세요';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {mode === 'new' ? 'AI 페이지 제작 (2025)' : 'AI 페이지 편집 (2025)'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'new'
              ? '최신 AI 모델로 자동으로 페이지 콘텐츠를 생성합니다.'
              : '최신 AI 모델로 기존 페이지를 편집합니다. 원본은 자동으로 백업됩니다.'}
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
              if (sourceMode === 'url') handleGenerateFromUrl();
              else handleGenerate();
            }}
          >
            {/* WO-O4O-AI-BLOCK-GENERATION-V1: 소스 모드 탭 (신규 모드에서만) */}
            {mode === 'new' && (
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setSourceMode('prompt'); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                    sourceMode === 'prompt'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  직접 입력
                </button>
                <button
                  type="button"
                  onClick={() => { setSourceMode('url'); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                    sourceMode === 'url'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Link2 className="w-4 h-4" />
                  URL에서 생성
                </button>
              </div>
            )}

            {/* URL 모드 폼 */}
            {sourceMode === 'url' && mode === 'new' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>URL</Label>
                  <input
                    type="url"
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm"
                    placeholder="https://example.com/article"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">공개 접근 가능한 URL을 입력하세요</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>콘텐츠 유형</Label>
                    <Select value={urlContentType} onValueChange={(v: any) => setUrlContentType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="document">문서형</SelectItem>
                        <SelectItem value="explanatory">설명형</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>톤</Label>
                    <Select value={urlTone} onValueChange={(v: any) => setUrlTone(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">일반</SelectItem>
                        <SelectItem value="professional">전문</SelectItem>
                        <SelectItem value="store">매장용</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* 신규 모드에서만 템플릿 선택 표시 */}
            {sourceMode === 'prompt' && mode === 'new' && (
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
            )}

            {/* 직접 입력 모드: AI 서비스 정보 + 모델 + API 키 + 프롬프트 */}
            {sourceMode === 'prompt' && (
              <>
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
                    <Label>{mode === 'new' ? '페이지 내용 설명' : '편집 요청 사항'}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPrompt(mode === 'new' ? examplePrompts[template] : editExamplePrompt)}
                    >
                      예시 사용
                    </Button>
                  </div>
                  <Textarea
                    placeholder={mode === 'new'
                      ? '어떤 페이지를 만들까요? 자세히 설명해주세요...'
                      : '어떻게 편집할까요? 구체적으로 설명해주세요...'}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    {mode === 'new'
                      ? '페이지의 목적, 타겟 고객, 주요 내용 등을 자세히 설명하면 더 좋은 결과를 얻을 수 있습니다.'
                      : '편집 방향을 구체적으로 설명하면 더 정확한 결과를 얻을 수 있습니다.'}
                  </p>
                </div>
              </>
            )}

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
            {mode === 'edit' && onRestore && (
              <Button type="button" variant="outline" onClick={onRestore} className="mr-auto">
                원본 복원
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            {sourceMode === 'url' && mode === 'new' ? (
              <Button type="button" onClick={handleGenerateFromUrl} disabled={!urlInput.trim()}>
                <Link2 className="mr-2 h-4 w-4" />
                URL로 생성
              </Button>
            ) : (
              <Button type="button" onClick={handleGenerate} disabled={!prompt.trim() || !apiKey.trim()}>
                <Sparkles className="mr-2 h-4 w-4" />
                {mode === 'new' ? '페이지 생성' : '편집 적용'}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};