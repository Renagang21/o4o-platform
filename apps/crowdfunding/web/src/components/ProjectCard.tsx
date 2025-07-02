import { Link } from 'react-router-dom'
import { Project } from '../types'
import { differenceInDays } from 'date-fns'

interface ProjectCardProps {
  project: Project
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  const progressPercentage = Math.min((project.currentAmount / project.targetAmount) * 100, 100)
  const daysLeft = differenceInDays(new Date(project.endDate), new Date())
  
  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'preparing': return 'bg-funding-preparing'
      case 'active': return 'bg-funding-active'
      case 'success': return 'bg-funding-success'
      case 'failed': return 'bg-funding-failed'
      case 'delivered': return 'bg-funding-delivered'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'preparing': return '준비 중'
      case 'active': return '진행 중'
      case 'success': return '성공'
      case 'failed': return '실패'
      case 'delivered': return '배송 완료'
      default: return ''
    }
  }

  return (
    <Link 
      to={`/projects/${project.id}`} 
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden group"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={project.mainImage}
          alt={project.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-4 left-4">
          <span className={`inline-block px-2 py-1 text-xs font-semibold text-white rounded ${getStatusColor(project.status)}`}>
            {getStatusText(project.status)}
          </span>
        </div>
        {project.transparencyScore >= 90 && (
          <div className="absolute top-4 right-4">
            <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-green-600 rounded">
              투명도 {project.transparencyScore}%
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category & Creator */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {project.category}
          </span>
          <span className="text-xs text-gray-500">
            by {project.creator.name}
          </span>
        </div>

        {/* Title & Subtitle */}
        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
          {project.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {project.subtitle}
        </p>

        {/* Partner Endorsements */}
        {project.partnerEndorsements.length > 0 && (
          <div className="mb-3 flex items-center space-x-1">
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs text-amber-600 font-medium">
              {project.partnerEndorsements.length}명의 파트너 추천
            </span>
          </div>
        )}

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between items-end mb-1">
            <div>
              <span className="text-2xl font-bold text-crowdfunding-primary">
                {progressPercentage.toFixed(0)}%
              </span>
              <span className="text-xs text-gray-500 ml-1">달성</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-gray-900">
                {project.backerCount}명
              </span>
              <span className="text-xs text-gray-500 ml-1">후원</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-crowdfunding-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            ₩{project.currentAmount.toLocaleString()}
          </span>
          {project.status === 'active' && daysLeft > 0 ? (
            <span className="text-sm font-medium text-gray-900">
              {daysLeft}일 남음
            </span>
          ) : project.status === 'active' ? (
            <span className="text-sm font-medium text-red-600">
              오늘 마감
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

export default ProjectCard