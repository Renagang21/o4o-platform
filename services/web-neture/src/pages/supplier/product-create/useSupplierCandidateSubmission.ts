import { useState } from 'react';
import { supplierApi } from '../../../lib/api';
import { mediaApi } from '../../../lib/api/media';
import { toast } from '@o4o/error-handling';
import {
  CANDIDATE_SHORT_DESCRIPTION_MAX_LENGTH,
  createErrorMessage,
  shortDescriptionLength,
} from './candidateFormHelpers';
import type { useSupplierCandidateForm } from './useSupplierCandidateForm';
import type { useSupplierCandidateMedia } from './useSupplierCandidateMedia';

export function useSupplierCandidateSubmission(
  formState: ReturnType<typeof useSupplierCandidateForm>,
  media: ReturnType<typeof useSupplierCandidateMedia>,
) {
  const {
    productType,
    form,
    master,
    barcodeChecked,
    consumerShortDesc,
    setSubmitError,
    isRegulated,
  } = formState;
  const { thumbnailSource, contentItems } = media;
  const [registered, setRegistered] = useState<{
    name: string;
    candidateId: string | null;
    identifierValue: string | null;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  // Submit — Candidate 제출 (Master/Offer 생성 없음)
  const handleSubmit = async () => {
    if (barcodeChecked && master) {
      setSubmitError('이미 등록된 제품입니다. [기존 제품에 공급 연결]로 진행해 주시기 바랍니다.');
      return;
    }
    // 서버 한도를 넘는 설명은 이미지 업로드 전에 막는다(업로드 후 FIELD_TOO_LONG 실패 방지).
    const descLength = shortDescriptionLength(consumerShortDesc);
    if (descLength > CANDIDATE_SHORT_DESCRIPTION_MAX_LENGTH) {
      setSubmitError(
        `소비자용 간이 설명이 ${CANDIDATE_SHORT_DESCRIPTION_MAX_LENGTH}자(서식 포함)를 넘습니다(현재 ${descLength}자). 줄여서 다시 요청해 주시기 바랍니다.`,
      );
      return;
    }
    setSubmitting(true);
    setSubmitError('');

    const { imageFailures, imageUrl, contentImageUrls } = await uploadCandidateImages(media);

    // 2) 규제 정보: 제품 유형(진입 선택) → regulatoryType/drugCategory. 규제 카테고리면 규제명·허가번호 포함.
    const regulatoryType = (productType?.regulatoryType || form.regulatoryType || 'GENERAL') as
      | 'GENERAL'
      | 'COSMETIC'
      | 'HEALTH_FUNCTIONAL'
      | 'QUASI_DRUG'
      | 'MEDICAL_DEVICE'
      | 'DRUG';
    const drugCategory = regulatoryType === 'DRUG' ? (productType?.drugCategory ?? 'otc') : null;
    const regulatoryName = (isRegulated ? form.regulatoryName : form.packagingName).trim() || null;

    const result = await supplierApi.submitProductCandidate({
      name: form.marketingName.trim(),
      barcode: form.barcode.trim() || null,
      categoryId: form.categoryId || null,
      brandId: form.brandId || null,
      brandName: form.brandName.trim() || null,
      manufacturerName: form.manufacturerName.trim() || null,
      specification: form.specification.trim() || null,
      originCountry: form.originCountry.trim() || null,
      regulatoryType,
      drugCategory,
      regulatoryName,
      mfdsPermitNumber: isRegulated ? form.mfdsPermitNumber.trim() || null : null,
      imageUrl,
      contentImageUrls,
      offerDraft: { consumerShortDescription: consumerShortDesc || null },

    });
    setSubmitting(false);

    if (result.success) {
      if (imageFailures > 0) {
        toast.error(
          `검토 요청은 접수됐지만 이미지 ${imageFailures}건은 업로드되지 않아 제외됐습니다.`,
        );
      }
      if (thumbnailSource?.kind === 'file') URL.revokeObjectURL(thumbnailSource.preview);
      contentItems.forEach((item) => {
        if (item.kind === 'file') URL.revokeObjectURL(item.preview);
      });
      setRegistered({
        name: form.marketingName.trim(),
        candidateId: result.data?.candidateId ?? null,
        identifierValue: result.data?.identifierValue ?? null,
      });
    } else {
      setSubmitError(createErrorMessage(result.error, result.message));
    }
  };

  return {
    registered,
    submitting,
    handleSubmit,
  };
}

async function uploadCandidateImages(media: ReturnType<typeof useSupplierCandidateMedia>) {
  const { thumbnailSource, contentItems } = media;
    // 1) 이미지: 파일은 미디어 라이브러리(master-less)에 먼저 업로드해 URL 로 바꾼다. 라이브러리 항목은 URL 그대로.
    //    실패한 파일은 Candidate 에서 제외하고 안내한다(제출 자체는 계속).
    let imageFailures = 0;
    let imageUrl: string | null = null;
    if (thumbnailSource?.kind === 'file') {
      const up = await mediaApi.upload(thumbnailSource.file, true, undefined, 'product-thumbnail');
      if (up.success && up.data?.url) imageUrl = up.data.url;
      else imageFailures += 1;
    } else if (thumbnailSource?.kind === 'library') {
      imageUrl = thumbnailSource.url;
    }
    const contentImageUrls: string[] = [];
    for (const item of contentItems) {
      if (item.kind === 'library') {
        contentImageUrls.push(item.url);
        continue;
      }
      const up = await mediaApi.upload(item.file, true, undefined, 'description');
      if (up.success && up.data?.url) contentImageUrls.push(up.data.url);
      else imageFailures += 1;
    }

  return { imageFailures, imageUrl, contentImageUrls };
}
