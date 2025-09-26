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
import { AIPageGenerator, AIProvider, Block } from '@/services/ai/pageGenerator';

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
  const [template, setTemplate] = useState('landing');
  const [provider, setProvider] = useState<AIProvider['name']>('openai');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templates = [
    { key: 'landing', name: '랜딩 페이지', description: '제품이나 서비스를 소개하는 페이지' },
    { key: 'about', name: '회사 소개', description: '회사나 팀을 소개하는 페이지' },
    { key: 'product', name: '제품 소개', description: '제품의 특징과 장점을 설명' },
    { key: 'blog', name: '블로그 포스트', description: '블로그 형식의 글' },
  ];

  const providers = [
    { key: 'openai', name: 'OpenAI (GPT-4)', requiresKey: true },
    { key: 'claude', name: 'Claude', requiresKey: true },
    { key: 'gemini', name: 'Google Gemini', requiresKey: true },
    { key: 'mock', name: '테스트 모드', requiresKey: false },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('페이지 내용을 입력해주세요.');
      return;
    }

    const selectedProvider = providers.find(p => p.key === provider);
    if (selectedProvider?.requiresKey && !apiKey) {
      setError('API 키를 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const generator = new AIPageGenerator({
        name: provider === 'mock' ? 'openai' : provider as AIProvider['name'],
        apiKey: provider === 'mock' ? undefined : apiKey,
      });

      const blocks = provider === 'mock' 
        ? generator['generateMockBlocks'](prompt, template)
        : await generator.generateBlocks(prompt, template as any);

      onGenerate(blocks);
      onClose();
      
      // 성공 후 초기화
      setPrompt('');
      setApiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const examplePrompts = {
    landing: '네추어 플랫폼을 소개하는 랜딩 페이지를 만들어주세요. 드롭쉬핑, 포럼, 사이니지 기능을 강조해주세요.',
    about: '혁신적인 기술 스타트업 회사 소개 페이지를 만들어주세요.',
    product: 'AI 기반 콘텐츠 생성 도구를 소개하는 페이지를 만들어주세요.',
    blog: '2025년 웹 개발 트렌드에 대한 블로그 포스트를 작성해주세요.',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI 페이지 생성
          </DialogTitle>
          <DialogDescription>
            AI가 자동으로 페이지 콘텐츠를 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 템플릿 선택 */}
          <div className="space-y-2">
            <Label htmlFor="template">템플릿</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger id="template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AI 프로바이더 선택 */}
          <div className="space-y-2">
            <Label htmlFor="provider">AI 모델</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider['name'])}>
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

          {/* API 키 입력 (필요한 경우) */}
          {providers.find(p => p.key === provider)?.requiresKey && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">API 키</Label>
              <input
                id="apiKey"
                type="password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={`${provider === 'openai' ? 'sk-...' : provider === 'claude' ? 'sk-ant-...' : 'AIza...'}`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                API 키는 브라우저에만 저장되며 서버로 전송되지 않습니다.
              </p>
            </div>
          )}

          {/* 프롬프트 입력 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="prompt">페이지 내용 설명</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPrompt(examplePrompts[template as keyof typeof examplePrompts])}
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

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            취소
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                페이지 생성
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIPageGeneratorModal;