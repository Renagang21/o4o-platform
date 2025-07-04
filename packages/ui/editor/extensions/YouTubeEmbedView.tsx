import { NodeViewProps } from '@tiptap/react'

/**
 * YouTube URL에서 비디오 ID를 추출하는 함수
 */
const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

/**
 * YouTube 임베드 뷰 컴포넌트
 * - 반응형 iframe 컨테이너
 * - 16:9 비율 유지
 * - 모바일 대응
 */
export const YouTubeEmbedView = ({ node }: NodeViewProps) => {
  const videoId = getYouTubeId(node.attrs.url)
  const width = node.attrs.width || 560
  const height = node.attrs.height || 315

  if (!videoId) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        유효하지 않은 YouTube URL입니다.
      </div>
    )
  }

  return (
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
} 