import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CategoryList from './CategoryList'
import TagList from './TagList'

export default function Categories() {
  const [activeTab, setActiveTab] = useState('categories')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">카테고리 & 태그</h1>
        <p className="text-gray-600 mt-1">콘텐츠를 체계적으로 분류하고 관리합니다</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="categories">카테고리</TabsTrigger>
          <TabsTrigger value="tags">태그</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <CategoryList />
        </TabsContent>

        <TabsContent value="tags" className="mt-6">
          <TagList />
        </TabsContent>
      </Tabs>
    </div>
  );
}