import { useState } from 'react';
import { Save, Palette, Type, Layout, Image as ImageIcon, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { useAdminNotices } from '@/hooks/useAdminNotices';

interface AppearanceSettingsData {
    // General
    favicon: string;
    logo: string;

    // Colors
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;

    // Typography
    headingFont: string;
    bodyFont: string;
    baseFontSize: string;

    // Layout
    containerWidth: string;
    mobileBreakpoint: string;
    tabletBreakpoint: string;
}

const fontOptions = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Noto Sans KR', label: 'Noto Sans KR' },
    { value: 'Pretendard', label: 'Pretendard' },
];

export default function AppearanceSettings() {
    const queryClient = useQueryClient();
    const { success, error } = useAdminNotices();
    const [activeTab, setActiveTab] = useState('general');

    const [settings, setSettings] = useState<AppearanceSettingsData>({
        favicon: '',
        logo: '',
        primaryColor: '#3b82f6',
        secondaryColor: '#10b981',
        accentColor: '#f59e0b',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        headingFont: 'Pretendard',
        bodyFont: 'Pretendard',
        baseFontSize: '16px',
        containerWidth: '1280px',
        mobileBreakpoint: '768px',
        tabletBreakpoint: '1024px',
    });

    // Fetch settings
    const { isLoading } = useQuery({
        queryKey: ['settings', 'appearance'],
        queryFn: async () => {
            try {
                // Try to fetch from new endpoint
                const response = await authClient.api.get('/settings/appearance');
                const data = response.data.data;
                if (data) {
                    setSettings(prev => ({ ...prev, ...data }));
                }
                return data;
            } catch (err) {
                // Fallback: try to get favicon from general settings if appearance settings don't exist yet
                try {
                    const genResponse = await authClient.api.get('/settings/general');
                    if (genResponse.data?.data?.favicon) {
                        setSettings(prev => ({ ...prev, favicon: genResponse.data.data.favicon }));
                    }
                } catch (e) {
                    console.log('No existing settings found');
                }
                return null;
            }
        }
    });

    // Save settings mutation
    const saveMutation = useMutation({
        mutationFn: async (data: AppearanceSettingsData) => {
            return authClient.api.put('/settings/appearance', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'appearance'] });
            success('외모 설정이 저장되었습니다.');
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : '설정 저장에 실패했습니다';
            error(message);
        }
    });

    const handleSave = () => {
        saveMutation.mutate(settings);
    };

    const handleChange = (field: keyof AppearanceSettingsData, value: any) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">외모 설정</h1>
                <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                >
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? '저장 중...' : '변경사항 저장'}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        일반
                    </TabsTrigger>
                    <TabsTrigger value="colors" className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        색상
                    </TabsTrigger>
                    <TabsTrigger value="typography" className="flex items-center gap-2">
                        <Type className="w-4 h-4" />
                        타이포그래피
                    </TabsTrigger>
                    <TabsTrigger value="layout" className="flex items-center gap-2">
                        <Layout className="w-4 h-4" />
                        레이아웃
                    </TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>사이트 아이덴티티</CardTitle>
                            <CardDescription>파비콘과 로고를 설정합니다</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="favicon">파비콘 URL</Label>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <Input
                                            id="favicon"
                                            value={settings.favicon}
                                            onChange={(e) => handleChange('favicon', e.target.value)}
                                            placeholder="https://example.com/favicon.ico"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            브라우저 탭에 표시되는 아이콘입니다 (.ico, .png, .svg)
                                        </p>
                                    </div>
                                    {settings.favicon && (
                                        <div className="w-10 h-10 border rounded flex items-center justify-center bg-gray-50">
                                            <img
                                                src={settings.favicon}
                                                alt="Favicon"
                                                className="w-6 h-6 object-contain"
                                                onError={(e: any) => e.target.style.display = 'none'}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="logo">사이트 로고 URL</Label>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <Input
                                            id="logo"
                                            value={settings.logo}
                                            onChange={(e) => handleChange('logo', e.target.value)}
                                            placeholder="https://example.com/logo.png"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            헤더에 표시될 로고 이미지입니다
                                        </p>
                                    </div>
                                    {settings.logo && (
                                        <div className="h-10 px-2 border rounded flex items-center justify-center bg-gray-50">
                                            <img
                                                src={settings.logo}
                                                alt="Logo"
                                                className="h-6 w-auto object-contain"
                                                onError={(e: any) => e.target.style.display = 'none'}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Colors Tab */}
                <TabsContent value="colors">
                    <Card>
                        <CardHeader>
                            <CardTitle>색상 팔레트</CardTitle>
                            <CardDescription>사이트의 전반적인 색상 테마를 설정합니다</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="primaryColor">Primary Color (주색상)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="primaryColor"
                                            type="color"
                                            value={settings.primaryColor}
                                            onChange={(e) => handleChange('primaryColor', e.target.value)}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={settings.primaryColor}
                                            onChange={(e) => handleChange('primaryColor', e.target.value)}
                                            className="font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="secondaryColor">Secondary Color (보조색상)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="secondaryColor"
                                            type="color"
                                            value={settings.secondaryColor}
                                            onChange={(e) => handleChange('secondaryColor', e.target.value)}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={settings.secondaryColor}
                                            onChange={(e) => handleChange('secondaryColor', e.target.value)}
                                            className="font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="accentColor">Accent Color (강조색상)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="accentColor"
                                            type="color"
                                            value={settings.accentColor}
                                            onChange={(e) => handleChange('accentColor', e.target.value)}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={settings.accentColor}
                                            onChange={(e) => handleChange('accentColor', e.target.value)}
                                            className="font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="backgroundColor">Background Color (배경색)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="backgroundColor"
                                            type="color"
                                            value={settings.backgroundColor}
                                            onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={settings.backgroundColor}
                                            onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                            className="font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="textColor">Text Color (텍스트색)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="textColor"
                                            type="color"
                                            value={settings.textColor}
                                            onChange={(e) => handleChange('textColor', e.target.value)}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={settings.textColor}
                                            onChange={(e) => handleChange('textColor', e.target.value)}
                                            className="font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Typography Tab */}
                <TabsContent value="typography">
                    <Card>
                        <CardHeader>
                            <CardTitle>타이포그래피</CardTitle>
                            <CardDescription>폰트 및 텍스트 스타일을 설정합니다</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="headingFont">제목 폰트 (Headings)</Label>
                                    <Select
                                        value={settings.headingFont}
                                        onValueChange={(value) => handleChange('headingFont', value)}
                                    >
                                        <SelectTrigger id="headingFont">
                                            <SelectValue placeholder="폰트 선택" />
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
                                    <Label htmlFor="bodyFont">본문 폰트 (Body)</Label>
                                    <Select
                                        value={settings.bodyFont}
                                        onValueChange={(value) => handleChange('bodyFont', value)}
                                    >
                                        <SelectTrigger id="bodyFont">
                                            <SelectValue placeholder="폰트 선택" />
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
                                    <Label htmlFor="baseFontSize">기본 폰트 크기</Label>
                                    <Select
                                        value={settings.baseFontSize}
                                        onValueChange={(value) => handleChange('baseFontSize', value)}
                                    >
                                        <SelectTrigger id="baseFontSize">
                                            <SelectValue placeholder="크기 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="14px">14px (Small)</SelectItem>
                                            <SelectItem value="16px">16px (Medium)</SelectItem>
                                            <SelectItem value="18px">18px (Large)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Layout Tab */}
                <TabsContent value="layout">
                    <Card>
                        <CardHeader>
                            <CardTitle>레이아웃 & 반응형</CardTitle>
                            <CardDescription>화면 크기 및 레이아웃 설정을 관리합니다</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="containerWidth">컨테이너 최대 너비</Label>
                                    <Input
                                        id="containerWidth"
                                        value={settings.containerWidth}
                                        onChange={(e) => handleChange('containerWidth', e.target.value)}
                                        placeholder="1280px"
                                    />
                                    <p className="text-xs text-gray-500">
                                        사이트 콘텐츠의 최대 너비를 설정합니다 (예: 1280px, 1440px)
                                    </p>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="mobileBreakpoint" className="flex items-center gap-2">
                                            <Smartphone className="w-4 h-4" />
                                            모바일 브레이크포인트
                                        </Label>
                                        <Input
                                            id="mobileBreakpoint"
                                            value={settings.mobileBreakpoint}
                                            onChange={(e) => handleChange('mobileBreakpoint', e.target.value)}
                                            placeholder="768px"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tabletBreakpoint" className="flex items-center gap-2">
                                            <Layout className="w-4 h-4" />
                                            태블릿 브레이크포인트
                                        </Label>
                                        <Input
                                            id="tabletBreakpoint"
                                            value={settings.tabletBreakpoint}
                                            onChange={(e) => handleChange('tabletBreakpoint', e.target.value)}
                                            placeholder="1024px"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
