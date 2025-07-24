import { http, HttpResponse } from 'msw';
import type { 
  CrowdfundingProject, 
  CrowdfundingParticipation, 
  CrowdfundingProjectDetail,
  CrowdfundingProjectFormData,
  CrowdfundingDashboardStats
} from '@o4o/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Mock data - 크라우드펀딩 프로젝트
let mockProjects: CrowdfundingProject[] = [
  {
    id: 'proj-1',
    title: '친환경 포장재 대량 구매 프로젝트',
    description: '환경을 생각하는 친환경 포장재를 대량 구매하여 비용을 절감하고자 합니다. 100개 매장이 참여하면 기존 대비 30% 비용 절감이 가능합니다.\n\n주요 혜택:\n- 포장재 비용 30% 절감\n- 친환경 브랜드 이미지 향상\n- 안정적인 공급망 확보',
    targetParticipantCount: 100,
    currentParticipantCount: 67,
    startDate: '2024-01-15',
    endDate: '2024-02-29',
    status: 'recruiting',
    creatorId: 'business-user-1',
    creatorName: '에코패키징',
    forumLink: '/forum/posts/eco-packaging-discussion',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: 'proj-2',
    title: '스마트 POS 시스템 공동 도입',
    description: '최신 스마트 POS 시스템을 공동 도입하여 개발비와 월 사용료를 대폭 절감할 수 있습니다. 50개 매장 참여 시 개별 도입 대비 50% 비용 절감 예상.\n\n제공 기능:\n- 통합 재고 관리\n- 실시간 매출 분석\n- 고객 관리 시스템\n- 모바일 앱 연동',
    targetParticipantCount: 50,
    currentParticipantCount: 38,
    startDate: '2024-01-20',
    endDate: '2024-03-15',
    status: 'recruiting',
    creatorId: 'business-user-2',
    creatorName: '스마트솔루션',
    forumLink: '/forum/posts/smart-pos-discussion',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-22T16:00:00Z'
  },
  {
    id: 'proj-3',
    title: '유기농 원료 공동 구매 성공!',
    description: '유기농 원료를 공동 구매하여 원가를 절감하는 프로젝트입니다. 목표를 달성하여 성공적으로 완료되었습니다.',
    targetParticipantCount: 30,
    currentParticipantCount: 35,
    startDate: '2023-12-01',
    endDate: '2024-01-10',
    status: 'completed',
    creatorId: 'business-user-3',
    creatorName: '유기농식품',
    forumLink: '/forum/posts/organic-ingredients',
    createdAt: '2023-12-01T08:00:00Z',
    updatedAt: '2024-01-10T18:00:00Z'
  },
  {
    id: 'proj-4',
    title: '배송 서비스 통합 플랫폼',
    description: '소규모 매장들을 위한 통합 배송 서비스를 개발하여 배송비를 절감하고자 합니다. 아직 개발 초기 단계입니다.',
    targetParticipantCount: 80,
    currentParticipantCount: 12,
    startDate: '2024-01-25',
    endDate: '2024-04-30',
    status: 'recruiting',
    creatorId: 'business-user-4',
    creatorName: '로지스틱스플러스',
    forumLink: '/forum/posts/delivery-platform',
    createdAt: '2024-01-25T11:00:00Z',
    updatedAt: '2024-01-25T11:00:00Z'
  }
];

// Mock data - 참여 정보
let mockParticipations: CrowdfundingParticipation[] = [
  {
    id: 'part-1',
    projectId: 'proj-1',
    vendorId: 'vendor-1',
    vendorName: '홍길동 매장',
    status: 'joined',
    joinedAt: '2024-01-16T10:00:00Z'
  },
  {
    id: 'part-2',
    projectId: 'proj-1',
    vendorId: 'vendor-2',
    vendorName: '김철수 상점',
    status: 'joined',
    joinedAt: '2024-01-17T14:00:00Z'
  },
  {
    id: 'part-3',
    projectId: 'proj-2',
    vendorId: 'vendor-1',
    vendorName: '홍길동 매장',
    status: 'joined',
    joinedAt: '2024-01-21T09:00:00Z'
  },
  {
    id: 'part-4',
    projectId: 'proj-1',
    vendorId: 'vendor-3',
    vendorName: '이영희 편의점',
    status: 'cancelled',
    joinedAt: '2024-01-18T11:00:00Z',
    cancelledAt: '2024-01-22T15:00:00Z'
  }
];

