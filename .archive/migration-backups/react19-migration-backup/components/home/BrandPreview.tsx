import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Card from '../common/Card';
// import Button from '../common/Button';

const BrandPreview: React.FC = () => {
  const products = [
    {
      image: '/images/product-1.png',
      name: '비타민 C',
      brand: 'HealthPlus'
    },
    {
      image: '/images/product-2.png',
      name: '오메가3',
      brand: 'WellnessPro'
    },
    {
      image: '/images/product-3.png',
      name: '프로바이오틱스',
      brand: 'NatureLife'
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
            브랜드 미리보기
          </h2>
          <p className="text-xl text-gray-600">
            당신만의 브랜드로 제품을 커스터마이징하세요
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {products.map((product, index) => (
            <Card
              key={index}
              variant="elevated"
              className="group overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <div className="aspect-w-1 aspect-h-1">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {product.name}
                </h3>
                <p className="text-gray-600">{product.brand}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <a
            href="/customizer"
            className="inline-flex items-center bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
          >
            커스터마이저 체험하기
            <span className="ml-2"><ArrowRight className="w-5 h-5" /></span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default BrandPreview; 