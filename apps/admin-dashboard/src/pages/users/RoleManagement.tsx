import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import { api } from '@/api/base';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
  permissions: Permission[];
  userCount: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RoleFormData {
  name: string;
  displayName: string;
  description: string;
  color: string;
  permissions: string[];
  isActive: boolean;
}

const defaultRoleColors = [
  '#8b5cf6', // purple
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#6366f1', // indigo
  '#06b6d4', // cyan
];

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    displayName: '',
    description: '',
    color: defaultRoleColors[0],
    permissions: [],
    isActive: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesResponse, permissionsResponse] = await Promise.all([
        api.get('/v1/users/roles'),
        api.get('/v1/users/permissions'),
      ]);

      if (rolesResponse.data.success) {
        setRoles(rolesResponse.data.data);
      }

      if (permissionsResponse.data.success) {
        setPermissions(permissionsResponse.data.data);
      }
    } catch (error) {
      toast.error('Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRole) {
        await api.put(`/v1/users/roles/${editingRole.id}`, formData);
        toast.success('Role updated successfully');
      } else {
        await api.post('/v1/users/roles', formData);
        toast.success('Role created successfully');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(editingRole ? 'Failed to update role' : 'Failed to create role');
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      color: role.color,
      permissions: role.permissions.map(p => p.id),
      isActive: role.isActive,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (role: Role) => {
    if (role.isSystem) {
      toast.error('Cannot delete system roles');
      return;
    }

    if (role.userCount > 0) {
      toast.error('Cannot delete role that is assigned to users');
      return;
    }

    if (confirm(`Are you sure you want to delete the role "${role.displayName}"?`)) {
      try {
        await api.delete(`/v1/users/roles/${role.id}`);
        toast.success('Role deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete role');
      }
    }
  };

  const resetForm = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      displayName: '',
      description: '',
      color: defaultRoleColors[0],
      permissions: [],
      isActive: true,
    });
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Role Management</h1>
          <p className="text-gray-600">Manage user roles and permissions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </DialogTitle>
              <DialogDescription>
                {editingRole 
                  ? 'Update role information and permissions'
                  : 'Define a new role with specific permissions'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Role Name (Internal)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="admin, moderator, etc."
                    disabled={editingRole?.isSystem}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Administrator, Moderator, etc."
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this role is for..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Select
                    value={formData.color}
                    onValueChange={(color) => setFormData(prev => ({ ...prev, color }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultRoleColors.map((color) => (
                        <SelectItem key={color} value={color}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: color }}
                            />
                            {color}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, isActive: !!checked }))
                    }
                  />
                  <Label htmlFor="isActive">Active Role</Label>
                </div>
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="mt-2 space-y-4 max-h-64 overflow-y-auto border rounded-lg p-4">
                  {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                    <div key={category}>
                      <h4 className="font-medium text-sm text-gray-700 mb-2 capitalize">
                        {category.replace('_', ' ')}
                      </h4>
                      <div className="space-y-2 ml-4">
                        {categoryPermissions.map((permission) => (
                          <div key={permission.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={permission.id}
                              checked={formData.permissions.includes(permission.id)}
                              onCheckedChange={() => togglePermission(permission.id)}
                            />
                            <div className="flex-1">
                              <Label htmlFor={permission.id} className="text-sm font-medium">
                                {permission.name}
                              </Label>
                              <p className="text-xs text-gray-500">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingRole ? 'Update Role' : 'Create Role'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="relative">
            {role.isSystem && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  System
                </Badge>
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ backgroundColor: role.color }}
                >
                  <Shield className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{role.displayName}</CardTitle>
                  <p className="text-sm text-gray-600">{role.name}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {role.description || 'No description provided'}
              </p>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{role.userCount} users</span>
                </div>
                <Badge variant={role.isActive ? "default" : "secondary"}>
                  {role.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Permissions ({role.permissions.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 3).map((permission) => (
                    <Badge key={permission.id} variant="outline" className="text-xs">
                      {permission.name}
                    </Badge>
                  ))}
                  {role.permissions.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{role.permissions.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleEdit(role)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                {!role.isSystem && role.userCount === 0 && (
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => handleDelete(role)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {roles.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No roles found</h3>
            <p className="text-gray-600 mb-6">
              Create your first role to start managing user permissions
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Role
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
