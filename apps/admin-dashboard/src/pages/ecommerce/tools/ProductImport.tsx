import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  Download,
  Settings,
  PlayCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FieldMapping {
  csvField: string;
  medusaField: string;
  defaultValue?: string;
}

interface ImportLog {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

const ProductImport = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'options' | 'import' | 'complete'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [importOptions, setImportOptions] = useState({
    duplicateHandling: 'skip',
    createCategories: true,
    downloadImages: true,
    resizeImages: true,
    generateThumbnails: true
  });
  const [importProgress, setImportProgress] = useState(0);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [importStats, setImportStats] = useState({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0
  });

  const medusaFields = [
    { value: 'title', label: '상품명' },
    { value: 'subtitle', label: '부제목' },
    { value: 'description', label: '상품 설명' },
    { value: 'handle', label: 'URL 슬러그' },
    { value: 'sku', label: 'SKU' },
    { value: 'barcode', label: '바코드' },
    { value: 'weight', label: '무게' },
    { value: 'length', label: '길이' },
    { value: 'height', label: '높이' },
    { value: 'width', label: '너비' },
    { value: 'price', label: '가격' },
    { value: 'sale_price', label: '할인가' },
    { value: 'inventory_quantity', label: '재고 수량' },
    { value: 'categories', label: '카테고리' },
    { value: 'tags', label: '태그' },
    { value: 'images', label: '이미지 URL' },
    { value: 'thumbnail', label: '썸네일 URL' },
    { value: 'status', label: '상태' },
    { value: 'meta_title', label: '메타 타이틀' },
    { value: 'meta_description', label: '메타 설명' },
    { value: 'skip', label: '(매핑하지 않음)' }
  ];

  const defaultMappings: Record<string, string> = {
    '이름': 'title',
    '간단한 설명': 'subtitle',
    '설명': 'description',
    'SKU': 'sku',
    '정상 가격': 'price',
    '할인 가격': 'sale_price',
    '재고': 'inventory_quantity',
    '카테고리': 'categories',
    '태그': 'tags',
    '이미지': 'images',
    '무게(kg)': 'weight'
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'text/csv') {
      setUploadedFile(file);
      parseCSV(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    maxSize: 52428800 // 50MB
  });

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      setCsvHeaders(headers);
      
