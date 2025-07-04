import React from 'react';
import { Calendar } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';

interface DateFilterProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  value,
  onChange,
  placeholder = "Select date",
  className = "",
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-10 pr-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        {value ? format(value, 'MMM dd, yyyy') : placeholder}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20">
            <DayPicker
              mode="single"
              selected={value}
              onSelect={(date) => {
                onChange(date);
                setIsOpen(false);
              }}
              className="p-3"
              classNames={{
                day_selected: 'bg-blue-600 text-white',
                day_today: 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
                day: 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100',
                month: 'text-gray-900 dark:text-gray-100',
                caption: 'text-gray-900 dark:text-gray-100',
                nav_button: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
                head_cell: 'text-gray-500 dark:text-gray-400',
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};