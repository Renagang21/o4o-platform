// 🎯 Commands List Component (Slash Commands UI)

import React, { useState, useEffect, useImperativeHandle } from 'react';
import { CommandItem } from './SlashCommand';

interface CommandsListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
  ref?: React.Ref<any>;
}

export const CommandsList = ({ items, command, ref, ...props }: CommandsListProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + items.length - 1) % items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="relative z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[280px] max-h-80 overflow-y-auto">
      {items.length ? (
        items.map((item, index) => (
          <button
            key={index}
            className={`w-full text-left p-3 rounded-md flex items-center gap-3 transition-colors ${
              index === selectedIndex 
                ? 'bg-blue-50 border border-blue-200' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => selectItem(index)}
          >
            <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center text-sm font-medium">
              {item.icon}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm">
                {item.title}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {item.description}
              </div>
            </div>
          </button>
        ))
      ) : (
        <div className="p-4 text-center text-gray-500 text-sm">
          검색 결과가 없습니다
        </div>
      )}
    </div>
  );
};

CommandsList.displayName = 'CommandsList';
