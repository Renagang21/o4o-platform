import { Link } from 'react-router-dom';

// ============================================================================
// Section Components
// ============================================================================

/** Section 1: Hero */
function HeroSection() {
  return (
    <section className="text-center py-16 px-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        약사가 혈당을 설명할 수 있게
      </h1>
      <p className="text-xl text-gray-600 mb-2">
        숫자가 아닌 패턴과 변화로 이해합니다
      </p>
      <p className="text-base text-gray-500">
        Raw 데이터 없이도 충분한, 약사를 위한 혈당 요약 서비스
      </p>
    </section>
  );
}

/** Section 2: 이 서비스가 해결하는 문제 */
function ProblemSection() {
  const problems = [
    {
      problem: 'CGM 데이터가 너무 많아서 어디서부터 봐야 할지 모른다',
      solution: '우선순위가 높은 환자부터 보여드립니다',
    },
    {
      problem: '숫자와 그래프만으로는 환자에게 설명하기 어렵다',
      solution: '말로 설명할 수 있는 문장으로 요약합니다',
    },
    {
      problem: '이전과 비교해서 나아졌는지 알기 어렵다',
      solution: '기간별 변화를 한눈에 보여드립니다',
    },
  ];

  return (
    <section className="py-12 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          이런 고민을 해결합니다
        </h2>
        <div className="space-y-6">
          {problems.map((item, index) => (
            <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
              <p className="text-gray-600 mb-3">
                <span className="text-gray-400 mr-2">기존:</span>
                {item.problem}
              </p>
              <p className="text-gray-900 font-medium">
                <span className="text-blue-600 mr-2">→</span>
                {item.solution}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Section 3: 사용 흐름 요약 */
function FlowSection() {
  const steps = [
    {
      step: '1',
      title: '환자 상태를 한눈에',
      description: '누가 먼저 관심이 필요한지 바로 파악합니다',
    },
    {
      step: '2',
      title: '패턴과 변화를 요약으로',
      description: '복잡한 데이터 대신 의미 있는 요약을 봅니다',
    },
    {
      step: '3',
      title: '환자에게 설명 시작',
      description: '화면을 보며 바로 상담을 진행할 수 있습니다',
    },
  ];

  return (
    <section className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          이렇게 사용합니다
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {item.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Section 4: 서비스 범위 명확화 */
function ScopeSection() {
  const notIncluded = [
    'Raw CGM 데이터를 저장하지 않습니다',
    '환자가 직접 사용하는 서비스가 아닙니다',
    '의료적 판단을 대체하지 않습니다',
  ];

  return (
    <section className="py-12 px-4 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
          GlucoseView는
        </h2>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <p className="text-gray-700 text-center mb-6">
            약사의 상담을 돕는 <strong>요약 도구</strong>입니다.
          </p>
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 text-center mb-4">
              명확한 서비스 범위
            </p>
            <ul className="space-y-2">
              {notIncluded.map((item, index) => (
                <li key={index} className="flex items-center text-gray-600 text-sm">
                  <span className="text-gray-400 mr-3">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Section 5: CTA */
function CTASection() {
  return (
    <section className="py-16 px-4 text-center">
      <p className="text-gray-600 mb-6">
        환자 목록을 확인하고 서비스를 둘러보세요
      </p>
      <Link
        to="/patients"
        className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        환자 목록 보기
      </Link>
    </section>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function HomePage() {
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6">
      {/* Section 1: Hero */}
      <HeroSection />

      {/* Section 2: 문제 해결 */}
      <ProblemSection />

      {/* Section 3: 사용 흐름 */}
      <FlowSection />

      {/* Section 4: 서비스 범위 */}
      <ScopeSection />

      {/* Section 5: CTA */}
      <CTASection />
    </div>
  );
}
