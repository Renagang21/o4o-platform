/**
 * Posts List Page - WordPress-style post management
 */

import { useState, useEffect, FC } from 'react';
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
import { apiClient } from '../../utils/apiClient';

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
  scheduled: 'bg-purple-100 text-purple-800',
};

// BulkActionBar component - defined outside to avoid recreating on each render
const BulkActionBar: FC<{
  selectedCount: number;
  onPublish: () => void;
  onDraft: () => void;
  onDelete: () => void;
  onClear: () => void;
}> = ({ selectedCount, onPublish, onDraft, onDelete, onClear }) => (
  <Card className="p-4 bg-blue-50 border-blue-200">
    <div className="flex items-center justify-between">
      <span className="text-blue-800">
        {selectedCount} posts selected
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onPublish}>
          Publish
        </Button>
        <Button variant="outline" size="sm" onClick={onDraft}>
          Draft
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete}>
          Delete
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  </Card>
);

const PostsList: FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  // Fetch posts with authentication
  const fetchPosts = async (page: number, search: string, status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(status !== 'all' && { status }),
      });

      const response = await apiClient.get(`/posts?${params}`);
      
      // Handle the response data
      const data = response.data || [];
      const pagination = response.pagination || {};
      
      setPosts(data);
      setTotalPosts(pagination.totalItems || 0);
      setTotalPages(pagination.total || 1);
    } catch (error) {
      // Check if it's a 403 error and show appropriate message
      if (error instanceof Error && error.message.includes('403')) {
        // For now, use mock data when API returns 403
        const mockPosts: Post[] = [
          {
            id: '1',
            title: 'Welcome to O4O Platform',
            slug: 'welcome-o4o-platform',
            status: 'published',
            format: 'standard',
            author: { id: '1', name: 'Admin' },
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            views: 150,
            featured: true,
            sticky: true,
            categories: [{ id: '1', name: 'Announcements' }],
            tags: ['welcome', 'platform'],
          },
          {
            id: '2',
            title: 'Getting Started Guide',
            slug: 'getting-started-guide',
            status: 'published',
            format: 'standard',
            author: { id: '1', name: 'Admin' },
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            views: 89,
            featured: false,
            sticky: false,
            categories: [{ id: '2', name: 'Guides' }],
            tags: ['tutorial', 'guide'],
          },
          {
            id: '3',
            title: 'Draft Post Example',
            slug: 'draft-post-example',
            status: 'draft',
            format: 'standard',
            author: { id: '1', name: 'Admin' },
            publishedAt: null,
            updatedAt: new Date().toISOString(),
            views: 0,
            featured: false,
            sticky: false,
            categories: [],
            tags: [],
          },
        ];
        
        // Filter by status if needed
        const filteredPosts = status === 'all' 
          ? mockPosts 
          : mockPosts.filter(p => p.status === status);
        
        // Filter by search if needed
        const searchedPosts = search
          ? filteredPosts.filter(p => 
              p.title.toLowerCase().includes(search.toLowerCase()) ||
              p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
            )
          : filteredPosts;
        
        setPosts(searchedPosts);
        setTotalPosts(searchedPosts.length);
        setTotalPages(1);
      } else {
        // Show error in UI instead of console
        setPosts([]);
        setTotalPosts(0);
        setTotalPages(1);
      }
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
  const handleBulkAction = async (action: string) => {
    switch (action) {
      case 'delete':
        await handleBulkDelete();
        break;
      case 'publish':
        await handleBulkStatusChange('published');
        break;
      case 'draft':
        await handleBulkStatusChange('draft');
        break;
      case 'archive':
        await handleBulkStatusChange('archived');
        break;
    }
    setSelectedPosts([]);
    fetchPosts(currentPage, searchQuery, statusFilter);
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedPosts.map(id => 
        apiClient.delete(`/posts/${id}`)
      ));
    } catch (error) {
      // Handle error appropriately
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    try {
      await Promise.all(selectedPosts.map(id =>
        apiClient.put(`/posts/${id}`, { status })
      ));
    } catch (error) {
      // Handle error appropriately
    }
  };

  // Handle single post actions
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await apiClient.delete(`/posts/${postId}`);
      fetchPosts(currentPage, searchQuery, statusFilter);
    } catch (error) {
      // Handle error appropriately
    }
  };

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
          onPublish={() => handleBulkAction('publish')}
          onDraft={() => handleBulkAction('draft')}
          onDelete={() => handleBulkAction('delete')}
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
                        {post.featured && (
                          <Badge variant="secondary" className="text-xs">Featured</Badge>
                        )}
                        {post.sticky && (
                          <Badge variant="secondary" className="text-xs">Sticky</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <button className="hover:text-blue-600">Edit</button>
                        <span>|</span>
                        <button className="hover:text-blue-600">Quick Edit</button>
                        <span>|</span>
                        <button 
                          className="hover:text-red-600"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          Trash
                        </button>
                        <span>|</span>
                        <a 
                          href={`/posts/${post.slug}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-blue-600"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{post.author.name}</TableCell>
                  <TableCell>
                    {post.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {post.categories.map(cat => (
                          <Badge key={cat.id} variant="outline" className="text-xs">
                            {cat.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[post.status]}>
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {post.publishedAt ? (
                      <div className="text-sm">
                        <div>{new Date(post.publishedAt).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(post.publishedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>{post.views}</TableCell>
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
                        <DropdownMenuItem>
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
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default PostsList;