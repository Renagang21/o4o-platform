/**
 * SupplierProductImportPage — 내 쇼핑몰 관리자 상품 가져오기
 *
 * WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1
 *
 * 공급자가 자신이 운영하는 쇼핑몰(Firstmall) 관리자 상품 수정 페이지의 HTML 을
 * 붙여넣거나 파일로 불러와 → 브라우저에서 분석 → 필요한 필드/이미지만 추출 →
 * 선택 이미지는 O4O 저장소로 복사 → 표준 편집기에 삽입 → 정식 등록 입력을 돕는다.
 *
 * 원칙: 관리자 HTML 원문은 서버/DB/로그에 저장하지 않는다(선택 이미지 URL 만 복사 요청).
 */

import SupplierActivationGate from '../../components/supplier/SupplierActivationGate';
import MediaPickerModal from '../../components/common/MediaPickerModal';
import { useSupplierProductImport } from './product-import/useSupplierProductImport';
import SupplierImportResult from './product-import/SupplierImportResult';
import SupplierImportSettings from './product-import/SupplierImportSettings';

export default function SupplierProductImportPage() {
  const controller = useSupplierProductImport();
  const {
    sourceUrl,
    setSourceUrl,
    html,
    setHtml,
    fileInputRef,
    parsed,
    mediaPickerTarget,
    setMediaPickerTarget,
    error,
    topChoice,
    passedType,
    selectTop,
    handleParse,
    handleFileLoad,
    handleReset,
  } = controller;
  return (
    <SupplierActivationGate mode="gate">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">내 쇼핑몰 관리자 상품 가져오기</h1>
          {/* WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1 */}
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            본인이 운영하거나 상품 정보 사용 권한을 가진 쇼핑몰의{' '}
            <strong>관리자 상품 데이터만</strong> 가져올 수 있습니다. 현재{' '}
            <strong>Firstmall 관리자 상품 수정 페이지</strong>를 지원합니다.
          </div>
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            관리자 HTML 은 <strong>브라우저에서만 분석</strong>되며{' '}
            <strong>원본 관리자 데이터는 서버·DB·로그에 저장하지 않습니다.</strong>
            선택한 이미지만 O4O 저장소로 복사됩니다. 자동 등록이 아니며, 정식 제품 등록 입력을 돕는
            보조 기능입니다.
          </div>
          <div className="mt-2">
            <strong className="text-sm text-slate-700">사용 방법</strong>
            <ol className="mt-1 ml-4 list-decimal text-sm text-slate-500 space-y-0.5">
              <li>제품 유형을 먼저 선택합니다</li>
              <li>쇼핑몰 관리자에서 상품 수정 페이지를 열고 Ctrl+U 로 HTML을 확인합니다</li>
              <li>전체 HTML을 복사해 붙여넣거나 HTML 파일을 불러옵니다</li>
              <li>[관리자 상품 데이터 분석] → 이미지 선택 → [정식 등록으로 계속]</li>
            </ol>
          </div>
        </div>

        {/* WO-O4O-NETURE-SUPPLIER-IMPORT-ASSISTANT-PRODUCT-TYPE-PASSTHROUGH-V1:
          등록 도우미는 상위 2분기(의약품/비의약품)만 선택한다. 의약품 세부 분류는 분석 후
          정식 등록 Wizard 가 처리. 앞 단계에서 전달되면 상위 분기가 미리 선택되고 정밀 유형은 보존된다. */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-slate-800">제품 유형 선택</h2>
          <p className="mb-3 text-xs text-slate-500">
            의약품 / 비의약품만 선택하세요. 앞 단계에서 선택했다면 미리 선택되어 있으며, 세부 분류는
            분석 후 정식 등록 화면에서 확정합니다.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <button
              onClick={() => selectTop('non_drug')}
              className={`text-left rounded-lg border p-3 transition-colors ${topChoice === 'non_drug' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <span className="text-sm font-medium text-slate-800">비의약품</span>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                일반 상품(식품·생활·잡화 등). 의약외품·의료기기·건기식·화장품 등 세부 분류는 등록
                폼의 규제 구분에서 선택합니다.
              </p>
            </button>
            <button
              onClick={() => selectTop('drug')}
              className={`text-left rounded-lg border p-3 transition-colors ${topChoice === 'drug' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">의약품</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                  약국 대상
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                일반의약품 또는 전문의약품. 세부 분류는 분석 후 정식 등록 화면에서 확정합니다.
              </p>
            </button>
          </div>
          {topChoice && (
            <p className="mt-3 text-xs text-slate-500">
              선택:{' '}
              <strong className="text-slate-700">
                {topChoice === 'drug' ? '의약품' : '비의약품'}
              </strong>
              {passedType?.key === 'quasi_drug' && ' (의약외품 — 비의약품 하위)'}. 세부 분류는 분석
              후 정식 등록 화면에서 확정합니다.
            </p>
          )}
        </div>

        {/* Input Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">1. 관리자 상품 HTML 입력</h2>

          <p className="mb-3 text-sm text-slate-500">
            쇼핑몰 관리자 상품 수정 페이지의 HTML을 붙여넣거나{' '}
            <strong>HTML 파일을 불러오세요.</strong>
            관리자 페이지에서 Ctrl+U(페이지 소스 보기) → 전체 복사가 가장 정확합니다.
          </p>

          {/* Shop domain */}
          <label className="mb-1 block text-sm font-medium text-slate-700">
            내 쇼핑몰 주소{' '}
            <span className="font-normal text-slate-400">
              (이미지 주소 기준 — 자동 감지되며 필요 시 수정)
            </span>
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://myshop.co.kr"
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />

          {/* HTML textarea + file load */}
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">관리자 HTML *</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              HTML 파일 불러오기 (.html / .txt)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,.txt,text/html,text/plain"
              onChange={handleFileLoad}
              className="hidden"
            />
          </div>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={12}
            placeholder="관리자 상품 수정 페이지의 HTML을 붙여넣으세요"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleParse}
              disabled={!html.trim()}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              관리자 상품 데이터 분석
            </button>
            {parsed && (
              <button
                onClick={handleReset}
                className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {parsed && <SupplierImportResult controller={controller} />}

        {parsed && <SupplierImportSettings controller={controller} />}

        <MediaPickerModal
          open={!!mediaPickerTarget}
          onClose={() => setMediaPickerTarget(null)}
          onSelect={(asset) => {
            mediaPickerTarget?.({ type: 'image', url: asset.url, title: asset.originalName });
            setMediaPickerTarget(null);
          }}
          title="상세 설명 이미지 선택"
          defaultFolder="description"
        />
      </div>
    </SupplierActivationGate>
  );
}
