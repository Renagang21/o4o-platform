/**
 * Taxonomies List Page
 * Displays all taxonomies with filtering and management capabilities
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Tag,
  Folder,
  List,
  ChevronDown,
  ArrowRight,
  GitBranch,
  Hash
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
import { taxonomyApi, cptApi } from '@/features/cpt-acf/services/cpt.api';

interface Taxonomy {
  id: string;
  name: string;
  slug: string;
  description?: string;
  hierarchical: boolean;
  postTypes: string[];
  labels?: {
    singular_name?: string;
    plural_name?: string;
    menu_name?: string;
  };
  showInRest?: boolean;
  showInMenu?: boolean;
  termsCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface CPTType {
  id: string;
  slug: string;
  name: string;
}

export default function TaxonomiesList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCPT, setSelectedCPT] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch taxonomies
  const { data: taxonomies = [], isLoading: taxonomiesLoading, refetch } = useQuery({
    queryKey: ['taxonomies'],
    queryFn: async () => {
      const response = await taxonomyApi.getAll();
      return response.data || [];
    }
  });

  // Fetch CPT types for filter
  const { data: cptTypes = [] } = useQuery({
    queryKey: ['cpt-types'],
    queryFn: async () => {
      const response = await cptApi.getAllTypes();
      return response.data || [];
    }
  });

  // Filter taxonomies
  const filteredTaxonomies = useMemo(() => {
    return taxonomies.filter(taxonomy => {
      const matchesSearch = taxonomy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           taxonomy.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           taxonomy.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCPT = selectedCPT === 'all' || 
                         taxonomy.postTypes.includes(selectedCPT);
      
      const matchesType = typeFilter === 'all' ||
                          (typeFilter === 'hierarchical' && taxonomy.hierarchical) ||
                          (typeFilter === 'tag' && !taxonomy.hierarchical);
      
      return matchesSearch && matchesCPT && matchesType;
    });
  }, [taxonomies, searchTerm, selectedCPT, typeFilter]);

  // Delete taxonomy
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this taxonomy? This will also delete all associated terms.')) {
      try {
        await authClient.api.delete(`/cpt/taxonomies/${id}`);
        refetch();
      } catch (error) {
        
      }
    }
  };

  // Duplicate taxonomy
  const handleDuplicate = async (taxonomy: Taxonomy) => {
    try {
      await authClient.api.post('/cpt/taxonomies', {
        ...taxonomy,
        name: `${taxonomy.name} (Copy)`,
        slug: `${taxonomy.slug}_copy`,
        id: undefined
      });
      refetch();
    } catch (error) {
      
    }
  };

  const getTypeIcon = (hierarchical: boolean) => {
    return hierarchical ? <GitBranch className="w-4 h-4" /> : <Hash className="w-4 h-4" />;
  };

  const getTypeBadge = (hierarchical: boolean) => {
    return hierarchical ? (
      <Badge variant="default">
        <Folder className="w-3 h-3 mr-1" />
        Hierarchical
      </Badge>
    ) : (
      <Badge variant="secondary">
        <Tag className="w-3 h-3 mr-1" />
        Tags
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Taxonomies</h1>
          <p className="text-gray-600 mt-1">Manage taxonomies for organizing your content</p>
        </div>
        <Button onClick={() => navigate('/cpt-engine/taxonomies/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Taxonomy
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Taxonomies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxonomies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Hierarchical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {taxonomies.filter(t => t.hierarchical).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tag-based</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {taxonomies.filter(t => !t.hierarchical).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {taxonomies.reduce((acc, t) => acc + (t.termsCount || 0), 0)}
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
                  placeholder="Search taxonomies..."
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="hierarchical">Hierarchical</SelectItem>
                <SelectItem value="tag">Tags</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Taxonomies Table */}
      <Card>
        <CardContent className="pt-6">
          {taxonomiesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredTaxonomies.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No taxonomies found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/cpt-engine/taxonomies/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Taxonomy
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Taxonomy</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Post Types</TableHead>
                  <TableHead className="text-center">Terms</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTaxonomies.map((taxonomy) => (
                  <TableRow key={taxonomy.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(taxonomy.hierarchical)}
                        <div>
                          <p className="font-medium">{taxonomy.name}</p>
                          <p className="text-sm text-gray-500">{taxonomy.slug}</p>
                          {taxonomy.description && (
                            <p className="text-sm text-gray-500 mt-1">{taxonomy.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(taxonomy.hierarchical)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {taxonomy.postTypes.map(postType => {
                          const cpt = cptTypes.find(t => t.slug === postType);
                          return (
                            <Badge key={postType} variant="outline">
                              {cpt?.name || postType}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/cpt-engine/taxonomies/${taxonomy.id}/terms`)}
                        className="gap-1"
                      >
                        <Badge variant="outline">
                          {taxonomy.termsCount || 0}
                        </Badge>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {taxonomy.showInRest && (
                          <Badge variant="outline" className="text-xs">REST API</Badge>
                        )}
                        {taxonomy.showInMenu && (
                          <Badge variant="outline" className="text-xs">Admin Menu</Badge>
                        )}
                      </div>
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
                            onClick={() => navigate(`/cpt-engine/taxonomies/${taxonomy.id}/edit`)}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/cpt-engine/taxonomies/${taxonomy.id}/terms`)}
                          >
                            <List className="w-4 h-4 mr-2" />
                            Manage Terms
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(taxonomy)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(taxonomy.id)}
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