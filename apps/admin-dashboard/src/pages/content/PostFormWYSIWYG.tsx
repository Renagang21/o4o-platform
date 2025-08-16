import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GutenbergBlockEditor from '@/components/editor/GutenbergBlockEditor';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import type { CreatePostDto, UpdatePostDto, PostStatus } from '@o4o/types';

interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: any;
}

const PostFormWYSIWYG = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Fetch post data if editing
  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/posts/${id}`);
      return response.data;
    },
    enabled: isEditMode
  });

  // Initialize form with post data
  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setContent(post.content || '');
      if (post.blocks) {
        setBlocks(post.blocks);
      } else if (post.content) {
        // Convert legacy content to blocks
        setBlocks([{ id: '1', type: 'paragraph', content: post.content, attributes: {} }]);
      }
    }
  }, [post]);

  // Create post mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreatePostDto) => {
      const response = await authClient.api.post('/posts', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Post created successfully');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate(`/content/posts/${data.id}/edit`);
    },
    onError: () => {
      toast.error('Failed to create post');
    }
  });

  // Update post mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePostDto }) => {
      const response = await authClient.api.put(`/posts/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Post updated successfully');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      setIsDirty(false);
    },
    onError: () => {
      toast.error('Failed to update post');
    }
  });

  // Handle blocks change
  const handleBlocksChange = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    // Convert blocks to HTML content for backward compatibility
    const htmlContent = newBlocks.map(block => {
      if (block.type === 'paragraph') return `<p>${block.content}</p>`;
      if (block.type === 'heading') {
        const level = block.attributes?.level || 2;
        return `<h${level}>${block.content}</h${level}>`;
      }
      if (block.type === 'list') {
        const items = block.attributes?.items || [];
        const listItems = items.map((item: any) => `<li>${item.content}</li>`).join('');
        return block.attributes?.type === 'ordered' ? `<ol>${listItems}</ol>` : `<ul>${listItems}</ul>`;
      }
      if (block.type === 'image' && block.attributes?.url) {
        return `<img src="${block.attributes.url}" alt="${block.attributes.alt || ''}" />`;
      }
      if (block.type === 'button' && block.attributes?.text) {
        return `<a href="${block.attributes.url || '#'}" class="button">${block.attributes.text}</a>`;
      }
      return '';
    }).join('\n');
    setContent(htmlContent);
    setIsDirty(true);
  };

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setIsDirty(true);
  };

  // Auto-save functionality
  const handleAutoSave = async () => {
    if (!isDirty) return;
    
    setIsAutoSaving(true);
    
    const postData = {
      title,
      content,
      status: 'draft' as PostStatus,
      type: 'post' as const
    };

    try {
      if (isEditMode && id) {
        const updateData: UpdatePostDto = {
          ...postData,
          id
        };
        await updateMutation.mutateAsync({ id, data: updateData });
      } else if (title || content) {
        // Only create if there's actual content
        const result = await createMutation.mutateAsync(postData);
        // Update URL to edit mode after first save
        window.history.replaceState(null, '', `/content/posts/${result.id}/edit`);
      }
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Manual save/publish
  const handlePublish = async () => {
    const postData = {
      title,
      content,
      status: 'published' as PostStatus,
      type: 'post' as const
    };

    if (isEditMode && id) {
      const updateData: UpdatePostDto = {
        ...postData,
        id
      };
      updateMutation.mutate({ id, data: updateData });
    } else {
      createMutation.mutate(postData);
    }
  };

  // Handle back navigation with unsaved changes warning
  const handleBack = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    navigate('/content/posts');
  };

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Minimal Header */}
      <div className="border-b px-4 py-2 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Posts
          </Button>
          
          {isAutoSaving && (
            <span className="text-sm text-gray-500">Auto-saving...</span>
          )}
          
          {!isAutoSaving && !isDirty && isEditMode && (
            <span className="text-sm text-green-600">Saved</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/preview/post/${id}`, '_blank')}
            disabled={!isEditMode}
          >
            Preview
          </Button>
          
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Publishing...'
              : isEditMode ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* WYSIWYG Editor - Full Height */}
      <div className="flex-1 overflow-hidden">
        <GutenbergBlockEditor
          initialBlocks={blocks}
          title={title}
          onChange={handleBlocksChange}
          onTitleChange={handleTitleChange}
          onSave={() => handleAutoSave()}
          autoSave={true}
          showInspector={false}
          fullScreen={false}
        />
      </div>
    </div>
  );
};

export default PostFormWYSIWYG;