import type { ReactNode } from 'react';

interface ProfileInfoFieldProps {
  label: string;
  value: string;
  editValue?: string;
  isEditing?: boolean;
  onChange?: (value: string) => void;
  editable?: boolean;
  type?: 'text' | 'tel' | 'email';
  icon?: ReactNode;
}

export function ProfileInfoField({
  label,
  value,
  editValue,
  isEditing = false,
  onChange,
  editable = true,
  type = 'text',
  icon,
}: ProfileInfoFieldProps) {
  const showInput = isEditing && editable && onChange;

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
      {icon && (
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        {showInput ? (
          <input
            type={type}
            value={editValue ?? value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mt-1"
          />
        ) : (
          <p className="text-sm font-medium text-gray-800 truncate">{value || '-'}</p>
        )}
      </div>
    </div>
  );
}
