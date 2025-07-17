
import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
  CheckCircle, 
  Clock, 
  Eye, 
  BookmarkPlus,
  MessageSquare,
  Award
} from 'lucide-react';
import DOMPurify from 'dompurify';

interface Answer {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    isExpert: boolean;
    specialization?: string;
    reputation: number;
  };
  upvotes: number;
  downvotes: number;
  isAccepted: boolean;
  isVerified: boolean;
  createdAt: string;
  replies: Reply[];
}

interface Reply {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    isExpert: boolean;
  };
  createdAt: string;
}

interface Question {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  category: string;
  tags: string[];
  views: number;
  answers: Answer[];
  isResolved: boolean;
  bounty?: number;
  createdAt: string;
  updatedAt: string;
}

const CommunityQA: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answerContent, setAnswerContent] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'unanswered'>('recent');
  const [showAnswerForm, setShowAnswerForm] = useState(false);

  useEffect(() => {
    // 샘플 데이터 - 실제로는 API에서 가져올 예정
    const sampleQuestions: Question[] = [
      {
        id: '1',
        title: '프로바이오틱스 언제 먹는게 좋나요?',
        content: `최근에 소화가 잘 안되서 프로바이오틱스를 사려고 하는데, 
        언제 먹는게 가장 효과적인지 궁금합니다. 
        
        식전에 먹어야 하는지, 식후에 먹어야 하는지, 아니면 공복에 먹어야 하는지 
        전문가분의 의견을 듣고 싶습니다.`,
        author: {
          id: 'user1',
          name: '건강러버',
          avatar: '/avatars/user1.jpg'
        },
        category: 'nutrition',
        tags: ['프로바이오틱스', '복용법', '소화건강'],
        views: 147,
        isResolved: true,
        createdAt: '2024-06-14T10:30:00Z',
        updatedAt: '2024-06-14T14:20:00Z',
        answers: [
          {
            id: 'a1',
            content: `프로바이오틱스는 **식후 30분**에 복용하는 것이 가장 효과적입니다.

그 이유는 다음과 같습니다:

1. **위산 중화**: 식사 후에는 위산이 어느 정도 중화되어 프로바이오틱스 균이 위산에 의해 파괴될 확률이 줄어듭니다.

2. **장내 환경**: 음식물과 함께 이동하면서 장까지 안전하게 도달할 가능성이 높아집니다.

3. **흡수율 향상**: 식사와 함께 복용하면 장내 정착률이 더 높아집니다.

**추가 권장사항:**
- 하루 1-2회, 규칙적인 시간에 복용
- 찬물과 함께 복용 (뜨거운 물은 균을 죽일 수 있음)
- 항생제 복용 중이라면 최소 2시간 간격으로 복용`,
            author: {
              id: 'expert1',
              name: '박○○ 약사',
              avatar: '/avatars/expert1.jpg',
              isExpert: true,
              specialization: '임상약학',
              reputation: 4850
            },
            upvotes: 89,
            downvotes: 3,
            isAccepted: true,
            isVerified: true,
            createdAt: '2024-06-14T11:15:00Z',
            replies: [
              {
                id: 'r1',
                content: '정말 유용한 답변이네요! 그런데 유산균 종류별로도 복용법이 다른가요?',
                author: {
                  id: 'user2',
                  name: '관심러',
                  avatar: '/avatars/user2.jpg',
                  isExpert: false
                },
                createdAt: '2024-06-14T12:30:00Z'
              }
            ]
          },
          {
            id: 'a2',
            content: `저는 개인적으로 아침 공복에 먹고 있어요. 
            
공복일 때가 장까지 빠르게 도달할 수 있어서 좋다고 들었거든요. 
실제로 소화도 많이 좋아졌고, 변비도 해결됐습니다.

다만 개인차가 있을 수 있으니 본인에게 맞는 시간을 찾아보시는 것도 좋을 것 같아요.`,
            author: {
              id: 'user3',
              name: '영양덕후',
              avatar: '/avatars/user3.jpg',
              isExpert: false,
              specialization: undefined,
              reputation: 156
            },
            upvotes: 23,
            downvotes: 5,
            isAccepted: false,
            isVerified: false,
            createdAt: '2024-06-14T13:45:00Z',
            replies: []
          }
        ]
      }
    ];

    setQuestions(sampleQuestions);
    setSelectedQuestion(sampleQuestions[0]);
  }, []);

  const handleUpvote = (answerId: string) => {
    if (!selectedQuestion) return;
    
    const updatedAnswers = selectedQuestion.answers.map(answer => 
      answer.id === answerId 
        ? { ...answer, upvotes: answer.upvotes + 1 }
        : answer
    );
    
    setSelectedQuestion({
      ...selectedQuestion,
      answers: updatedAnswers
    });
  };

  const handleAcceptAnswer = (answerId: string) => {
    if (!selectedQuestion) return;
    
    const updatedAnswers = selectedQuestion.answers.map(answer => ({
      ...answer,
      isAccepted: answer.id === answerId
    }));
    
    setSelectedQuestion({
      ...selectedQuestion,
      answers: updatedAnswers,
      isResolved: true
    });
  };

  const submitAnswer = () => {
    if (!answerContent.trim() || !selectedQuestion) return;

    const newAnswer: Answer = {
      id: `a${Date.now()}`,
      content: answerContent,
      author: {
        id: 'current-user',
        name: '나',
        avatar: '/avatars/current-user.jpg',
        isExpert: false,
        reputation: 0
      },
      upvotes: 0,
      downvotes: 0,
      isAccepted: false,
      isVerified: false,
      createdAt: new Date().toISOString(),
      replies: []
    };

    setSelectedQuestion({
      ...selectedQuestion,
      answers: [...selectedQuestion.answers, newAnswer]
    });

    setAnswerContent('');
    setShowAnswerForm(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}일 전`;
    return date.toLocaleDateString();
  };

  const ExpertBadge: React.FC<{ author: Answer['author'] }> = ({ author }) => {
    if (!author.isExpert) return null;
    
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
          <Award className="w-3 h-3" />
          <span>전문가</span>
        </div>
        {author.specialization && (
          <span className="text-xs text-gray-500">{author.specialization}</span>
        )}
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Star className="w-3 h-3 fill-current text-yellow-400" />
          <span>{author.reputation.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 질문 목록 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">최근 질문</h2>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                  질문하기
                </button>
              </div>
              
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular' | 'unanswered')}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="recent">최신순</option>
                <option value="popular">인기순</option>
                <option value="unanswered">미답변</option>
              </select>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {questions.map(question => (
                <div 
                  key={question.id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedQuestion?.id === question.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => setSelectedQuestion(question)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm line-clamp-2">{question.title}</h3>
                    {question.isResolved && (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-500 space-x-3">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>{question.views}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-3 h-3" />
                      <span>{question.answers.length}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(question.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 질문 상세 및 답변 */}
        <div className="lg:col-span-2">
          {selectedQuestion ? (
            <div className="space-y-6">
              {/* 질문 상세 */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedQuestion.title}
                    </h1>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedQuestion.tags.map(tag => (
                        <span key={tag} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <BookmarkPlus className="w-5 h-5" />
                    </button>
                    {selectedQuestion.isResolved && (
                      <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-3 py-1 rounded-full">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">해결됨</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="prose max-w-none mb-4">
                  <p className="whitespace-pre-line text-gray-700">
                    {selectedQuestion.content}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <img 
                      src={selectedQuestion.author.avatar} 
                      alt={selectedQuestion.author.name}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        e.currentTarget.src = '/api/placeholder/24/24';
                      }}
                    />
                    <span>{selectedQuestion.author.name}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(selectedQuestion.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{selectedQuestion.views} 조회</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{selectedQuestion.answers.length} 답변</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 답변 목록 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {selectedQuestion.answers.length}개의 답변
                  </h2>
                  <button 
                    onClick={() => setShowAnswerForm(!showAnswerForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    답변 작성
                  </button>
                </div>

                {selectedQuestion.answers
                  .sort((a, b) => {
                    if (a.isAccepted && !b.isAccepted) return -1;
                    if (!a.isAccepted && b.isAccepted) return 1;
                    return b.upvotes - a.upvotes;
                  })
                  .map(answer => (
                  <div key={answer.id} className="bg-white rounded-lg shadow-sm border p-6">
                    {/* 답변 헤더 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={answer.author.avatar} 
                          alt={answer.author.name}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => {
                            e.currentTarget.src = '/api/placeholder/40/40';
                          }}
                        />
                        <div>
                          <div className="font-medium text-gray-900">
                            {answer.author.name}
                          </div>
                          <ExpertBadge author={answer.author} />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {answer.isVerified && (
                          <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                            <CheckCircle className="w-3 h-3" />
                            <span>검증됨</span>
                          </div>
                        )}
                        {answer.isAccepted && (
                          <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs">
                            <Star className="w-3 h-3 fill-current" />
                            <span>채택됨</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 답변 내용 */}
                    <div className="prose max-w-none mb-4">
                      <div 
                        className="whitespace-pre-line text-gray-700"
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(answer.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')) 
                        }}
                      />
                    </div>

                    {/* 답변 액션 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={() => handleUpvote(answer.id)}
                            className="flex items-center space-x-1 p-2 hover:bg-gray-100 rounded"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-sm">{answer.upvotes}</span>
                          </button>
                          <button className="flex items-center space-x-1 p-2 hover:bg-gray-100 rounded">
                            <ThumbsDown className="w-4 h-4" />
                            <span className="text-sm">{answer.downvotes}</span>
                          </button>
                        </div>
                        
                        <button className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700">
                          <MessageSquare className="w-4 h-4" />
                          <span>답글 {answer.replies.length}</span>
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          {formatTimeAgo(answer.createdAt)}
                        </span>
                        {!answer.isAccepted && !selectedQuestion.isResolved && (
                          <button 
                            onClick={() => handleAcceptAnswer(answer.id)}
                            className="text-sm text-green-600 hover:text-green-700 font-medium"
                          >
                            채택하기
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 답글 */}
                    {answer.replies.length > 0 && (
                      <div className="mt-4 pl-6 border-l-2 border-gray-200">
                        {answer.replies.map(reply => (
                          <div key={reply.id} className="py-3 border-b border-gray-100 last:border-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <img 
                                src={reply.author.avatar} 
                                alt={reply.author.name}
                                className="w-6 h-6 rounded-full"
                                onError={(e) => {
                                  e.currentTarget.src = '/api/placeholder/24/24';
                                }}
                              />
                              <span className="font-medium text-sm">{reply.author.name}</span>
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 답변 작성 폼 */}
              {showAnswerForm && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold mb-4">답변 작성</h3>
                  <textarea
                    value={answerContent}
                    onChange={(e) => setAnswerContent(e.target.value)}
                    placeholder="도움이 될 만한 답변을 작성해주세요..."
                    className="w-full h-32 p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex justify-end space-x-2 mt-4">
                    <button 
                      onClick={() => setShowAnswerForm(false)}
                      className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      취소
                    </button>
                    <button 
                      onClick={submitAnswer}
                      disabled={!answerContent.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      답변 등록
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">질문을 선택해주세요</h3>
              <p className="text-gray-600">왼쪽에서 궁금한 질문을 클릭하면 상세 내용을 볼 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityQA;