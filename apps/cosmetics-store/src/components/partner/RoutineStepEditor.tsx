import { useState } from 'react';
import ProductSelectorModal from './ProductSelectorModal';

export interface RoutineStep {
  step: number;
  productId: string;
  productName?: string;
  category?: string;
  description?: string;
}

interface Product {
  id: string;
  name: string;
  metadata?: {
    cosmetics?: {
      productCategory?: string;
    };
  };
}

interface RoutineStepEditorProps {
  steps: RoutineStep[];
  onChange: (steps: RoutineStep[]) => void;
}

export default function RoutineStepEditor({ steps, onChange }: RoutineStepEditorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  const handleAddProduct = (product: Product) => {
    const newStep: RoutineStep = {
      step: steps.length + 1,
      productId: product.id,
      productName: product.name,
      category: product.metadata?.cosmetics?.productCategory || '기타',
      description: '',
    };
    onChange([...steps, newStep]);
  };

  const handleReplaceProduct = (product: Product, index: number) => {
    const updatedSteps = [...steps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      productId: product.id,
      productName: product.name,
      category: product.metadata?.cosmetics?.productCategory || '기타',
    };
    onChange(updatedSteps);
  };

  const handleRemoveStep = (index: number) => {
    const updatedSteps = steps.filter((_, i) => i !== index);
    // Renumber steps
    const renumberedSteps = updatedSteps.map((step, i) => ({
      ...step,
      step: i + 1,
    }));
    onChange(renumberedSteps);
  };

  const handleUpdateDescription = (index: number, description: string) => {
    const updatedSteps = [...steps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      description,
    };
    onChange(updatedSteps);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updatedSteps = [...steps];
    [updatedSteps[index - 1], updatedSteps[index]] = [updatedSteps[index], updatedSteps[index - 1]];
    // Renumber
    const renumberedSteps = updatedSteps.map((step, i) => ({
      ...step,
      step: i + 1,
    }));
    onChange(renumberedSteps);
  };

  const handleMoveDown = (index: number) => {
    if (index === steps.length - 1) return;
    const updatedSteps = [...steps];
    [updatedSteps[index], updatedSteps[index + 1]] = [updatedSteps[index + 1], updatedSteps[index]];
    // Renumber
    const renumberedSteps = updatedSteps.map((step, i) => ({
      ...step,
      step: i + 1,
    }));
    onChange(renumberedSteps);
  };

  const openModalForAdd = () => {
    setEditingStepIndex(null);
    setIsModalOpen(true);
  };

  const openModalForReplace = (index: number) => {
    setEditingStepIndex(index);
    setIsModalOpen(true);
  };

  const handleProductSelect = (product: Product) => {
    if (editingStepIndex !== null) {
      handleReplaceProduct(product, editingStepIndex);
    } else {
      handleAddProduct(product);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">루틴 단계 구성</h3>
        <button
          onClick={openModalForAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + 제품 추가
        </button>
      </div>

      {steps.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-4">아직 추가된 제품이 없습니다</p>
          <button
            onClick={openModalForAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            첫 번째 제품 추가하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Step Number */}
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  {step.step}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {step.category} → {step.productName || `제품 ID: ${step.productId}`}
                      </h4>
                      <p className="text-sm text-gray-600">ID: {step.productId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Move buttons */}
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="위로 이동"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === steps.length - 1}
                        className="text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="아래로 이동"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => openModalForReplace(index)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        교체
                      </button>
                      <button
                        onClick={() => handleRemoveStep(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* Description/Note */}
                  <textarea
                    value={step.description || ''}
                    onChange={(e) => handleUpdateDescription(index, e.target.value)}
                    placeholder="이 단계에 대한 설명을 입력하세요 (선택사항)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {steps.length > 0 && steps.length < 2 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ 루틴은 최소 2단계 이상이어야 합니다. 제품을 {2 - steps.length}개 더 추가해주세요.
          </p>
        </div>
      )}

      <ProductSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleProductSelect}
      />
    </div>
  );
}
