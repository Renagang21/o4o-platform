import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { supplierApi } from '../../../lib/api/supplier';
import { saveDraft } from '../../../lib/product-import/storage';
import type {
  ParsedProductData,
  FirstmallAdminProduct,
  DetailImageCandidate,
  ImportDraft,
} from '../../../lib/product-import/types';
import { escapeHtmlAttr } from './importHelpers';
type TransferContext = {
  navigate: NavigateFunction;
  onApplyDraft?: (draft: ImportDraft) => void;
  sourceUrl: string;
  parsed: ParsedProductData | null;
  adminProduct: FirstmallAdminProduct | null;
  name: string;
  brand: string;
  manufacturer: string;
  specification: string;
  originCountry: string;
  price: string;
  detailDesc: string;
  setDetailDesc: Dispatch<SetStateAction<string>>;
  selectedImages: Set<number>;
  thumbnailIdx: number | null;
  selectedDetailImages: Set<number>;
  setSelectedDetailImages: Dispatch<SetStateAction<Set<number>>>;
  detailImagesConfirmed: boolean;
  setDetailImagesConfirmed: Dispatch<SetStateAction<boolean>>;
  o4oCategoryId: string;
  o4oPriceGeneral: string;
  o4oIsPublic: boolean;
  o4oServiceKeys: string[];
  o4oRegulatoryType: string;
  effective: { productKey?: string; regulatoryType?: string };
  detailCandidates: DetailImageCandidate[];
};

