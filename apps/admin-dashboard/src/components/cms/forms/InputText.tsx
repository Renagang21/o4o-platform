/**
 * CMS Forms - InputText Component
 * Text input with validation
 */

interface InputTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  type?: 'text' | 'email' | 'url' | 'password';
}

export default function InputText({
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
  type = 'text',
}: InputTextProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    />
  );
}
