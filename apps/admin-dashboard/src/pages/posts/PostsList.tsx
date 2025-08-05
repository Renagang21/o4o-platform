/**
 * Posts List Page - WordPress-style post management
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, Edit, Trash, Eye } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
// import { BulkActionBar } from '../../components/common/BulkActionBar';

interface Post {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'private' | 'archived' | 'scheduled';
  format: string;
  author: {
    id: string;
    name: string;
  };
  publishedAt: string | null;
  updatedAt: string;
  views: number;
  featured: boolean;
  sticky: boolean;
  categories: Array<{ id: string; name: string }>;
  tags: string[];
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  private: 'bg-blue-100 text-blue-800',
  archived: 'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-purple-100 text-purple-800'
};

const formatLabels = {
  standard: 'Standard',
  aside: 'Aside',
  gallery: 'Gallery',
  link: 'Link',
  image: 'Image',
  quote: 'Quote',
  status: 'Status',
  video: 'Video',
  audio: 'Audio',
  chat: 'Chat'
};

const PostsList: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  // Fetch posts
  const fetchPosts = async (page = 1, search = '', status = 'all') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        order: 'desc',
        orderby: 'date'
      });

      if (search) params.append('search', search);
      if (status !== 'all') params.append('status', status);

      const response = await fetch(`/api/posts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch posts');

      const data = await response.json();
      const totalPosts = parseInt(response.headers.get('X-WP-Total') || '0');
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');

      setPosts(data);
      setTotalPosts(totalPosts);
      setTotalPages(totalPages);
    } catch (error) {
      console.error('Error fetching posts:', error);
      // TODO: Show error toast
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(currentPage, searchQuery, statusFilter);
  }, [currentPage, searchQuery, statusFilter]);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string, postIds: string[]) => {
    switch (action) {
      case 'delete':
        await handleBulkDelete(postIds);
        break;
      case 'publish':
        await handleBulkStatusChange(postIds, 'published');
        break;
      case 'draft':
        await handleBulkStatusChange(postIds, 'draft');
        break;
      case 'archive':
        await handleBulkStatusChange(postIds, 'archived');
        break;
    }
    setSelectedPosts([]);
    fetchPosts(currentPage, searchQuery, statusFilter);
  };

  const handleBulkDelete = async (postIds: string[]) => {
    try {
      await Promise.all(postIds.map(id => 
        fetch(`/api/posts/${id}`, { method: 'DELETE' })
      ));
      // TODO: Show success toast
    } catch (error) {
      console.error('Error deleting posts:', error);
      // TODO: Show error toast
    }
  };

  const handleBulkStatusChange = async (postIds: string[], status: string) => {
    try {
      await Promise.all(postIds.map(id =>
        fetch(`/api/posts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        })
      ));
      // TODO: Show success toast
    } catch (error) {
      console.error('Error updating posts:', error);
      // TODO: Show error toast
    }
  };

  // Handle single post actions
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      fetchPosts(currentPage, searchQuery, statusFilter);
      // TODO: Show success toast
    } catch (error) {
      console.error('Error deleting post:', error);
      // TODO: Show error toast
    }
  };

  // Simple inline bulk action bar
  const BulkActionBar = ({ selectedCount, onClear }: { selectedCount: number; onClear: () => void }) => (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="flex items-center justify-between">
        <span className="text-blue-800">
          {selectedCount} posts selected
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleBulkAction('publish', selectedPosts)}>
            Publish
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction('draft', selectedPosts)}>
            Draft
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction('delete', selectedPosts)}>
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Posts</h1>
          <p className="text-gray-600">Manage your blog posts and articles</p>
        </div>
        <Button onClick={() => navigate('/posts/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Post
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Status: {statusFilter === 'all' ? 'All' : statusFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleStatusFilter('all')}>
                  All Statuses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilter('published')}>
                  Published
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilter('draft')}>
                  Draft
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilter('private')}>
                  Private
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilter('scheduled')}>
                  Scheduled
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilter('archived')}>
                  Archived
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="text-sm text-gray-500">
            {totalPosts} posts total
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedPosts.length > 0 && (
        <BulkActionBar
          selectedCount={selectedPosts.length}
          onClear={() => setSelectedPosts([])}
        />
      )}

      {/* Posts Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedPosts.length === posts.length && posts.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPosts(posts.map(p => p.id));
                    } else {
                      setSelectedPosts([]);
                    }
                  }}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading posts...
                </TableCell>
              </TableRow>
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No posts found
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedPosts.includes(post.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPosts([...selectedPosts, post.id]);
                        } else {
                          setSelectedPosts(selectedPosts.filter(id => id !== post.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/posts/${post.id}/edit`)}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {post.title}
                        </button>
                        {post.sticky && (
                          <Badge variant="secondary" className="text-xs">
                            Sticky
                          </Badge>
                        )}
                        {post.featured && (
                          <Badge variant="secondary" className="text-xs">
                            Featured
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        /{post.slug} • {formatLabels[post.format as keyof typeof formatLabels]}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{post.author.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {post.categories.map((category) => (
                        <Badge key={category.id} variant="outline" className="text-xs">
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[post.status]} text-xs`}>
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {post.publishedAt 
                        ? new Date(post.publishedAt).toLocaleDateString()
                        : new Date(post.updatedAt).toLocaleDateString()
                      }
                    </div>
                  </TableCell>
                  <TableCell>{post.views.toLocaleString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/posts/${post.id}/edit`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/posts/${post.slug}`, '_blank')}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeletePost(post.id)}
                          className="text-red-600"
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostsList;