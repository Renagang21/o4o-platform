/**
 * ContentItemRenderer Component
 *
 * ContentBundle의 개별 항목을 렌더링하는 컴포넌트
 * - 텍스트/HTML 콘텐츠
 * - 이미지/비디오
 * - Quiz/Survey 임베드
 */

import { useState } from 'react';
import type { Quiz, Survey } from '@/lib/api/contentBundleApi';
import { QuizRunner } from './QuizRunner';
import { SurveyRunner } from './SurveyRunner';

// Content item types
export type ContentItemType =
  | 'text'
  | 'html'
  | 'image'
  | 'video'
  | 'quiz'
  | 'survey'
  | 'file'
  | 'embed';

export interface ContentItem {
  id: string;
  type: ContentItemType;
  order: number;
  title?: string;
  description?: string;
  content?: string; // For text/html
  url?: string; // For image/video/file/embed
  quiz?: Quiz; // For quiz type
  survey?: Survey; // For survey type
  metadata?: Record<string, any>;
}

interface ContentItemRendererProps {
  item: ContentItem;
  bundleId?: string;
  onQuizComplete?: (attempt: any) => void;
  onSurveyComplete?: (response: any) => void;
  onClick?: (elementId: string) => void;
}

export function ContentItemRenderer({
  item,
  bundleId,
  onQuizComplete,
  onSurveyComplete,
  onClick,
}: ContentItemRendererProps) {
  const [showQuiz, setShowQuiz] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);

  const handleClick = () => {
    onClick?.(item.id);
  };

  // Text content
  if (item.type === 'text') {
    return (
      <div className="prose prose-lg max-w-none" onClick={handleClick}>
        {item.title && (
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
        )}
        <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
      </div>
    );
  }

  // HTML content
  if (item.type === 'html') {
    return (
      <div className="prose prose-lg max-w-none" onClick={handleClick}>
        {item.title && (
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
        )}
        <div
          className="content-html"
          dangerouslySetInnerHTML={{ __html: item.content || '' }}
        />
      </div>
    );
  }

  // Image content
  if (item.type === 'image') {
    return (
      <div className="content-image" onClick={handleClick}>
        {item.title && (
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
        )}
        <figure>
          <img
            src={item.url}
            alt={item.title || 'Content image'}
            className="w-full rounded-lg shadow-md"
          />
          {item.description && (
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              {item.description}
            </figcaption>
          )}
        </figure>
      </div>
    );
  }

  // Video content
  if (item.type === 'video') {
    return (
      <div className="content-video" onClick={handleClick}>
        {item.title && (
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
        )}
        <div className="aspect-video rounded-lg overflow-hidden shadow-md">
          {item.url?.includes('youtube.com') || item.url?.includes('youtu.be') ? (
            <iframe
              src={getYouTubeEmbedUrl(item.url)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : item.url?.includes('vimeo.com') ? (
            <iframe
              src={getVimeoEmbedUrl(item.url)}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={item.url}
              controls
              className="w-full h-full"
              poster={item.metadata?.thumbnail}
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>
        {item.description && (
          <p className="mt-2 text-sm text-gray-500">{item.description}</p>
        )}
      </div>
    );
  }

  // Quiz content
  if (item.type === 'quiz' && item.quiz) {
    if (showQuiz) {
      return (
        <div className="content-quiz">
          <QuizRunner
            quiz={item.quiz}
            bundleId={bundleId}
            onComplete={(attempt) => {
              setQuizCompleted(true);
              setShowQuiz(false);
              onQuizComplete?.(attempt);
            }}
            onClose={() => setShowQuiz(false)}
          />
        </div>
      );
    }

    return (
      <div
        className="content-quiz bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100"
        onClick={handleClick}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">📝</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {item.quiz.title}
            </h3>
            {item.quiz.description && (
              <p className="text-gray-600 text-sm mb-3">{item.quiz.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span>{item.quiz.questions.length}문항</span>
              <span>합격 {item.quiz.passingScore}점</span>
              {item.quiz.timeLimit && <span>{item.quiz.timeLimit}분 제한</span>}
            </div>
            {quizCompleted ? (
              <div className="flex items-center gap-2 text-green-600">
                <span>✓</span>
                <span className="font-medium">완료됨</span>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuiz(true);
                }}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                퀴즈 시작
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Survey content
  if (item.type === 'survey' && item.survey) {
    if (showSurvey) {
      return (
        <div className="content-survey">
          <SurveyRunner
            survey={item.survey}
            bundleId={bundleId}
            onComplete={(response) => {
              setSurveyCompleted(true);
              setShowSurvey(false);
              onSurveyComplete?.(response);
            }}
            onClose={() => setShowSurvey(false)}
          />
        </div>
      );
    }

    return (
      <div
        className="content-survey bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-100"
        onClick={handleClick}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {item.survey.title}
            </h3>
            {item.survey.description && (
              <p className="text-gray-600 text-sm mb-3">{item.survey.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span>{item.survey.questions?.length || 0}문항</span>
              {item.survey.allowAnonymous && <span>익명 가능</span>}
            </div>
            {surveyCompleted ? (
              <div className="flex items-center gap-2 text-green-600">
                <span>✓</span>
                <span className="font-medium">완료됨</span>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSurvey(true);
                }}
                className="bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                설문 시작
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // File download
  if (item.type === 'file') {
    return (
      <div
        className="content-file bg-gray-50 rounded-lg p-4 border border-gray-200"
        onClick={handleClick}
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-xl">📎</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {item.title || 'File Download'}
            </h4>
            {item.description && (
              <p className="text-sm text-gray-500 truncate">{item.description}</p>
            )}
          </div>
          <a
            href={item.url}
            download
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            다운로드
          </a>
        </div>
      </div>
    );
  }

  // Embed content (iframe)
  if (item.type === 'embed') {
    return (
      <div className="content-embed" onClick={handleClick}>
        {item.title && (
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
        )}
        <div className="aspect-video rounded-lg overflow-hidden shadow-md">
          <iframe
            src={item.url}
            className="w-full h-full"
            allowFullScreen
          />
        </div>
        {item.description && (
          <p className="mt-2 text-sm text-gray-500">{item.description}</p>
        )}
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <div className="content-unknown bg-yellow-50 rounded-lg p-4 border border-yellow-200">
      <p className="text-yellow-700">
        지원되지 않는 콘텐츠 유형입니다: {item.type}
      </p>
    </div>
  );
}

// Helper functions
function getYouTubeEmbedUrl(url: string): string {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
}

function getVimeoEmbedUrl(url: string): string {
  const regex = /vimeo\.com\/(?:.*\/)?(\d+)/;
  const match = url.match(regex);
  if (match) {
    return `https://player.vimeo.com/video/${match[1]}`;
  }
  return url;
}

export default ContentItemRenderer;