export function useSupplierImportTransfers(context: TransferContext) {
  const {
    navigate,
    onApplyDraft,
    sourceUrl,
    parsed,
    adminProduct,
    name,
    brand,
    manufacturer,
    specification,
    originCountry,
    price,
    detailDesc,
    setDetailDesc,
    selectedImages,
    thumbnailIdx,
    selectedDetailImages,
    setSelectedDetailImages,
    detailImagesConfirmed,
    setDetailImagesConfirmed,
    o4oCategoryId,
    o4oPriceGeneral,
    o4oIsPublic,
    o4oServiceKeys,
    o4oRegulatoryType,
    effective,
    detailCandidates,
  } = context;
  // 이미지 O4O 저장소 복사 상태 (선택 → 복사 → 편집기 삽입)
  const [imageCopyStatus, setImageCopyStatus] = useState<'idle' | 'copying' | 'error'>('idle');
  const [imageCopyError, setImageCopyError] = useState('');

  // 등록 이동 시 대표/갤러리 이미지 O4O 복사 상태
  const [navStatus, setNavStatus] = useState<'idle' | 'copying'>('idle');
  const [navError, setNavError] = useState('');

  const handleNavigateToCreate = useCallback(async () => {
    if (!parsed || navStatus === 'copying') return;

    const selectedImgUrls = parsed.imageUrls.filter((_, i) => selectedImages.has(i));

    const thumbUrl =
      thumbnailIdx != null && parsed.imageUrls[thumbnailIdx]
        ? parsed.imageUrls[thumbnailIdx]
        : (selectedImgUrls[0] ?? null);

    const detailSelUrls = selectedImgUrls.filter((u) => u !== thumbUrl);

    // 선택 이미지를 O4O 로 복사 — 정책 분리: 대표=1000x1000(thumbnail), 갤러리=표준(standard).
    //   외부 http/https URL 이 등록 데이터에 남지 않도록 O4O URL 만 전달.
    let o4oThumb: string | null = null;
    let o4oDetailUrls: string[] = [];
    if (selectedImgUrls.length > 0) {
      setNavStatus('copying');
      setNavError('');
      try {
        const shopOrigin = sourceUrl.trim() || adminProduct?.shopDomain || undefined;
        // 대표 썸네일: 서버에서 1000x1000 표준화
        if (thumbUrl) {
          const tRes = await supplierApi.copyImages([thumbUrl], shopOrigin, { mode: 'thumbnail' });
          o4oThumb = tRes.results.find((r) => r.ok && r.url)?.url ?? null;
        }
        // 갤러리(대표 외 선택): 표준 정책
        if (detailSelUrls.length > 0) {
          const gRes = await supplierApi.copyImages(detailSelUrls, shopOrigin, {
            mode: 'standard',
          });
          const map = new Map(
            gRes.results.filter((r) => r.ok && r.url).map((r) => [r.originalUrl, r.url as string]),
          );
          o4oDetailUrls = detailSelUrls.map((u) => map.get(u)).filter((u): u is string => !!u);
        }
        if (!o4oThumb && o4oDetailUrls.length === 0) {
          setNavStatus('idle');
          setNavError(
            '선택 이미지를 O4O 저장소로 복사하지 못했습니다. 내 쇼핑몰 주소가 올바른지 확인해 주세요.',
          );
          return;
        }
      } catch (e) {
        setNavStatus('idle');
        setNavError(e instanceof Error ? e.message : '이미지 복사에 실패했습니다.');
        return;
      }
    }

    const draft: ImportDraft = {
      marketingName: name,
      brandName: brand,
      manufacturerName: manufacturer,
      specification,
      originCountry,
      consumerReferencePrice: price,
      consumerShortDesc: parsed.shortDescription ?? '',
      consumerDetailDesc: detailDesc,
      // O4O https URL 만 전달 (외부 URL 미전달)
      thumbnailUrl: o4oThumb,
      thumbnailCorrectedDataUrl: undefined,
      detailImageUrls: o4oDetailUrls.slice(0, 10),
      contentImageUrls: [],
      sourceUrl: sourceUrl || '',
      importedAt: new Date().toISOString(),
      // O4O 등록 설정 (WO-O4O-SUPPLIER-IMPORT-O4O-SETTINGS-STEP-V1)
      categoryId: o4oCategoryId || undefined,
      priceGeneral: o4oPriceGeneral || undefined,
      isPublic: o4oIsPublic,
      serviceKeys: o4oServiceKeys.length > 0 ? o4oServiceKeys : undefined,
      // WO-O4O-NETURE-SUPPLIER-MENU-ASSISTANT-IA-CLEANUP-V1: 선택 유형 우선, 없으면 기존 설정
      regulatoryType:
        (effective.regulatoryType && effective.regulatoryType !== 'GENERAL'
          ? effective.regulatoryType
          : undefined) ?? (o4oRegulatoryType !== 'GENERAL' ? o4oRegulatoryType : undefined),
    };

    if (onApplyDraft) {
      setNavStatus('idle');
      onApplyDraft(draft);
      return;
    }
    saveDraft(draft);
    setNavStatus('idle');
    // 상위 분기(+보존된 정밀 유형)를 정식 wizard 로 전달. 세부 미지정 의약품은 regulatoryType=DRUG 만.
    const params = new URLSearchParams();
    if (effective.productKey) params.set('productType', effective.productKey);
    if (effective.regulatoryType) params.set('regulatoryType', effective.regulatoryType);
    const qs = params.toString();
    navigate(qs ? `/supplier/products/new?${qs}` : '/supplier/products/new');
  }, [
    onApplyDraft,
    parsed,
    navStatus,
    name,
    brand,
    manufacturer,
    specification,
    originCountry,
    price,
    detailDesc,
    selectedImages,
    thumbnailIdx,
    sourceUrl,
    adminProduct,
    navigate,
    o4oCategoryId,
    o4oPriceGeneral,
    o4oIsPublic,
    o4oServiceKeys,
    o4oRegulatoryType,
    effective,
  ]);

  // 선택 이미지를 O4O 저장소로 복사한 뒤, 표준 폭 <img>(가운데 정렬)로 에디터 본문 하단에 삽입.
  //   외부 URL 이 아닌 O4O https URL 을 삽입한다(원본 사이트 차단/변경에 영향받지 않음).
  //   에디터(.editor-image 클래스)가 표준 반응형 폭을 적용한다(WO §10).
  const handleInsertDetailImages = useCallback(async () => {
    if (selectedDetailImages.size === 0 || !detailImagesConfirmed || imageCopyStatus === 'copying')
      return;

    const chosen = detailCandidates.filter((_, i) => selectedDetailImages.has(i)); // 이미 원본 순서

    setImageCopyStatus('copying');
    setImageCopyError('');
    try {
      const shopOrigin = (sourceUrl.trim() || adminProduct?.shopDomain) ?? undefined;
      // 상세설명 이미지는 원본 해상도 보존(긴 세로 이미지를 축소하지 않음 → 본문 폭 표시 시 선명).
      const res = await supplierApi.copyImages(
        chosen.map((c) => c.originalUrl),
        shopOrigin,
        { mode: 'preserve' },
      );
      // originalUrl → O4O url 매핑
      const map = new Map(
        res.results.filter((r) => r.ok && r.url).map((r) => [r.originalUrl, r.url as string]),
      );
      const productName = name.trim() || '상품';
      const html = chosen
        .map((c, i) => {
          const o4oUrl = map.get(c.originalUrl);
          if (!o4oUrl) return '';
          const alt = escapeHtmlAttr(c.alt || `${productName} 상세설명 이미지 ${i + 1}`);
          // 블록 이미지를 <p> 로 감싸지 않는다. DisplayImage 는 블록 노드라
          // <p><img></p> 로 넣으면 TipTap 이 이미지를 단락 밖으로 빼며 빈 <p></p> 가 남고
          // (편집기 상단 여백), 그 빈 단락이 이미지에 붙어 함께 지워진다. bare <img> 로 삽입.
          return `<img src="${escapeHtmlAttr(o4oUrl)}" alt="${alt}" class="editor-image img-align-center" data-align="center" />`;
        })
        .filter(Boolean)
        .join('');

      if (!html) {
        setImageCopyStatus('error');
        setImageCopyError(
          '선택한 이미지를 O4O 저장소로 복사하지 못했습니다. 쇼핑몰 주소가 올바른지 확인해 주세요.',
        );
        return;
      }

      setDetailDesc((prev) => (prev ? prev + html : html));
      if (res.copied < chosen.length) {
        setImageCopyError(
          `${chosen.length}개 중 ${res.copied}개만 복사되어 삽입했습니다. 일부 이미지는 가져오지 못했습니다.`,
        );
      }
      setSelectedDetailImages(new Set());
      setDetailImagesConfirmed(false);
      setImageCopyStatus('idle');
    } catch (e) {
      setImageCopyStatus('error');
      setImageCopyError(e instanceof Error ? e.message : '이미지 복사에 실패했습니다.');
    }
  }, [
    selectedDetailImages,
    detailImagesConfirmed,
    imageCopyStatus,
    detailCandidates,
    sourceUrl,
    adminProduct,
    name,
    setDetailDesc,
    setSelectedDetailImages,
    setDetailImagesConfirmed,
  ]);

  return {
    navStatus,
    setNavStatus,
    navError,
    setNavError,
    imageCopyStatus,
    setImageCopyStatus,
    imageCopyError,
    setImageCopyError,
    handleNavigateToCreate,
    handleInsertDetailImages,
  };
}
