import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, 
  FileText, 
  Database, 
  Users, 
  Search as SearchIcon, 
  Edit3, 
  Trash2, 
  Eye,
  Copy,
  Mail,
  UserPlus,
  Filter
} from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Form {
  id: string;
  name: string;
  type: 'contact' | 'post' | 'user' | 'search' | 'cpt';
  cptSlug?: string;
  status: 'active' | 'inactive';
  submissions: number;
  created: string;
  modified: string;
  fields: number;
  submitAction?: 'create_post' | 'create_user' | 'send_email' | 'both';
  userRole?: string;
}

const FormsManager = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch forms from API
  const { data: forms = [], isLoading, refetch } = useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      const response = await authClient.api.get<{ data: Form[] }>('/api/cpt/forms');
      return response.data?.data || [];
    }
  });

  const formTypes = {
    contact: { icon: Mail, label: 'Contact Form', color: 'blue' },
    post: { icon: FileText, label: 'Post Form', color: 'green' },
    user: { icon: UserPlus, label: 'User Form', color: 'purple' },
    search: { icon: SearchIcon, label: 'Search Form', color: 'orange' },
    cpt: { icon: Database, label: 'CPT Form', color: 'indigo' }
  };

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || form.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: forms.length,
    active: forms.filter(f => f.status === 'active').length,
    submissions: forms.reduce((acc, f) => acc + f.submissions, 0),
    contact: forms.filter(f => f.type === 'contact').length,
    post: forms.filter(f => f.type === 'post').length,
    user: forms.filter(f => f.type === 'user').length,
    search: forms.filter(f => f.type === 'search').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forms</h1>
          <p className="text-gray-600 mt-1">Create and manage frontend forms</p>
        </div>
        <Button onClick={() => navigate('/cpt-engine/forms/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Form
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">{stats.active} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contact Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contact}</div>
            <p className="text-xs text-gray-500 mt-1">Email notifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Post Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.post}</div>
            <p className="text-xs text-gray-500 mt-1">Frontend submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.submissions}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Form Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/cpt-engine/forms/new?type=contact')}>
          <CardHeader>
            <Mail className="w-8 h-8 text-blue-500 mb-2" />
            <CardTitle>Contact Forms</CardTitle>
            <CardDescription>
              Create contact forms with email notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Create Contact Form
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/cpt-engine/forms/new?type=post')}>
          <CardHeader>
            <Database className="w-8 h-8 text-green-500 mb-2" />
            <CardTitle>Post Forms</CardTitle>
            <CardDescription>
              Frontend forms for creating and editing posts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Create Post Form
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/cpt-engine/forms/new?type=user')}>
          <CardHeader>
            <Users className="w-8 h-8 text-purple-500 mb-2" />
            <CardTitle>User Forms</CardTitle>
            <CardDescription>
              Registration and profile editing forms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Create User Form
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/cpt-engine/forms/new?type=search')}>
          <CardHeader>
            <SearchIcon className="w-8 h-8 text-orange-500 mb-2" />
            <CardTitle>Search Forms</CardTitle>
            <CardDescription>
              Advanced search with custom filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Create Search Form
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Forms Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Forms</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search forms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="search">Search</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredForms.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredForms.map((form) => {
                  const TypeIcon = formTypes[form.type].icon;
                  return (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{form.name}</div>
                          {form.cptSlug && (
                            <div className="text-xs text-gray-500 mt-1">CPT: {form.cptSlug}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4" />
                          <span>{formTypes[form.type].label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={form.status === 'active' ? 'default' : 'secondary'}>
                          {form.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{form.fields}</TableCell>
                      <TableCell>{form.submissions}</TableCell>
                      <TableCell>{form.modified}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => navigate(`/cpt-engine/forms/${form.id}/submissions`)}
                            title="View Submissions"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => navigate(`/cpt-engine/forms/${form.id}/edit`)}
                            title="Edit Form"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            title="Duplicate Form"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-600"
                            title="Delete Form"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Forms Created Yet</h3>
              <p className="text-gray-500 mb-4">
                Get started by creating your first form
              </p>
              <Button onClick={() => navigate('/cpt-engine/forms/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Form
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FormsManager;