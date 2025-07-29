#!/bin/bash

# Script to fix TypeScript errors in admin-dashboard

echo "🔧 Fixing TypeScript errors in admin-dashboard..."

# Fix 1: Add missing React hook imports for affiliate components
echo "📦 Fixing missing React hooks in affiliate components..."

# CommissionApprovalManager.tsx
sed -i "1s/import { FC } from 'react';/import { FC, useState, useEffect } from 'react';/" apps/admin-dashboard/src/components/affiliate/CommissionApprovalManager.tsx

# CommissionHistory.tsx
sed -i "1s/import { FC } from 'react';/import { FC, useState } from 'react';/" apps/admin-dashboard/src/components/affiliate/CommissionHistory.tsx

# CommissionSummary.tsx
sed -i "1s/import { FC } from 'react';/import { FC, useState, useEffect } from 'react';/" apps/admin-dashboard/src/components/affiliate/CommissionSummary.tsx

# Fix 2: Remove duplicate imports
echo "🔧 Removing duplicate imports..."

# Library.tsx - Remove the duplicate FC import and fix the import
cat > apps/admin-dashboard/src/pages/media/Library.tsx << 'EOF'
import { FC, useState, useEffect } from 'react';
import { 
  Upload,
  Search,
  Filter,
  Grid3X3,
  List,
  Folder,
  FolderPlus,
  Image,
  Video,
  Music,
  FileText,
  Trash2,
  RefreshCw,
  X,
  ChevronDown,
  HardDrive
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MediaUploadDialog } from '@/components/MediaUploadDialog'
import { useState, useCallback } from 'react'
import { formatBytes, getFileIcon } from '@/utils/fileUtils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface MediaItem {
  id: string
  name: string
  type: 'image' | 'video' | 'audio' | 'document' | 'other'
  size: number
  url: string
  thumbnailUrl?: string
  mimeType: string
  uploadedAt: string
  uploadedBy: string
  folder?: string
  width?: number
  height?: number
  duration?: number
  description?: string
  altText?: string
}

interface MediaFolder {
  id: string
  name: string
  parent?: string
  createdAt: string
  itemCount: number
}

