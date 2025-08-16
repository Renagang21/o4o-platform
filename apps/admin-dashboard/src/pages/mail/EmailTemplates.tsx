import { FC, useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash2, Eye, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  slug: string;
  type: 'system' | 'custom';
  category: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  enabled: boolean;
  updatedAt: string;
}

const EmailTemplates: FC = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  // 기본 템플릿 목록
  const defaultTemplates: EmailTemplate[] = [
    {
      id: 1,
      name: '회원가입 환영',
      subject: '{{site_name}}에 오신 것을 환영합니다!',
      slug: 'welcome',
      type: 'system',
      category: '회원',
      htmlContent: '<h1>환영합니다, {{user_name}}님!</h1><p>{{site_name}}의 회원이 되신 것을 축하합니다.</p>',
      variables: ['site_name', 'user_name', 'user_email'],
      enabled: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      name: '비밀번호 재설정',
      subject: '비밀번호 재설정 요청',
      slug: 'password-reset',
      type: 'system',
      category: '인증',
      htmlContent: '<p>비밀번호 재설정을 요청하셨습니다.</p><p><a href="{{reset_link}}">여기를 클릭</a>하여 비밀번호를 재설정하세요.</p>',
      variables: ['user_name', 'reset_link', 'expire_time'],
      enabled: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      name: '주문 확인',
      subject: '주문이 확인되었습니다 - 주문번호: {{order_number}}',
      slug: 'order-confirmation',
      type: 'system',
      category: '주문',
      htmlContent: '<h2>주문이 확인되었습니다</h2><p>주문번호: {{order_number}}</p><p>총 금액: {{total_amount}}</p>',
      variables: ['order_number', 'total_amount', 'order_items', 'shipping_address'],
      enabled: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: 4,
      name: '배송 알림',
      subject: '상품이 배송되었습니다',
      slug: 'shipping-notification',
      type: 'system',
      category: '배송',
      htmlContent: '<p>주문하신 상품이 배송되었습니다.</p><p>운송장번호: {{tracking_number}}</p>',
      variables: ['order_number', 'tracking_number', 'carrier', 'expected_delivery'],
      enabled: true,
      updatedAt: new Date().toISOString()
    }
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    // TODO: API 연동
    setTemplates(defaultTemplates);
    setLoading(false);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handlePreview = (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleDuplicate = (template: EmailTemplate) => {
    const newTemplate = {
      ...template,
      id: Date.now(),
      name: `${template.name} (복사본)`,
      slug: `${template.slug}-copy`,
      type: 'custom' as const
    };
    setTemplates([...templates, newTemplate]);
    toast({
      title: '템플릿 복제됨',
      description: '템플릿이 성공적으로 복제되었습니다.'
    });
  };

  const handleToggle = (templateId: number) => {
    setTemplates(templates.map(t => 
      t.id === templateId ? { ...t, enabled: !t.enabled } : t
    ));
  };

  const handleSave = () => {
    if (editingTemplate) {
      setTemplates(templates.map(t => 
        t.id === editingTemplate.id ? editingTemplate : t
      ));
      toast({
        title: '저장됨',
        description: '템플릿이 성공적으로 저장되었습니다.'
      });
      setShowEditor(false);
      setEditingTemplate(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">이메일 템플릿</h2>
          <p className="text-gray-600 mt-1">시스템에서 발송되는 이메일 템플릿을 관리합니다</p>
        </div>
        <Button onClick={() => {
          setEditingTemplate({
            id: Date.now(),
            name: '새 템플릿',
            subject: '',
            slug: '',
            type: 'custom',
            category: '기타',
            htmlContent: '',
            variables: [],
            enabled: true,
            updatedAt: new Date().toISOString()
          });
          setShowEditor(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          새 템플릿
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    템플릿
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수정일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-500">{template.subject}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {template.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.type === 'system' 
                          ? 'bg-gray-100 text-gray-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {template.type === 'system' ? '시스템' : '사용자정의'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(template.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          template.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          template.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(template)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {template.type === 'custom' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTemplates(templates.filter(t => t.id !== template.id));
                              toast({
                                title: '삭제됨',
                                description: '템플릿이 삭제되었습니다.'
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 템플릿 편집 다이얼로그 */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? '템플릿 편집' : '새 템플릿'}
            </DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>템플릿 이름</Label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      name: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label>슬러그</Label>
                  <Input
                    value={editingTemplate.slug}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      slug: e.target.value
                    })}
                    placeholder="welcome-email"
                  />
                </div>
              </div>
              
              <div>
                <Label>제목</Label>
                <Input
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    subject: e.target.value
                  })}
                />
              </div>

              <div>
                <Label>HTML 내용</Label>
                <Textarea
                  rows={10}
                  value={editingTemplate.htmlContent}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    htmlContent: e.target.value
                  })}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label>사용 가능한 변수</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editingTemplate.variables.map((variable) => (
                    <span key={variable} className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              취소
            </Button>
            <Button onClick={handleSave}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 템플릿 미리보기 다이얼로그 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>템플릿 미리보기</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <Label>제목</Label>
                <div className="p-2 bg-gray-50 rounded">{previewTemplate.subject}</div>
              </div>
              <div>
                <Label>내용</Label>
                <div 
                  className="p-4 bg-white border rounded"
                  dangerouslySetInnerHTML={{ __html: previewTemplate.htmlContent }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplates;