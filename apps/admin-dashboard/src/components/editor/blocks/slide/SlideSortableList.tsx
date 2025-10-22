/**
 * SlideSortableList - Drag-and-drop reorderable slide list
 * Phase 2: Advanced editing features
 */

import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Copy, 
  Trash2, 
  Eye,
  EyeOff,
  Image,
  Type,
  Layers
} from 'lucide-react';
import { Slide } from './types';

interface SlideSortableListProps {
  slides: Slide[];
  currentSlide: number;
  onReorder: (slides: Slide[]) => void;
  onSelect: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onToggleVisibility?: (index: number) => void;
  selectedSlides?: Set<number>;
  onSelectionChange?: (selected: Set<number>) => void;
}

interface SortableSlideItemProps {
  slide: Slide;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleVisibility?: () => void;
  onMultiSelect?: (add: boolean) => void;
}

const SortableSlideItem: React.FC<SortableSlideItemProps> = ({
  slide,
  index,
  isActive,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  onToggleVisibility,
  onMultiSelect
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getSlideIcon = () => {
    switch (slide.type) {
      case 'text': return <Type size={14} />;
      case 'image': return <Image size={14} />;
      case 'mixed': return <Layers size={14} />;
      default: return null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey && onMultiSelect) {
      onMultiSelect(true);
    } else if (e.ctrlKey || e.metaKey) {
      onMultiSelect?.(true);
    } else {
      onSelect();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`slide-sortable-item ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={handleClick}
    >
      <div className="slide-sortable-item__drag-handle" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </div>

      <div className="slide-sortable-item__thumbnail">
        {slide.imageUrl ? (
          <img src={slide.imageUrl} alt="" />
        ) : (
          <div 
            className="thumbnail-placeholder"
            style={{ backgroundColor: slide.backgroundColor || '#f0f0f0' }}
          >
            {getSlideIcon()}
          </div>
        )}
        <span className="slide-number">#{index + 1}</span>
      </div>

      <div className="slide-sortable-item__content">
        <div className="slide-title">
          {slide.title || `Slide ${index + 1}`}
        </div>
        <div className="slide-type">
          {getSlideIcon()}
          <span>{slide.type}</span>
        </div>
      </div>

      <div className="slide-sortable-item__actions">
        {onToggleVisibility && (
          <button
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility();
            }}
            title={slide.visible !== false ? "Hide slide" : "Show slide"}
          >
            {slide.visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        )}
        <button
          className="action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate slide"
        >
          <Copy size={14} />
        </button>
        <button
          className="action-btn action-btn--danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete slide"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const SlideSortableList: React.FC<SlideSortableListProps> = ({
  slides,
  currentSlide,
  onReorder,
  onSelect,
  onDuplicate,
  onDelete,
  onToggleVisibility,
  selectedSlides = new Set(),
  onSelectionChange
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = slides.findIndex(slide => slide.id === active.id);
      const newIndex = slides.findIndex(slide => slide.id === over.id);
      
      const newSlides = arrayMove(slides, oldIndex, newIndex);
      // Update order numbers
      newSlides.forEach((slide, index) => {
        slide.order = index;
      });
      
      onReorder(newSlides);
    }
    
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleMultiSelect = (index: number, add: boolean) => {
    if (!onSelectionChange) return;
    
    const newSelection = new Set(selectedSlides);
    if (add) {
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
    } else {
      newSelection.clear();
      newSelection.add(index);
    }
    onSelectionChange(newSelection);
  };

  const activeSlide = activeId ? slides.find(s => s.id === activeId) : null;

  return (
    <div className="slide-sortable-list">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={slides.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="slide-sortable-list__items">
            {slides.map((slide, index) => (
              <SortableSlideItem
                key={slide.id}
                slide={slide}
                index={index}
                isActive={currentSlide === index}
                isSelected={selectedSlides.has(index)}
                onSelect={() => onSelect(index)}
                onDuplicate={() => onDuplicate(index)}
                onDelete={() => onDelete(index)}
                onToggleVisibility={onToggleVisibility ? () => onToggleVisibility(index) : undefined}
                onMultiSelect={(add) => handleMultiSelect(index, add)}
              />
            ))}
          </div>
        </SortableContext>
        
        <DragOverlay>
          {activeSlide ? (
            <div className="slide-sortable-item dragging-overlay">
              <div className="slide-sortable-item__content">
                <div className="slide-title">
                  {activeSlide.title || 'Slide'}
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default SlideSortableList;