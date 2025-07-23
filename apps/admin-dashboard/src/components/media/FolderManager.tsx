import React, { useState } from 'react'
import { 
  Folder, 
  FolderOpen, 
  FolderPlus, 
  Edit2, 
  Trash2, 
  ChevronRight,
  ChevronDown,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { MediaFolder, CreateMediaFolderDto, UpdateMediaFolderDto } from '@o4o/types'
import toast from 'react-hot-toast'

interface FolderManagerProps {
  isOpen: boolean
  onClose: () => void
  onFolderSelect?: (folderId: string) => void
}

interface FolderTreeItemProps {
  folder: MediaFolder
  level: number
  expandedFolders: string[]
  onToggle: (folderId: string) => void
  onEdit: (folder: MediaFolder) => void
  onDelete: (folder: MediaFolder) => void
  onSelect?: (folderId: string) => void
  folders: MediaFolder[]
}

const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  folder,
  level,
  expandedFolders,
  onToggle,
  onEdit,
  onDelete,
  onSelect,
  folders
}) => {
  const childFolders = folders.filter(f => f.parentId === folder.id)
  const hasChildren = childFolders.length > 0
  const isExpanded = expandedFolders.includes(folder.id)

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        <button
          onClick={() => hasChildren && onToggle(folder.id)}
          className="p-1"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>
        
        <div
          className="flex-1 flex items-center gap-2"
          onClick={() => onSelect?.(folder.id)}
        >
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-600" />
          ) : (
            <Folder className="w-4 h-4 text-blue-600" />
          )}
          <span className="text-sm font-medium">{folder.name}</span>
          <span className="text-xs text-gray-500">({folder.mediaCount})</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" onClick={(e: any) => e.stopPropagation()}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(folder)}>
              <Edit2 className="w-4 h-4 mr-2" />
              편집
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(folder)}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {childFolders.map((childFolder) => (
            <FolderTreeItem
              key={childFolder.id}
              folder={childFolder}
              level={level + 1}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onSelect={onSelect}
              folders={folders}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const FolderManager: React.FC<FolderManagerProps> = ({ isOpen, onClose, onFolderSelect }) => {
  const queryClient = useQueryClient()
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<MediaFolder | null>(null)
  const [formData, setFormData] = useState<CreateMediaFolderDto>({
    name: '',
    parentId: undefined,
    description: '',
  })

  // Fetch folders
  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['media-folders'],
    queryFn: async () => {
      const response = await authClient.api.get('/media/folders')
      return response.data
    }
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateMediaFolderDto) => {
      return authClient.api.post('/media/folders', data)
    },
    onSuccess: () => {
      toast.success('폴더가 생성되었습니다')
      queryClient.invalidateQueries({ queryKey: ['media-folders'] })
      setIsCreateDialogOpen(false)
      setFormData({ name: '', parentId: undefined, description: '' })
    },
    onError: () => {
      toast.error('폴더 생성에 실패했습니다')
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateMediaFolderDto) => {
      return authClient.api.put(`/media/folders/${data.id}`, data)
    },
    onSuccess: () => {
      toast.success('폴더가 수정되었습니다')
      queryClient.invalidateQueries({ queryKey: ['media-folders'] })
      setEditingFolder(null)
    },
    onError: () => {
      toast.error('폴더 수정에 실패했습니다')
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.delete(`/media/folders/${id}`)
    },
    onSuccess: () => {
      toast.success('폴더가 삭제되었습니다')
      queryClient.invalidateQueries({ queryKey: ['media-folders'] })
    },
    onError: () => {
      toast.error('폴더 삭제에 실패했습니다')
    }
  })

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    )
  }

  // Handle create
  const handleCreate = () => {
    createMutation.mutate(formData)
  }

  // Handle update
  const handleUpdate = () => {
    if (!editingFolder) return
    updateMutation.mutate({
      id: editingFolder.id,
      name: formData.name,
      description: formData.description,
      parentId: formData.parentId,
    })
  }

  // Handle delete
  const handleDelete = (folder: MediaFolder) => {
    if (confirm(`정말 "${folder.name}" 폴더를 삭제하시겠습니까?\n폴더 내 미디어는 미분류로 이동됩니다.`)) {
      deleteMutation.mutate(folder.id)
    }
  }

  // Get root folders
  const rootFolders = folders.filter((f: MediaFolder) => !f.parentId)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>폴더 관리</DialogTitle>
            <DialogDescription>
              미디어를 정리할 폴더를 관리합니다
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium">폴더 구조</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFormData({ name: '', parentId: undefined, description: '' })
                setEditingFolder(null)
                setIsCreateDialogOpen(true)
              }}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              새 폴더
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">폴더가 없습니다</p>
              <Button
                variant="outline"
                onClick={() => {
                  setFormData({ name: '', parentId: undefined, description: '' })
                  setEditingFolder(null)
                  setIsCreateDialogOpen(true)
                }}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                첫 폴더 만들기
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
              {rootFolders.map((folder: MediaFolder) => (
                <FolderTreeItem
                  key={folder.id}
                  folder={folder}
                  level={0}
                  expandedFolders={expandedFolders}
                  onToggle={toggleFolder}
                  onEdit={(folder) => {
                    setEditingFolder(folder)
                    setFormData({
                      name: folder.name,
                      parentId: folder.parentId,
                      description: folder.description,
                    })
                    setIsCreateDialogOpen(true)
                  }}
                  onDelete={handleDelete}
                  onSelect={onFolderSelect}
                  folders={folders}
                />
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFolder ? '폴더 수정' : '새 폴더'}
            </DialogTitle>
            <DialogDescription>
              폴더 정보를 입력하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="folderName">폴더 이름</Label>
              <Input
                id="folderName"
                value={formData.name}
                onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 2024년 이미지"
              />
            </div>

            <div>
              <Label htmlFor="parentFolder">상위 폴더</Label>
              <select
                id="parentFolder"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.parentId || ''}
                onChange={(e: any) => setFormData({ ...formData, parentId: e.target.value || undefined })}
              >
                <option value="">최상위</option>
                {folders.map((folder: MediaFolder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="folderDescription">설명 (선택)</Label>
              <Textarea
                id="folderDescription"
                value={formData.description}
                onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                placeholder="폴더에 대한 설명"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setEditingFolder(null)
              }}
            >
              취소
            </Button>
            <Button
              onClick={editingFolder ? handleUpdate : handleCreate}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
            >
              {editingFolder ? '수정' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default FolderManager