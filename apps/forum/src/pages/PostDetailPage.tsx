import { useParams } from 'react-router-dom';
import { usePost } from '../hooks/usePosts';

const PostDetailPage = () => {
  const { postSlug } = useParams();
  const { data: post, isLoading } = usePost(postSlug!);

  if (isLoading) return <div className="skeleton h-96" />;
  if (!post) return <div>게시글을 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <article className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
    </div>
  );
};

export default PostDetailPage;