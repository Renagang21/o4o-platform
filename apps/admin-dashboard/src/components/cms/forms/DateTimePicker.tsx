/**
 * CMS Forms - DateTimePicker Component
 * Date and time picker for scheduling
 */

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: string;
  label?: string;
}

export default function DateTimePicker({
  value,
  onChange,
  disabled,
  min,
  label,
}: DateTimePickerProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={min}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
}
