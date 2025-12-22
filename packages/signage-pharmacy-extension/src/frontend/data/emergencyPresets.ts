/**
 * Emergency Announcement Presets
 *
 * Phase 3: Quick announcement presets for common pharmacy situations.
 * These can be executed immediately and will return to normal schedule after.
 */

export interface EmergencyPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultDuration: number; // seconds, 0 = until manually stopped
  message: string;
  variables?: EmergencyVariable[];
}

export interface EmergencyVariable {
  key: string;
  label: string;
  type: 'text' | 'time' | 'select';
  options?: string[];
  defaultValue?: string;
}

/**
 * Emergency Announcement Presets
 */
export const EMERGENCY_PRESETS: EmergencyPreset[] = [
  {
    id: 'lunch-break',
    name: '점심시간 안내',
    description: '점심시간 중 잠시 자리를 비울 때',
    icon: 'Coffee',
    color: 'amber',
    defaultDuration: 0, // Until manually stopped
    message: '점심시간입니다.\n{{startTime}} ~ {{endTime}}\n잠시 후 다시 찾아뵙겠습니다.',
    variables: [
      {
        key: 'startTime',
        label: '시작 시간',
        type: 'time',
        defaultValue: '12:00',
      },
      {
        key: 'endTime',
        label: '종료 시간',
        type: 'time',
        defaultValue: '13:00',
      },
    ],
  },
  {
    id: 'hours-change',
    name: '영업시간 변경',
    description: '오늘 영업시간이 평소와 다를 때',
    icon: 'Clock',
    color: 'blue',
    defaultDuration: 0,
    message: '오늘 영업시간 안내\n{{openTime}} ~ {{closeTime}}\n이용에 참고 부탁드립니다.',
    variables: [
      {
        key: 'openTime',
        label: '오픈 시간',
        type: 'time',
        defaultValue: '09:00',
      },
      {
        key: 'closeTime',
        label: '마감 시간',
        type: 'time',
        defaultValue: '18:00',
      },
    ],
  },
  {
    id: 'temporary-closed',
    name: '임시 휴무',
    description: '긴급 상황으로 임시 휴무 시',
    icon: 'AlertTriangle',
    color: 'red',
    defaultDuration: 0,
    message: '오늘은 {{reason}}(으)로\n임시 휴무입니다.\n불편을 드려 죄송합니다.',
    variables: [
      {
        key: 'reason',
        label: '휴무 사유',
        type: 'select',
        options: ['개인 사정', '직원 교육', '시설 점검', '긴급 상황'],
        defaultValue: '개인 사정',
      },
    ],
  },
  {
    id: 'waiting-notice',
    name: '대기 안내',
    description: '대기가 많을 때 예상 시간 안내',
    icon: 'Users',
    color: 'purple',
    defaultDuration: 300, // 5 minutes
    message: '현재 대기 손님이 많습니다.\n예상 대기시간: 약 {{waitTime}}분\n잠시만 기다려주세요.',
    variables: [
      {
        key: 'waitTime',
        label: '예상 대기시간 (분)',
        type: 'text',
        defaultValue: '10',
      },
    ],
  },
  {
    id: 'break-time',
    name: '잠시 자리비움',
    description: '잠깐 자리를 비울 때',
    icon: 'Timer',
    color: 'gray',
    defaultDuration: 600, // 10 minutes
    message: '잠시 자리를 비웁니다.\n약 {{minutes}}분 후 돌아오겠습니다.\n조금만 기다려주세요.',
    variables: [
      {
        key: 'minutes',
        label: '예상 시간 (분)',
        type: 'text',
        defaultValue: '5',
      },
    ],
  },
  {
    id: 'custom-notice',
    name: '사용자 정의',
    description: '직접 메시지 입력',
    icon: 'Edit',
    color: 'indigo',
    defaultDuration: 0,
    message: '{{customMessage}}',
    variables: [
      {
        key: 'customMessage',
        label: '표시할 메시지',
        type: 'text',
        defaultValue: '',
      },
    ],
  },
];

/**
 * Get preset by ID
 */
export function getEmergencyPreset(id: string): EmergencyPreset | undefined {
  return EMERGENCY_PRESETS.find((p) => p.id === id);
}

/**
 * Replace variables in message template
 */
export function renderEmergencyMessage(
  preset: EmergencyPreset,
  values: Record<string, string>
): string {
  let message = preset.message;

  for (const variable of preset.variables || []) {
    const value = values[variable.key] || variable.defaultValue || '';
    message = message.replace(new RegExp(`{{${variable.key}}}`, 'g'), value);
  }

  return message;
}
