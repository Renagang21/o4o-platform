import { useNavigate } from 'react-router-dom';
import { useCreatePost } from '../hooks/usePosts';

const PostCreatePage = () => {
  const navigate = useNavigate();
  const { mutate: createPost } = useCreatePost();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">새 게시글 작성</h1>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-600">게시글 작성 폼이 여기에 구현됩니다.</p>
      </div>
    </div>
  );
};

export default PostCreatePage;