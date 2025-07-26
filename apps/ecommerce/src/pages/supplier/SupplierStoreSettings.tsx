import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  useMySupplierProfile, 
  useUpdateSupplierProfile,
  useUploadSupplierLogo,
  useUploadSupplierBanner,
  useCheckSlugAvailability,
  useGenerateSlug
} from '@/hooks';
import { Button } from '@o4o/ui';
import { Input } from '@o4o/ui';
import { Textarea } from '@o4o/ui';
import { Label } from '@o4o/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@o4o/ui';
import { Alert, AlertDescription } from '@o4o/ui';
import { Skeleton } from '@o4o/ui';
import { 
  Store, 
  Upload, 
  Save, 
  AlertCircle, 
  CheckCircle,
  X,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@o4o/utils';

const profileSchema = z.object({
  storeName: z.string().min(2, '매장 이름은 2자 이상이어야 합니다').max(50),
  storeSlug: z.string()
    .min(3, 'URL은 3자 이상이어야 합니다')
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'URL은 소문자, 숫자, 하이픈(-)만 사용 가능합니다'),
  description: z.string().optional(),
  shippingPolicy: z.string().optional(),
  returnPolicy: z.string().optional(),
  warrantyPolicy: z.string().optional(),
  contactEmail: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  businessHours: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional()
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function SupplierStoreSettings() {
  const { data: profile, isLoading: profileLoading } = useMySupplierProfile();
  const updateProfile = useUpdateSupplierProfile();
  const uploadLogo = useUploadSupplierLogo();
  const uploadBanner = useUploadSupplierBanner();
  const generateSlug = useGenerateSlug();
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  
  const slugCheckResult = useCheckSlugAvailability(slugInput);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      storeName: '',
      storeSlug: '',
      description: '',
      shippingPolicy: '',
      returnPolicy: '',
      warrantyPolicy: '',
      contactEmail: '',
      contactPhone: '',
      businessHours: '',
      address: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  const watchedSlug = watch('storeSlug');

  // Load profile data
  useEffect(() => {
    if (profile) {
      setValue('storeName', profile.storeName || '');
      setValue('storeSlug', profile.storeSlug || '');
      setValue('description', profile.description || '');
      setValue('shippingPolicy', profile.shippingPolicy || '');
      setValue('returnPolicy', profile.returnPolicy || '');
      setValue('warrantyPolicy', profile.warrantyPolicy || '');
      setValue('contactEmail', profile.contactEmail || '');
      setValue('contactPhone', profile.contactPhone || '');
      setValue('businessHours', profile.businessHours || '');
      setValue('address', profile.address || '');
      setValue('city', profile.city || '');
      setValue('state', profile.state || '');
      setValue('zipCode', profile.zipCode || '');
      setSlugInput(profile.storeSlug || '');
    }
  }, [profile, setValue]);

  // Check slug when it changes
  useEffect(() => {
    if (watchedSlug && watchedSlug !== profile?.storeSlug) {
      setSlugInput(watchedSlug);
      setIsCheckingSlug(true);
      const timer = setTimeout(() => {
        setIsCheckingSlug(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [watchedSlug, profile?.storeSlug]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('로고 이미지는 5MB 이하여야 합니다.');
        return;
      }
      setLogoFile(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('배너 이미지는 10MB 이하여야 합니다.');
        return;
      }
      setBannerFile(file);
    }
  };

  const handleGenerateSlug = async () => {
    const storeName = watch('storeName');
    if (!storeName) {
      toast.error('먼저 매장 이름을 입력해주세요.');
      return;
    }

    generateSlug.mutate(storeName, {
      onSuccess: (data) => {
        setValue('storeSlug', data.slug);
        setSlugInput(data.slug);
      }
    });
  };

  const onSubmit = async (data: ProfileFormData) => {
    // Check slug availability
    if (data.storeSlug !== profile?.storeSlug && slugCheckResult.data && !slugCheckResult.data.available) {
      toast.error('이미 사용 중인 URL입니다.');
      return;
    }

    // Upload logo if changed
    if (logoFile) {
      try {
        await uploadLogo.mutateAsync(logoFile);
      } catch (error: any) {
        return;
      }
    }

    // Upload banner if changed
    if (bannerFile) {
      try {
        await uploadBanner.mutateAsync(bannerFile);
      } catch (error: any) {
        return;
      }
    }

    // Update profile
    updateProfile.mutate(data);
  };

  if (profileLoading) {
    return <SupplierStoreSettingsSkeleton />;
  }

  if (!profile) {
    return (
      <div className="container py-8">
        <Alert className="border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            판매자 프로필을 불러올 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const shopUrl = profile.storeSlug ? `/shop/${profile.storeSlug}` : null;

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">매장 설정</h1>
        <p className="text-gray-600 mt-2">
          매장 정보를 설정하고 고객에게 보여질 정보를 관리합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>
              매장의 기본 정보를 설정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Store Name */}
            <div>
              <Label htmlFor="storeName">매장 이름 *</Label>
              <Input
                id="storeName"
                {...register('storeName')}
                placeholder="예: 행복한 쇼핑몰"
                className="mt-1"
              />
              {errors.storeName && (
                <p className="text-sm text-red-600 mt-1">{errors.storeName.message}</p>
              )}
            </div>

            {/* Store Slug */}
            <div>
              <Label htmlFor="storeSlug">매장 URL *</Label>
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-1">neture.co.kr/shop/</span>
                    <Input
                      id="storeSlug"
                      {...register('storeSlug')}
                      placeholder="my-store"
                      className="flex-1"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateSlug}
                  disabled={generateSlug.isPending}
                >
                  자동 생성
                </Button>
              </div>
              {errors.storeSlug && (
                <p className="text-sm text-red-600 mt-1">{errors.storeSlug.message}</p>
              )}
              {watchedSlug && watchedSlug !== profile.storeSlug && (
                <div className="mt-1">
                  {isCheckingSlug ? (
                    <p className="text-sm text-gray-500">확인 중...</p>
                  ) : slugCheckResult.data ? (
                    <p className={cn(
                      "text-sm",
                      slugCheckResult.data.available ? "text-green-600" : "text-red-600"
                    )}>
                      {slugCheckResult.data.available ? (
                        <>
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          사용 가능한 URL입니다.
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          이미 사용 중인 URL입니다.
                        </>
                      )}
                    </p>
                  ) : null}
                </div>
              )}
              {shopUrl && (
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline mt-1 inline-flex items-center"
                >
                  매장 페이지 보기
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">매장 소개</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="매장을 소개하는 문구를 작성해주세요."
                rows={4}
                className="mt-1"
              />
            </div>

            {/* Logo */}
            <div>
              <Label>로고</Label>
              <div className="mt-2 flex items-start gap-4">
                {profile.logo || logoFile ? (
                  <div className="relative">
                    <img
                      src={logoFile ? URL.createObjectURL(logoFile) : profile.logo}
                      alt="매장 로고"
                      className="w-24 h-24 rounded-lg object-cover border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null);
                        // TODO: Remove logo from server
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <Store className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload">
                    <Button type="button" variant="outline" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        로고 업로드
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    권장 크기: 200x200px, 최대 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Banner */}
            <div>
              <Label>배너</Label>
              <div className="mt-2">
                {profile.banner || bannerFile ? (
                  <div className="relative">
                    <img
                      src={bannerFile ? URL.createObjectURL(bannerFile) : profile.banner}
                      alt="매장 배너"
                      className="w-full h-48 rounded-lg object-cover border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBannerFile(null);
                        // TODO: Remove banner from server
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">배너 이미지</p>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="hidden"
                  id="banner-upload"
                />
                <label htmlFor="banner-upload">
                  <Button type="button" variant="outline" className="mt-2" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      배너 업로드
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  권장 크기: 1920x480px, 최대 10MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>연락처 정보</CardTitle>
            <CardDescription>
              고객이 연락할 수 있는 정보를 입력합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactEmail">이메일</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  {...register('contactEmail')}
                  placeholder="contact@example.com"
                />
                {errors.contactEmail && (
                  <p className="text-sm text-red-600 mt-1">{errors.contactEmail.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="contactPhone">전화번호</Label>
                <Input
                  id="contactPhone"
                  {...register('contactPhone')}
                  placeholder="02-1234-5678"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="businessHours">영업 시간</Label>
              <Input
                id="businessHours"
                {...register('businessHours')}
                placeholder="평일 09:00-18:00, 주말 휴무"
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>위치 정보</CardTitle>
            <CardDescription>
              매장의 위치 정보를 입력합니다 (선택사항).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="서울시 강남구 테헤란로 123"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">시/구</Label>
                <Input
                  id="city"
                  {...register('city')}
                  placeholder="서울시"
                />
              </div>
              <div>
                <Label htmlFor="state">도/광역시</Label>
                <Input
                  id="state"
                  {...register('state')}
                  placeholder="서울"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">우편번호</Label>
                <Input
                  id="zipCode"
                  {...register('zipCode')}
                  placeholder="12345"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Policies */}
        <Card>
          <CardHeader>
            <CardTitle>정책</CardTitle>
            <CardDescription>
              배송, 반품, 보증 정책을 입력합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="shippingPolicy">배송 정책</Label>
              <Textarea
                id="shippingPolicy"
                {...register('shippingPolicy')}
                placeholder="배송 방법, 배송료, 배송 기간 등을 입력하세요."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="returnPolicy">반품/교환 정책</Label>
              <Textarea
                id="returnPolicy"
                {...register('returnPolicy')}
                placeholder="반품/교환 가능 기간, 조건, 비용 등을 입력하세요."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="warrantyPolicy">보증 정책</Label>
              <Textarea
                id="warrantyPolicy"
                {...register('warrantyPolicy')}
                placeholder="제품 보증 기간, 보증 범위 등을 입력하세요."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={!isDirty || updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                저장하기
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SupplierStoreSettingsSkeleton() {
  return (
    <div className="container py-8 max-w-4xl">
      <Skeleton className="h-10 w-48 mb-2" />
      <Skeleton className="h-6 w-96 mb-8" />
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}