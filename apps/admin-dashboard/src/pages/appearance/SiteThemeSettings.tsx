import { useState } from 'react';
import { Save, Palette, Type, Layout as LayoutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { DesignTokens, defaultTokens } from '@o4o/appearance-system';

const fontOptions = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Noto Sans KR, sans-serif', label: 'Noto Sans KR' },
  { value: 'Pretendard, sans-serif', label: 'Pretendard' },
  { value: 'Spoqa Han Sans Neo, sans-serif', label: 'Spoqa Han Sans Neo' },
];

export default function SiteThemeSettings() {
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [tokens, setTokens] = useState<DesignTokens>(defaultTokens);

  // Fetch theme settings
  const { isLoading } = useQuery({
    queryKey: ['settings', 'theme'],
    queryFn: async () => {
      const response = await authClient.api.get('/settings/theme');
      const data = response.data.data;
      if (data && data.designTokens) {
        setTokens(data.designTokens);
      }
      return data;
    }
  });

  // Save theme settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { designTokens: DesignTokens }) => {
      return authClient.api.put('/settings/theme', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'theme'] });
      success('테마 설정이 저장되었습니다.');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : '테마 설정 저장에 실패했습니다';
      error(message);
    }
  });

  const handleSave = () => {
    saveMutation.mutate({ designTokens: tokens });
  };

  const handleColorChange = (field: keyof typeof tokens.colors, value: string) => {
    setTokens((prev) => ({
      ...prev,
      colors: { ...prev.colors, [field]: value }
    }));
  };

  const handleTypographyChange = (field: string, value: string | number) => {
    setTokens((prev) => ({
      ...prev,
      typography: { ...prev.typography, [field]: value }
    }));
  };

  const handleSpacingChange = (field: keyof typeof tokens.spacing, value: number) => {
    setTokens((prev) => ({
      ...prev,
      spacing: { ...prev.spacing, [field]: value }
    }));
  };

  const handleRadiusChange = (field: keyof typeof tokens.radius, value: number) => {
    setTokens((prev) => ({
      ...prev,
      radius: { ...prev.radius, [field]: `${value}px` }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">사이트 테마 설정</h1>
          <p className="text-gray-500 mt-1">
            사이트 전체의 색상, 타이포그래피, 레이아웃을 설정합니다
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? '저장 중...' : '설정 저장'}
        </Button>
      </div>

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            색상
          </TabsTrigger>
          <TabsTrigger value="typography" className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            타이포그래피
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex items-center gap-2">
            <LayoutIcon className="w-4 h-4" />
            레이아웃
          </TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Primary Colors</CardTitle>
              <CardDescription>브랜드의 주요 색상을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary"
                      type="color"
                      value={tokens.colors.primary}
                      onChange={(e) => handleColorChange('primary', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={tokens.colors.primary}
                      onChange={(e) => handleColorChange('primary', e.target.value)}
                      placeholder="#2563EB"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primarySoft">Primary Soft</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primarySoft"
                      type="color"
                      value={tokens.colors.primarySoft}
                      onChange={(e) => handleColorChange('primarySoft', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={tokens.colors.primarySoft}
                      onChange={(e) => handleColorChange('primarySoft', e.target.value)}
                      placeholder="#EFF6FF"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Background Colors</CardTitle>
              <CardDescription>사이트와 컴포넌트의 배경색을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="background">Background</Label>
                  <div className="flex gap-2">
                    <Input
                      id="background"
                      type="color"
                      value={tokens.colors.background}
                      onChange={(e) => handleColorChange('background', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={tokens.colors.background}
                      onChange={(e) => handleColorChange('background', e.target.value)}
                      placeholder="#F9FAFB"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500">사이트 전체 배경색</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surface">Surface</Label>
                  <div className="flex gap-2">
                    <Input
                      id="surface"
                      type="color"
                      value={tokens.colors.surface}
                      onChange={(e) => handleColorChange('surface', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={tokens.colors.surface}
                      onChange={(e) => handleColorChange('surface', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500">카드, 섹션 배경색</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surfaceMuted">Surface Muted</Label>
                  <div className="flex gap-2">
                    <Input
                      id="surfaceMuted"
                      type="color"
                      value={tokens.colors.surfaceMuted}
                      onChange={(e) => handleColorChange('surfaceMuted', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={tokens.colors.surfaceMuted}
                      onChange={(e) => handleColorChange('surfaceMuted', e.target.value)}
                      placeholder="#F3F4F6"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500">서브 섹션 배경색</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="borderSubtle">Border Subtle</Label>
                  <div className="flex gap-2">
                    <Input
                      id="borderSubtle"
                      type="color"
                      value={tokens.colors.borderSubtle}
                      onChange={(e) => handleColorChange('borderSubtle', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={tokens.colors.borderSubtle}
                      onChange={(e) => handleColorChange('borderSubtle', e.target.value)}
                      placeholder="#E5E7EB"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500">부드러운 테두리 색</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Text Colors</CardTitle>
              <CardDescription>텍스트 색상을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="textPrimary">Text Primary</Label>
                  <div className="flex gap-2">
                    <Input
                      id="textPrimary"
                      type="color"
                      value={tokens.colors.textPrimary}
                      onChange={(e) => handleColorChange('textPrimary', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={tokens.colors.textPrimary}
                      onChange={(e) => handleColorChange('textPrimary', e.target.value)}
                      placeholder="#111827"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500">기본 텍스트 색상</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="textMuted">Text Muted</Label>
                  <div className="flex gap-2">
                    <Input
                      id="textMuted"
                      type="color"
                      value={tokens.colors.textMuted}
                      onChange={(e) => handleColorChange('textMuted', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={tokens.colors.textMuted}
                      onChange={(e) => handleColorChange('textMuted', e.target.value)}
                      placeholder="#6B7280"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500">보조 텍스트 색상</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Font Families</CardTitle>
              <CardDescription>제목과 본문에 사용할 글꼴을 선택합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fontFamilyHeading">Heading Font</Label>
                  <Select
                    value={tokens.typography.fontFamilyHeading}
                    onValueChange={(value) => handleTypographyChange('fontFamilyHeading', value)}
                  >
                    <SelectTrigger id="fontFamilyHeading">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fontFamilyBody">Body Font</Label>
                  <Select
                    value={tokens.typography.fontFamilyBody}
                    onValueChange={(value) => handleTypographyChange('fontFamilyBody', value)}
                  >
                    <SelectTrigger id="fontFamilyBody">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Base Typography</CardTitle>
              <CardDescription>기본 글꼴 크기와 줄 간격을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fontSizeBase">Base Font Size</Label>
                    <span className="text-sm text-gray-500">{tokens.typography.fontSizeBase}</span>
                  </div>
                  <Slider
                    id="fontSizeBase"
                    min={14}
                    max={18}
                    step={1}
                    value={[parseInt(tokens.typography.fontSizeBase)]}
                    onValueChange={(value) => handleTypographyChange('fontSizeBase', `${value[0]}px`)}
                  />
                  <p className="text-xs text-gray-500">14px - 18px</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lineHeightBase">Base Line Height</Label>
                    <span className="text-sm text-gray-500">{tokens.typography.lineHeightBase}</span>
                  </div>
                  <Slider
                    id="lineHeightBase"
                    min={1.4}
                    max={1.8}
                    step={0.1}
                    value={[tokens.typography.lineHeightBase]}
                    onValueChange={(value) => handleTypographyChange('lineHeightBase', value[0])}
                  />
                  <p className="text-xs text-gray-500">1.4 - 1.8</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Spacing</CardTitle>
              <CardDescription>섹션과 블록 간격을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sectionY">Section Padding (Y)</Label>
                    <span className="text-sm text-gray-500">{tokens.spacing.sectionY}px</span>
                  </div>
                  <Slider
                    id="sectionY"
                    min={64}
                    max={120}
                    step={8}
                    value={[tokens.spacing.sectionY]}
                    onValueChange={(value) => handleSpacingChange('sectionY', value[0])}
                  />
                  <p className="text-xs text-gray-500">섹션의 세로 패딩 (64px - 120px)</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="blockGap">Block Gap</Label>
                    <span className="text-sm text-gray-500">{tokens.spacing.blockGap}px</span>
                  </div>
                  <Slider
                    id="blockGap"
                    min={16}
                    max={40}
                    step={4}
                    value={[tokens.spacing.blockGap]}
                    onValueChange={(value) => handleSpacingChange('blockGap', value[0])}
                  />
                  <p className="text-xs text-gray-500">블록 간 간격 (16px - 40px)</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="gridGap">Grid Gap</Label>
                    <span className="text-sm text-gray-500">{tokens.spacing.gridGap}px</span>
                  </div>
                  <Slider
                    id="gridGap"
                    min={16}
                    max={40}
                    step={4}
                    value={[tokens.spacing.gridGap]}
                    onValueChange={(value) => handleSpacingChange('gridGap', value[0])}
                  />
                  <p className="text-xs text-gray-500">그리드 간격 (16px - 40px)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Border Radius</CardTitle>
              <CardDescription>컴포넌트의 모서리 둥글기를 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="radiusSm">Small</Label>
                    <span className="text-sm text-gray-500">{tokens.radius.sm}</span>
                  </div>
                  <Slider
                    id="radiusSm"
                    min={0}
                    max={8}
                    step={1}
                    value={[parseInt(tokens.radius.sm)]}
                    onValueChange={(value) => handleRadiusChange('sm', value[0])}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="radiusMd">Medium</Label>
                    <span className="text-sm text-gray-500">{tokens.radius.md}</span>
                  </div>
                  <Slider
                    id="radiusMd"
                    min={0}
                    max={12}
                    step={1}
                    value={[parseInt(tokens.radius.md)]}
                    onValueChange={(value) => handleRadiusChange('md', value[0])}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="radiusLg">Large</Label>
                    <span className="text-sm text-gray-500">{tokens.radius.lg}</span>
                  </div>
                  <Slider
                    id="radiusLg"
                    min={0}
                    max={16}
                    step={1}
                    value={[parseInt(tokens.radius.lg)]}
                    onValueChange={(value) => handleRadiusChange('lg', value[0])}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>현재 설정의 미리보기</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            style={{
              backgroundColor: tokens.colors.background,
              padding: '2rem',
              borderRadius: tokens.radius.lg,
            }}
          >
            <div
              style={{
                backgroundColor: tokens.colors.surface,
                padding: '2rem',
                borderRadius: tokens.radius.md,
                border: `1px solid ${tokens.colors.borderSubtle}`,
              }}
            >
              <h2
                style={{
                  fontFamily: tokens.typography.fontFamilyHeading,
                  color: tokens.colors.textPrimary,
                  fontSize: '1.5rem',
                  marginBottom: '1rem',
                }}
              >
                Sample Heading
              </h2>
              <p
                style={{
                  fontFamily: tokens.typography.fontFamilyBody,
                  color: tokens.colors.textMuted,
                  fontSize: tokens.typography.fontSizeBase,
                  lineHeight: tokens.typography.lineHeightBase,
                  marginBottom: '1rem',
                }}
              >
                This is a sample paragraph showing how your typography settings will look.
                이것은 한글 텍스트 미리보기입니다.
              </p>
              <button
                style={{
                  backgroundColor: tokens.colors.primary,
                  color: '#ffffff',
                  padding: '0.5rem 1rem',
                  borderRadius: tokens.radius.sm,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Sample Button
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? '저장 중...' : '설정 저장'}
        </Button>
      </div>
    </div>
  );
}
