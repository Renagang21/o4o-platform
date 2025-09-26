import { FormEvent, type FC } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Package,
  DollarSign,
  Image as ImageIcon,
  X,
  FolderTree,
  Settings2
} from 'lucide-react';
import { useProduct, useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import { Product } from '@/types/ecommerce';
import ProductVariantManager from '@/components/ecommerce/ProductVariantManager';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { RichText } from '@/components/editor/gutenberg/RichText';
import { 
  Bold, 
  Italic, 
  Link2, 
  Type, 
  ImageIcon, 
  List, 
  ListOrdered,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Highlighter,
  Undo2,
  Redo2,
  Quote,
  Code,
  Subscript,
  Superscript
} from 'lucide-react';
import './ProductForm.css';

const ProductForm: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // API Hooks
  const { data: productData, isLoading } = useProduct(id || '', isEditMode);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    slug: '',
    sku: '',
    description: '',
    shortDescription: '',
    retailPrice: 0,
    wholesalePrice: 0,
    cost: 0,
    stockQuantity: 0,
    stockStatus: 'instock',
    manageStock: true,
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0, weight: 0, unit: 'cm', weightUnit: 'kg' },
    type: 'simple',
    status: 'active',
    featured: false,
    tags: [],
    images: [],
    metaTitle: '',
    metaDescription: '',
    categories: [],
  });

  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);
  // const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [selectedFontSize, setSelectedFontSize] = useState('16');
  const [selectedHeading, setSelectedHeading] = useState('p');

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const response = await authClient.api.get('/ecommerce/categories/tree');
      return response.data;
    }
  });
  const categories = categoriesData?.data || [];

  // Load product data in edit mode
  useEffect(() => {
    if (productData?.data) {
      setFormData(productData.data);
    }
  }, [productData]);

  const handleInputChange = (field: keyof Product, value: string | number | boolean | object) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (isEditMode) {
        await updateProduct.mutateAsync({
          productId: id!,
          productData: formData
        });
      } else {
        await createProduct.mutateAsync(formData);
      }
      navigate('/ecommerce/products');
    } catch (error: any) {
    // Error logging - use proper error handler
    } finally {
      setIsSaving(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      ?.toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    handleInputChange('slug', slug || '');
  };

  const toggleCategory = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id: any) => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    setSelectedCategories(newCategories);
    handleInputChange('categories', newCategories);
  };

  const insertImage = () => {
    if (imageUrl.trim()) {
      const imgTag = `<img src="${imageUrl}" alt="${imageAlt || '상품 이미지'}" style="max-width: 100%; height: auto; border-radius: 6px; margin: 0.5em 0;" />`;
      document.execCommand('insertHTML', false, imgTag);
      setShowImageModal(false);
      setImageUrl('');
      setImageAlt('');
    }
  };

  // Advanced formatting functions
  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const applyFontSize = (size: string) => {
    setSelectedFontSize(size);
    applyFormat('fontSize', size === 'default' ? '3' : size);
  };

  const applyHeading = (tag: string) => {
    setSelectedHeading(tag);
    if (tag === 'p') {
      applyFormat('formatBlock', 'p');
    } else {
      applyFormat('formatBlock', tag);
    }
  };

  const applyColor = (color: string) => {
    applyFormat('foreColor', color);
    setShowColorPicker(false);
  };

  const applyBackgroundColor = (color: string) => {
    applyFormat('backColor', color);
    setShowBgColorPicker(false);
  };

  const insertLink = () => {
    const url = prompt('링크 URL을 입력하세요:');
    if (url) {
      applyFormat('createLink', url);
    }
  };

  // Color palette
  const colors = [
    '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
    '#ff0000', '#ff6600', '#ffcc00', '#33cc33', '#3366cc', '#9933cc',
    '#ff3366', '#ff9933', '#ccff33', '#33ffcc', '#3399ff', '#cc33ff'
  ];

  // Number formatting and validation functions
  const formatPrice = (value: number | string): string => {
    if (!value && value !== 0) return '';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(numValue)) return '';
    return numValue.toLocaleString('ko-KR');
  };

  const parsePrice = (value: string): number => {
    if (!value) return 0;
    // Remove commas and any non-digit characters except decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handlePriceChange = (field: keyof Product, value: string) => {
    const numericValue = parsePrice(value);
    handleInputChange(field, numericValue);
  };

  // Validate numeric input
  const validateNumericInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Meta', 'Control', 'Alt'
    ];
    
    if (allowedKeys.includes(e.key)) return;
    
    // Allow decimal point only once
    if (e.key === '.' && !(e.target as HTMLInputElement).value.includes('.')) return;
    
    // Allow only numbers
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const renderCategoryTree = (cats: any[], level = 0) => {
    return cats.map((category: any) => (
      <div key={category.id}>
        <div
          className={`flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer`}
          style={{ paddingLeft: `${level * 1.5}rem` }}
        >
          <input
            type="checkbox"
            checked={selectedCategories.includes(category.id)}
            onChange={() => toggleCategory(category.id)}
            className="mr-2"
          />
          <span className="text-sm">{category.name}</span>
          <span className="text-xs text-gray-500 ml-2">({category.productCount})</span>
        </div>
        {category.children && category.children.length > 0 && (
          <div>{renderCategoryTree(category.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate('/ecommerce/products')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? '상품 수정' : '새 상품 추가'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditMode ? '상품 정보를 수정합니다' : '새로운 상품을 등록합니다'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/ecommerce/products')}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e: any) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL 슬러그
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onChange={(e: any) => handleInputChange('slug', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={generateSlug}
                    className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    자동 생성
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  간단한 설명
                </label>
                
                {/* Simple Rich Text Editor Toolbar */}
                <div className="border border-b-0 rounded-t-lg bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyFormat('bold')}
                      className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="굵게 (Ctrl+B)"
                    >
                      <Bold className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('italic')}
                      className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="기울임 (Ctrl+I)"
                    >
                      <Italic className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('underline')}
                      className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="밑줄 (Ctrl+U)"
                    >
                      <Underline className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={insertLink}
                      className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="링크 삽입 (Ctrl+K)"
                    >
                      <Link2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowImageModal(true)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="이미지 삽입"
                    >
                      <ImageIcon className="w-3 h-3" />
                    </button>
                    
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    
                    {/* Simple color picker for short description */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                        title="글자 색상"
                      >
                        <Palette className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border rounded-b-lg p-3 focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                  <div 
                    className="rich-text min-h-[60px] outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: formData.shortDescription || '' }}
                    onInput={(e) => {
                      const content = (e.target as HTMLDivElement).innerHTML;
                      handleInputChange('shortDescription', content);
                    }}
                    onKeyDown={(e) => {
                      // Keyboard shortcuts for short description
                      if ((e.ctrlKey || e.metaKey)) {
                        switch (e.key) {
                          case 'b':
                            e.preventDefault();
                            applyFormat('bold');
                            break;
                          case 'i':
                            e.preventDefault();
                            applyFormat('italic');
                            break;
                          case 'u':
                            e.preventDefault();
                            applyFormat('underline');
                            break;
                          case 'k':
                            e.preventDefault();
                            insertLink();
                            break;
                        }
                      }
                    }}
                    style={{ 
                      minHeight: '60px',
                      padding: '8px',
                      border: 'none',
                      outline: 'none'
                    }}
                    data-placeholder={!formData.shortDescription ? "상품의 간단한 설명을 입력하세요. 굵게, 기울임, 밑줄, 링크, 색상 등을 사용할 수 있습니다." : ""}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상세 설명
                </label>
                
                {/* Rich Text Editor Toolbar */}
                <div className="border border-b-0 rounded-t-lg bg-gray-50 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {/* Undo/Redo */}
                    <button
                      type="button"
                      onClick={() => applyFormat('undo')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="실행 취소 (Ctrl+Z)"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('redo')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="다시 실행 (Ctrl+Y)"
                    >
                      <Redo2 className="w-4 h-4" />
                    </button>
                    
                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Heading Selector */}
                    <select
                      value={selectedHeading}
                      onChange={(e) => applyHeading(e.target.value)}
                      className="px-2 py-1 text-sm border rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="p">본문</option>
                      <option value="h1">제목 1</option>
                      <option value="h2">제목 2</option>
                      <option value="h3">제목 3</option>
                      <option value="h4">제목 4</option>
                      <option value="h5">제목 5</option>
                      <option value="h6">제목 6</option>
                    </select>

                    {/* Font Size */}
                    <select
                      value={selectedFontSize}
                      onChange={(e) => applyFontSize(e.target.value)}
                      className="px-2 py-1 text-sm border rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">매우 작게</option>
                      <option value="2">작게</option>
                      <option value="3">보통</option>
                      <option value="4">크게</option>
                      <option value="5">매우 크게</option>
                      <option value="6">거대</option>
                      <option value="7">초거대</option>
                    </select>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Basic Formatting */}
                    <button
                      type="button"
                      onClick={() => applyFormat('bold')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="굵게 (Ctrl+B)"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('italic')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="기울임 (Ctrl+I)"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('underline')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="밑줄 (Ctrl+U)"
                    >
                      <Underline className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('strikeThrough')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="취소선"
                    >
                      <Strikethrough className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Colors */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                        title="글자 색상"
                      >
                        <Palette className="w-4 h-4" />
                      </button>
                      {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 p-2 bg-white border rounded-lg shadow-lg z-10">
                          <div className="grid grid-cols-6 gap-1 w-32">
                            {colors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => applyColor(color)}
                                className="w-5 h-5 rounded border border-gray-300 hover:scale-110"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowBgColorPicker(!showBgColorPicker)}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                        title="배경 색상"
                      >
                        <Highlighter className="w-4 h-4" />
                      </button>
                      {showBgColorPicker && (
                        <div className="absolute top-full left-0 mt-1 p-2 bg-white border rounded-lg shadow-lg z-10">
                          <div className="grid grid-cols-6 gap-1 w-32">
                            {colors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => applyBackgroundColor(color)}
                                className="w-5 h-5 rounded border border-gray-300 hover:scale-110"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Alignment */}
                    <button
                      type="button"
                      onClick={() => applyFormat('justifyLeft')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="왼쪽 정렬"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('justifyCenter')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="가운데 정렬"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('justifyRight')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="오른쪽 정렬"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('justifyFull')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="양쪽 정렬"
                    >
                      <AlignJustify className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Lists */}
                    <button
                      type="button"
                      onClick={() => applyFormat('insertUnorderedList')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="순서 없는 목록"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('insertOrderedList')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="순서 있는 목록"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Advanced */}
                    <button
                      type="button"
                      onClick={insertLink}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="링크 삽입 (Ctrl+K)"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowImageModal(true)}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="이미지 삽입"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('insertHorizontalRule')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="구분선 삽입"
                    >
                      <Type className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('formatBlock', 'blockquote')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="인용구"
                    >
                      <Quote className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('formatBlock', 'pre')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="코드 블록"
                    >
                      <Code className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('subscript')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="아래 첨자"
                    >
                      <Subscript className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('superscript')}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                      title="위 첨자"
                    >
                      <Superscript className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="border rounded-b-lg p-3 focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                  <div 
                    className="rich-text min-h-[120px] outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: formData.description || '' }}
                    onInput={(e) => {
                      const content = (e.target as HTMLDivElement).innerHTML;
                      handleInputChange('description', content);
                    }}
                    onKeyDown={(e) => {
                      // Keyboard shortcuts
                      if ((e.ctrlKey || e.metaKey)) {
                        switch (e.key) {
                          case 'b':
                            e.preventDefault();
                            applyFormat('bold');
                            break;
                          case 'i':
                            e.preventDefault();
                            applyFormat('italic');
                            break;
                          case 'u':
                            e.preventDefault();
                            applyFormat('underline');
                            break;
                          case 'k':
                            e.preventDefault();
                            insertLink();
                            break;
                          case 'z':
                            e.preventDefault();
                            applyFormat('undo');
                            break;
                          case 'y':
                            e.preventDefault();
                            applyFormat('redo');
                            break;
                        }
                      }
                    }}
                    style={{ 
                      minHeight: '120px',
                      padding: '8px',
                      border: 'none',
                      outline: 'none'
                    }}
                    data-placeholder={!formData.description ? "상품에 대한 상세한 설명을 입력하세요. 툴바의 다양한 기능을 사용하여 풍부한 콘텐츠를 만들어보세요!" : ""}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              가격 설정
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  판매가 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatPrice(formData.retailPrice || 0)}
                    onChange={(e) => handlePriceChange('retailPrice', e.target.value)}
                    onKeyDown={validateNumericInput}
                    className="w-full px-3 py-2 pr-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    required
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">원</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">숫자만 입력 가능 (자동으로 천 단위 쉼표 표시)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  정가 (할인 전 가격)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatPrice(formData.wholesalePrice || 0)}
                    onChange={(e) => handlePriceChange('wholesalePrice', e.target.value)}
                    onKeyDown={validateNumericInput}
                    className="w-full px-3 py-2 pr-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">원</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  원가
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatPrice(formData.cost || 0)}
                    onChange={(e) => handlePriceChange('cost', e.target.value)}
                    onKeyDown={validateNumericInput}
                    className="w-full px-3 py-2 pr-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">원</span>
                </div>
              </div>
            </div>

            {/* Role-based Pricing */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">역할별 가격</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-600">도매 가격</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatPrice(formData.wholesalePrice || 0)}
                      onChange={(e) => handlePriceChange('wholesalePrice', e.target.value)}
                      onKeyDown={validateNumericInput}
                      className="w-32 px-3 py-1 pr-6 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      placeholder="0"
                    />
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">원</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-600">파트너 가격</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatPrice(formData.affiliatePrice || 0)}
                      onChange={(e) => handlePriceChange('affiliatePrice', e.target.value)}
                      onKeyDown={validateNumericInput}
                      className="w-32 px-3 py-1 pr-6 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      placeholder="0"
                    />
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">원</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FolderTree className="w-5 h-5 mr-2" />
              카테고리
            </h2>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {renderCategoryTree(categories)}
            </div>
          </div>

          {/* Product Options & Variants */}
          {formData.type === 'variable' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Settings2 className="w-5 h-5 mr-2" />
                상품 옵션 및 변형
              </h2>
              
              <ProductVariantManager
                options={productOptions}
                variants={productVariants}
                basePrice={formData.retailPrice || 0}
                baseSku={formData.sku || ''}
                onOptionsChange={setProductOptions}
                onVariantsChange={setProductVariants}
              />
            </div>
          )}

          {/* Inventory */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              재고 관리
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU (재고 관리 코드)
                </label>
                <input
                  type="text"
                  value={formData.sku || ''}
                  onChange={(e: any) => handleInputChange('sku', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="trackInventory"
                  checked={formData.manageStock || false}
                  onChange={(e: any) => handleInputChange('manageStock', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="trackInventory" className="ml-2 text-sm text-gray-700">
                  재고 추적
                </label>
              </div>

              {formData.manageStock && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      재고 수량
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formatPrice(formData.stockQuantity || 0)}
                        onChange={(e) => {
                          const numericValue = parsePrice(e.target.value);
                          handleInputChange('stockQuantity', Math.floor(numericValue)); // 정수로 처리
                        }}
                        onKeyDown={(e) => {
                          // 재고는 정수만 허용
                          const allowedKeys = [
                            'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                            'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                            'Meta', 'Control', 'Alt'
                          ];
                          
                          if (allowedKeys.includes(e.key)) return;
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className="w-full px-3 py-2 pr-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">개</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">정수만 입력 가능</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      재고 상태
                    </label>
                    <select
                      value={formData.stockStatus || 'in_stock'}
                      onChange={(e: any) => handleInputChange('stockStatus', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="in_stock">재고 있음</option>
                      <option value="out_of_stock">품절</option>
                      <option value="on_backorder">입고 예정</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">상태</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  판매 상태
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e: any) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">판매중</option>
                  <option value="inactive">판매중지</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상태
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e: any) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">공개</option>
                  <option value="draft">임시저장</option>
                  <option value="private">비공개</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured || false}
                  onChange={(e: any) => handleInputChange('featured', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="featured" className="ml-2 text-sm text-gray-700">
                  추천 상품으로 설정
                </label>
              </div>
            </div>
          </div>

          {/* Product Type */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">상품 유형</h2>
            
            <select
              value={formData.type || 'physical'}
              onChange={(e: any) => handleInputChange('type', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="simple">단순 상품</option>
              <option value="variable">옵션 상품</option>
              <option value="digital">디지털 상품</option>
              <option value="service">서비스</option>
            </select>

            {(formData.type === 'simple' || formData.type === 'variable') && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    무게 (kg)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.weight ? formData.weight.toString() : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          handleInputChange('weight', value === '' ? 0 : parseFloat(value));
                        }
                      }}
                      onKeyDown={(e) => {
                        const allowedKeys = [
                          'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                          'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                          'Meta', 'Control', 'Alt'
                        ];
                        
                        if (allowedKeys.includes(e.key)) return;
                        
                        // Allow decimal point only once
                        if (e.key === '.' && !(e.target as HTMLInputElement).value.includes('.')) return;
                        
                        // Allow only numbers
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-3 py-2 pr-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">kg</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">소수점 입력 가능 (예: 1.5)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    크기 (cm)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="길이"
                        value={formData.dimensions?.length ? formData.dimensions.length.toString() : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            handleInputChange('dimensions', {
                              ...formData.dimensions,
                              length: value === '' ? 0 : parseFloat(value)
                            });
                          }
                        }}
                        onKeyDown={validateNumericInput}
                        className="px-3 py-2 pr-6 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">cm</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="너비"
                        value={formData.dimensions?.width ? formData.dimensions.width.toString() : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            handleInputChange('dimensions', {
                              ...formData.dimensions,
                              width: value === '' ? 0 : parseFloat(value)
                            });
                          }
                        }}
                        onKeyDown={validateNumericInput}
                        className="px-3 py-2 pr-6 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">cm</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="높이"
                        value={formData.dimensions?.height ? formData.dimensions.height.toString() : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            handleInputChange('dimensions', {
                              ...formData.dimensions,
                              height: value === '' ? 0 : parseFloat(value)
                            });
                          }
                        }}
                        onKeyDown={validateNumericInput}
                        className="px-3 py-2 pr-6 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">cm</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">소수점 입력 가능</p>
                </div>
              </div>
            )}
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <ImageIcon className="w-5 h-5 mr-2" />
              상품 이미지
            </h2>
            
            <div className="space-y-3">
              {formData.images && formData.images.length > 0 ? (
                formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.url}
                      alt={image.alt || ''}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = [...(formData.images || [])];
                        newImages.splice(index, 1);
                        handleInputChange('images', newImages);
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    클릭하여 이미지를 업로드하세요
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">SEO 설정</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메타 제목
                </label>
                <input
                  type="text"
                  value={formData.metaTitle || ''}
                  onChange={(e: any) => handleInputChange('metaTitle', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메타 설명
                </label>
                <textarea
                  value={formData.metaDescription || ''}
                  onChange={(e: any) => handleInputChange('metaDescription', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 삽입 모달 */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">이미지 삽입</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이미지 URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  대체 텍스트 (Alt Text)
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="이미지 설명"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 이미지 미리보기 */}
              {imageUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    미리보기
                  </label>
                  <div className="border rounded-lg p-2 bg-gray-50">
                    <img
                      src={imageUrl}
                      alt={imageAlt || '미리보기'}
                      className="max-w-full max-h-48 mx-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                      onLoad={(e) => {
                        (e.target as HTMLImageElement).style.display = 'block';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowImageModal(false);
                  setImageUrl('');
                  setImageAlt('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={insertImage}
                disabled={!imageUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                삽입
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default ProductForm;