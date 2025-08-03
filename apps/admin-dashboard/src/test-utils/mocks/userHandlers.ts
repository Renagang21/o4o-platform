import { http, HttpResponse } from 'msw';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Mock user data
const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    fullName: 'Admin User',
    role: 'admin',
    roles: ['admin'],
    status: 'active',
    isActive: true,
    isEmailVerified: true,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    email: 'vendor@example.com',
    firstName: 'Vendor',
    lastName: 'User',
    fullName: 'Vendor User',
    role: 'vendor',
    roles: ['vendor', 'seller'],
    status: 'active',
    isActive: true,
    isEmailVerified: true,
    lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    email: 'pending@example.com',
    firstName: 'Pending',
    lastName: 'User',
    fullName: 'Pending User',
    role: 'customer',
    roles: ['customer'],
    status: 'pending',
    isActive: false,
    isEmailVerified: false,
    lastLoginAt: null,
    createdAt: new Date('2024-03-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    email: 'business@example.com',
    firstName: 'Business',
    lastName: 'Owner',
    fullName: 'Business Owner',
    role: 'business',
    roles: ['business', 'vendor'],
    status: 'active',
    isActive: true,
    isEmailVerified: true,
    lastLoginAt: new Date(Date.now() - 172800000).toISOString(),
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    email: 'rejected@example.com',
    firstName: 'Rejected',
    lastName: 'User',
    fullName: 'Rejected User',
    role: 'customer',
    roles: ['customer'],
    status: 'rejected',
    isActive: false,
    isEmailVerified: false,
    lastLoginAt: null,
    createdAt: new Date('2024-02-15').toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Mock approval history
const mockApprovalHistory = [
  {
    id: '1',
    user_id: '3',
    admin_id: '1',
    admin: {
      id: '1',
      email: 'admin@example.com',
      fullName: 'Admin User'
    },
    action: 'status_changed',
    previous_status: 'pending',
    new_status: 'pending',
    notes: 'User registration',
    created_at: new Date('2024-03-01').toISOString()
  },
  {
    id: '2',
    user_id: '5',
    admin_id: '1',
    admin: {
      id: '1',
      email: 'admin@example.com',
      fullName: 'Admin User'
    },
    action: 'rejected',
    previous_status: 'pending',
    new_status: 'rejected',
    notes: 'Incomplete information provided',
    created_at: new Date('2024-02-16').toISOString()
  }
];

export const userManagementHandlers = [
  // Get users with filters
  http.get(`${API_BASE}/v1/users`, ({ request }: any) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search');
    const role = url.searchParams.get('role');
    const status = url.searchParams.get('status');

    let filteredUsers = [...mockUsers];

    // Apply filters
    if (search) {
      filteredUsers = filteredUsers.filter((user: any) =>
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.fullName.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (role) {
      filteredUsers = filteredUsers.filter((user: any) => user.roles.includes(role));
    }

    if (status) {
      filteredUsers = filteredUsers.filter((user: any) => user.status === status);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    return HttpResponse.json({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          total: filteredUsers.length,
          page,
          limit,
          totalPages: Math.ceil(filteredUsers.length / limit)
        }
      }
    });
  }),

  // Get user statistics
  http.get(`${API_BASE}/v1/users/statistics`, () => {
    const statistics = {
      total: mockUsers.length,
      pending: mockUsers.filter((u: any) => u.status === 'pending').length,
      active: mockUsers.filter((u: any) => u.status === 'active').length,
      rejected: mockUsers.filter((u: any) => u.status === 'rejected').length,
      byRole: {
        admin: mockUsers.filter((u: any) => u.roles.includes('admin')).length,
        vendor: mockUsers.filter((u: any) => u.roles.includes('vendor')).length,
        customer: mockUsers.filter((u: any) => u.roles.includes('customer')).length,
        business: mockUsers.filter((u: any) => u.roles.includes('business')).length,
        seller: mockUsers.filter((u: any) => u.roles.includes('seller')).length,
      }
    };

    return HttpResponse.json({
      success: true,
      data: statistics
    });
  }),

  // Get single user
  http.get(`${API_BASE}/v1/users/:id`, ({ params }: any) => {
    const { id } = params as any;
    const user = mockUsers.find((u: any) => u.id === id);

    if (!user) {
      return HttpResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    return HttpResponse.json({
      success: true,
      data: user
    });
  }),

  // Create user
  http.post(`${API_BASE}/v1/users`, async ({ request }: any) => {
    const data = await request.json();
    
    const newUser = {
      id: String(mockUsers.length + 1),
      ...data,
      fullName: `${data.firstName} ${data.lastName}`.trim(),
      isActive: data.status === 'active',
      isEmailVerified: false,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockUsers.push(newUser);

    return HttpResponse.json({
      success: true,
      data: newUser
    }, { status: 201 });
  }),

  // Update user
  http.put(`${API_BASE}/v1/users/:id`, async ({ params, request }: any) => {
    const { id } = params as any;
    const data = await request.json();
    
    const userIndex = mockUsers.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return HttpResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    mockUsers[userIndex] = {
      ...mockUsers[userIndex],
      ...data,
      fullName: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}`.trim() : mockUsers[userIndex].fullName,
      updatedAt: new Date().toISOString()
    };

    return HttpResponse.json({
      success: true,
      data: mockUsers[userIndex]
    });
  }),

  // Delete user
  http.delete(`${API_BASE}/v1/users/:id`, ({ params }: any) => {
    const { id } = params as any;
    const userIndex = mockUsers.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return HttpResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    mockUsers.splice(userIndex, 1);

    return HttpResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  }),

  // Approve user
  http.post(`${API_BASE}/v1/users/:id/approve`, async ({ params, request }: any) => {
    const { id } = params as any;
    const { notes: _notes } = await request.json();
    
    const user = mockUsers.find((u: any) => u.id === id);
    if (!user) {
      return HttpResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    user.status = 'approved';
    user.isActive = true;

    return HttpResponse.json({
      success: true,
      data: user
    });
  }),

  // Reject user
  http.post(`${API_BASE}/v1/users/:id/reject`, async ({ params, request }: any) => {
    const { id } = params as any;
    const { notes: _notes } = await request.json();
    
    const user = mockUsers.find((u: any) => u.id === id);
    if (!user) {
      return HttpResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    user.status = 'rejected';
    user.isActive = false;

    return HttpResponse.json({
      success: true,
      data: user
    });
  }),

  // Bulk approve
  http.post(`${API_BASE}/v1/users/bulk-approve`, async ({ request }: any) => {
    const { userIds, notes: _notes } = await request.json();
    
    let approvedCount = 0;
    userIds.forEach((id: string) => {
      const user = mockUsers.find((u: any) => u.id === id);
      if (user && user.status === 'pending') {
        user.status = 'approved';
        user.isActive = true;
        approvedCount++;
      }
    });

    return HttpResponse.json({
      success: true,
      data: {
        approvedCount
      }
    });
  }),

  // Bulk reject
  http.post(`${API_BASE}/v1/users/bulk-reject`, async ({ request }: any) => {
    const { userIds, notes: _notes } = await request.json();
    
    let rejectedCount = 0;
    userIds.forEach((id: string) => {
      const user = mockUsers.find((u: any) => u.id === id);
      if (user && user.status === 'pending') {
        user.status = 'rejected';
        user.isActive = false;
        rejectedCount++;
      }
    });

    return HttpResponse.json({
      success: true,
      data: {
        rejectedCount
      }
    });
  }),

  // Get approval history
  http.get(`${API_BASE}/v1/users/:id/approval-history`, ({ params }: any) => {
    const { id } = params as any;
    const history = mockApprovalHistory.filter((h: any) => h.user_id === id);

    return HttpResponse.json({
      success: true,
      data: history
    });
  }),

  // Export users
  http.get(`${API_BASE}/v1/users/export/csv`, () => {
    const csv = `ID,Email,First Name,Last Name,Role,Status,Created At
${mockUsers.map((u: any) => `${u.id},${u.email},${u.firstName},${u.lastName},${u.role},${u.status},${u.createdAt}`).join('\n')}`;

    return new HttpResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=users-export.csv'
      }
    });
  })
];