// Helper functions
const getProjectParticipants = (projectId: string) => {
  return mockParticipations.filter(p => p.projectId === projectId && p.status === 'joined');
};

export const crowdfundingHandlers = [
  // Get all projects
  http.get(`${API_BASE}/v1/crowdfunding-simple/projects`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const creatorId = url.searchParams.get('creatorId');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    let filteredProjects = [...mockProjects];

    // Apply filters
    if (status && status !== 'all') {
      filteredProjects = filteredProjects.filter(p => p.status === status);
    }

    if (creatorId) {
      filteredProjects = filteredProjects.filter(p => p.creatorId === creatorId);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredProjects = filteredProjects.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.creatorName?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by creation date (newest first)
    filteredProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const start = (page - 1) * limit;
    const paginatedProjects = filteredProjects.slice(start, start + limit);

    return HttpResponse.json({
      success: true,
      data: paginatedProjects,
      pagination: {
        page,
        limit,
        total: filteredProjects.length,
        totalPages: Math.ceil(filteredProjects.length / limit)
      }
    });
  }),

  // Get single project
  http.get(`${API_BASE}/v1/crowdfunding-simple/projects/:id`, ({ params }) => {
    const project = mockProjects.find(p => p.id === (params.id as string));
    
    if (!project) {
      return HttpResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Add participants to create detailed project
    const participants = getProjectParticipants(project.id);
    const projectDetail: CrowdfundingProjectDetail = {
      ...project,
      participants,
      participationStatus: undefined // 실제 구현에서는 현재 사용자의 참여 상태를 확인
    };

    return HttpResponse.json({
      success: true,
      data: projectDetail
    });
  }),

  // Create project
  http.post(`${API_BASE}/v1/crowdfunding-simple/projects`, async ({ request }: any) => {
    const data: CrowdfundingProjectFormData = await request.json();
    
    const newProject: CrowdfundingProject = {
      id: `proj-${Date.now()}`,
      title: data.title,
      description: data.description,
      targetParticipantCount: data.targetParticipantCount,
      currentParticipantCount: 0,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'recruiting',
      creatorId: 'current-user-id', // 실제로는 토큰에서 가져옴
      creatorName: '현재 사용자',
      forumLink: data.forumLink,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockProjects.unshift(newProject);

    return HttpResponse.json({
      success: true,
      data: newProject,
      message: '프로젝트가 생성되었습니다.'
    }, { status: 201 });
  }),

  // Update project
  http.put(`${API_BASE}/v1/crowdfunding-simple/projects/:id`, async ({ params, request }: any) => {
    const { id } = params;
    const updateData: Partial<CrowdfundingProjectFormData> = await request.json();
    
    const index = mockProjects.findIndex(p => p.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    mockProjects[index] = {
      ...mockProjects[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    return HttpResponse.json({
      success: true,
      data: mockProjects[index],
      message: '프로젝트가 수정되었습니다.'
    });
  }),

  // Delete project
  http.delete(`${API_BASE}/v1/crowdfunding-simple/projects/:id`, ({ params }) => {
    const { id } = params;
    const index = mockProjects.findIndex(p => p.id === id);
    
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    mockProjects.splice(index, 1);
    
    // Remove related participations
    mockParticipations = mockParticipations.filter(p => p.projectId !== id);

    return HttpResponse.json({
      success: true,
      message: '프로젝트가 삭제되었습니다.'
    });
  }),

  // Join project
  http.post(`${API_BASE}/v1/crowdfunding-simple/projects/:id/join`, ({ params }) => {
    const projectId = params.id as string;
    const vendorId = 'current-vendor-id'; // 실제로는 토큰에서 가져옴
    
    const project = mockProjects.find(p => p.id === projectId);
    if (!project) {
      return HttpResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if already participating
    const existingParticipation = mockParticipations.find(
      p => p.projectId === projectId && p.vendorId === vendorId
    );

    if (existingParticipation && existingParticipation.status === 'joined') {
      return HttpResponse.json(
        { success: false, error: '이미 참여한 프로젝트입니다.' },
        { status: 400 }
      );
    }

    const newParticipation: CrowdfundingParticipation = {
      id: `part-${Date.now()}`,
      projectId,
      vendorId,
      vendorName: '현재 사용자',
      status: 'joined',
      joinedAt: new Date().toISOString()
    };

    mockParticipations.push(newParticipation);
    
    // Update project participant count
    project.currentParticipantCount = getProjectParticipants(projectId).length;
    project.updatedAt = new Date().toISOString();

    return HttpResponse.json({
      success: true,
      data: newParticipation,
      message: '프로젝트에 참여했습니다.'
    });
  }),

  // Cancel participation
  http.post(`${API_BASE}/v1/crowdfunding-simple/projects/:id/cancel`, ({ params }) => {
    const projectId = params.id as string;
    const vendorId = 'current-vendor-id'; // 실제로는 토큰에서 가져옴
    
    const participation = mockParticipations.find(
      p => p.projectId === projectId && p.vendorId === vendorId && p.status === 'joined'
    );

    if (!participation) {
      return HttpResponse.json(
        { success: false, error: '참여 기록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    participation.status = 'cancelled';
    participation.cancelledAt = new Date().toISOString();

    // Update project participant count
    const project = mockProjects.find(p => p.id === projectId);
    if (project) {
      project.currentParticipantCount = getProjectParticipants(projectId).length;
      project.updatedAt = new Date().toISOString();
    }

    return HttpResponse.json({
      success: true,
      data: participation,
      message: '참여를 취소했습니다.'
    });
  }),

  // Get participation status
  http.get(`${API_BASE}/v1/crowdfunding-simple/projects/:id/participation-status`, ({ params }) => {
    const { id: projectId } = params;
    const vendorId = 'current-vendor-id'; // 실제로는 토큰에서 가져옴
    
    const participation = mockParticipations.find(
      p => p.projectId === projectId && p.vendorId === vendorId
    );

    return HttpResponse.json({
      success: true,
      data: participation || null
    });
  }),

  // Update project status (admin only)
  http.patch(`${API_BASE}/v1/crowdfunding-simple/projects/:id/status`, async ({ params, request }: any) => {
    const { id } = params;
    const { status } = await request.json();
    
    const project = mockProjects.find(p => p.id === id);
    if (!project) {
      return HttpResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    project.status = status;
    project.updatedAt = new Date().toISOString();

    return HttpResponse.json({
      success: true,
      data: project,
      message: '프로젝트 상태가 변경되었습니다.'
    });
  }),

  // Get dashboard stats
  http.get(`${API_BASE}/v1/crowdfunding-simple/dashboard/stats`, () => {
    const totalProjects = mockProjects.length;
    const activeProjects = mockProjects.filter(p => p.status === 'recruiting').length;
    const completedProjects = mockProjects.filter(p => p.status === 'completed').length;
    const totalParticipants = mockParticipations.filter(p => p.status === 'joined').length;
    
    const successfulProjects = mockProjects.filter(p => 
      p.currentParticipantCount >= p.targetParticipantCount
    ).length;
    const successRate = totalProjects > 0 ? Math.round((successfulProjects / totalProjects) * 100) : 0;

    const stats: CrowdfundingDashboardStats = {
      totalProjects,
      activeProjects,
      completedProjects,
      totalParticipants,
      successRate
    };

    return HttpResponse.json({
      success: true,
      data: stats
    });
  })
];