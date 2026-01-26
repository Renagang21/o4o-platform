import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { ScreenOptionsReact } from '@/components/common/ScreenOptionsEnhanced';
import { useScreenOptions, ColumnOption } from '@/hooks/useScreenOptions';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { formatDate } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

interface Comment {
  id: string;
  author: {
    name: string;
    email: string;
    url?: string;
    avatar?: string;
  };
  content: string;
  post: {
    id: string;
    title: string;
    type: string;
  };
  status: 'approved' | 'pending' | 'spam' | 'trash';
  createdAt: string;
  ip: string;
  userAgent?: string;
  parentId?: string;
  replies?: Comment[];
}

export default function CommentsListEnhanced() {
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [selectedComments, setSelectedComments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [postFilter] = useState(''); // Reserved for future use
  const [page] = useState(1); // Reserved for pagination

  // Default column configuration
  const defaultColumns: ColumnOption[] = [
    { id: 'author', label: 'Author', visible: true, required: true },
    { id: 'comment', label: 'Comment', visible: true, required: true },
    { id: 'response', label: 'In response to', visible: true },
    { id: 'date', label: 'Submitted on', visible: true }
  ];

  // Use screen options hook
  const {
    options,
    itemsPerPage,
    isColumnVisible,
    updateColumnVisibility,
    setItemsPerPage
  } = useScreenOptions('comments-list', {
    columns: defaultColumns,
    itemsPerPage: 20
  });

  // Fetch comments
  const { data, isLoading } = useQuery({
    queryKey: ['comments', statusFilter, search, postFilter, page, itemsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString() as any,
        limit: itemsPerPage.toString() as any,
      });

      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (postFilter) params.append('post', postFilter);

      const response = await authClient.api.get(`/comments?${params}`);
      return response.data;
    }
  });

  // Update comment status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await authClient.api.patch(`/comments/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      success('Comment status updated.');
    },
    onError: () => {
      error('Failed to update comment status.');
    }
  });

  // Delete comment
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.delete(`/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      success('Comment permanently deleted.');
    },
    onError: () => {
      error('Failed to delete comment.');
    }
  });

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedComments.length === 0) {
      error('No comments selected.');
      return;
    }

    try {
      switch (action) {
        case 'approve':
          await Promise.all(
            selectedComments.map((id: any) => 
              updateStatusMutation.mutateAsync({ id, status: 'approved' })
            )
          );
          success(`${selectedComments.length} comment(s) approved.`);
          break;
        case 'spam':
          await Promise.all(
            selectedComments.map((id: any) => 
              updateStatusMutation.mutateAsync({ id, status: 'spam' })
            )
          );
          success(`${selectedComments.length} comment(s) marked as spam.`);
          break;
        case 'trash':
          await Promise.all(
            selectedComments.map((id: any) => 
              updateStatusMutation.mutateAsync({ id, status: 'trash' })
            )
          );
          success(`${selectedComments.length} comment(s) moved to trash.`);
          break;
      }
      setSelectedComments([]);
    } catch (err: any) {
      error('Failed to perform bulk action.');
    }
  };

  // Get status counts
  const statusCounts = data?.counts || {
    all: 0,
    pending: 0,
    approved: 0,
    spam: 0,
    trash: 0
  };

  // Define table columns
  const allColumns: WordPressTableColumn[] = [
    { id: 'author', label: 'Author', width: '20%' },
    { id: 'comment', label: 'Comment', width: '50%' },
    { id: 'response', label: 'In response to', width: '15%' },
    { id: 'date', label: 'Submitted on', width: '15%' }
  ];
  
  const columns = allColumns.filter((col: any) => isColumnVisible(col.id));

  // Transform comments to table rows
  const comments = data?.comments || [];
  const rows: WordPressTableRow[] = comments.map((comment: Comment) => ({
    id: comment.id,
    data: {
      author: (
        <div className="comment-author">
          <strong>{comment.author.name}</strong><br />
          <a href={`mailto:${comment.author.email}`}>{comment.author.email}</a><br />
          <span className="text-xs text-gray-500">{comment.ip}</span>
        </div>
      ),
      comment: (
        <div className="comment-content">
          <div 
            className="submitted-on text-xs text-gray-500 mb-1"
          >
            Submitted on <a href={`/comments/${comment.id}`}>{formatDate(comment.createdAt)}</a>
          </div>
          <p className="mb-2">{comment.content}</p>
          {comment.status === 'pending' && (
            <em className="comment-awaiting-moderation text-orange-600 text-sm">
              Your comment is awaiting moderation.
            </em>
          )}
        </div>
      ),
      response: (
        <div>
          <a href={`/${comment.post.type}s/${comment.post.id}/edit`}>
            {comment.post.title}
          </a>
          <br />
          <a href={`/${comment.post.type}s/${comment.post.id}#comments`} className="text-xs">
            View Post
          </a>
        </div>
      ),
      date: formatDate(comment.createdAt)
    },
    actions: [
      ...(comment.status !== 'approved' ? [
        { 
          label: 'Approve', 
          onClick: () => updateStatusMutation.mutate({ id: comment.id, status: 'approved' })
        }
      ] : [
        { 
          label: 'Unapprove', 
          onClick: () => updateStatusMutation.mutate({ id: comment.id, status: 'pending' })
        }
      ]),
      { label: 'Reply', href: `/comments/${comment.id}/reply` },
      { label: 'Quick Edit', onClick: () => {/* Quick edit action */} },
      { label: 'Edit', href: `/comments/${comment.id}/edit` },
      ...(comment.status !== 'spam' ? [
        { 
          label: 'Spam', 
          onClick: () => updateStatusMutation.mutate({ id: comment.id, status: 'spam' })
        }
      ] : []),
      ...(comment.status !== 'trash' ? [
        { 
          label: 'Trash', 
          onClick: () => updateStatusMutation.mutate({ id: comment.id, status: 'trash' }),
          isDelete: true
        }
      ] : [
        { 
          label: 'Delete Permanently', 
          onClick: () => {
            if (confirm('Are you sure you want to delete this comment permanently?')) {
              deleteMutation.mutate(comment.id);
            }
          },
          isDelete: true
        }
      ])
    ]
  }));

  return (
    <div className="wrap">
      {/* Screen Options */}
      <div className="relative">
        <ScreenOptionsReact
          title="Screen Options"
          columns={options.columns || defaultColumns}
          onColumnToggle={updateColumnVisibility}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
      
      <h1 className="o4o-heading-inline">Comments</h1>
      
      {/* Views */}
      <ul className="subsubsub">
        <li className="all">
          <a 
            href="#" 
            className={statusFilter === 'all' ? 'current' : ''}
            onClick={(e: any) => { e.preventDefault(); setStatusFilter('all'); }}
          >
            All <span className="count">({statusCounts.all})</span>
          </a> |
        </li>
        <li className="moderated">
          <a 
            href="#" 
            className={statusFilter === 'pending' ? 'current' : ''}
            onClick={(e: any) => { e.preventDefault(); setStatusFilter('pending'); }}
          >
            Pending <span className="count">({statusCounts.pending})</span>
          </a> |
        </li>
        <li className="approved">
          <a 
            href="#" 
            className={statusFilter === 'approved' ? 'current' : ''}
            onClick={(e: any) => { e.preventDefault(); setStatusFilter('approved'); }}
          >
            Approved <span className="count">({statusCounts.approved})</span>
          </a> |
        </li>
        <li className="spam">
          <a 
            href="#" 
            className={statusFilter === 'spam' ? 'current' : ''}
            onClick={(e: any) => { e.preventDefault(); setStatusFilter('spam'); }}
          >
            Spam <span className="count">({statusCounts.spam})</span>
          </a> |
        </li>
        <li className="trash">
          <a 
            href="#" 
            className={statusFilter === 'trash' ? 'current' : ''}
            onClick={(e: any) => { e.preventDefault(); setStatusFilter('trash'); }}
          >
            Trash <span className="count">({statusCounts.trash})</span>
          </a>
        </li>
      </ul>
      
      {/* Search Box */}
      <p className="search-box">
        <label className="screen-reader-text" htmlFor="comment-search-input">
          Search Comments:
        </label>
        <Input
          type="search"
          id="comment-search-input"
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          placeholder="Search comments..."
          className="w-auto inline-block mr-2"
        />
        <Button variant="secondary" size="sm">
          Search Comments
        </Button>
      </p>

      {/* Bulk Actions */}
      <div className="tablenav top">
        <div className="alignleft actions bulkactions">
          <Select value="" onValueChange={handleBulkAction}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Bulk actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approve">Approve</SelectItem>
              <SelectItem value="unapprove">Unapprove</SelectItem>
              <SelectItem value="spam">Mark as spam</SelectItem>
              <SelectItem value="trash">Move to trash</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="secondary" 
            size="sm"
            disabled={selectedComments.length === 0}
          >
            Apply
          </Button>
        </div>
        
        <div className="tablenav-pages">
          <span className="displaying-num">{statusCounts[statusFilter] || 0} items</span>
        </div>
        
        <br className="clear" />
      </div>

      {/* Comments Table */}
      <WordPressTable
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedComments}
        onSelectRow={(id, selected) => {
          if (selected) {
            setSelectedComments([...selectedComments, id]);
          } else {
            setSelectedComments(selectedComments.filter((commentId: any) => commentId !== id));
          }
        }}
        onSelectAll={(selected) => {
          if (selected) {
            setSelectedComments(comments.map((c: Comment) => c.id));
          } else {
            setSelectedComments([]);
          }
        }}
        loading={isLoading}
        emptyMessage="No comments found."
      />
      
      {/* Bottom navigation */}
      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <span className="displaying-num">{statusCounts[statusFilter] || 0} items</span>
        </div>
        <br className="clear" />
      </div>
    </div>
  );
}