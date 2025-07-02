export { AboutTeam } from './AboutTeam';
export { AboutStory } from './AboutStory';
export { AboutStats } from './AboutStats';
export { AboutMission } from './AboutMission';

// About pattern metadata for the block editor
export const aboutPatterns = [
  {
    id: 'about-team',
    name: 'Team Grid',
    description: '팀원 소개 그리드 레이아웃',
    component: 'AboutTeam',
    category: 'about',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: '우리 팀',
      description: '열정적이고 전문적인 팀원들을 소개합니다.',
      teamMembers: [
        {
          id: '1',
          name: '김철수',
          role: 'CEO',
          description: '10년 경력의 비즈니스 전문가',
          avatar: '/api/placeholder/150/150',
          social: {
            linkedin: '#',
            email: 'ceo@company.com'
          }
        }
      ]
    }
  },
  {
    id: 'about-story',
    name: 'Company Story',
    description: '회사 스토리와 타임라인',
    component: 'AboutStory',
    category: 'about',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: '우리의 이야기',
      description: '작은 아이디어에서 시작되어 오늘날의 성공까지',
      layout: 'mixed'
    }
  },
  {
    id: 'about-stats',
    name: 'Statistics',
    description: '숫자로 보는 성과 통계',
    component: 'AboutStats',
    category: 'about',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: '숫자로 보는 성과',
      animateOnView: true,
      layout: 'grid'
    }
  },
  {
    id: 'about-mission',
    name: 'Mission & Vision',
    description: '사명과 비전 소개',
    component: 'AboutMission',
    category: 'about',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: '우리의 사명과 비전',
      layout: 'cards'
    }
  }
];