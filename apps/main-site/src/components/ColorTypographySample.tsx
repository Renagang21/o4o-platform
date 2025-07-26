import React from 'react';

const ColorTypographySample: FC = () => {
  return (
    <div className="p-8 space-y-8">
      {/* 타이포그래피 섹션 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-main">타이포그래피</h2>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-text-main">제목 (text-2xl, font-semibold)</h1>
          <p className="text-base leading-relaxed text-text-main">
            본문 텍스트 (text-base, leading-relaxed) - 기본적인 내용을 표시하는 데 사용됩니다.
            Pretendard 폰트를 사용하여 가독성을 높였습니다.
          </p>
          <p className="text-sm text-text-secondary">
            보조 설명 텍스트 (text-sm, text-text-secondary) - 부가적인 정보나 설명을 제공할 때 사용됩니다.
          </p>
          <button className="text-sm font-medium tracking-wide text-primary">
            버튼 텍스트 (text-sm, font-medium, tracking-wide)
          </button>
        </div>
      </section>

      {/* 컬러 섹션 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-main">컬러 팔레트</h2>
        
        {/* Primary Colors */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text-main">Primary Colors</h3>
          <div className="flex space-x-4">
            <div className="w-24 h-24 bg-primary rounded-lg flex items-center justify-center text-white">
              Primary
            </div>
            <div className="w-24 h-24 bg-primary-light rounded-lg flex items-center justify-center text-primary">
              Light
            </div>
            <div className="w-24 h-24 bg-primary-dark rounded-lg flex items-center justify-center text-white">
              Dark
            </div>
          </div>
        </div>

        {/* Secondary Colors */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text-main">Secondary Colors</h3>
          <div className="flex space-x-4">
            <div className="w-24 h-24 bg-secondary rounded-lg flex items-center justify-center text-primary">
              Secondary
            </div>
            <div className="w-24 h-24 bg-secondary-dark rounded-lg flex items-center justify-center text-primary">
              Dark
            </div>
          </div>
        </div>

        {/* Success Colors */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text-main">Success Colors</h3>
          <div className="flex space-x-4">
            <div className="w-24 h-24 bg-success rounded-lg flex items-center justify-center text-white">
              Success
            </div>
            <div className="w-24 h-24 bg-success-light rounded-lg flex items-center justify-center text-success">
              Light
            </div>
            <div className="w-24 h-24 bg-success-dark rounded-lg flex items-center justify-center text-white">
              Dark
            </div>
          </div>
        </div>

        {/* Danger Colors */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text-main">Danger Colors</h3>
          <div className="flex space-x-4">
            <div className="w-24 h-24 bg-danger rounded-lg flex items-center justify-center text-white">
              Danger
            </div>
            <div className="w-24 h-24 bg-danger-light rounded-lg flex items-center justify-center text-danger">
              Light
            </div>
            <div className="w-24 h-24 bg-danger-dark rounded-lg flex items-center justify-center text-white">
              Dark
            </div>
          </div>
        </div>

        {/* Text Colors */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text-main">Text Colors</h3>
          <div className="space-y-2">
            <p className="text-text-main">Main Text Color</p>
            <p className="text-text-secondary">Secondary Text Color</p>
            <p className="text-text-disabled">Disabled Text Color</p>
          </div>
        </div>
      </section>

      {/* 버튼 샘플 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-main">버튼 스타일</h2>
        <div className="flex flex-wrap gap-4">
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
            Primary Button
          </button>
          <button className="px-4 py-2 text-sm font-medium text-primary bg-primary-light rounded-lg hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
            Secondary Button
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-success rounded-lg hover:bg-success-dark focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2">
            Success Button
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg hover:bg-danger-dark focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2">
            Danger Button
          </button>
          <button className="px-4 py-2 text-sm font-medium text-text-disabled bg-gray-100 rounded-lg cursor-not-allowed">
            Disabled Button
          </button>
        </div>
      </section>
    </div>
  );
};

export default ColorTypographySample; 