/**
 * CoursePicker Component
 *
 * Searchable dropdown for selecting courses from LMS
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            className="w-full justify-between"
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
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="강좌 검색..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? '로딩 중...' : '검색 결과가 없습니다.'}
              </CommandEmpty>
              <CommandGroup>
                {filteredCourses.map((course) => (
                  <CommandItem
                    key={course.id}
                    value={course.id}
                    onSelect={() => handleSelect(course.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedIds.includes(course.id)
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">{course.title}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {course.category && <span>{course.category}</span>}
                        {course.credits && (
                          <span className="text-green-600">
                            {course.credits} 평점
                          </span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