const Library: FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([
    {
      id: '1',
      name: 'product-hero.jpg',
      type: 'image',
      size: 1024000,
      url: '/images/product-hero.jpg',
      thumbnailUrl: '/images/product-hero-thumb.jpg',
      mimeType: 'image/jpeg',
      uploadedAt: '2024-01-15T10:00:00Z',
      uploadedBy: 'admin',
      width: 1920,
      height: 1080,
      altText: '제품 메인 이미지'
    },
    {
      id: '2',
      name: 'tutorial-video.mp4',
      type: 'video',
      size: 10240000,
      url: '/videos/tutorial.mp4',
      thumbnailUrl: '/images/video-thumb.jpg',
      mimeType: 'video/mp4',
      uploadedAt: '2024-01-14T15:30:00Z',
      uploadedBy: 'editor',
      duration: 300,
      description: '사용 방법 튜토리얼'
    },
    {
      id: '3',
      name: 'background-music.mp3',
      type: 'audio',
      size: 5120000,
      url: '/audio/background.mp3',
      mimeType: 'audio/mpeg',
      uploadedAt: '2024-01-13T09:15:00Z',
      uploadedBy: 'admin',
      duration: 180
    },
    {
      id: '4',
      name: 'user-guide.pdf',
      type: 'document',
      size: 2048000,
      url: '/documents/user-guide.pdf',
      mimeType: 'application/pdf',
      uploadedAt: '2024-01-12T14:20:00Z',
      uploadedBy: 'admin',
      description: '사용자 가이드 문서'
    }
  ])

  const [folders, setFolders] = useState<MediaFolder[]>([
    {
      id: 'folder-1',
      name: '제품 이미지',
      createdAt: '2024-01-01T00:00:00Z',
      itemCount: 25
    },
    {
      id: 'folder-2',
      name: '배너',
      createdAt: '2024-01-01T00:00:00Z',
      itemCount: 12
    },
    {
      id: 'folder-3',
      name: '문서',
      createdAt: '2024-01-01T00:00:00Z',
      itemCount: 8
    }
  ])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
    } else {
      newSelection.add(itemId)
    }
    setSelectedItems(newSelection)
  }

  const selectAll = () => {
    setSelectedItems(new Set(mediaItems.map(item => item.id)))
  }

  const clearSelection = () => {
    setSelectedItems(new Set())
  }

  const deleteSelectedItems = () => {
    if (confirm(`${selectedItems.size}개의 파일을 삭제하시겠습니까?`)) {
      setMediaItems(mediaItems.filter(item => !selectedItems.has(item.id)))
      clearSelection()
    }
  }

  const filteredItems = mediaItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === 'all' || item.type === selectedType
    const matchesFolder = !selectedFolder || item.folder === selectedFolder
    return matchesSearch && matchesType && matchesFolder
  })

  const handleUploadComplete = (files: File[]) => {
    // 업로드 처리 로직
    console.log('Uploaded files:', files)
    setUploadDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">미디어 라이브러리</h1>
          <p className="text-gray-600 mt-1">업로드된 미디어 파일을 관리합니다</p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          새 미디어 추가
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="border-b p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="미디어 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    {selectedType === 'all' ? '모든 유형' : selectedType}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSelectedType('all')}>
                    모든 유형
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedType('image')}>
                    <Image className="h-4 w-4 mr-2" />
                    이미지
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedType('video')}>
                    <Video className="h-4 w-4 mr-2" />
                    비디오
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedType('audio')}>
                    <Music className="h-4 w-4 mr-2" />
                    오디오
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedType('document')}>
                    <FileText className="h-4 w-4 mr-2" />
                    문서
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2">
              {selectedItems.size > 0 && (
                <>
                  <span className="text-sm text-gray-600">
                    {selectedItems.size}개 선택됨
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                  >
                    선택 해제
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={deleteSelectedItems}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex">
            {/* Sidebar - Folders */}
            <div className="w-64 border-r p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">폴더</h3>
                <Button variant="ghost" size="sm">
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-1">
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100 ${
                    !selectedFolder ? 'bg-gray-100' : ''
                  }`}
                  onClick={() => setSelectedFolder(null)}
                >
                  <HardDrive className="h-4 w-4" />
                  <span className="flex-1">모든 미디어</span>
                  <span className="text-sm text-gray-500">{mediaItems.length}</span>
                </button>
                
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100 ${
                      selectedFolder === folder.id ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <Folder className="h-4 w-4" />
                    <span className="flex-1">{folder.name}</span>
                    <span className="text-sm text-gray-500">{folder.itemCount}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Media Grid/List */}
            <div className="flex-1 p-4">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 ${
                        selectedItems.has(item.id) ? 'border-blue-500' : 'border-transparent'
                      }`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        {item.type === 'image' && item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.altText || item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-gray-400">
                            {getFileIcon(item.type, 'h-12 w-12')}
                          </div>
                        )}
                      </div>
                      
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleItemSelection(item.id)
                            }}
                          >
                            {selectedItems.has(item.id) ? '선택 해제' : '선택'}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-2">
                        <p className="text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">{formatBytes(item.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer ${
                        selectedItems.has(item.id) ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                      
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        {item.type === 'image' && item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.altText || item.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <div className="text-gray-400">
                            {getFileIcon(item.type, 'h-6 w-6')}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatBytes(item.size)} • {new Date(item.uploadedAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      
                      <Badge variant="secondary">
                        {item.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <MediaUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />

      {/* Media Details Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>미디어 상세 정보</DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                {selectedItem.type === 'image' ? (
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.altText || selectedItem.name}
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    {getFileIcon(selectedItem.type, 'h-24 w-24 text-gray-400')}
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label>파일명</Label>
                  <Input value={selectedItem.name} readOnly />
                </div>
                
                <div>
                  <Label>대체 텍스트</Label>
                  <Input
                    value={selectedItem.altText || ''}
                    placeholder="이미지 설명을 입력하세요"
                  />
                </div>
                
                <div>
                  <Label>설명</Label>
                  <Textarea
                    value={selectedItem.description || ''}
                    placeholder="파일에 대한 설명을 입력하세요"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>파일 크기</Label>
                    <p className="text-sm text-gray-600">{formatBytes(selectedItem.size)}</p>
                  </div>
                  
                  <div>
                    <Label>파일 형식</Label>
                    <p className="text-sm text-gray-600">{selectedItem.mimeType}</p>
                  </div>
                  
                  {selectedItem.width && selectedItem.height && (
                    <>
                      <div>
                        <Label>크기</Label>
                        <p className="text-sm text-gray-600">
                          {selectedItem.width} × {selectedItem.height}
                        </p>
                      </div>
                    </>
                  )}
                  
                  {selectedItem.duration && (
                    <div>
                      <Label>재생 시간</Label>
                      <p className="text-sm text-gray-600">
                        {Math.floor(selectedItem.duration / 60)}분 {selectedItem.duration % 60}초
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <Label>업로드 일시</Label>
                    <p className="text-sm text-gray-600">
                      {new Date(selectedItem.uploadedAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  
                  <div>
                    <Label>업로더</Label>
                    <p className="text-sm text-gray-600">{selectedItem.uploadedBy}</p>
                  </div>
                </div>
                
                <div>
                  <Label>파일 URL</Label>
                  <div className="flex gap-2">
                    <Input value={selectedItem.url} readOnly />
                    <Button
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(selectedItem.url)}
                    >
                      복사
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Library
EOF

# PendingUsers.tsx - Remove duplicate imports
cat > apps/admin-dashboard/src/pages/users-backup/PendingUsers.tsx << 'EOF'
import { FC } from 'react';

const PendingUsers: FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">승인 대기 사용자</h1>
        <p className="text-gray-600 mt-1">가입 승인을 기다리는 사용자들을 관리합니다</p>
      </div>

      <div className="wp-card">
        <div className="wp-card-body">
          <div className="text-center py-12 text-gray-500">
            <p>승인 대기 사용자 페이지는 개발 중입니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PendingUsers
EOF

# Fix 3: Add type annotations for implicit any parameters
echo "🔧 Adding type annotations for event handlers..."

# Find and fix onChange handlers with implicit any
find apps/admin-dashboard/src -type f -name "*.tsx" -exec sed -i \
  -e 's/onChange={(checked)/onChange={(checked: boolean)/g' \
  -e 's/onChange={(value)/onChange={(value: string)/g' \
  -e 's/onChange={(e)/onChange={(e: React.ChangeEvent<HTMLInputElement>)/g' \
  -e 's/onValueChange={(value)/onValueChange={(value: string)/g' \
  -e 's/onCheckedChange={(checked)/onCheckedChange={(checked: boolean)/g' \
  {} \;

# Fix 4: Fix specific error in ActivityFeed
echo "🔧 Fixing ActivityFeed comparison error..."
sed -i 's/activity\.type === ""/activity.type === "content"/' apps/admin-dashboard/src/pages/dashboard/components/ActivityFeed/index.tsx

# Fix 5: Fix ScreenOption export issue
echo "🔧 Fixing ScreenOption export..."
# Check if ScreenOptions.tsx exports ScreenOption
if ! grep -q "export.*ScreenOption[^s]" apps/admin-dashboard/src/components/ScreenOptions.tsx; then
  # Add the export at the end of the file
  echo -e "\nexport { ScreenOption }" >> apps/admin-dashboard/src/components/ScreenOptions.tsx
fi

echo "✅ Admin dashboard TypeScript fixes complete!"