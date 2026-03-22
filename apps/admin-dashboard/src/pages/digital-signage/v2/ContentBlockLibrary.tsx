/**
 * Content Block Library — Container
 *
 * Sprint 2-5: Admin Dashboard - Content Block management
 * Phase 2: Digital Signage Production Upgrade
 *
 * WO-O4O-CONTENT-BLOCK-LIBRARY-SPLIT-V1
 * Refactored from 1,237-line monolith to container + sub-components + hook
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ContentBlockType } from '@/lib/api/signageV2';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  RefreshCw,
  Grid,
  List,
  Box,
  Eye,
} from 'lucide-react';
import { useContentBlocks } from './content-blocks/useContentBlocks';
import { BLOCK_TYPE_CONFIGS } from './content-blocks/content-block-constants';
import { BlockEditorDialog } from './content-blocks/BlockEditorDialog';
import { BlockPreviewDialog } from './content-blocks/BlockPreviewDialog';
import { BlockDeleteDialog } from './content-blocks/BlockDeleteDialog';

export default function ContentBlockLibrary() {
  const {
    blocks,
    loading,
    filteredBlocks,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    viewMode,
    setViewMode,
    showBlockDialog,
    setShowBlockDialog,
    showPreviewDialog,
    setShowPreviewDialog,
    editingBlock,
    previewBlock,
    setPreviewBlock,
    deleteTarget,
    setDeleteTarget,
    blockForm,
    setBlockForm,
    loadBlocks,
    openBlockDialog,
    handleSaveBlock,
    handleDuplicate,
    handleDelete,
  } = useContentBlocks();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Blocks</h1>
          <p className="text-muted-foreground">
            Reusable content components for templates
          </p>
        </div>
        <Button onClick={() => openBlockDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          New Block
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filterType}
          onValueChange={(value) => setFilterType(value as ContentBlockType | 'all')}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(BLOCK_TYPE_CONFIGS).map(([type, config]) => (
              <SelectItem key={type} value={type}>
                <div className="flex items-center gap-2">
                  <config.icon className="h-4 w-4" />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="icon" onClick={loadBlocks}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Block Type Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(BLOCK_TYPE_CONFIGS).map(([type, config]) => {
          const count = blocks.filter((b) => b.blockType === type).length;
          return (
            <Badge
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilterType(filterType === type ? 'all' : (type as ContentBlockType))}
            >
              <config.icon className="h-3 w-3 mr-1" />
              {config.label} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Blocks */}
      {filteredBlocks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No content blocks found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== 'all'
                ? 'Try different filters'
                : 'Create your first content block to get started'}
            </p>
            {!searchQuery && filterType === 'all' && (
              <Button onClick={() => openBlockDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Block
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBlocks.map((block) => {
            const config = BLOCK_TYPE_CONFIGS[block.blockType];
            const Icon = config.icon;

            return (
              <Card key={block.id} className="group">
                <CardContent className="p-0">
                  {/* Preview */}
                  <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Icon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openBlockDialog(block)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setPreviewBlock(block);
                                setShowPreviewDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(block)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget(block)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {/* Type badge */}
                    <div className="absolute bottom-2 left-2">
                      <Badge className={`${config.color} text-white border-0`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">{block.name}</h3>
                      {block.isSystem && (
                        <Badge variant="secondary" className="text-xs ml-2">
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {config.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBlocks.map((block) => {
            const config = BLOCK_TYPE_CONFIGS[block.blockType];
            const Icon = config.icon;

            return (
              <Card key={block.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-lg ${config.color} flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{block.name}</h3>
                      {block.isSystem && (
                        <Badge variant="secondary" className="text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {config.label} - {config.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openBlockDialog(block)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setPreviewBlock(block);
                          setShowPreviewDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(block)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteTarget(block)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <BlockEditorDialog
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        editingBlock={editingBlock}
        blockForm={blockForm}
        setBlockForm={setBlockForm}
        onSave={handleSaveBlock}
      />
      <BlockPreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        block={previewBlock}
      />
      <BlockDeleteDialog
        target={deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
