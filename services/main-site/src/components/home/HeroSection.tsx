import React from 'react';
import { Link } from 'react-router-dom';

const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-blue-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-gray-900">
              건강한 브랜드,<br />
              <span className="text-blue-600">지금 시작하세요</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              당신만의 브랜드를 만들고, 건강한 제품을 판매하세요.<br />
              전문가와 함께하는 성공적인 비즈니스의 시작.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Link
                to="/register"
                className="inline-flex items-center px-8 py-4 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
              >
                브랜드 만들기
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center px-8 py-4 rounded-xl font-semibold bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 transition-all duration-300"
              >
                제품 살펴보기
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-pink-500 rounded-full filter blur-3xl opacity-20"></div>
              <img
                src="/images/hero-product.png"
                alt="Product Preview"
                className="relative rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 