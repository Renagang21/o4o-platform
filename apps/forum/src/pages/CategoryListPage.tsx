import { useCategories } from '../hooks/useCategories';
import { Link } from 'react-router-dom';
import { Layers, FileText, TrendingUp } from 'lucide-react';

const CategoryListPage = () => {
  const { data: categories, isLoading } = useCategories({ isActive: true });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">카테고리</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6" />
          카테고리
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories?.map((category) => (
          <Link
            key={category.id}
            to={`/categories/${category.slug}`}
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {category.name}
              </h3>
              {category.color && (
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
              )}
            </div>
            
            {category.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {category.description}
              </p>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-gray-500">
                <FileText className="w-4 h-4" />
                <span>{category.postCount} 게시글</span>
              </div>
              
              {category.requireApproval && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  승인 필요
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CategoryListPage;