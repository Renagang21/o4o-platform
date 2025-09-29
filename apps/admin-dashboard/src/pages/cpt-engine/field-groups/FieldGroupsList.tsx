/**
 * Field Groups List Page
 * Displays all field groups with filtering and management capabilities
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Layout,
  Filter,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@o4o/auth-client';

interface FieldGroup {
  id: string;
  title: string;
  description?: string;
  postTypes: string[];
  fields: any[];
  position: string;
  style: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CPTType {
  id: string;
  slug: string;
  name: string;
}

export default function FieldGroupsList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCPT, setSelectedCPT] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch field groups
  const { data: fieldGroups = [], isLoading: groupsLoading, refetch } = useQuery({
    queryKey: ['field-groups'],
    queryFn: async () => {
      const response = await authClient.api.get<{ data: FieldGroup[] }>('/api/cpt/field-groups');
      return response.data?.data || [];
    }
  });

  // Fetch CPT types for filter
  const { data: cptTypes = [] } = useQuery({
    queryKey: ['cpt-types'],
    queryFn: async () => {
      const response = await authClient.api.get<{ data: CPTType[] }>('/api/public/cpt/types');
      return response.data?.data || [];
    }
  });

  // Filter field groups
  const filteredGroups = useMemo(() => {
    return fieldGroups.filter(group => {
      const matchesSearch = group.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           group.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCPT = selectedCPT === 'all' || 
                         group.postTypes.includes(selectedCPT);
      
      const matchesStatus = statusFilter === 'all' ||
                           (statusFilter === 'active' && group.isActive) ||
                           (statusFilter === 'inactive' && !group.isActive);
      
      return matchesSearch && matchesCPT && matchesStatus;
    });
  }, [fieldGroups, searchTerm, selectedCPT, statusFilter]);

  // Delete field group
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this field group?')) {
      try {
        await authClient.api.delete(`/api/cpt/field-groups/${id}`);
        refetch();
      } catch (error) {
        console.error('Failed to delete field group:', error);
      }
    }
  };

  // Duplicate field group
  const handleDuplicate = async (group: FieldGroup) => {
    try {
      await authClient.api.post('/api/cpt/field-groups', {
        ...group,
        title: `${group.title} (Copy)`,
        id: undefined
      });
      refetch();
    } catch (error) {
      console.error('Failed to duplicate field group:', error);
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await authClient.api.patch(`/api/cpt/field-groups/${id}`, {
        isActive: !currentStatus
      });
      refetch();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const getPositionLabel = (position: string) => {
    const labels: Record<string, string> = {
      'normal': 'Normal',
      'side': 'Side',
      'advanced': 'Advanced'
    };
    return labels[position] || position;
  };

  const getStyleLabel = (style: string) => {
    const labels: Record<string, string> = {
      'default': 'Default',
      'seamless': 'Seamless'
    };
    return labels[style] || style;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Field Groups</h1>
          <p className="text-gray-600 mt-1">Manage custom field groups for your post types</p>
        </div>
        <Button onClick={() => navigate('/cpt-engine/field-groups/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Field Group
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fieldGroups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fieldGroups.filter(g => g.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fieldGroups.reduce((acc, g) => acc + (g.fields?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">CPTs Covered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(fieldGroups.flatMap(g => g.postTypes)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search field groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCPT} onValueChange={setSelectedCPT}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by CPT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Post Types</SelectItem>
                {cptTypes.map(cpt => (
                  <SelectItem key={cpt.slug} value={cpt.slug}>
                    {cpt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Field Groups Table */}
      <Card>
        <CardContent className="pt-6">
          {groupsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8">
              <Layout className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No field groups found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/cpt-engine/field-groups/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Field Group
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Group</TableHead>
                  <TableHead>Post Types</TableHead>
                  <TableHead className="text-center">Fields</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{group.title}</p>
                        {group.description && (
                          <p className="text-sm text-gray-500">{group.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {group.postTypes.map(postType => {
                          const cpt = cptTypes.find(t => t.slug === postType);
                          return (
                            <Badge key={postType} variant="secondary">
                              {cpt?.name || postType}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {group.fields?.length || 0} fields
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline">{getPositionLabel(group.position)}</Badge>
                        <Badge variant="outline">{getStyleLabel(group.style)}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={group.isActive ? 'default' : 'secondary'}>
                        {group.isActive ? (
                          <><Eye className="w-3 h-3 mr-1" /> Active</>
                        ) : (
                          <><EyeOff className="w-3 h-3 mr-1" /> Inactive</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions
                            <ChevronDown className="w-4 h-4 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/cpt-engine/field-groups/${group.id}/edit`)}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(group)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(group.id, group.isActive)}
                          >
                            {group.isActive ? (
                              <><EyeOff className="w-4 h-4 mr-2" /> Deactivate</>
                            ) : (
                              <><Eye className="w-4 h-4 mr-2" /> Activate</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(group.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}