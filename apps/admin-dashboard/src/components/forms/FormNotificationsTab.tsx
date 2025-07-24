import React, { useState } from 'react';
import { Plus, Trash2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { FormNotification, FormField } from '@o4o/types';

interface FormNotificationsTabProps {
  notifications: FormNotification[];
  fields: FormField[];
  onChange: (notifications: FormNotification[]) => void;
}

export const FormNotificationsTab: React.FC<FormNotificationsTabProps> = ({
  notifications,
  fields: _fields,
  onChange,
}) => {
  const [selectedNotification, setSelectedNotification] = useState<string | null>(
    notifications[0]?.id || null
  );

  const addNotification = () => {
    const newNotification: FormNotification = {
      id: `notification_${Date.now()}`,
      name: '새 알림',
      enabled: true,
      to: '',
      subject: '',
      message: '',
      fromName: '',
      fromEmail: '',
      replyTo: '',
      bcc: '',
      attachFiles: false,
      conditional: {
        enabled: false,
        action: 'show' as const,
        logicType: 'all',
        rules: [],
      },
    };
    onChange([...notifications, newNotification]);
    setSelectedNotification(newNotification.id);
  };

  const updateNotification = (id: string, updates: Partial<FormNotification>) => {
    onChange(
      notifications.map((notification) =>
        notification.id === id ? { ...notification, ...updates } : notification
      )
    );
  };

  const deleteNotification = (id: string) => {
    onChange(notifications.filter((notification) => notification.id !== id));
    if (selectedNotification === id) {
      setSelectedNotification(notifications[0]?.id || null);
    }
  };

  const currentNotification = notifications.find((n) => n.id === selectedNotification);

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-4">
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-3 cursor-pointer ${
                selectedNotification === notification.id ? 'border-primary' : ''
              }`}
              onClick={() => setSelectedNotification(notification.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{notification.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          <Button variant="outline" className="w-full" onClick={addNotification}>
            <Plus className="h-4 w-4 mr-2" />
            알림 추가
          </Button>
        </div>
      </div>

      <div className="col-span-8">
        {currentNotification ? (
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label>알림 이름</Label>
                <Input
                  value={currentNotification.name}
                  onChange={(e) =>
                    updateNotification(currentNotification.id, { name: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>받는 사람</Label>
                <Input
                  value={currentNotification.to}
                  onChange={(e) =>
                    updateNotification(currentNotification.id, { to: e.target.value })
                  }
                  placeholder="admin@example.com 또는 {field:email}"
                />
              </div>

              <div>
                <Label>제목</Label>
                <Input
                  value={currentNotification.subject}
                  onChange={(e) =>
                    updateNotification(currentNotification.id, { subject: e.target.value })
                  }
                  placeholder="새 양식 제출: {field:name}"
                />
              </div>

              <div>
                <Label>메시지</Label>
                <Textarea
                  value={currentNotification.message}
                  onChange={(e) =>
                    updateNotification(currentNotification.id, { message: e.target.value })
                  }
                  rows={10}
                  placeholder="양식 필드를 사용하려면 {field:field_name} 형식을 사용하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>보내는 사람 이름</Label>
                  <Input
                    value={currentNotification.fromName}
                    onChange={(e) =>
                      updateNotification(currentNotification.id, { fromName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>보내는 사람 이메일</Label>
                  <Input
                    type="email"
                    value={currentNotification.fromEmail}
                    onChange={(e) =>
                      updateNotification(currentNotification.id, { fromEmail: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>회신 주소</Label>
                <Input
                  type="email"
                  value={currentNotification.replyTo || ''}
                  onChange={(e) =>
                    updateNotification(currentNotification.id, { replyTo: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>숨은 참조 (BCC)</Label>
                <Input
                  value={currentNotification.bcc || ''}
                  onChange={(e) =>
                    updateNotification(currentNotification.id, { bcc: e.target.value })
                  }
                  placeholder="쉼표로 구분된 이메일 주소"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>업로드된 파일 첨부</Label>
                <Switch
                  checked={currentNotification.attachFiles}
                  onCheckedChange={(checked) =>
                    updateNotification(currentNotification.id, { attachFiles: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>조건부 전송</Label>
                <Switch
                  checked={currentNotification.conditional?.enabled || false}
                  onCheckedChange={(checked) =>
                    updateNotification(currentNotification.id, {
                      conditional: {
                        ...currentNotification.conditional!,
                        enabled: checked,
                      },
                    })
                  }
                />
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <p className="text-center text-gray-500">알림을 선택하거나 추가하세요</p>
          </Card>
        )}
      </div>
    </div>
  );
};