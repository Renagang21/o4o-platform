import React from 'react';
import { UserPlus, ShoppingBag, TrendingUp } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';

const StepGuide: React.FC = () => {
  const steps = [
    {
      icon: UserPlus,
      title: '회원가입',
      description: '간단한 회원가입으로 시작하세요. 전문가의 도움을 받을 수 있습니다.'
    },
    {
      icon: ShoppingBag,
      title: '상품 선택',
      description: '다양한 건강 제품 중에서 당신의 브랜드에 맞는 제품을 선택하세요.'
    },
    {
      icon: TrendingUp,
      title: '판매 시작',
      description: '브랜드 스토어를 오픈하고 제품 판매를 시작하세요.'
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
            시작하기 쉬운 3단계
          </h2>
          <p className="text-xl text-gray-600">
            누구나 쉽게 시작할 수 있는 브랜드 만들기
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card
              key={index}
              variant="elevated"
              className="relative p-8 hover:shadow-xl transition-all duration-300"
            >
              <Badge
                variant="primary"
                size="sm"
                className="absolute -top-4 left-8"
              >
                {index + 1}
              </Badge>
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <step.icon className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StepGuide; 