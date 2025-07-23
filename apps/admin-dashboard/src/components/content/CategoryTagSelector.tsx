import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, tagsApi } from '@/api/categoriesApi';
import { Category, Tag } from '@o4o/types';
import toast from 'react-hot-toast';

interface CategoryTagSelectorProps {
  selectedCategories: string[];
  selectedTags: string[];
  onCategoriesChange: (categories: string[]) => void;
  onTagsChange: (tags: string[]) => void;
}

export default function CategoryTagSelector({
  selectedCategories,
  selectedTags,
  onCategoriesChange,
  onTagsChange
}: CategoryTagSelectorProps) {
  const [tagInput, setTagInput] = useState('');
  const [searchTag, setSearchTag] = useState('');
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getCategories
  });

  // Fetch tags
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getTags
  });

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: tagsApi.createTag,
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      onTagsChange([...selectedTags, newTag.id]);
      setTagInput('');
      toast.success('태그가 생성되었습니다');
    },
    onError: () => {
      toast.error('태그 생성에 실패했습니다');
    }
  });

  // Handle category selection
  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoriesChange(selectedCategories.filter(id => id !== categoryId));
    } else {
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  // Handle tag selection
  const handleTagToggle = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  // Handle creating new tag
  const handleCreateTag = () => {
    if (tagInput.trim()) {
      const slug = tagInput
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9가-힣]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      createTagMutation.mutate({
        name: tagInput.trim(),
        slug
      });
    }
  };

  // Filter tags based on search
  const filteredTags = tags.filter((tag: Tag) => 
    tag.name.toLowerCase().includes(searchTag.toLowerCase())
  );

  // Get selected category/tag objects
  const selectedCategoryObjects = categories.filter((cat: Category) => 
    selectedCategories.includes(cat.id)
  );
  const selectedTagObjects = tags.filter((tag: Tag) => 
    selectedTags.includes(tag.id)
  );

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <Label className="text-base font-semibold mb-3 block">카테고리</Label>
        <ScrollArea className="h-48 border rounded-md p-3">
          <div className="space-y-2">
            {categories.map((category: Category) => (
              <div key={category.id} className="flex items-start space-x-2">
                <Checkbox
                  id={`cat-${category.id}`}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => handleCategoryToggle(category.id)}
                />
                <div className="flex-1">
                  <label
                    htmlFor={`cat-${category.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {category.name}
                  </label>
                  {category.description && (
                    <p className="text-xs text-gray-500">{category.description}</p>
                  )}
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                카테고리가 없습니다
              </p>
            )}
          </div>
        </ScrollArea>
        
        {/* Selected categories display */}
        {selectedCategoryObjects.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedCategoryObjects.map((category: Category) => (
              <Badge key={category.id} variant="secondary">
                {category.name}
                <button
                  onClick={() => handleCategoryToggle(category.id)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Tags */}
      <div>
        <Label className="text-base font-semibold mb-3 block">태그</Label>
        
        {/* Tag search */}
        <div className="mb-3">
          <Input
            placeholder="태그 검색..."
            value={searchTag}
            onChange={(e: any) => setSearchTag(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Tag list */}
        <ScrollArea className="h-32 border rounded-md p-3 mb-3">
          <div className="flex flex-wrap gap-2">
            {filteredTags.map((tag: Tag) => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleTagToggle(tag.id)}
              >
                {tag.name}
                {selectedTags.includes(tag.id) && (
                  <X className="w-3 h-3 ml-1" />
                )}
              </Badge>
            ))}
            {filteredTags.length === 0 && (
              <p className="text-sm text-gray-500 w-full text-center py-4">
                태그가 없습니다
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Add new tag */}
        <div className="flex gap-2">
          <Input
            placeholder="새 태그 입력..."
            value={tagInput}
            onChange={(e: any) => setTagInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateTag();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCreateTag}
            disabled={!tagInput.trim() || createTagMutation.isPending}
          >
            <Plus className="w-4 h-4" />
            추가
          </Button>
        </div>

        {/* Selected tags summary */}
        {selectedTagObjects.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">
              선택된 태그 ({selectedTagObjects.length}개)
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedTagObjects.map((tag: Tag) => (
                <Badge key={tag.id}>
                  {tag.name}
                  <button
                    onClick={() => handleTagToggle(tag.id)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}