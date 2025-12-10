/**
 * CoursePicker Component
 *
 * Searchable dropdown for selecting courses from LMS
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, X, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Course {
  id: string;
  title: string;
  credits?: number;
  category?: string;
}

interface CoursePickerProps {
  courses: Course[];
  selectedIds?: string[];
  onSelect: (courseId: string) => void;
  onDeselect?: (courseId: string) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  isLoading?: boolean;
}

export function CoursePicker({
  courses,
  selectedIds = [],
  onSelect,
  onDeselect,
  multiple = false,
  placeholder = '강좌 선택...',
  disabled = false,
  className,
  isLoading = false,
}: CoursePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCourses = courses.filter((c) => selectedIds.includes(c.id));

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = useCallback(
    (courseId: string) => {
      if (selectedIds.includes(courseId)) {
        onDeselect?.(courseId);
      } else {
        onSelect(courseId);
        if (!multiple) {
          setOpen(false);
        }
      }
    },
    [selectedIds, onSelect, onDeselect, multiple]
  );

  const handleRemove = useCallback(
    (courseId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onDeselect?.(courseId);
    },
    [onDeselect]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('flex flex-col gap-2 relative', className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled || isLoading}
        className="w-full justify-between"
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">
          {selectedCourses.length === 0
            ? placeholder
            : multiple
            ? `${selectedCourses.length}개 강좌 선택됨`
            : selectedCourses[0]?.title}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="강좌 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                로딩 중...
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                검색 결과가 없습니다.
              </div>
            ) : (
              filteredCourses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleSelect(course.id)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                >
                  <Check
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      selectedIds.includes(course.id)
                        ? 'opacity-100 text-blue-600'
                        : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-sm truncate">{course.title}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {course.category && <span>{course.category}</span>}
                      {course.credits && (
                        <span className="text-green-600">
                          {course.credits} 평점
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Selected courses display (for multiple selection) */}
      {multiple && selectedCourses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCourses.map((course) => (
            <Badge
              key={course.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <BookOpen className="h-3 w-3" />
              <span className="max-w-[150px] truncate">{course.title}</span>
              {onDeselect && (
                <button
                  type="button"
                  onClick={(e) => handleRemove(course.id, e)}
                  className="ml-1 rounded-full p-0.5 hover:bg-gray-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default CoursePicker;
