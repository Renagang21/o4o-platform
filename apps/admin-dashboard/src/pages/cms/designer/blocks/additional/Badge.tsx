/**
 * Additional Block - Badge
 *
 * Small label / tag
 */

export interface BadgeProps {
  text: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

const variantClasses = {
  primary: 'bg-blue-100 text-blue-800',
  secondary: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-cyan-100 text-cyan-800',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export default function Badge({
  text = 'Badge',
  variant = 'primary',
  size = 'md',
  rounded = true,
}: BadgeProps) {
  return (
    <span
      className={`inline-block font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${
        rounded ? 'rounded-full' : 'rounded'
      }`}
    >
      {text}
    </span>
  );
}
