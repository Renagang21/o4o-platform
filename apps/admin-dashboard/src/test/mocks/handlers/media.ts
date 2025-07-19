import { http, HttpResponse } from 'msw';
import type { MediaItem, MediaFolder, MediaListResponse, MediaUploadResponse } from '@o4o/types';

// Mock folders
const mockFolders: MediaFolder[] = [
  {
    id: 'folder-1',
    name: '2024년 이미지',
    slug: '2024-images',
    description: '2024년도 업로드 이미지',
    mediaCount: 12,
    createdBy: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'folder-2',
    name: '제품 이미지',
    slug: 'product-images',
    parentId: 'folder-1',
    description: '제품 관련 이미지',
    mediaCount: 8,
    createdBy: 'admin',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'folder-3',
    name: '문서',
    slug: 'documents',
    description: 'PDF 및 문서 파일',
    mediaCount: 5,
    createdBy: 'admin',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
];

// Mock media items
const mockMediaItems: MediaItem[] = [
  {
    id: 'media-1',
    title: '제품 이미지 1',
    filename: 'product-1.jpg',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
    mimeType: 'image/jpeg',
    mediaType: 'image',
    size: 245678,
    width: 800,
    height: 600,
    alt: '스마트워치 제품 이미지',
    caption: '최신 스마트워치 모델',
    uploadedBy: {
      id: '1',
      name: '관리자',
      email: 'admin@example.com',
    },
    tags: ['제품', '스마트워치'],
    folderId: 'folder-2',
    status: 'ready',
    variations: {
      thumbnail: {
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150',
        width: 150,
        height: 150,
        size: 12345,
      },
      medium: {
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
        width: 300,
        height: 300,
        size: 34567,
      },
      large: {
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
        width: 600,
        height: 600,
        size: 123456,
      },
    },
    createdAt: new Date('2024-07-01'),
    updatedAt: new Date('2024-07-01'),
  },
  {
    id: 'media-2',
    title: '제품 이미지 2',
    filename: 'product-2.jpg',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
    mimeType: 'image/jpeg',
    mediaType: 'image',
    size: 198765,
    width: 800,
    height: 600,
    alt: '헤드폰 제품 이미지',
    caption: '프리미엄 헤드폰',
    uploadedBy: {
      id: '1',
      name: '관리자',
      email: 'admin@example.com',
    },
    tags: ['제품', '헤드폰', '오디오'],
    folderId: 'folder-2',
    status: 'ready',
    createdAt: new Date('2024-07-02'),
    updatedAt: new Date('2024-07-02'),
  },
  {
    id: 'media-3',
    title: '회사 소개서',
    filename: 'company-intro.pdf',
    url: '/files/company-intro.pdf',
    mimeType: 'application/pdf',
    mediaType: 'document',
    size: 1234567,
    uploadedBy: {
      id: '2',
      name: '김직원',
      email: 'kim@example.com',
    },
    tags: ['문서', '회사소개'],
    folderId: 'folder-3',
    status: 'ready',
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: 'media-4',
    title: '배경 이미지',
    filename: 'background.jpg',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200',
    thumbnailUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=300',
    mimeType: 'image/jpeg',
    mediaType: 'image',
    size: 567890,
    width: 1200,
    height: 800,
    alt: '그라디언트 배경',
    uploadedBy: {
      id: '1',
      name: '관리자',
      email: 'admin@example.com',
    },
    tags: ['배경', '디자인'],
    status: 'ready',
    createdAt: new Date('2024-07-10'),
    updatedAt: new Date('2024-07-10'),
  },
  {
    id: 'media-5',
    title: '프로모션 비디오',
    filename: 'promo-video.mp4',
    url: '/files/promo-video.mp4',
    mimeType: 'video/mp4',
    mediaType: 'video',
    size: 12345678,
    width: 1920,
    height: 1080,
    duration: 30,
    uploadedBy: {
      id: '3',
      name: '박마케터',
      email: 'park@example.com',
    },
    tags: ['비디오', '프로모션'],
    status: 'processing',
    createdAt: new Date('2024-07-15'),
    updatedAt: new Date('2024-07-15'),
  },
];

// Store data in memory for CRUD operations
let mediaItems = [...mockMediaItems];
let folders = [...mockFolders];

export const mediaHandlers = [
  // Get media items
  http.get('/api/v1/media', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '24');
    const mediaType = url.searchParams.get('mediaType');
    const folderId = url.searchParams.get('folderId');
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');

    let filteredItems = [...mediaItems];

    // Apply filters
    if (mediaType && mediaType !== 'all') {
      filteredItems = filteredItems.filter(item => item.mediaType === mediaType);
    }

    if (folderId) {
      if (folderId === 'uncategorized') {
        filteredItems = filteredItems.filter(item => !item.folderId);
      } else {
        filteredItems = filteredItems.filter(item => item.folderId === folderId);
      }
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.filename.toLowerCase().includes(searchLower) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (status && status !== 'all') {
      filteredItems = filteredItems.filter(item => item.status === status);
    }

    // Sort by date
    filteredItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);

    const response: MediaListResponse = {
      items: paginatedItems,
      total: filteredItems.length,
      page,
      limit,
      totalPages: Math.ceil(filteredItems.length / limit),
      folders,
    };

    return HttpResponse.json(response);
  }),

  // Get single media item
  http.get('/api/v1/media/:id', ({ params }) => {
    const item = mediaItems.find(m => m.id === params.id);
    if (!item) {
      return HttpResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    return HttpResponse.json(item);
  }),

  // Upload media
  http.post('/api/v1/media/upload', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const alt = formData.get('alt') as string;
    const caption = formData.get('caption') as string;
    const folderId = formData.get('folderId') as string;

    const newMedia: MediaItem = {
      id: `media-${Date.now()}`,
      title: title || file.name,
      filename: file.name,
      url: `https://images.unsplash.com/photo-${Date.now()}?w=800`,
      thumbnailUrl: `https://images.unsplash.com/photo-${Date.now()}?w=300`,
      mimeType: file.type,
      mediaType: file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('video/') ? 'video' :
                 file.type.startsWith('audio/') ? 'audio' : 'document',
      size: file.size,
      alt,
      caption,
      uploadedBy: {
        id: '1',
        name: '관리자',
        email: 'admin@example.com',
      },
      folderId: folderId || undefined,
      status: 'ready',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mediaItems.unshift(newMedia);

    const response: MediaUploadResponse = {
      success: true,
      media: newMedia,
      message: '업로드가 완료되었습니다',
    };

    return HttpResponse.json(response, { status: 201 });
  }),

  // Update media
  http.put('/api/v1/media/:id', async ({ params, request }) => {
    const data = await request.json() as any;
    const index = mediaItems.findIndex(m => m.id === params.id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    mediaItems[index] = {
      ...mediaItems[index],
      ...data,
      updatedAt: new Date(),
    };

    return HttpResponse.json(mediaItems[index]);
  }),

  // Delete media
  http.delete('/api/v1/media/:id', ({ params }) => {
    const index = mediaItems.findIndex(m => m.id === params.id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    mediaItems.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Bulk operations
  http.post('/api/v1/media/bulk', async ({ request }) => {
    const data = await request.json() as any;
    const { action, mediaIds } = data;

    if (action === 'delete') {
      mediaItems = mediaItems.filter(item => !mediaIds.includes(item.id));
      return HttpResponse.json({ success: true, message: `${mediaIds.length}개 삭제됨` });
    }

    return HttpResponse.json({ success: true });
  }),

  // Get folders
  http.get('/api/v1/media/folders', () => {
    return HttpResponse.json(folders);
  }),

  // Create folder
  http.post('/api/v1/media/folders', async ({ request }) => {
    const data = await request.json() as any;
    const newFolder: MediaFolder = {
      id: `folder-${Date.now()}`,
      ...data,
      slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      mediaCount: 0,
      createdBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    folders.push(newFolder);
    return HttpResponse.json(newFolder, { status: 201 });
  }),

  // Update folder
  http.put('/api/v1/media/folders/:id', async ({ params, request }) => {
    const data = await request.json() as any;
    const index = folders.findIndex(f => f.id === params.id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    folders[index] = {
      ...folders[index],
      ...data,
      updatedAt: new Date(),
    };

    return HttpResponse.json(folders[index]);
  }),

  // Delete folder
  http.delete('/api/v1/media/folders/:id', ({ params }) => {
    const index = folders.findIndex(f => f.id === params.id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Move media to uncategorized
    mediaItems = mediaItems.map(item =>
      item.folderId === params.id
        ? { ...item, folderId: undefined }
        : item
    );

    folders.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),
];