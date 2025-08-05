import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PatternPageBuilder from '@/components/editor/PatternPageBuilder';
import { api } from '@/api/base';

const PatternBuilder: FC = () => {
  const navigate = useNavigate();

  const handleSave = async (title: string, content: string, blocks: any[]) => {
    try {
      const response = await api.post('/admin/pages', {
        title,
        content,
        blocks,
        status: 'draft',
        template: 'pattern-builder'
      });

      toast.success('페이지가 저장되었습니다');
      navigate(`/pages/${response.data.id}/edit`);
    } catch (error) {
      toast.error('페이지 저장에 실패했습니다');
      console.error('Failed to save page:', error);
    }
  };

  return <PatternPageBuilder onSave={handleSave} />;
};

export default PatternBuilder;