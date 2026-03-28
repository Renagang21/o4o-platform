/**
 * AddressSearch — 우편번호 검색 + 주소 자동입력 컴포넌트
 *
 * WO-O4O-POSTAL-CODE-ADDRESS-V1
 *
 * Daum Postcode API (무료, API 키 불필요) 기반.
 * 플랫폼 전체 사업자 정보 폼에서 공통 사용.
 */

import { useRef, useCallback } from 'react';

declare global {
  interface Window {
    daum?: {
      Postcode: new (config: {
        oncomplete: (data: DaumPostcodeResult) => void;
        width?: string;
        height?: string;
      }) => { open: () => void };
    };
  }
}

interface DaumPostcodeResult {
  zonecode: string;      // 우편번호
  address: string;       // 기본 주소 (도로명)
  jibunAddress: string;  // 지번 주소
  roadAddress: string;   // 도로명 주소
  buildingName: string;  // 건물명
  bname: string;         // 법정동/법정리
  sido: string;          // 시/도
  sigungu: string;       // 시/군/구
}

export interface AddressSearchValue {
  zipCode: string;
  address: string;
  addressDetail: string;
}

export interface AddressSearchProps {
  zipCode: string;
  address: string;
  addressDetail: string;
  onChange: (data: AddressSearchValue) => void;
  disabled?: boolean;
  /** 입력 필드 className (기본: Tailwind border-gray 스타일) */
  inputClassName?: string;
}

const DAUM_POSTCODE_SCRIPT = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

function loadDaumPostcodeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.daum?.Postcode) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src*="postcode"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = DAUM_POSTCODE_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Daum Postcode script load failed'));
    document.head.appendChild(script);
  });
}

export function AddressSearch({
  zipCode,
  address,
  addressDetail,
  onChange,
  disabled = false,
  inputClassName,
}: AddressSearchProps) {
  const detailRef = useRef<HTMLInputElement>(null);

  const inputClass = inputClassName ||
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const handleSearch = useCallback(async () => {
    if (disabled) return;
    try {
      await loadDaumPostcodeScript();
      if (!window.daum?.Postcode) return;

      new window.daum.Postcode({
        oncomplete(data: DaumPostcodeResult) {
          const addr = data.roadAddress || data.jibunAddress || data.address;
          onChange({
            zipCode: data.zonecode,
            address: addr,
            addressDetail,
          });
          // 상세주소 입력에 포커스
          setTimeout(() => detailRef.current?.focus(), 100);
        },
      }).open();
    } catch (err) {
      console.error('[AddressSearch] Failed to open postcode:', err);
    }
  }, [disabled, onChange, addressDetail]);

  return (
    <div className="space-y-2">
      {/* 우편번호 + 검색 버튼 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">우편번호</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={zipCode}
            readOnly
            placeholder="우편번호"
            className={`${inputClass} flex-1 bg-gray-50`}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={disabled}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            우편번호 검색
          </button>
        </div>
      </div>

      {/* 기본주소 (자동입력, 읽기전용) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">주소</label>
        <input
          type="text"
          value={address}
          readOnly
          placeholder="우편번호 검색 시 자동입력됩니다"
          className={`${inputClass} bg-gray-50`}
        />
      </div>

      {/* 상세주소 (사용자 입력) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">상세주소</label>
        <input
          ref={detailRef}
          type="text"
          value={addressDetail}
          onChange={(e) => onChange({ zipCode, address, addressDetail: e.target.value })}
          disabled={disabled}
          placeholder="상세주소를 입력하세요 (동/호수 등)"
          className={inputClass}
        />
      </div>
    </div>
  );
}
