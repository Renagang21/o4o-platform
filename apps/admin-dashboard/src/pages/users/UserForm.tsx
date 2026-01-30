import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BusinessInfoSection from './components/BusinessInfoSection';
import toast from 'react-hot-toast';
import { UserApi } from '@/api/userApi';
import { authClient } from '@o4o/auth-client';

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  roles: z.array(z.string()).min(1, 'At least one role is required'),
  status: z.enum(['active', 'pending', 'approved', 'rejected']),
});

type UserFormData = z.infer<typeof userSchema>;

export default function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const isEdit = !!id;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      roles: ['customer'],
      status: 'pending',
    },
  });

  const selectedRoles = watch('roles');
  const [roles, setRoles] = useState<Array<{ value: string; label: string; description: string }>>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // Fetch roles from database
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoadingRoles(true);
        const response = await authClient.api.get('/users/roles');
        if (response.data?.success && Array.isArray(response.data.data)) {
          setRoles(response.data.data);
        } else {
          console.warn('Invalid roles data format:', response.data);
          setRoles([]);
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error);
        toast.error('Failed to load roles');
        setRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    if (isEdit) {
      fetchUser();
    }
  }, [id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await UserApi.getUser(id);
      const responseAny = response as any;

      // Handle various response structures from API
      const userData = responseAny.data?.data ||
                      responseAny.data ||
                      responseAny.user ||
                      responseAny;

      if (userData && userData.email) {
        // Set form values
        setValue('email', userData.email);
        setValue('firstName', userData.firstName || '');
        setValue('lastName', userData.lastName || '');
        setValue('roles', userData.roles || [userData.role] || ['customer']);
        setValue('status', userData.status || 'pending');
      } else {
        throw new Error('Invalid user data received');
      }
    } catch (error) {
    // Error logging - use proper error handler
      toast.error('Failed to load user');
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      setLoading(true);

      // Backend expects: email, firstName, lastName, status, roles
      // Do NOT send: role (single), name, or empty password
      const payload: Partial<UserFormData> = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        status: data.status,
        roles: data.roles
      };

      if (isEdit) {
        // Don't send password if it's empty
        if (data.password && data.password.trim()) {
          payload.password = data.password;
        }

        await UserApi.updateUser(id, payload);

        toast.success('User updated successfully');
      } else {
        // For new users, password is required
        if (!data.password || !data.password.trim()) {
          toast.error('Password is required for new users');
          return;
        }
        payload.password = data.password;

        await UserApi.createUser(payload as any);

        toast.success('User created successfully');
      }
      
      navigate('/users');
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error(error.response?.data?.error || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (role: string) => {
    const currentRoles = selectedRoles || [];
    if (currentRoles.includes(role)) {
      // Don't allow removing the last role
      if (currentRoles.length > 1) {
        setValue('roles', currentRoles.filter((r) => r !== role));
      }
    } else {
      setValue('roles', [...currentRoles, role]);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant={"ghost" as const} onClick={() => navigate('/users')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{isEdit ? 'Edit User' : 'Add New User'}</CardTitle>
                <CardDescription>
                  {isEdit ? 'Update user information' : 'Create a new user account'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      {...register('firstName')}
                      placeholder="John"
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      {...register('lastName')}
                      placeholder="Doe"
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    placeholder="john.doe@example.com"
                    disabled={isEdit}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">
                    Password {isEdit && '(leave blank to keep current)'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={isEdit ? 'new-password' : 'new-password'}
                    {...register('password')}
                    placeholder={isEdit ? 'Leave blank to keep current' : 'Enter password'}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={watch('status')}
                    onValueChange={(value) => setValue('status', value as 'active' | 'pending' | 'approved' | 'rejected')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <p className="text-sm text-red-500 mt-1">{errors.status.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Roles */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>User Roles</CardTitle>
                <CardDescription>
                  Select one or more roles for this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRoles ? (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    Loading roles...
                  </div>
                ) : roles.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    No roles available
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roles.map((role) => (
                      <div
                        key={role.value}
                        className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRoleToggle(role.value)}
                      >
                        <Checkbox
                          checked={selectedRoles?.includes(role.value) || false}
                          onCheckedChange={() => handleRoleToggle(role.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{role.label}</div>
                          <div className="text-sm text-gray-600">{role.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {errors.roles && (
                  <p className="text-sm text-red-500 mt-2">{errors.roles.message}</p>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
              </Button>
              <Button
                type="button"
                variant={"outline" as const}
                onClick={() => navigate('/users')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
          
          {/* Business Information (for business users) */}
          {isEdit && selectedRoles?.some(role => ['business', 'vendor', 'seller'].includes(role)) && (
            <BusinessInfoSection userId={id!} userRole={selectedRoles[0]} />
          )}
        </div>
      </form>
    </div>
  );
}