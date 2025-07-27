import { useParams } from 'react-router-dom'

const UserDetail: FC = () => {
  const { userId } = useParams()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">사용자 상세 정보</h1>
        <p className="text-gray-600 mt-1">사용자 ID: {userId}</p>
      </div>

      <div className="wp-card">
        <div className="wp-card-body">
          <div className="text-center py-12 text-gray-500">
            <p>사용자 상세 정보 페이지는 개발 중입니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDetail