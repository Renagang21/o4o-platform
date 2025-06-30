import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Upload, 
  Image as ImageIcon,
  AlertCircle,
  Eye
} from 'lucide-react';
import { Product, ProductFormData, productCategories } from '../types/product';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../ui/Modal';
import { useProducts } from '../context/ProductContext';
import { useSuccessToast, useErrorToast } from '../ui/ToastNotification';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  mode: 'create' | 'edit';
}

const STEPS = [
  { id: 1, title: '기본 정보', description: '상품의 기본 정보를 입력하세요' },
  { id: 2, title: '가격 정보', description: '공급가와 권장 판매가를 설정하세요' },
  { id: 3, title: '재고 정보', description: '재고 수량과 관리 방법을 설정하세요' },
  { id: 4, title: '이미지', description: '상품 이미지를 업로드하세요' },
  { id: 5, title: '배송 정보', description: '배송비와 배송 일정을 설정하세요' }
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  product,
  mode
}) => {
  const { addProduct, updateProduct, state } = useProducts();
  const showSuccess = useSuccessToast();
  const showError = useErrorToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: '',
    description: '',
    brand: '',
    model: '',
    supplierPrice: 0,
    recommendedPrice: 0,
    minOrderQuantity: 1,
    currentStock: 0,
    minStockAlert: 10,
    stockManagement: 'auto',
    mainImage: undefined,
    additionalImages: [],
    shippingCost: 0,
    shippingDays: 2,
    shippingAreas: 'all',
    specialInstructions: ''
  });

  const [errors, setErrors] = useState<Partial<ProductFormData>>({});
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  // Initialize form data when product changes
  useEffect(() => {
    if (product && mode === 'edit') {
      setFormData({
        name: product.name,
        category: product.category,
        description: product.description,
        brand: product.brand || '',
        model: product.model || '',
        supplierPrice: product.supplierPrice,
        recommendedPrice: product.recommendedPrice,
        minOrderQuantity: product.minOrderQuantity,
        currentStock: product.currentStock,
        minStockAlert: product.minStockAlert,
        stockManagement: product.stockManagement,
        mainImage: product.image,
        additionalImages: product.images ? product.images.slice(1) : [],
        shippingCost: product.shippingCost,
        shippingDays: product.shippingDays,
        shippingAreas: product.shippingAreas,
        specialInstructions: product.specialInstructions || ''
      });
      
      // Set preview images
      const images = [product.image, ...(product.images?.slice(1) || [])].filter(Boolean);
      setPreviewImages(images as string[]);
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        category: '',
        description: '',
        brand: '',
        model: '',
        supplierPrice: 0,
        recommendedPrice: 0,
        minOrderQuantity: 1,
        currentStock: 0,
        minStockAlert: 10,
        stockManagement: 'auto',
        mainImage: undefined,
        additionalImages: [],
        shippingCost: 0,
        shippingDays: 2,
        shippingAreas: 'all',
        specialInstructions: ''
      });
      setPreviewImages([]);
    }
    setCurrentStep(1);
    setErrors({});
  }, [product, mode, isOpen]);

  // Form validation
  const validateStep = (step: number): boolean => {
    const newErrors: Partial<ProductFormData> = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = '상품명을 입력하세요';
        if (!formData.category) newErrors.category = '카테고리를 선택하세요';
        if (!formData.description.trim()) newErrors.description = '상품 설명을 입력하세요';
        break;
      case 2:
        if (formData.supplierPrice <= 0) newErrors.supplierPrice = '공급가를 입력하세요';
        if (formData.recommendedPrice <= 0) newErrors.recommendedPrice = '권장 판매가를 입력하세요';
        if (formData.recommendedPrice <= formData.supplierPrice) {
          newErrors.recommendedPrice = '권장 판매가는 공급가보다 높아야 합니다';
        }
        if (formData.minOrderQuantity <= 0) newErrors.minOrderQuantity = '최소 주문 수량을 입력하세요';
        break;
      case 3:
        if (formData.currentStock < 0) newErrors.currentStock = '재고는 0 이상이어야 합니다';
        if (formData.minStockAlert < 0) newErrors.minStockAlert = '최소 재고 알림은 0 이상이어야 합니다';
        break;
      case 5:
        if (formData.shippingCost < 0) newErrors.shippingCost = '배송비는 0 이상이어야 합니다';
        if (formData.shippingDays <= 0 || formData.shippingDays > 30) {
          newErrors.shippingDays = '배송 소요일은 1-30일 사이여야 합니다';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Handle file upload
  const handleFileUpload = (files: FileList | null, isMain: boolean = false) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => 
      file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB limit
    );

    if (validFiles.length === 0) {
      showError('이미지 업로드 실패', '유효한 이미지 파일을 선택하세요 (최대 5MB)');
      return;
    }

    // Create preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        
        if (isMain) {
          setPreviewImages(prev => [imageUrl, ...prev.slice(1)]);
          handleInputChange('mainImage', file);
        } else {
          setPreviewImages(prev => [...prev, imageUrl]);
          handleInputChange('additionalImages', [...(formData.additionalImages || []), file]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image
  const removeImage = (index: number) => {
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    
    if (index === 0) {
      handleInputChange('mainImage', undefined);
    } else {
      const newAdditionalImages = formData.additionalImages?.filter((_, i) => i !== index - 1) || [];
      handleInputChange('additionalImages', newAdditionalImages);
    }
  };

  // Navigation
  const goToStep = (step: number) => {
    if (step > currentStep) {
      // Validate current step before proceeding
      if (!validateStep(currentStep)) return;
    }
    setCurrentStep(step);
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        brand: formData.brand,
        model: formData.model,
        image: typeof formData.mainImage === 'string' ? formData.mainImage : '/images/placeholder.jpg',
        images: [
          typeof formData.mainImage === 'string' ? formData.mainImage : '/images/placeholder.jpg',
          ...(formData.additionalImages?.map(img => 
            typeof img === 'string' ? img : '/images/placeholder.jpg'
          ) || [])
        ],
        currentStock: formData.currentStock,
        minStockAlert: formData.minStockAlert,
        supplierPrice: formData.supplierPrice,
        recommendedPrice: formData.recommendedPrice,
        marginRate: ((formData.recommendedPrice - formData.supplierPrice) / formData.recommendedPrice) * 100,
        status: formData.currentStock > 0 ? 'active' as const : 'out_of_stock' as const,
        shippingCost: formData.shippingCost,
        shippingDays: formData.shippingDays,
        shippingAreas: formData.shippingAreas,
        specialInstructions: formData.specialInstructions,
        minOrderQuantity: formData.minOrderQuantity,
        stockManagement: formData.stockManagement
      };

      if (mode === 'edit' && product) {
        await updateProduct({ ...product, ...productData });
        showSuccess('상품 수정 완료', '상품 정보가 성공적으로 수정되었습니다.');
      } else {
        await addProduct(productData);
        showSuccess('상품 등록 완료', '새 상품이 성공적으로 등록되었습니다.');
      }

      onClose();
    } catch (error) {
      showError('저장 실패', '상품 정보 저장 중 오류가 발생했습니다.');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상품명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="상품명을 입력하세요"
                maxLength={100}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">카테고리를 선택하세요</option>
                {productCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.category}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상품 설명 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="상품 설명을 입력하세요"
                maxLength={500}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">브랜드</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="브랜드명"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">모델명</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="모델명"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  공급가 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.supplierPrice}
                  onChange={(e) => handleInputChange('supplierPrice', Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.supplierPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                  min="0"
                />
                {errors.supplierPrice && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.supplierPrice}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  권장 판매가 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.recommendedPrice}
                  onChange={(e) => handleInputChange('recommendedPrice', Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.recommendedPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                  min="0"
                />
                {errors.recommendedPrice && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.recommendedPrice}
                  </p>
                )}
              </div>
            </div>

            {/* Margin Calculator */}
            {formData.supplierPrice > 0 && formData.recommendedPrice > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">예상 마진율</span>
                  <span className="text-lg font-bold text-blue-900">
                    {(((formData.recommendedPrice - formData.supplierPrice) / formData.recommendedPrice) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  마진 금액: {(formData.recommendedPrice - formData.supplierPrice).toLocaleString()}원
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                최소 주문 수량 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.minOrderQuantity}
                onChange={(e) => handleInputChange('minOrderQuantity', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.minOrderQuantity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="1"
                min="1"
              />
              {errors.minOrderQuantity && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.minOrderQuantity}
                </p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  현재 재고 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.currentStock}
                  onChange={(e) => handleInputChange('currentStock', Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.currentStock ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                  min="0"
                />
                {errors.currentStock && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.currentStock}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  최소 재고 알림
                </label>
                <input
                  type="number"
                  value={formData.minStockAlert}
                  onChange={(e) => handleInputChange('minStockAlert', Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.minStockAlert ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="10"
                  min="0"
                />
                {errors.minStockAlert && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.minStockAlert}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">재고 관리 방식</label>
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="stockManagement"
                    value="auto"
                    checked={formData.stockManagement === 'auto'}
                    onChange={(e) => handleInputChange('stockManagement', e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">자동 관리</div>
                    <div className="text-sm text-gray-500">주문 시 자동으로 재고 차감</div>
                  </div>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="stockManagement"
                    value="manual"
                    checked={formData.stockManagement === 'manual'}
                    onChange={(e) => handleInputChange('stockManagement', e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">수동 관리</div>
                    <div className="text-sm text-gray-500">재고를 직접 관리</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Stock Status Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-900 mb-2">재고 상태 미리보기</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">현재 재고:</span>
                  <span className={`font-medium ${
                    formData.currentStock === 0 ? 'text-red-600' :
                    formData.currentStock <= formData.minStockAlert ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {formData.currentStock.toLocaleString()}개
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">상태:</span>
                  <span className={`font-medium ${
                    formData.currentStock === 0 ? 'text-red-600' :
                    formData.currentStock <= formData.minStockAlert ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {formData.currentStock === 0 ? '품절' :
                     formData.currentStock <= formData.minStockAlert ? '재고 부족' : '정상'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {/* Main Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메인 이미지
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                {previewImages[0] ? (
                  <div className="relative inline-block">
                    <img
                      src={previewImages[0]}
                      alt="메인 이미지"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(0)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <div className="text-sm text-gray-600">
                      <label className="cursor-pointer text-blue-600 hover:text-blue-700">
                        이미지 업로드
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e.target.files, true)}
                          className="sr-only"
                        />
                      </label>
                      <span> 또는 드래그 앤 드롭</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG 최대 5MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                추가 이미지 (최대 5개)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {previewImages.slice(1).map((image, index) => (
                  <div key={index + 1} className="relative">
                    <img
                      src={image}
                      alt={`추가 이미지 ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index + 1)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {previewImages.length < 6 && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                    <label className="cursor-pointer block">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-xs text-gray-600">이미지 추가</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileUpload(e.target.files)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배송비
                </label>
                <input
                  type="number"
                  value={formData.shippingCost}
                  onChange={(e) => handleInputChange('shippingCost', Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.shippingCost ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                  min="0"
                />
                {errors.shippingCost && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.shippingCost}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">0원 입력 시 무료배송</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배송 소요일
                </label>
                <input
                  type="number"
                  value={formData.shippingDays}
                  onChange={(e) => handleInputChange('shippingDays', Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.shippingDays ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="2"
                  min="1"
                  max="30"
                />
                {errors.shippingDays && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.shippingDays}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">영업일 기준</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">배송 지역</label>
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="shippingAreas"
                    value="all"
                    checked={formData.shippingAreas === 'all'}
                    onChange={(e) => handleInputChange('shippingAreas', e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">전국 배송</div>
                    <div className="text-sm text-gray-500">모든 지역 배송 가능</div>
                  </div>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="shippingAreas"
                    value="selected"
                    checked={formData.shippingAreas === 'selected'}
                    onChange={(e) => handleInputChange('shippingAreas', e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">지역 선택</div>
                    <div className="text-sm text-gray-500">특정 지역만 배송</div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                특별 배송 안내
              </label>
              <textarea
                value={formData.specialInstructions}
                onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="특별한 배송 안내사항이 있다면 입력하세요 (선택사항)"
                maxLength={200}
              />
            </div>

            {/* Shipping Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-900 mb-2">배송 정보 요약</div>
              <div className="space-y-1 text-sm text-gray-600">
                <div>배송비: {formData.shippingCost === 0 ? '무료' : `${formData.shippingCost.toLocaleString()}원`}</div>
                <div>배송 기간: {formData.shippingDays}일</div>
                <div>배송 지역: {formData.shippingAreas === 'all' ? '전국' : '선택 지역'}</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      closeOnOverlayClick={false}
    >
      <ModalHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'edit' ? '상품 수정' : '상품 등록'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {STEPS[currentStep - 1].description}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {currentStep} / {STEPS.length}
          </div>
        </div>

        {/* Step Navigation */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => goToStep(step.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 ml-2 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => (
              <div key={step.id} className="text-xs text-gray-500 text-center w-8">
                {step.title}
              </div>
            ))}
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="max-h-96 overflow-y-auto">
          {renderStepContent()}
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <ModalButton
                variant="secondary"
                onClick={prevStep}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                이전
              </ModalButton>
            )}
          </div>

          <div className="flex gap-2">
            <ModalButton variant="secondary" onClick={onClose}>
              취소
            </ModalButton>
            
            {currentStep < STEPS.length ? (
              <ModalButton variant="primary" onClick={nextStep}>
                다음
                <ChevronRight className="w-4 h-4 ml-1" />
              </ModalButton>
            ) : (
              <ModalButton 
                variant="primary" 
                onClick={handleSubmit}
                disabled={state.loading}
              >
                {state.loading ? '저장 중...' : mode === 'edit' ? '수정 완료' : '등록 완료'}
              </ModalButton>
            )}
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
};