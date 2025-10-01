import React, { useState, useRef, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, AlertCircle, X, Check } from 'lucide-react';
import { AIPageGenerator, AIProvider, Block, GenerateOptions, GEMINI_MODELS, OPENAI_MODELS, CLAUDE_MODELS } from '@/services/ai/pageGenerator';
import { AIApiKeyService } from '@/pages/settings/AISettings';
import { useNavigate } from 'react-router-dom';
import { PostGenerationEditor } from './PostGenerationEditor';
import { ImageUploader, UploadedImage } from './ImageUploader';

interface AIPageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (blocks: Block[]) => void;
}

const AIPageGeneratorModal: React.FC<AIPageGeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
}) => {
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState<AIProvider['name']>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useSavedKey, setUseSavedKey] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<Block[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const navigate = useNavigate();
  
  // 진행률 관련 상태
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  // AbortController를 위한 ref
  const abortControllerRef = useRef<AbortController | null>(null);
  const generatorRef = useRef<AIPageGenerator | null>(null);
  
  // 컴포넌트 마운트 시 저장된 API 키와 모델 로드
  useEffect(() => {
    const loadProviderSettings = async () => {
      try {
        const savedKey = await AIApiKeyService.getKey(provider);
        const savedModel = await AIApiKeyService.getDefaultModel(provider);
        
        if (savedKey) {
          setApiKey(savedKey);
          setUseSavedKey(true);
        } else {
          setApiKey('');
          setUseSavedKey(false);
        }
        
        if (savedModel) {
          setSelectedModel(savedModel);
        }
      } catch (error) {
        // Failed to load provider settings
        setApiKey('');
        setUseSavedKey(false);
      }
    };
    
    loadProviderSettings();
  }, [provider]);


  const providers = [
    { key: 'gemini', name: 'Google Gemini (추천)', requiresKey: true },
    { key: 'openai', name: 'OpenAI (GPT-4)', requiresKey: true },
    { key: 'claude', name: 'Claude', requiresKey: true },
    { key: 'mock', name: '테스트 모드', requiresKey: false },
  ];
  
  // 프로바이더에 따른 모델 목록
  const getModelsForProvider = (providerName: string) => {
    switch (providerName) {
      case 'gemini':
        return Object.entries(GEMINI_MODELS);
      case 'openai':
        return Object.entries(OPENAI_MODELS);
      case 'claude':
        return Object.entries(CLAUDE_MODELS);
      default:
        return [];
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('페이지 내용을 입력해주세요.');
      return;
    }

    const selectedProvider = providers.find(p => p.key === provider);
    
    // API 키 확인 - 저장된 키 또는 입력된 키 사용
    let finalApiKey = apiKey;
    if (useSavedKey && selectedProvider?.requiresKey) {
      const savedKey = await AIApiKeyService.getKey(provider);
      if (savedKey) {
        finalApiKey = savedKey;
      }
    }
    
    if (selectedProvider?.requiresKey && !finalApiKey) {
      setError('API 키가 필요합니다. 설정에서 API 키를 등록하거나 직접 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setProgressMessage('준비 중...');

    // AbortController 생성
    abortControllerRef.current = new AbortController();

    try {
      const generator = new AIPageGenerator({
        name: provider === 'mock' ? 'openai' : provider as AIProvider['name'],
        apiKey: provider === 'mock' ? undefined : finalApiKey,
        model: provider === 'mock' ? undefined : selectedModel,
      });
      
      generatorRef.current = generator;

      // 진행률 콜백
      const onProgress = (progress: number, message: string) => {
        setProgress(progress);
        setProgressMessage(message);
      };

      // 이미지 분석 결과 수집
      const imageAnalyses = uploadedImages
        .filter(img => img.analysis) // 분석이 완료된 이미지만
        .map(img => img.analysis!);

      const options: GenerateOptions = {
        prompt,
        onProgress,
        signal: abortControllerRef.current.signal,
        imageAnalyses, // Vision AI 분석 결과 전달
      };

      const blocks = provider === 'mock' 
        ? await generator.generateBlocks(options)
        : await generator.generateBlocks(options);

      // 생성 후 편집 인터페이스 표시
      setGeneratedBlocks(blocks);
      setShowEditor(true);
      
      // 성공 후 초기화
      setPrompt('');
      setApiKey('');
      setProgress(0);
      setProgressMessage('');
    } catch (err: any) {
      if (err.message === '생성이 취소되었습니다') {
        setError('생성이 취소되었습니다.');
      } else {
        setError(err instanceof Error ? err.message : 'AI 생성 중 오류가 발생했습니다.');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      generatorRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (generatorRef.current) {
      generatorRef.current.cancel();
    }
    setIsGenerating(false);
    setProgress(0);
    setProgressMessage('');
  };

  const handleClose = () => {
    if (isGenerating) {
      handleCancel();
    }
    if (showEditor) {
      setShowEditor(false);
      setGeneratedBlocks([]);
    } else {
      onClose();
    }
  };

  // 편집 완료 후 페이지에 적용
  const handleEditorSave = (editedBlocks: Block[]) => {
    onGenerate(editedBlocks);
    setShowEditor(false);
    setGeneratedBlocks([]);
    onClose();
  };

  // 편집 취소
  const handleEditorCancel = () => {
    setShowEditor(false);
    setGeneratedBlocks([]);
  };

  // 이미지 업로드 처리
  const handleImagesChange = (images: UploadedImage[]) => {
    setUploadedImages(images);
  };

  const examplePrompts = [
    '네추어 플랫폼을 소개하는 랜딩 페이지를 만들어주세요. 드롭쉽핑, 포럼, 사이니지 기능을 강조해주세요.',
    '혁신적인 기술 스타트업 회사 소개 페이지를 만들어주세요.',
    'AI 기반 콘텐츠 생성 도구를 소개하는 페이지를 만들어주세요.',
    '2025년 웹 개발 트렌드에 대한 블로그 포스트를 작성해주세요.',
    '창의적인 포트폴리오 페이지를 만들어주세요.',
    '역동적인 이벤트 소개 페이지를 만들어주세요.',
    '미니멀한 아티스트 갤러리 페이지를 만들어주세요.',
    '인터랙티브한 FAQ 페이지를 만들어주세요.',
  ];

  return (
    <>
      <PostGenerationEditor
        isOpen={showEditor}
        onClose={handleEditorCancel}
        onSave={handleEditorSave}
        initialBlocks={generatedBlocks}
      />
      
      <Dialog open={isOpen && !showEditor} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI 페이지 생성
            </div>
            {isGenerating && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                취소
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            AI가 자동으로 페이지 콘텐츠를 생성합니다.
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          // 진행 중 화면
          <div className="space-y-4 py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
              <p className="text-sm font-medium">{progressMessage}</p>
              <p className="text-xs text-muted-foreground">잠시만 기다려주세요...</p>
            </div>
            
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">{progress}%</p>
            </div>

            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                생성 취소
              </Button>
            </div>
          </div>
        ) : (
          // 입력 화면
          <div className="space-y-4 py-4">
            {/* AI 프로바이더 선택 */}
            <div className="space-y-2">
              <Label htmlFor="provider">AI 서비스</Label>
              <Select value={provider} onValueChange={(v) => {
                setProvider(v as AIProvider['name']);
                // 프로바이더 변경 시 기본 모델 설정
                if (v === 'gemini') setSelectedModel('gemini-2.5-flash');
                else if (v === 'openai') setSelectedModel('gpt-4-turbo');
                else if (v === 'claude') setSelectedModel('claude-3-sonnet-20240229');
              }}>
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {!p.requiresKey && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            무료
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 모델 선택 (프로바이더별) */}
            {provider !== 'mock' && (
              <div className="space-y-2">
                <Label htmlFor="model">모델 선택</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger id="model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getModelsForProvider(provider).map(([key, name]) => (
                      <SelectItem key={key} value={key}>
                        <div className="text-sm">
                          <div>{key}</div>
                          <div className="text-xs text-muted-foreground">{name}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* API 키 설정 */}
            {providers.find(p => p.key === provider)?.requiresKey && (
              <div className="space-y-2">
                <Label>API 키 설정</Label>
                {AIApiKeyService.getKey(provider) ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800">저장된 API 키 사용 중</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/settings/ai')}
                      >
                        설정 변경
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        API 키가 설정되지 않았습니다.
                        <Button
                          variant="link"
                          size="sm"
                          className="ml-2 p-0 h-auto"
                          onClick={() => navigate('/settings/ai')}
                        >
                          설정으로 이동
                        </Button>
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="use-temp-key"
                        checked={!useSavedKey}
                        onChange={(e) => setUseSavedKey(!e.target.checked)}
                      />
                      <Label htmlFor="use-temp-key" className="text-sm cursor-pointer">
                        임시 API 키 사용
                      </Label>
                    </div>
                    
                    {!useSavedKey && (
                      <form onSubmit={(e) => e.preventDefault()}>
                        <input
                          id="apiKey"
                          type="password"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder={`${provider === 'openai' ? 'sk-...' : provider === 'claude' ? 'sk-ant-...' : 'AIza...'}`}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          autoComplete="off"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          임시 키는 이번 생성에만 사용됩니다.
                        </p>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 프롬프트 입력 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="prompt">페이지 내용 설명</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const randomExample = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
                    setPrompt(randomExample);
                  }}
                >
                  예시 사용
                </Button>
              </div>
              <Textarea
                id="prompt"
                placeholder="어떤 페이지를 만들까요? 자세히 설명해주세요..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                페이지의 목적, 타겟 고객, 주요 내용 등을 자세히 설명하면 더 좋은 결과를 얻을 수 있습니다.
              </p>
            </div>

            {/* 이미지 업로드 */}
            <div className="space-y-2">
              <Label>참고 이미지 (선택사항)</Label>
              <ImageUploader
                onImagesChange={handleImagesChange}
                maxImages={3}
                maxSizeMB={5}
                enableVisionAI={provider !== 'mock'}
                className=""
              />
              <p className="text-xs text-muted-foreground">
                이미지를 업로드하면 AI가 이미지를 분석하여 페이지 생성에 반영합니다.
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
            <Button variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button onClick={handleGenerate}>
              <Sparkles className="mr-2 h-4 w-4" />
              페이지 생성
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
      </Dialog>
    </>
  );
};

export default AIPageGeneratorModal;