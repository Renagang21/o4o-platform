import React, { useState, useRef, useEffect, ReactNode } from 'react';

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  alignment?: 'left' | 'right';
  className?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * 공용 드롭다운 컴포넌트
 *
 * 외부 클릭 감지, ESC 키 닫힘, 접근성 지원
 * AccountModule, RoleSwitcher 등에서 재사용 가능
 *
 * @example
 * <Dropdown
 *   trigger={<button>메뉴</button>}
 *   alignment="right"
 * >
 *   <div>드롭다운 내용</div>
 * </Dropdown>
 */
export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  alignment = 'right',
  className = '',
  onOpenChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Toggle dropdown
  const toggleDropdown = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  };

  // Close dropdown
  const closeDropdown = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0'
  };

  return (
    <div className={`dropdown-container relative ${className}`} ref={dropdownRef}>
      {/* Trigger */}
      <div onClick={toggleDropdown} className="dropdown-trigger cursor-pointer">
        {trigger}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`dropdown-menu absolute z-50 mt-2 min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg ${alignmentClasses[alignment]}`}
          role="menu"
          aria-orientation="vertical"
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
