import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Download,
  ArrowRight,
  ArrowLeft,
  X,
  Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { authClient } from '@o4o/auth-client';
import { toast } from 'react-hot-toast';

// Product field definitions
interface ProductField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description: string;
}

const PRODUCT_FIELDS: ProductField[] = [
  { key: 'title', label: '상품명', type: 'string', required: true, description: '상품의 이름' },
  { key: 'content', label: '상세 설명', type: 'string', required: false, description: '상품 상세 설명' },
  { key: 'excerpt', label: '간단 설명', type: 'string', required: false, description: '상품 요약 설명' },
  { key: 'cost_price', label: '공급가', type: 'number', required: true, description: '공급받는 가격' },
  { key: 'selling_price', label: '판매가', type: 'number', required: true, description: '실제 판매 가격' },
  { key: 'supplier', label: '공급자', type: 'string', required: false, description: '공급자명' },
  { key: 'supplier_sku', label: '공급자 상품코드', type: 'string', required: false, description: '공급자의 상품 코드' },
  { key: 'shipping_days_min', label: '최소 배송일', type: 'number', required: false, description: '최소 배송 소요 일수' },
  { key: 'shipping_days_max', label: '최대 배송일', type: 'number', required: false, description: '최대 배송 소요 일수' },
  { key: 'shipping_fee', label: '배송비', type: 'number', required: false, description: '배송비 (0 = 무료배송)' },
  { key: 'can_modify_price', label: '가격 수정 가능', type: 'boolean', required: false, description: '파트너 가격 수정 가능 여부' },
];

interface CSVRow {
  [key: string]: string;
}

