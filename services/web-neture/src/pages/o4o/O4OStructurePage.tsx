/**
 * O4OStructurePage — O4O 유통 및 실행 구조
 *
 * WO-O4O-STRUCTURE-PAGE-V1
 *
 * 역할 분담:
 *   /o4o            = 무엇인가 (What)
 *   /o4o/intro      = 구성 (How)
 *   /o4o/concepts   = 왜 필요한가 (Why)
 *   /o4o/principles = 어떤 기준인가 (Principle)
 *   /o4o/structure  = 실제로 어떻게 흐르는가 (Flow)  ← 이 페이지
 *
 * 섹션 구조 (WO 고정):
 *   1. 헤더
 *   2. 전체 흐름 다이어그램
 *   3. 단계별 흐름 (Step 1~5)
 *   4. 핵심 특징 (4)
 *   5. 정리
 *   6. CTA
 *
 * 금지: 개념 설명 반복(/concepts), 운영 원칙(/principles), 서비스 상세(/o4o),
 *       Target 내용, 장문 텍스트.
 */

import { Link } from 'react-router-dom';
import {
  Truck,
  Store,
  Users,
  CheckCircle,
  RotateCw,
  ArrowRight,
  ArrowDown,
  Minus,
  Megaphone,
  PackageOpen,
  Repeat,
} from 'lucide-react';

export default function O4OStructurePage() {
  return (
    <div className="min-h-screen">
      <HeaderSection />
      <FlowDiagramSection />
      <StepsSection />
      <FeaturesSection />
      <SummarySection />
      <CtaSection />
    </div>
  );
}

// ─── 1. 헤더 ─────────────────────────────────────────────────────────────────

function HeaderSection() {
  return (
    <section className="bg-slate-900 text-white py-24">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
          O4O 유통 및 실행 구조
        </h1>
        <p className="text-lg text-slate-200 leading-relaxed">
          제품과 정보는 하나의 흐름으로 연결되어
          <br className="hidden sm:inline" />
          {' '}매장에서 실행됩니다.
        </p>
      </div>
    </section>
  );
}

// ─── 2. 전체 흐름 다이어그램 ─────────────────────────────────────────────────

function FlowDiagramSection() {
  const nodes = [
    { icon: Truck, name: '공급자' },
    { icon: Store, name: '매장' },
    { icon: Users, name: '고객' },
    { icon: CheckCircle, name: '반응' },
    { icon: RotateCw, name: '재연결' },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-12 text-center">
          전체 흐름
        </h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-2">
          {nodes.map((node, idx) => (
            <div
              key={node.name}
              className="flex flex-col md:flex-row items-center gap-3 md:gap-2 w-full md:w-auto"
            >
              <div className="flex flex-col items-center justify-center w-32 h-32 bg-slate-50 rounded-xl border-2 border-slate-200">
                <node.icon className="w-7 h-7 text-primary-600 mb-2" />
                <p className="font-semibold text-gray-900">{node.name}</p>
              </div>
              {idx < nodes.length - 1 && (
                <>
                  <ArrowRight className="hidden md:block w-5 h-5 text-slate-400 flex-shrink-0" />
                  <ArrowDown className="md:hidden w-5 h-5 text-slate-400 flex-shrink-0" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 3. 단계별 흐름 ──────────────────────────────────────────────────────────

function StepsSection() {
  const steps = [
    {
      no: '01',
      icon: Truck,
      name: '공급자',
      desc: '제품과 정보를 플랫폼에 연결합니다.',
    },
    {
      no: '02',
      icon: Store,
      name: '매장',
      desc: '매장은 공간과 접점을 활용하여 정보를 전달합니다.',
    },
    {
      no: '03',
      icon: Users,
      name: '고객',
      desc: '고객은 매장에서 정보를 이해하고 선택합니다.',
    },
    {
      no: '04',
      icon: CheckCircle,
      name: '실행',
      desc: '구매, 상담, 재방문 등으로 연결됩니다.',
    },
    {
      no: '05',
      icon: RotateCw,
      name: '반복',
      desc: '고객 반응은 다시 구조에 반영됩니다.',
    },
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-12 text-center">
          단계별 흐름
        </h2>
        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.no}
              className="flex items-start gap-5 p-6 bg-white rounded-xl border border-slate-200"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <step.icon className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-xs font-mono text-slate-400">{step.no}</span>
                  <h3 className="text-lg font-semibold text-gray-900">{step.name}</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 4. 핵심 특징 ────────────────────────────────────────────────────────────

function FeaturesSection() {
  const features = [
    { icon: Minus, text: '중간 단계가 줄어든다' },
    { icon: Megaphone, text: '설명이 매장에서 이루어진다' },
    { icon: PackageOpen, text: '재고 없이도 판매가 가능하다' },
    { icon: Repeat, text: '고객 반응이 다시 구조로 연결된다' },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 text-center">
          핵심 특징
        </h2>
        <p className="text-gray-500 text-sm text-center mb-12">
          기존 유통과의 차이
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-4 p-6 bg-slate-50 rounded-xl border border-slate-200"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <f.icon className="w-5 h-5 text-primary-600" />
              </div>
              <p className="font-medium text-gray-900">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 5. 정리 ─────────────────────────────────────────────────────────────────

function SummarySection() {
  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">정리</h2>
        <p className="text-lg text-gray-700 leading-relaxed">
          O4O는 제품과 정보를 매장을 중심으로 연결하여
          <br className="hidden sm:inline" />
          {' '}실행되는 유통 구조입니다.
        </p>
      </div>
    </section>
  );
}

// ─── 6. CTA ──────────────────────────────────────────────────────────────────

function CtaSection() {
  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-10">
          이어서 살펴보기
        </h2>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to="/o4o/services"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            매장 운영 서비스 보기 →
          </Link>
          <Link
            to="/o4o"
            className="inline-flex items-center justify-center px-6 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors"
          >
            ← 플랫폼 개요로 돌아가기
          </Link>
        </div>
      </div>
    </section>
  );
}
