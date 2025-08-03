import { Link } from 'react-router-dom';
import { TrendingUp, Clock, Award } from 'lucide-react';
import { ProjectCard } from '@/components/project/ProjectCard';
import { useFundingProjects } from '@/hooks/useProjects';

export function HomePage() {
  const { data: trendingProjects, isLoading: loadingTrending } = useFundingProjects({
    sortBy: 'popular',
    limit: 4
  });

  const { data: endingSoon, isLoading: loadingEnding } = useFundingProjects({
    sortBy: 'ending_soon',
    status: 'ongoing',
    limit: 4
  });

  const { data: staffPicks, isLoading: loadingPicks } = useFundingProjects({
    isStaffPick: true,
    limit: 4
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-text-main mb-6">
              아이디어를 현실로 만드는 크라우드펀딩
            </h1>
            <p className="text-xl text-text-secondary mb-8">
              창의적인 프로젝트를 후원하고, 특별한 리워드를 받아보세요
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/projects"
                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                프로젝트 둘러보기
              </Link>
              <Link
                to="/create"
                className="px-6 py-3 bg-white text-primary border-2 border-primary rounded-lg font-medium hover:bg-primary/5 transition-colors"
              >
                프로젝트 만들기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Projects */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-text-main">인기 프로젝트</h2>
            </div>
            <Link
              to="/projects?sort=popular"
              className="text-primary hover:text-primary/80 font-medium"
            >
              더보기 →
            </Link>
          </div>

          {loadingTrending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-80 bg-surface animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {trendingProjects?.projects.map((project: any) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Ending Soon */}
      <section className="py-16 bg-surface">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-secondary" />
              <h2 className="text-2xl font-bold text-text-main">마감 임박</h2>
            </div>
            <Link
              to="/projects?sort=ending_soon"
              className="text-primary hover:text-primary/80 font-medium"
            >
              더보기 →
            </Link>
          </div>

          {loadingEnding ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-80 bg-white animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {endingSoon?.projects.map((project: any) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Staff Picks */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-accent" />
              <h2 className="text-2xl font-bold text-text-main">에디터 추천</h2>
            </div>
            <Link
              to="/projects?filter=staff_pick"
              className="text-primary hover:text-primary/80 font-medium"
            >
              더보기 →
            </Link>
          </div>

          {loadingPicks ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-80 bg-surface animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {staffPicks?.projects.map((project: any) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-secondary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            당신의 아이디어가 세상을 바꿉니다
          </h2>
          <p className="text-white/90 text-lg mb-8">
            지금 바로 프로젝트를 시작하고 서포터들을 만나보세요
          </p>
          <Link
            to="/create"
            className="inline-block px-8 py-4 bg-white text-primary rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            프로젝트 시작하기
          </Link>
        </div>
      </section>
    </div>
  );
}