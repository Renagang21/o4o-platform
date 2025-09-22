import { http, HttpResponse } from 'msw';

// Simple mock media items for WordPress-style media library
const mockMediaItems = [
  {
    id: 'media-1',
    title: 'Product Image 1',
    filename: 'product-1.jpg',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
    mimeType: 'image/jpeg',
    size: 245678,
    author: 'Admin',
    createdAt: '2024-07-01T00:00:00Z',
  },
  {
    id: 'media-2',
    title: 'Product Image 2',
    filename: 'product-2.jpg',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
    mimeType: 'image/jpeg',
    size: 198765,
    author: 'Admin',
    createdAt: '2024-07-02T00:00:00Z',
  },
  {
    id: 'media-3',
    title: 'Company Document',
    filename: 'company-intro.pdf',
    url: '/files/company-intro.pdf',
    mimeType: 'application/pdf',
    size: 1234567,
    author: 'User',
    createdAt: '2024-06-15T00:00:00Z',
  },
  {
    id: 'media-4',
    title: 'Background Image',
    filename: 'background.jpg',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200',
    thumbnailUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=300',
    mimeType: 'image/jpeg',
    size: 567890,
    author: 'Admin',
    createdAt: '2024-07-10T00:00:00Z',
  },
];

// Store data in memory for CRUD operations
let mediaItems = [...mockMediaItems];

export const mediaHandlers = [
  // Get media items - simplified response
  http.get('/api/v1/content/media', () => {
    return HttpResponse.json({
      data: {
        media: mediaItems,
        total: mediaItems.length
      }
    });
  }),

  // Upload media - simplified
  http.post('/api/v1/content/media/upload', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;

    const newMedia = {
      id: `media-${Date.now()}`,
      title: title || file.name,
      filename: file.name,
      url: `https://images.unsplash.com/photo-${Date.now()}?w=800`,
      thumbnailUrl: file.type.startsWith('image/') 
        ? `https://images.unsplash.com/photo-${Date.now()}?w=300`
        : undefined,
      mimeType: file.type,
      size: file.size,
      author: 'Admin',
      createdAt: new Date().toISOString(),
    };

    mediaItems.unshift(newMedia);

    return HttpResponse.json({
      success: true,
      media: newMedia,
    }, { status: 201 });
  }),

  // Delete media - simplified
  http.delete('/api/v1/content/media/:id', ({ params }) => {
    const index = mediaItems.findIndex(m => m.id === params.id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    mediaItems.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),
];