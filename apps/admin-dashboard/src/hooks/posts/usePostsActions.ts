import { postApi } from '@/services/api/postApi';
import toast from 'react-hot-toast';
import { Post } from './usePostsData';

interface UsePostsActionsProps {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
}

export const usePostsActions = ({ posts, setPosts }: UsePostsActionsProps) => {
  
  const handleQuickEdit = async (id: string, data: {
    title: string;
    slug: string;
    status: Post['status'];
    categoryIds?: string[];
    tags?: string;
  }) => {
    try {
      // Sanitize slug
      const sanitizedSlug = data.slug
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Process tags from comma-separated string to array
      const tagsArray = data.tags 
        ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];
      
      const response = await postApi.update({
        id,
        title: data.title,
        slug: sanitizedSlug,
        status: data.status,
        categoryIds: data.categoryIds || [],
        tags: tagsArray
      });
      
      if (response.success) {
        setPosts(posts.map(post => 
          post.id === id
            ? {
                ...post,
                title: data.title,
                slug: sanitizedSlug,
                status: data.status,
                categories: data.categoryIds || [],
                tags: tagsArray
              }
            : post
        ));
        toast.success('Post updated successfully');
        return true;
      } else {
        toast.error('Failed to update post');
        return false;
      }
    } catch (error) {
      toast.error('Failed to update post');
      return false;
    }
  };

  const handleTrash = async (id: string) => {
    if (confirm('정말 이 글을 휴지통으로 이동하시겠습니까?')) {
      try {
        const response = await postApi.update({
          id,
          status: 'trash'
        });
        
        if (response.success) {
          setPosts(posts.map(p => 
            p.id === id ? { ...p, status: 'trash' as const } : p
          ));
          return true;
        } else {
          alert('휴지통으로 이동하는데 실패했습니다.');
          return false;
        }
      } catch (error) {
        alert('휴지통으로 이동 중 오류가 발생했습니다.');
        return false;
      }
    }
    return false;
  };
  
  const handlePermanentDelete = async (id: string) => {
    if (confirm('이 글을 영구적으로 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.')) {
      try {
        const response = await postApi.delete(id);
        
        if (response.success) {
          setPosts(posts.filter(p => p.id !== id));
          sessionStorage.removeItem('posts-data');
          return true;
        } else {
          alert('삭제에 실패했습니다.');
          return false;
        }
      } catch (error) {
        alert('삭제 중 오류가 발생했습니다.');
        return false;
      }
    }
    return false;
  };

  const handleRestore = async (id: string) => {
    if (confirm('이 글을 복원하시겠습니까?')) {
      try {
        const response = await postApi.update({
          id,
          status: 'draft'
        });
        
        if (response.success) {
          setPosts(posts.map(p => 
            p.id === id ? { ...p, status: 'draft' as const } : p
          ));
          return true;
        } else {
          alert('복원에 실패했습니다.');
          return false;
        }
      } catch (error) {
        alert('복원 중 오류가 발생했습니다.');
        return false;
      }
    }
    return false;
  };

  const handleBulkAction = async (action: string, selectedIds: Set<string>) => {
    if (!action) {
      alert('Please select an action.');
      return false;
    }
    
    if (selectedIds.size === 0) {
      alert('No posts selected.');
      return false;
    }
    
    if (action === 'trash') {
      if (confirm(`선택한 ${selectedIds.size}개의 글을 휴지통으로 이동하시겠습니까?`)) {
        try {
          const promises = Array.from(selectedIds).map(id => 
            postApi.update({
              id,
              status: 'trash'
            })
          );
          
          const results = await Promise.all(promises);
          const allSuccessful = results.every(r => r.success);
          
          if (allSuccessful) {
            setPosts(posts.map(p => 
              selectedIds.has(p.id) ? { ...p, status: 'trash' as const } : p
            ));
            return true;
          } else {
            alert('일부 글을 휴지통으로 이동하는데 실패했습니다.');
            return false;
          }
        } catch (error) {
          alert('휴지통으로 이동 중 오류가 발생했습니다.');
          return false;
        }
      }
    } else if (action === 'edit') {
      alert('Bulk edit feature coming soon');
    }
    return false;
  };

  return {
    handleQuickEdit,
    handleTrash,
    handlePermanentDelete,
    handleRestore,
    handleBulkAction
  };
};