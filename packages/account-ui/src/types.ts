import type { ReactNode } from 'react';

export interface ProfileField {
  key: string;
  label: string;
  value: string;
  type?: 'text' | 'tel' | 'email';
  editable?: boolean;
  icon?: ReactNode;
}