interface FieldMapping {
  [csvColumn: string]: string; // csvColumn -> productFieldKey
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

type Step = 'upload' | 'preview' | 'mapping' | 'validation' | 'import' | 'complete';

const BulkProductImport: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Step 1: File Upload
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('CSV 파일만 업로드 가능합니다');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error('CSV 파일에 데이터가 없습니다');
          return;
        }

        const data = results.data as CSVRow[];
        const columns = results.meta.fields || [];

        setCsvData(data);
        setCsvColumns(columns);

        // Auto-map matching column names
        const autoMapping: FieldMapping = {};
        columns.forEach(col => {
          const normalizedCol = col.toLowerCase().trim();
          const matchedField = PRODUCT_FIELDS.find(
            field => field.key === normalizedCol || field.label === col
          );
          if (matchedField) {
            autoMapping[col] = matchedField.key;
          }
        });
        setFieldMapping(autoMapping);

        setCurrentStep('preview');
        toast.success(`${data.length}개 행을 불러왔습니다`);
      },
      error: (error) => {
        toast.error(`파일 읽기 오류: ${error.message}`);
      }
    });
  };

  // Step 2: Preview -> Mapping
  const handleProceedToMapping = () => {
    setCurrentStep('mapping');
  };

  // Step 3: Field Mapping -> Validation
  const handleProceedToValidation = () => {
    // Check if required fields are mapped
    const requiredFields = PRODUCT_FIELDS.filter(f => f.required);
    const mappedProductFields = Object.values(fieldMapping);

    const missingRequired = requiredFields.filter(
      field => !mappedProductFields.includes(field.key)
    );

    if (missingRequired.length > 0) {
      toast.error(`필수 필드 매핑이 누락되었습니다: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    // Validate data
    const errors: ValidationError[] = [];

    csvData.forEach((row, rowIndex) => {
      Object.entries(fieldMapping).forEach(([csvCol, productFieldKey]) => {
        const field = PRODUCT_FIELDS.find(f => f.key === productFieldKey);
        if (!field) return;

        const value = row[csvCol];

        // Required field check
        if (field.required && (!value || value.trim() === '')) {
          errors.push({
            row: rowIndex + 1,
            field: field.label,
            message: '필수 필드가 비어있습니다'
          });
        }

        // Type validation
        if (value && value.trim() !== '') {
          if (field.type === 'number') {
            const num = Number(value);
            if (isNaN(num) || num < 0) {
              errors.push({
                row: rowIndex + 1,
                field: field.label,
                message: '올바른 숫자 형식이 아니거나 음수입니다'
              });
            }
          } else if (field.type === 'boolean') {
            const lowerValue = value.toLowerCase();
            if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lowerValue)) {
              errors.push({
                row: rowIndex + 1,
                field: field.label,
                message: '올바른 불린 값이 아닙니다 (true/false, 1/0, yes/no)'
              });
            }
          }
        }
      });
    });

    setValidationErrors(errors);
    setCurrentStep('validation');
  };

  // Step 4: Validation -> Import
  const handleStartImport = async () => {
    if (validationErrors.length > 0) {
      toast.error('검증 오류가 있습니다. 오류를 수정한 후 다시 시도하세요.');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('import');

    try {
      // Transform CSV data to product format
      const products = csvData.map(row => {
        const product: any = {
          title: '',
          content: '',
          excerpt: '',
          acf: {
            cost_price: 0,
            selling_price: 0,
            margin_rate: '0',
            can_modify_price: true,
            supplier: '',
            supplier_sku: '',
            shipping_days_min: 3,
            shipping_days_max: 7,
            shipping_fee: 0
          }
        };

        Object.entries(fieldMapping).forEach(([csvCol, productFieldKey]) => {
          const value = row[csvCol];
          if (!value || value.trim() === '') return;

          if (['title', 'content', 'excerpt'].includes(productFieldKey)) {
            product[productFieldKey] = value;
          } else {
            const field = PRODUCT_FIELDS.find(f => f.key === productFieldKey);
            if (!field) return;

            let parsedValue: any = value;
            if (field.type === 'number') {
              parsedValue = Number(value);
            } else if (field.type === 'boolean') {
              const lowerValue = value.toLowerCase();
              parsedValue = ['true', '1', 'yes'].includes(lowerValue);
            }

            product.acf[productFieldKey] = parsedValue;
          }
        });

        // Calculate margin_rate
        const costPrice = product.acf.cost_price || 0;
        const sellingPrice = product.acf.selling_price || 0;
        if (sellingPrice > 0) {
          product.acf.margin_rate = ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(2);
        }

        return product;
      });

      // Call API to import products
      const response = await authClient.api.post('/api/admin/dropshipping/products/bulk-import', products);

      if (response.data.success) {
        setImportResults({
          success: response.data.data?.success || 0,
          failed: response.data.data?.failed || 0,
          errors: response.data.data?.errors || []
        });
        setCurrentStep('complete');
        toast.success('상품 임포트가 완료되었습니다');
      } else {
        throw new Error(response.data.message || '임포트 실패');
      }
    } catch (error: any) {
      toast.error(`임포트 오류: ${error.message}`);
      setIsProcessing(false);
    }
  };

  // Download CSV Template
  const handleDownloadTemplate = () => {
    const headers = PRODUCT_FIELDS.map(f => f.label);
    const exampleRow = [
      '샘플 상품명',
      '상세 설명입니다',
      '간단 설명',
      '10000',
      '15000',
      '공급사명',
      'SKU-001',
      '3',
      '7',
      '3000',
      'true'
    ];

    const csv = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Reset
  const handleReset = () => {
    setCsvData([]);
    setCsvColumns([]);
    setFieldMapping({});
    setValidationErrors([]);
    setImportResults(null);
    setCurrentStep('upload');
  };

  // Render Steps
  const renderStepIndicator = () => {
    const steps = [
      { key: 'upload', label: '파일 업로드' },
      { key: 'preview', label: '프리뷰' },
      { key: 'mapping', label: '필드 매핑' },
      { key: 'validation', label: '검증' },
      { key: 'import', label: '임포트' }
    ];

    const currentIndex = steps.findIndex(s => s.key === currentStep);

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  index <= currentIndex
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-200 border-gray-300 text-gray-500'
                }`}
              >
                {index < currentIndex ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className={`ml-2 text-sm ${index <= currentIndex ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${index < currentIndex ? 'bg-blue-600' : 'bg-gray-300'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          CSV 파일 업로드
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>CSV 파일 형식 안내</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>UTF-8 인코딩 권장</li>
                <li>최대 파일 크기: 5MB</li>
                <li>첫 번째 행은 컬럼명으로 사용됩니다</li>
                <li>필수 필드: 상품명, 공급가, 판매가</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="text-blue-600 font-medium hover:text-blue-700">
                파일 선택
              </span>
              <span className="text-gray-600"> 또는 드래그 앤 드롭</span>
            </label>
            <p className="text-sm text-gray-500 mt-2">CSV 파일만 업로드 가능합니다</p>
          </div>

          <div className="flex justify-center">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              CSV 템플릿 다운로드
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderPreviewStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          데이터 프리뷰
          <Badge variant="secondary">{csvData.length}개 행</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left border-b">#</th>
                  {csvColumns.map(col => (
                    <th key={col} className="px-4 py-2 text-left border-b">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 10).map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                    {csvColumns.map(col => (
                      <td key={col} className="px-4 py-2">{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {csvData.length > 10 && (
            <p className="text-sm text-gray-500 text-center">
              처음 10개 행만 표시됩니다 (전체: {csvData.length}개)
            </p>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              다시 업로드
            </Button>
            <Button onClick={handleProceedToMapping}>
              필드 매핑
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderMappingStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          필드 매핑
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              CSV 컬럼과 상품 필드를 매핑하세요. 필수 필드는 반드시 매핑되어야 합니다.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {csvColumns.map(csvCol => (
              <div key={csvCol} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <span className="font-medium">{csvCol}</span>
                  <p className="text-sm text-gray-500">샘플: {csvData[0]?.[csvCol]}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
                <select
                  value={fieldMapping[csvCol] || ''}
                  onChange={(e) => setFieldMapping({
                    ...fieldMapping,
                    [csvCol]: e.target.value
                  })}
                  className="flex-1 px-3 py-2 border rounded-md"
                >
                  <option value="">매핑 안함</option>
                  {PRODUCT_FIELDS.map(field => (
                    <option key={field.key} value={field.key}>
                      {field.label} {field.required && '(필수)'}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setCurrentStep('preview')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              이전
            </Button>
            <Button onClick={handleProceedToValidation}>
              검증
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderValidationStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {validationErrors.length === 0 ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          )}
          검증 결과
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {validationErrors.length === 0 ? (
            <Alert variant="default" className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                모든 데이터 검증을 통과했습니다. 총 {csvData.length}개 상품을 임포트할 준비가 되었습니다.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {validationErrors.length}개의 오류가 발견되었습니다. CSV 파일을 수정한 후 다시 업로드하세요.
                </AlertDescription>
              </Alert>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left border-b">행</th>
                      <th className="px-4 py-2 text-left border-b">필드</th>
                      <th className="px-4 py-2 text-left border-b">오류 내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationErrors.map((error, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-2">{error.row}</td>
                        <td className="px-4 py-2">{error.field}</td>
                        <td className="px-4 py-2 text-red-600">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setCurrentStep('mapping')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              필드 매핑 수정
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={handleReset}>
                <X className="h-4 w-4 mr-2" />
                파일 다시 업로드
              </Button>
              {validationErrors.length === 0 && (
                <Button onClick={handleStartImport} disabled={isProcessing}>
                  <Save className="h-4 w-4 mr-2" />
                  임포트 시작
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderImportStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>상품 임포트 중...</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">상품을 등록하고 있습니다. 잠시만 기다려주세요...</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderCompleteStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          임포트 완료
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-3xl font-bold text-green-600">{importResults?.success || 0}</p>
              <p className="text-sm text-gray-600">성공</p>
            </div>
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-3xl font-bold text-red-600">{importResults?.failed || 0}</p>
              <p className="text-sm text-gray-600">실패</p>
            </div>
          </div>

          {importResults && importResults.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">오류 목록:</p>
                <ul className="list-disc list-inside space-y-1">
                  {importResults.errors.slice(0, 10).map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
                {importResults.errors.length > 10 && (
                  <p className="text-sm mt-2">외 {importResults.errors.length - 10}개...</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center gap-4">
            <Button onClick={handleReset}>
              새 임포트 시작
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/dropshipping/products'}>
              상품 목록 보기
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CSV 상품 일괄 가져오기</h1>
        <p className="text-gray-600 mt-1">CSV 파일을 통해 여러 상품을 한번에 등록할 수 있습니다</p>
      </div>

      {currentStep !== 'complete' && renderStepIndicator()}

      {currentStep === 'upload' && renderUploadStep()}
      {currentStep === 'preview' && renderPreviewStep()}
      {currentStep === 'mapping' && renderMappingStep()}
      {currentStep === 'validation' && renderValidationStep()}
      {currentStep === 'import' && renderImportStep()}
      {currentStep === 'complete' && renderCompleteStep()}
    </div>
  );
};

export default BulkProductImport;
