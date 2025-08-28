import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Edit, Plus } from 'lucide-react';

interface EditorButtonProps {
  mode: 'post' | 'page' | 'template' | 'pattern';
  id?: string | number;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  icon?: boolean;
  className?: string;
}

/**
 * 편집기 진입 버튼
 * 독립형 편집기로 이동하는 버튼 컴포넌트
 */
export const EditorButton: FC<EditorButtonProps> = ({
  mode,
  id,
  label,
  variant = 'default',
  size = 'default',
  icon = true,
  className
}) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    const path = id ? `/editor/${mode}s/${id}` : `/editor/${mode}s/new`;
    navigate(path);
  };
  
  const getDefaultLabel = () => {
    if (label) return label;
    
    if (id) {
      return `Edit ${mode}`;
    } else {
      switch (mode) {
        case 'page': return 'Add New Page';
        case 'template': return 'Add New Template';
        case 'pattern': return 'Add New Pattern';
        default: return 'Add New Post';
      }
    }
  };
  
  const IconComponent = id ? Edit : Plus;
  
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={className}
    >
      {icon && <IconComponent className="h-4 w-4 mr-2" />}
      {getDefaultLabel()}
    </Button>
  );
};