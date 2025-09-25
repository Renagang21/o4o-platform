import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Download,
  Database,
  FileText,
  Package,
  BarChart3,
  RefreshCw,
  Shield,
  Wrench,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const EcommerceTools = () => {
  const navigate = useNavigate();
  const [recentImports] = useState([
    {
      id: 1,
      filename: 'products_2024_01.csv',
      date: '2024-01-15',
      status: 'completed',
      total: 156,
      success: 150,
      failed: 6
    },
    {
      id: 2,
      filename: 'woocommerce_export.csv',
      date: '2024-01-10',
      status: 'completed',
      total: 89,
      success: 89,
      failed: 0
    }
  ]);

  const tools = [
    {
      id: 'import-products',
      title: '상품 Import',
      description: 'WooCommerce CSV 파일을 통해 상품을 일괄 등록합니다',
      icon: Upload,
      color: 'blue',
      action: () => navigate('/ecommerce/tools/import'),
      stats: '최근 Import: 2개 파일',
      primary: true
    },
    {
      id: 'export-products',
      title: '상품 Export',
      description: '현재 등록된 상품을 CSV 파일로 내보냅니다',
      icon: Download,
      color: 'green',
      action: () => navigate('/ecommerce/tools/export'),
      stats: '총 523개 상품'
    },
    {
      id: 'backup-data',
      title: '데이터 백업',
      description: '전체 상품 데이터를 백업합니다',
      icon: Database,
      color: 'purple',
      action: () => navigate('/ecommerce/tools/backup'),
      stats: '마지막 백업: 3일 전'
    },
    {
      id: 'bulk-update',
      title: '일괄 수정',
      description: '여러 상품의 가격, 재고를 한번에 수정합니다',
      icon: RefreshCw,
      color: 'orange',
      action: () => navigate('/ecommerce/tools/bulk-update'),
      stats: '빠른 수정 도구'
    },
    {
      id: 'migrate-data',
      title: '데이터 마이그레이션',
      description: '다른 플랫폼에서 데이터를 이전합니다',
      icon: Package,
      color: 'indigo',
      action: () => navigate('/ecommerce/tools/migrate'),
      stats: 'WooCommerce, Shopify 지원'
    },
    {
      id: 'reports',
      title: '리포트 생성',
      description: '판매 및 재고 리포트를 생성합니다',
      icon: BarChart3,
      color: 'pink',
      action: () => navigate('/ecommerce/tools/reports'),
      stats: '다양한 형식 지원'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">E-commerce 도구</h1>
        <p className="text-gray-600 mt-1">상품 데이터 관리를 위한 다양한 도구들</p>
      </div>

      {/* Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          대량 작업을 수행하기 전에 반드시 데이터를 백업하세요. 
          Import/Export 작업은 되돌릴 수 없습니다.
        </AlertDescription>
      </Alert>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card 
              key={tool.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                tool.primary ? 'border-blue-500 border-2' : ''
              }`}
              onClick={tool.action}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg bg-${tool.color}-100`}>
                    <Icon className={`w-6 h-6 text-${tool.color}-600`} />
                  </div>
                  {tool.primary && (
                    <Badge variant="default">추천</Badge>
                  )}
                </div>
                <CardTitle className="mt-4">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{tool.stats}</span>
                  <Button size="sm" variant="ghost">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Imports */}
      <Card>
        <CardHeader>
          <CardTitle>최근 Import 기록</CardTitle>
          <CardDescription>최근 수행한 상품 Import 작업 내역</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentImports.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="font-medium">{record.filename}</p>
                    <p className="text-sm text-gray-500">{record.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">처리 결과</p>
                    <p className="font-medium">
                      성공: {record.success}/{record.total}
                      {record.failed > 0 && (
                        <span className="text-red-500 ml-2">실패: {record.failed}</span>
                      )}
                    </p>
                  </div>
                  <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                    {record.status === 'completed' ? '완료' : '진행중'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 작업</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/ecommerce/tools/import')}>
              <Upload className="w-4 h-4 mr-2" />
              CSV Import 시작
            </Button>
            <Button variant="outline" onClick={() => navigate('/ecommerce/tools/export')}>
              <Download className="w-4 h-4 mr-2" />
              상품 Export
            </Button>
            <Button variant="outline" onClick={() => navigate('/ecommerce/tools/backup')}>
              <Shield className="w-4 h-4 mr-2" />
              백업 생성
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EcommerceTools;