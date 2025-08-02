import { ChangeEvent, FC, useState } from 'react';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FormConfirmation, FormField } from '@o4o/types';

interface FormConfirmationsTabProps {
  confirmations: FormConfirmation[];
  fields: FormField[];
  onChange: (confirmations: FormConfirmation[]) => void;
}

export const FormConfirmationsTab: FC<FormConfirmationsTabProps> = ({
  confirmations,
  fields: _fields,
  onChange,
}) => {
  const [selectedConfirmation, setSelectedConfirmation] = useState<string | null>(
    confirmations[0]?.id || null
  );

  const addConfirmation = () => {
    const newConfirmation: FormConfirmation = {
      id: `confirmation_${Date.now()}`,
      name: '새 확인',
      type: 'message',
      message: '제출해 주셔서 감사합니다!',
    };
    onChange([...confirmations, newConfirmation]);
    setSelectedConfirmation(newConfirmation.id);
  };

  const updateConfirmation = (id: string, updates: Partial<FormConfirmation>) => {
    onChange(
      confirmations.map((confirmation) =>
        confirmation.id === id ? { ...confirmation, ...updates } : confirmation
      )
    );
  };

  const deleteConfirmation = (id: string) => {
    if (confirmations.length <= 1) {
      alert('최소 하나의 확인 메시지가 필요합니다.');
      return;
    }
    onChange(confirmations.filter((confirmation) => confirmation.id !== id));
    if (selectedConfirmation === id) {
      setSelectedConfirmation(confirmations[0]?.id || null);
    }
  };

  const currentConfirmation = confirmations.find((c) => c.id === selectedConfirmation);

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-4">
        <div className="space-y-2">
          {confirmations.map((confirmation) => (
            <Card
              key={confirmation.id}
              className={`p-3 cursor-pointer ${
                selectedConfirmation === confirmation.id ? 'border-primary' : ''
              }`}
              onClick={() => setSelectedConfirmation(confirmation.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{confirmation.name}</span>
                </div>
                {confirmations.length > 1 && (
                  <Button
                    variant={"ghost" as const}
                    size={"icon" as const}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConfirmation(confirmation.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
          <Button variant={"outline" as const} className="w-full" onClick={addConfirmation}>
            <Plus className="h-4 w-4 mr-2" />
            확인 추가
          </Button>
        </div>
      </div>

      <div className="col-span-8">
        {currentConfirmation ? (
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label>확인 이름</Label>
                <Input
                  value={currentConfirmation.name}
                  onChange={(e) =>
                    updateConfirmation(currentConfirmation.id, { name: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>확인 유형</Label>
                <Select
                  value={currentConfirmation.type}
                  onValueChange={(value) =>
                    updateConfirmation(currentConfirmation.id, { type: value as FormConfirmation['type'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message">메시지</SelectItem>
                    <SelectItem value="page">페이지로 이동</SelectItem>
                    <SelectItem value="redirect">URL로 리디렉션</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {currentConfirmation.type === 'message' && (
                <div>
                  <Label>메시지</Label>
                  <Textarea
                    value={currentConfirmation.message || ''}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      updateConfirmation(currentConfirmation.id, { message: e.target.value })
                    }
                    rows={10}
                    placeholder="HTML을 사용할 수 있습니다. 양식 필드를 사용하려면 {field:field_name} 형식을 사용하세요"
                  />
                </div>
              )}

              {currentConfirmation.type === 'page' && (
                <div>
                  <Label>페이지 ID</Label>
                  <Input
                    value={currentConfirmation.pageId || ''}
                    onChange={(e) =>
                      updateConfirmation(currentConfirmation.id, { pageId: e.target.value })
                    }
                    placeholder="감사 페이지의 ID를 입력하세요"
                  />
                </div>
              )}

              {currentConfirmation.type === 'redirect' && (
                <div>
                  <Label>리디렉션 URL</Label>
                  <Input
                    value={currentConfirmation.redirectUrl || ''}
                    onChange={(e) =>
                      updateConfirmation(currentConfirmation.id, { redirectUrl: e.target.value })
                    }
                    placeholder="https://example.com/thank-you"
                  />
                </div>
              )}

              <div>
                <Label>쿼리 문자열 추가</Label>
                <Input
                  value={currentConfirmation.queryString || ''}
                  onChange={(e) =>
                    updateConfirmation(currentConfirmation.id, { queryString: e.target.value })
                  }
                  placeholder="utm_source=form&entry_id={entry_id}"
                />
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <p className="text-center text-gray-500">확인을 선택하거나 추가하세요</p>
          </Card>
        )}
      </div>
    </div>
  );
};