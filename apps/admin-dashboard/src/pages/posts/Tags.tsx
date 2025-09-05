import { useState, useEffect } from 'react';
import { 
  ChevronDown,
  Settings,
  Eye,
  Edit2,
  Trash2,
  Copy,
  MoreVertical
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';

interface Tag {
  id: string;
  name: string;
  description: string;
  slug: string;
  count: number;
  date: string;
}

const Tags = () => {
  const [tags, setTags] = useState<Tag[]>([
    { id: '1', name: 'Featured', description: 'Featured posts', slug: 'featured', count: 5, date: '2024-01-15' },
    { id: '2', name: 'Tutorial', description: 'Tutorial and guide posts', slug: 'tutorial', count: 12, date: '2024-01-10' },
    { id: '3', name: 'News', description: 'Latest news and updates', slug: 'news', count: 8, date: '2024-01-08' }
  ]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: ''
  });
  
  // Screen Options state - load from localStorage
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('tags-visible-columns');
    return saved ? JSON.parse(saved) : {
      description: true,
      slug: true,
      count: true
    };
  });
  
  // Save visible columns to localStorage when they change
  useEffect(() => {
    localStorage.setItem('tags-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  
  const handleColumnToggle = (column: string) => {
    setVisibleColumns((prev: any) => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTags(new Set(tags.map(t => t.id)));
    } else {
      setSelectedTags(new Set());
    }
  };

  const handleSelectTag = (id: string) => {
    const newSelection = new Set(selectedTags);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTags(newSelection);
  };

  const handleAddNew = () => {
    setShowAddModal(true);
  };

  const handleSaveTag = () => {
    if (formData.name) {
      const newTag: Tag = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        count: 0,
        date: new Date().toISOString().split('T')[0]
      };
      setTags([...tags, newTag]);
      setFormData({ name: '', slug: '', description: '' });
      setShowAddModal(false);
    }
  };

  const handleEdit = (id: string) => {
    setEditingTag(id);
    const tag = tags.find(t => t.id === id);
    if (tag) {
      setFormData({
        name: tag.name,
        slug: tag.slug,
        description: tag.description
      });
    }
  };

  const handleUpdateTag = () => {
    if (editingTag && formData.name) {
      setTags(tags.map(tag => 
        tag.id === editingTag
          ? {
              ...tag,
              name: formData.name,
              slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
              description: formData.description
            }
          : tag
      ));
      setEditingTag(null);
      setFormData({ name: '', slug: '', description: '' });
    }
  };

  const handleQuickEdit = (id: string) => {
    // Implement quick edit
    // TODO: Implement quick edit functionality
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 이 태그를 삭제하시겠습니까?')) {
      setTags(tags.filter(t => t.id !== id));
    }
  };

  const handleApplyBulkAction = () => {
    if (!selectedBulkAction) {
      alert('Please select an action.');
      return;
    }
    
    if (selectedTags.size === 0) {
      alert('No tags selected.');
      return;
    }
    
    if (selectedBulkAction === 'delete') {
      if (confirm(`선택한 ${selectedTags.size}개의 태그를 삭제하시겠습니까?`)) {
        setTags(tags.filter(t => !selectedTags.has(t.id)));
        setSelectedTags(new Set());
        setSelectedBulkAction('');
      }
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f0f1' }}>
      {/* Header with Breadcrumb and Screen Options */}
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <div className="flex items-center justify-between">
          <AdminBreadcrumb 
            items={[
              { label: 'Admin', href: '/admin' },
              { label: '글', href: '/admin/posts' },
              { label: '태그' }
            ]}
          />
          
          {/* Screen Options Button */}
          <div className="relative">
            <button
              onClick={() => setShowScreenOptions(!showScreenOptions)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <Settings className="w-4 h-4" />
              Screen Options
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showScreenOptions && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-50">
                <div className="p-4">
                  <h3 className="font-medium text-sm mb-3">Show on screen</h3>
                  <div className="space-y-2">
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        id="screen-option-description"
                        name="screen-option-description"
                        checked={visibleColumns.description}
                        onChange={() => handleColumnToggle('description')}
                        className="mr-2" 
                      />
                      Description
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        id="screen-option-slug"
                        name="screen-option-slug"
                        checked={visibleColumns.slug}
                        onChange={() => handleColumnToggle('slug')}
                        className="mr-2" 
                      />
                      Slug
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        id="screen-option-count"
                        name="screen-option-count"
                        checked={visibleColumns.count}
                        onChange={() => handleColumnToggle('count')}
                        className="mr-2" 
                      />
                      Count
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Title and Add New */}
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-normal text-gray-900">태그</h1>
          <button
            onClick={handleAddNew}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Add New
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">글에 태그를 추가하여 분류합니다</p>

        {/* Add New Tag Modal */}
        {showAddModal && (
          <div className="mb-6 p-4 bg-white border border-gray-300 rounded-lg">
            <h2 className="text-lg font-medium mb-4">Add New Tag</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter tag name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="tag-slug"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                  placeholder="The description is not prominent by default; however, some themes may show it."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveTag}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Add New Tag
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ name: '', slug: '', description: '' });
                }}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Edit Tag Modal */}
        {editingTag && (
          <div className="mb-6 p-4 bg-white border border-gray-300 rounded-lg">
            <h2 className="text-lg font-medium mb-4">Edit Tag</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleUpdateTag}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Update
              </button>
              <button
                onClick={() => {
                  setEditingTag(null);
                  setFormData({ name: '', slug: '', description: '' });
                }}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                {selectedBulkAction === 'delete' ? 'Delete' : 'Bulk Actions'}
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showBulkActions && (
                <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-300 rounded shadow-lg z-20">
                  <button
                    onClick={() => {
                      setSelectedBulkAction('delete');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedTags.size > 0 
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedTags.size === 0}
            >
              Apply
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            {tags.length} items
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedTags.size === tags.length && tags.length > 0}
                  />
                </th>
                <th className="px-3 py-3 text-left">
                  <button className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black">
                    Name
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </th>
                {visibleColumns.description && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                )}
                {visibleColumns.slug && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Slug</th>
                )}
                {visibleColumns.count && (
                  <th className="px-3 py-3 text-center text-sm font-medium text-gray-700">Count</th>
                )}
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr
                  key={tag.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                  onMouseEnter={() => setHoveredRow(tag.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedTags.has(tag.id)}
                      onChange={() => handleSelectTag(tag.id)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div>
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        {tag.name}
                      </button>
                      {hoveredRow === tag.id && (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <button
                            onClick={() => handleEdit(tag.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            onClick={() => handleQuickEdit(tag.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Quick Edit
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            onClick={() => handleDelete(tag.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  {visibleColumns.description && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {tag.description || '—'}
                    </td>
                  )}
                  {visibleColumns.slug && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {tag.slug}
                    </td>
                  )}
                  {visibleColumns.count && (
                    <td className="px-3 py-3 text-sm text-center text-gray-600">
                      <a href="#" className="text-blue-600 hover:text-blue-800">
                        {tag.count}
                      </a>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Bulk Actions */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                {selectedBulkAction === 'delete' ? 'Delete' : 'Bulk Actions'}
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showBulkActions && (
                <div className="absolute left-0 bottom-full mb-1 w-40 bg-white border border-gray-300 rounded shadow-lg z-20">
                  <button
                    onClick={() => {
                      setSelectedBulkAction('delete');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedTags.size > 0 
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedTags.size === 0}
            >
              Apply
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            {tags.length} items
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tags;