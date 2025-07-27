import { useState, FC } from 'react';
import { Plus, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import toast from 'react-hot-toast';

interface CategoryAttribute {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  level: number;
  path: string[];
  active: boolean;
  order: number;
  image?: string;
  attributes?: CategoryAttribute[];
  shippingPolicy?: {
    freeShippingThreshold?: number;
    baseShippingFee?: number;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  productCount: number;
  children?: ProductCategory[];
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  parentId?: string;
  active: boolean;
  attributes: CategoryAttribute[];
  shippingPolicy: {
    freeShippingThreshold: number;
    baseShippingFee: number;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
}

const ProductCategories: FC = () => {
  const queryClient = useQueryClient();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    description: '',
    parentId: undefined,
    active: true,
    attributes: [],
    shippingPolicy: {
      freeShippingThreshold: 50000,
      baseShippingFee: 3000
    },
    seo: {
      title: '',
      description: '',
      keywords: ''
    }
  });
  const [newAttribute, setNewAttribute] = useState<CategoryAttribute>({
    key: '',
    label: '',
    type: 'text',
    required: false
  });

  // Fetch categories
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/ecommerce/categories/tree');
      return response.data;
    }
  });
  const categories = categoriesData?.data || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await authClient.api.post('/v1/ecommerce/categories', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('카테고리가 생성되었습니다');
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      handleCloseDialog();
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryFormData }) => {
      const response = await authClient.api.put(`/v1/ecommerce/categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('카테고리가 수정되었습니다');
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      handleCloseDialog();
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await authClient.api.delete(`/v1/ecommerce/categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('카테고리가 삭제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
    }
  });

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleOpenDialog = (category?: ProductCategory, parentId?: string) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        parentId: category.parentId,
        active: category.active,
        attributes: category.attributes || [],
        shippingPolicy: {
          freeShippingThreshold: category.shippingPolicy?.freeShippingThreshold || 50000,
          baseShippingFee: category.shippingPolicy?.baseShippingFee || 3000
        },
        seo: {
          title: category.seo?.title || '',
          description: category.seo?.description || '',
          keywords: category.seo?.keywords?.join(', ') || ''
        }
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        parentId: parentId,
        active: true,
        attributes: [],
        shippingPolicy: {
          freeShippingThreshold: 50000,
          baseShippingFee: 3000
        },
        seo: {
          title: '',
          description: '',
          keywords: ''
        }
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      parentId: undefined,
      active: true,
      attributes: [],
      shippingPolicy: {
        freeShippingThreshold: 50000,
        baseShippingFee: 3000
      },
      seo: {
        title: '',
        description: '',
        keywords: ''
      }
    });
    setNewAttribute({
      key: '',
      label: '',
      type: 'text',
      required: false
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: any = {
      ...formData,
      seo: {
        ...formData.seo,
        keywords: formData.seo.keywords.split(',').map((k: string) => k.trim()).filter(k => k)
      }
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (category: ProductCategory) => {
    if (category.children && category.children.length > 0) {
      toast.error('하위 카테고리가 있는 카테고리는 삭제할 수 없습니다');
      return;
    }

    if (category.productCount > 0) {
      toast.error('상품이 등록된 카테고리는 삭제할 수 없습니다');
      return;
    }

    if (confirm(`"${category.name}" 카테고리를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const handleAddAttribute = () => {
    if (!newAttribute.key || !newAttribute.label) {
      toast.error('속성 키와 라벨을 입력하세요');
      return;
    }

    setFormData(prev => ({
      ...prev,
      attributes: [...prev.attributes, { ...newAttribute }]
    }));

    setNewAttribute({
      key: '',
      label: '',
      type: 'text',
      required: false
    });
  };

  const handleRemoveAttribute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }));
  };

  const renderCategory = (category: ProductCategory, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id}>
        <div 
          className={`flex items-center justify-between p-4 hover:bg-modern-bg-hover border-b border-modern-border-primary ${
            level > 0 ? `ml-${level * 8}` : ''
          }`}
          style={{ marginLeft: `${level * 2}rem` }}
        >
          <div className="flex items-center gap-3">
            {hasChildren && (
              <button
                onClick={() => toggleExpanded(category.id)}
                className="p-1 hover:bg-modern-bg-tertiary rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}
            
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-modern-text-primary">{category.name}</h4>
                <span className="text-xs text-modern-text-secondary">/{category.slug}</span>
                {!category.active && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    비활성
                  </span>
                )}
              </div>
              {category.description && (
                <p className="text-sm text-modern-text-secondary mt-1">{category.description}</p>
              )}
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-modern-text-tertiary">
                  상품 {category.productCount}개
                </span>
                {category.shippingPolicy && (
                  <span className="text-xs text-modern-text-tertiary">
                    무료배송 {(category.shippingPolicy.freeShippingThreshold || 0).toLocaleString()}원 이상
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={"ghost" as const}
              size={"sm" as const}
              onClick={() => handleOpenDialog(undefined, category.id)}
            >
              <Plus className="w-4 h-4" />
              하위 추가
            </Button>
            <Button
              variant={"ghost" as const}
              size={"sm" as const}
              onClick={() => handleOpenDialog(category)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant={"ghost" as const}
              size={"sm" as const}
              onClick={() => handleDelete(category)}
              disabled={category.productCount > 0 || (category.children && category.children.length > 0)}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">상품 카테고리</h1>
          <p className="text-modern-text-secondary mt-1">다단계 카테고리 구조를 관리하고 속성을 설정하세요.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          최상위 카테고리
        </Button>
      </div>

      {/* Categories Tree */}
      <Card>
        <CardHeader>
          <CardTitle>카테고리 구조</CardTitle>
          <CardDescription>
            드래그앤드롭으로 순서를 변경하고, 카테고리별 속성과 배송 정책을 설정하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary mx-auto"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-modern-text-secondary">
              카테고리가 없습니다. 새 카테고리를 추가하세요.
            </div>
          ) : (
            <div>
              {categories.map((category: any) => renderCategory(category))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? '카테고리 수정' : '새 카테고리'}
              </DialogTitle>
              <DialogDescription>
                카테고리 정보와 속성을 설정하세요.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-modern-text-primary">기본 정보</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">카테고리명 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setFormData(prev => ({
                          ...prev,
                          name: e.target.value,
                          slug: editingCategory ? prev.slug : generateSlug(e.target.value)
                        }));
                      }}
                      placeholder="예: 전자제품"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="예: electronics"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="카테고리에 대한 설명을 입력하세요..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="active">활성화</Label>
                    <p className="text-sm text-modern-text-secondary">
                      비활성화 시 상품 등록이 불가능합니다
                    </p>
                  </div>
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, active: checked }))}
                  />
                </div>
              </div>

              {/* Attributes */}
              <div className="space-y-4">
                <h3 className="font-medium text-modern-text-primary">카테고리 속성</h3>
                <p className="text-sm text-modern-text-secondary">
                  이 카테고리의 상품에 필요한 속성을 정의하세요.
                </p>

                <div className="space-y-2">
                  {formData.attributes.map((attr, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-modern-bg-tertiary rounded">
                      <span className="font-medium">{attr.label}</span>
                      <span className="text-sm text-modern-text-secondary">({attr.key})</span>
                      <span className="text-sm">{attr.type}</span>
                      {attr.required && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">필수</span>
                      )}
                      <Button
                        type="button"
                        variant={"ghost" as const}
                        size={"sm" as const}
                        onClick={() => handleRemoveAttribute(index)}
                        className="ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>속성 키</Label>
                    <Input
                      value={newAttribute.key}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAttribute(prev => ({ ...prev, key: e.target.value }))}
                      placeholder="예: color"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>라벨</Label>
                    <Input
                      value={newAttribute.label}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAttribute(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="예: 색상"
                    />
                  </div>
                  <div>
                    <Label>타입</Label>
                    <select
                      value={newAttribute.type}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAttribute(prev => ({ ...prev, type: e.target.value as any }))}
                      className="h-10 px-3 py-2 border border-modern-border-primary rounded-md"
                    >
                      <option value="text">텍스트</option>
                      <option value="number">숫자</option>
                      <option value="select">선택</option>
                      <option value="boolean">예/아니오</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newAttribute.required}
                      onCheckedChange={(checked: boolean) => setNewAttribute(prev => ({ ...prev, required: checked }))}
                    />
                    <Label>필수</Label>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddAttribute}
                  >
                    추가
                  </Button>
                </div>
              </div>

              {/* Shipping Policy */}
              <div className="space-y-4">
                <h3 className="font-medium text-modern-text-primary">배송 정책</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="freeShippingThreshold">무료배송 기준금액</Label>
                    <Input
                      id="freeShippingThreshold"
                      type="number"
                      value={formData.shippingPolicy.freeShippingThreshold}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({
                        ...prev,
                        shippingPolicy: {
                          ...prev.shippingPolicy,
                          freeShippingThreshold: parseInt(e.target.value) || 0
                        }
                      }))}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="baseShippingFee">기본 배송비</Label>
                    <Input
                      id="baseShippingFee"
                      type="number"
                      value={formData.shippingPolicy.baseShippingFee}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({
                        ...prev,
                        shippingPolicy: {
                          ...prev.shippingPolicy,
                          baseShippingFee: parseInt(e.target.value) || 0
                        }
                      }))}
                      placeholder="3000"
                    />
                  </div>
                </div>
              </div>

              {/* SEO */}
              <div className="space-y-4">
                <h3 className="font-medium text-modern-text-primary">SEO 설정</h3>
                
                <div>
                  <Label htmlFor="seoTitle">SEO 제목</Label>
                  <Input
                    id="seoTitle"
                    value={formData.seo.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({
                      ...prev,
                      seo: { ...prev.seo, title: e.target.value }
                    }))}
                    placeholder="검색 결과에 표시될 제목"
                  />
                </div>
                
                <div>
                  <Label htmlFor="seoDescription">SEO 설명</Label>
                  <Textarea
                    id="seoDescription"
                    value={formData.seo.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({
                      ...prev,
                      seo: { ...prev.seo, description: e.target.value }
                    }))}
                    placeholder="검색 결과에 표시될 설명"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="seoKeywords">SEO 키워드</Label>
                  <Input
                    id="seoKeywords"
                    value={formData.seo.keywords}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({
                      ...prev,
                      seo: { ...prev.seo, keywords: e.target.value }
                    }))}
                    placeholder="쉼표로 구분된 키워드"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant={"outline" as const} onClick={handleCloseDialog}>
                취소
              </Button>
              <Button 
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingCategory ? '수정' : '생성'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductCategories;