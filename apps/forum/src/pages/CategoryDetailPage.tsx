import { useParams } from 'react-router-dom';
import { useCategory } from '../hooks/useCategories';
import PostListPage from './PostListPage';

const CategoryDetailPage = () => {
  const { categorySlug } = useParams();
  const { data: category, isLoading } = useCategory(categorySlug!);

  if (isLoading) {
    return <div className="skeleton h-96" />;
  }

  if (!category) {
    return <div>카테고리를 찾을 수 없습니다.</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-gray-600">{category.description}</p>
        )}
      </div>
      
      <PostListPage />
    </div>
  );
};

export default CategoryDetailPage;