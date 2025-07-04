import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Comment } from '../../types'

interface ProjectCommentsProps {
  comments: Comment[]
}

const ProjectComments = ({ comments }: ProjectCommentsProps) => {
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  // Mock comments if empty
  const mockComments: Comment[] = comments.length > 0 ? comments : [
    {
      id: '1',
      content: '정말 기대되는 제품이네요! 특히 7일 배터리 지속시간이 인상적입니다. 기존에 사용하던 스마트워치는 2-3일마다 충전해야 해서 불편했는데, 이 제품은 정말 혁신적인 것 같아요.',
      createdAt: '2024-06-21T10:30:00Z',
      author: { id: '2', name: '김후원', email: '', role: 'backer' },
      replies: [
        {
          id: '1-1',
          content: '감사합니다! 배터리 최적화에 많은 노력을 기울였습니다. 실제로는 사용 패턴에 따라 8-9일까지도 사용 가능할 것으로 예상됩니다 😊',
          createdAt: '2024-06-21T11:15:00Z',
          author: { id: '1', name: '박트러스트', email: '', role: 'creator' }
        }
      ]
    },
    {
      id: '2',
      content: 'FDA 승인을 받았다니 정말 대단하네요! 의료진으로서 이런 검증된 제품을 환자들에게 추천할 수 있어서 기쁩니다. 혈압 측정 정확도는 어느 정도인가요?',
      createdAt: '2024-06-20T15:45:00Z',
      author: { id: '3', name: '이의사', email: '', role: 'backer' },
      replies: [
        {
          id: '2-1',
          content: '의료진분의 관심에 감사드립니다! 혈압 측정 정확도는 ±3mmHg 이내로, 의료용 기준을 만족합니다. 상세한 임상 데이터는 투명성 허브에서 확인하실 수 있습니다.',
          createdAt: '2024-06-20T16:20:00Z',
          author: { id: '1', name: '박트러스트', email: '', role: 'creator' }
        },
        {
          id: '2-2',
          content: '저도 간호사인데 이런 제품을 환자 모니터링에 활용할 수 있을 것 같아요. 정말 기대됩니다!',
          createdAt: '2024-06-21T09:10:00Z',
          author: { id: '4', name: '최간호사', email: '', role: 'backer' }
        }
      ]
    },
    {
      id: '3',
      content: '제품 수령과 금액 환급 중 선택할 수 있다는 게 정말 특별한 것 같아요. 다른 크라우드펀딩에서는 본 적이 없는 시스템이네요. 환급 시 추가 수수료는 어떻게 계산되나요?',
      createdAt: '2024-06-19T13:20:00Z',
      author: { id: '5', name: '박선택', email: '', role: 'backer' },
      replies: []
    },
    {
      id: '4',
      content: '스트레치 골 달성 축하드려요! 무선 충전 패드까지 받을 수 있을 것 같아서 더욱 기대됩니다 🎉',
      createdAt: '2024-06-18T20:30:00Z',
      author: { id: '6', name: '유기대', email: '', role: 'backer' },
      replies: []
    }
  ]

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim()) {
      console.log('새 댓글:', newComment)
      setNewComment('')
    }
  }

  const handleSubmitReply = (e: React.FormEvent, commentId: string) => {
    e.preventDefault()
    if (replyText.trim()) {
      console.log('답글:', replyText, '댓글 ID:', commentId)
      setReplyText('')
      setReplyTo(null)
    }
  }

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-12' : ''}`}>
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className={`${isReply ? 'w-8 h-8' : 'w-10 h-10'} bg-gray-300 rounded-full flex items-center justify-center text-white font-medium ${
          comment.author.role === 'creator' ? 'bg-crowdfunding-primary' : 
          comment.author.role === 'partner' ? 'bg-yellow-500' : 'bg-gray-400'
        }`}>
          {comment.author.name.charAt(0)}
        </div>
        
        <div className="flex-1">
          {/* Author and timestamp */}
          <div className="flex items-center space-x-2 mb-1">
            <span className={`font-medium ${isReply ? 'text-sm' : ''}`}>
              {comment.author.name}
            </span>
            {comment.author.role === 'creator' && (
              <span className="inline-block px-2 py-1 text-xs font-medium text-white bg-crowdfunding-primary rounded">
                창작자
              </span>
            )}
            {comment.author.role === 'partner' && (
              <span className="inline-block px-2 py-1 text-xs font-medium text-white bg-yellow-500 rounded">
                파트너
              </span>
            )}
            <span className={`text-gray-500 ${isReply ? 'text-xs' : 'text-sm'}`}>
              {formatDistanceToNow(new Date(comment.createdAt), { 
                addSuffix: true, 
                locale: ko 
              })}
            </span>
          </div>
          
          {/* Content */}
          <p className={`text-gray-700 mb-2 leading-relaxed ${isReply ? 'text-sm' : ''}`}>
            {comment.content}
          </p>
          
          {/* Reply button */}
          {!isReply && (
            <button
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              className="text-sm text-gray-500 hover:text-crowdfunding-primary"
            >
              답글
            </button>
          )}
          
          {/* Reply form */}
          {replyTo === comment.id && (
            <form onSubmit={(e) => handleSubmitReply(e, comment.id)} className="mt-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="답글을 입력하세요..."
                className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
                rows={3}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 text-sm bg-crowdfunding-primary text-white rounded hover:bg-crowdfunding-primary/90"
                >
                  답글 작성
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  )

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        댓글 {mockComments.length + mockComments.reduce((sum, comment) => sum + (comment.replies?.length || 0), 0)}개
      </h2>
      
      {/* Comment form */}
      <form onSubmit={handleSubmitComment} className="mb-8">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="프로젝트에 대한 의견이나 질문을 남겨주세요..."
          className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
          rows={4}
        />
        <div className="flex justify-end mt-3">
          <button
            type="submit"
            className="px-6 py-2 bg-crowdfunding-primary text-white rounded-lg font-medium hover:bg-crowdfunding-primary/90 transition-colors"
          >
            댓글 작성
          </button>
        </div>
      </form>
      
      {/* Comments list */}
      <div className="space-y-6">
        {mockComments.map((comment) => renderComment(comment))}
      </div>

      {mockComments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          첫 번째 댓글을 남겨보세요!
        </div>
      )}
    </div>
  )
}

export default ProjectComments