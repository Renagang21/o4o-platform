import { cptPostApi } from '@/features/cpt-acf/services/cpt.api';
import { PostStatus } from '@/features/cpt-acf/types/cpt.types';
import toast from 'react-hot-toast';
import { CPTPost } from './useCPTData';

interface UseCPTActionsProps {
  cptSlug: string;
  posts: CPTPost[];
  setPosts: (posts: CPTPost[]) => void;
}

export const useCPTActions = ({ cptSlug, posts, setPosts }: UseCPTActionsProps) => {

  const handleQuickEdit = async (id: string, data: {
    title: string;
    slug: string;
    status: CPTPost['status'];
    customFields?: Record<string, any>;
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

      // Map status to PostStatus enum
      const statusMap: Record<string, PostStatus> = {
        'publish': PostStatus.PUBLISH,
        'draft': PostStatus.DRAFT,
        'private': PostStatus.PRIVATE,
        'trash': PostStatus.TRASH
      };

      const response = await cptPostApi.updatePost(cptSlug, id, {
        title: data.title,
        slug: sanitizedSlug,
        status: statusMap[data.status] || PostStatus.DRAFT,
        customFields: data.customFields || {}
      });

      if (response.data) {
        setPosts(posts.map(post =>
          post.id === id
            ? {
                ...post,
                title: data.title,
                slug: sanitizedSlug,
                status: data.status,
                customFields: data.customFields || post.customFields
              }
            : post
        ));
        toast.success('콘텐츠가 업데이트되었습니다');
        return true;
      } else {
        toast.error('업데이트에 실패했습니다');
        return false;
      }
    } catch (error) {
      console.error('Quick edit error:', error);
      toast.error('업데이트 중 오류가 발생했습니다');
      return false;
    }
  };

  const handleTrash = async (id: string) => {
    if (confirm('정말 이 콘텐츠를 휴지통으로 이동하시겠습니까?')) {
      try {
        const response = await cptPostApi.updatePost(cptSlug, id, {
          status: PostStatus.TRASH
        });

        if (response.data) {
          setPosts(posts.map(p =>
            p.id === id ? { ...p, status: 'trash' as const } : p
          ));
          toast.success('휴지통으로 이동했습니다');
          return true;
        } else {
          toast.error('휴지통으로 이동하는데 실패했습니다');
          return false;
        }
      } catch (error) {
        console.error('Trash error:', error);
        toast.error('휴지통으로 이동 중 오류가 발생했습니다');
        return false;
      }
    }
    return false;
  };

  const handlePermanentDelete = async (id: string) => {
    if (confirm('이 콘텐츠를 영구적으로 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.')) {
      try {
        const response = await cptPostApi.deletePost(cptSlug, id);

        if (response.success) {
          setPosts(posts.filter(p => p.id !== id));
          toast.success('콘텐츠가 삭제되었습니다');
          return true;
        } else {
          toast.error('삭제에 실패했습니다');
          return false;
        }
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('삭제 중 오류가 발생했습니다');
        return false;
      }
    }
    return false;
  };

  const handleRestore = async (id: string) => {
    if (confirm('이 콘텐츠를 복원하시겠습니까?')) {
      try {
        const response = await cptPostApi.updatePost(cptSlug, id, {
          status: PostStatus.DRAFT
        });

        if (response.data) {
          setPosts(posts.map(p =>
            p.id === id ? { ...p, status: 'draft' as const } : p
          ));
          toast.success('콘텐츠가 복원되었습니다');
          return true;
        } else {
          toast.error('복원에 실패했습니다');
          return false;
        }
      } catch (error) {
        console.error('Restore error:', error);
        toast.error('복원 중 오류가 발생했습니다');
        return false;
      }
    }
    return false;
  };

  const handleBulkAction = async (action: string, selectedIds: Set<string>) => {
    if (!action) {
      toast.error('작업을 선택해주세요');
      return false;
    }

    if (selectedIds.size === 0) {
      toast.error('콘텐츠를 선택해주세요');
      return false;
    }

    if (action === 'trash') {
      if (confirm(`선택한 ${selectedIds.size}개의 콘텐츠를 휴지통으로 이동하시겠습니까?`)) {
        try {
          const promises = Array.from(selectedIds).map(id =>
            cptPostApi.updatePost(cptSlug, id, {
              status: PostStatus.TRASH
            })
          );

          const results = await Promise.all(promises);
          const allSuccessful = results.every(r => r.success || r.data);

          if (allSuccessful) {
            setPosts(posts.map(p =>
              selectedIds.has(p.id) ? { ...p, status: 'trash' as const } : p
            ));
            toast.success('휴지통으로 이동했습니다');
            return true;
          } else {
            toast.error('일부 콘텐츠를 이동하는데 실패했습니다');
            return false;
          }
        } catch (error) {
          console.error('Bulk trash error:', error);
          toast.error('휴지통으로 이동 중 오류가 발생했습니다');
          return false;
        }
      }
    } else if (action === 'delete') {
      if (confirm(`선택한 ${selectedIds.size}개의 콘텐츠를 영구 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.`)) {
        try {
          const promises = Array.from(selectedIds).map(id =>
            cptPostApi.deletePost(cptSlug, id)
          );

          const results = await Promise.all(promises);
          const allSuccessful = results.every(r => r.success || r.data);

          if (allSuccessful) {
            setPosts(posts.filter(p => !selectedIds.has(p.id)));
            toast.success('콘텐츠가 삭제되었습니다');
            return true;
          } else {
            toast.error('일부 콘텐츠 삭제에 실패했습니다');
            return false;
          }
        } catch (error) {
          console.error('Bulk delete error:', error);
          toast.error('삭제 중 오류가 발생했습니다');
          return false;
        }
      }
    } else if (action === 'edit') {
      toast.success('일괄 편집 기능은 곧 제공됩니다');
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