      // Parse preview data (first 5 rows)
      const preview = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {} as any);
      });
      setPreviewData(preview);

      // Auto-map fields
      const mappings = headers.map(header => ({
        csvField: header,
        medusaField: defaultMappings[header] || 'skip',
        defaultValue: ''
      }));
      setFieldMappings(mappings);

      // Set import stats
      setImportStats(prev => ({
        ...prev,
        total: lines.length - 1
      }));
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (csvField: string, medusaField: string) => {
    setFieldMappings(prev =>
      prev.map(mapping =>
        mapping.csvField === csvField
          ? { ...mapping, medusaField }
          : mapping
      )
    );
  };

  const startImport = async () => {
    setCurrentStep('import');
    
    // Simulate import process
    const total = importStats.total;
    let processed = 0;
    
    const interval = setInterval(() => {
      processed += Math.floor(Math.random() * 5) + 1;
      if (processed >= total) {
        processed = total;
        clearInterval(interval);
        setCurrentStep('complete');
      }
      
      const progress = (processed / total) * 100;
      setImportProgress(progress);
      
      setImportStats(prev => ({
        ...prev,
        processed,
        success: processed - Math.floor(processed * 0.05),
        failed: Math.floor(processed * 0.02),
        skipped: Math.floor(processed * 0.03)
      }));
      
      // Add log entries
      if (processed % 10 === 0) {
        addLog('info', `${processed}/${total} 상품 처리 완료`);
      }
    }, 200);
  };

  const addLog = (type: ImportLog['type'], message: string) => {
    setImportLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <Card>
            <CardHeader>
              <CardTitle>1단계: CSV 파일 업로드</CardTitle>
              <CardDescription>
                WooCommerce에서 내보낸 CSV 파일을 업로드하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                  transition-colors hover:border-blue-500 hover:bg-blue-50
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                  ${uploadedFile ? 'bg-green-50 border-green-500' : ''}
                `}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                {uploadedFile ? (
                  <div>
                    <p className="text-lg font-medium text-green-600">
                      파일 업로드 완료!
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      총 {importStats.total}개 상품 감지됨
                    </p>
                  </div>
                ) : isDragActive ? (
                  <p>파일을 여기에 놓으세요...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium">
                      클릭하거나 파일을 드래그하여 업로드
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      CSV 파일만 지원 (최대 50MB)
                    </p>
                  </div>
                )}
              </div>

              {uploadedFile && (
                <>
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      파일이 성공적으로 업로드되었습니다. {csvHeaders.length}개의 필드가 감지되었습니다.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h3 className="font-medium mb-2">감지된 필드</h3>
                    <div className="flex flex-wrap gap-2">
                      {csvHeaders.map(header => (
                        <Badge key={header} variant="secondary">
                          {header}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => setCurrentStep('mapping')}>
                      다음: 필드 매핑
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );

      case 'mapping':
        return (
          <Card>
            <CardHeader>
              <CardTitle>2단계: 필드 매핑</CardTitle>
              <CardDescription>
                CSV 필드를 Medusa 상품 필드에 매핑하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  자동 매핑이 적용되었습니다. 필요한 경우 수동으로 조정하세요.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CSV 필드</TableHead>
                      <TableHead>샘플 데이터</TableHead>
                      <TableHead>Medusa 필드</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fieldMappings.map(mapping => (
                      <TableRow key={mapping.csvField}>
                        <TableCell className="font-medium">
                          {mapping.csvField}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {previewData[0]?.[mapping.csvField] || '(비어있음)'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping.medusaField}
                            onValueChange={(value) => 
                              handleMappingChange(mapping.csvField, value)
                            }
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {medusaFields.map(field => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                  이전
                </Button>
                <Button onClick={() => setCurrentStep('options')}>
                  다음: Import 옵션
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'options':
        return (
          <Card>
            <CardHeader>
              <CardTitle>3단계: Import 옵션 설정</CardTitle>
              <CardDescription>
                데이터 처리 방식을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-4 block">
                  중복 상품 처리
                </Label>
                <RadioGroup
                  value={importOptions.duplicateHandling}
                  onValueChange={(value) =>
                    setImportOptions(prev => ({ ...prev, duplicateHandling: value }))
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label htmlFor="skip">건너뛰기 (기존 상품 유지)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="update" id="update" />
                    <Label htmlFor="update">업데이트 (기존 상품 덮어쓰기)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="duplicate" id="duplicate" />
                    <Label htmlFor="duplicate">새 상품으로 등록 (SKU 자동 변경)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">추가 옵션</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="createCategories"
                      checked={importOptions.createCategories}
                      onCheckedChange={(checked) =>
                        setImportOptions(prev => ({ 
                          ...prev, 
                          createCategories: checked as boolean 
                        }))
                      }
                    />
                    <Label htmlFor="createCategories">
                      존재하지 않는 카테고리 자동 생성
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="downloadImages"
                      checked={importOptions.downloadImages}
                      onCheckedChange={(checked) =>
                        setImportOptions(prev => ({ 
                          ...prev, 
                          downloadImages: checked as boolean 
                        }))
                      }
                    />
                    <Label htmlFor="downloadImages">
                      이미지 URL 자동 다운로드
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="resizeImages"
                      checked={importOptions.resizeImages}
                      onCheckedChange={(checked) =>
                        setImportOptions(prev => ({ 
                          ...prev, 
                          resizeImages: checked as boolean 
                        }))
                      }
                    />
                    <Label htmlFor="resizeImages">
                      이미지 자동 리사이징
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="generateThumbnails"
                      checked={importOptions.generateThumbnails}
                      onCheckedChange={(checked) =>
                        setImportOptions(prev => ({ 
                          ...prev, 
                          generateThumbnails: checked as boolean 
                        }))
                      }
                    />
                    <Label htmlFor="generateThumbnails">
                      썸네일 자동 생성
                    </Label>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Import 작업은 되돌릴 수 없습니다. 시작하기 전에 데이터를 백업하세요.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('mapping')}>
                  이전
                </Button>
                <Button onClick={startImport}>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Import 시작
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'import':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Import 진행 중...</CardTitle>
              <CardDescription>
                상품을 등록하고 있습니다. 잠시만 기다려주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>진행률</span>
                  <span>{importProgress.toFixed(0)}%</span>
                </div>
                <Progress value={importProgress} className="w-full" />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">전체</p>
                    <p className="text-2xl font-bold">{importStats.total}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">성공</p>
                    <p className="text-2xl font-bold text-green-600">
                      {importStats.success}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">실패</p>
                    <p className="text-2xl font-bold text-red-600">
                      {importStats.failed}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">건너뜀</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {importStats.skipped}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                <h3 className="font-medium mb-2">Import 로그</h3>
                <div className="space-y-1 text-sm font-mono">
                  {importLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`
                        ${log.type === 'error' ? 'text-red-600' : ''}
                        ${log.type === 'warning' ? 'text-yellow-600' : ''}
                        ${log.type === 'success' ? 'text-green-600' : ''}
                        ${log.type === 'info' ? 'text-gray-600' : ''}
                      `}
                    >
                      [{log.timestamp.toLocaleTimeString()}] {log.message}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'complete':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Import 완료!</CardTitle>
              <CardDescription>
                상품 Import가 성공적으로 완료되었습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  총 {importStats.total}개 중 {importStats.success}개 상품이 성공적으로 등록되었습니다.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">성공</p>
                        <p className="text-2xl font-bold text-green-600">
                          {importStats.success}
                        </p>
                      </div>
                      <Check className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">실패</p>
                        <p className="text-2xl font-bold text-red-600">
                          {importStats.failed}
                        </p>
                      </div>
                      <X className="w-8 h-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate('/ecommerce/products')}>
                  상품 목록 보기
                </Button>
                <Button onClick={() => window.location.reload()}>
                  새 Import 시작
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  로그 다운로드
                </Button>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">상품 Import</h1>
          <p className="text-gray-600 mt-1">
            CSV 파일을 통해 상품을 일괄 등록합니다
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/ecommerce/tools')}>
          도구 목록으로
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {['upload', 'mapping', 'options', 'import', 'complete'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${currentStep === step ? 'bg-blue-600 text-white' : ''}
                ${['upload', 'mapping', 'options', 'import', 'complete'].indexOf(currentStep) > index
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-600'}
              `}
            >
              {['upload', 'mapping', 'options', 'import', 'complete'].indexOf(currentStep) > index ? (
                <Check className="w-5 h-5" />
              ) : (
                index + 1
              )}
            </div>
            {index < 4 && (
              <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      {renderStep()}
    </div>
  );
};

export default ProductImport;