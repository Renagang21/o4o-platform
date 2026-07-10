/**
 * ProductMasterDetailPage — 기본 상품 상세 (관리 콘솔형, read-only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-MASTER-DETAIL-GET-ENRICHMENT-V1
 * (기반: WO-O4O-ADMIN-O4O-PRODUCT-MANAGEMENT-BASE-CONSOLE-V1 / ...-READONLY-SKELETON-V1)
 *
 * 상품 관리 콘솔의 중심 화면. 상품 정보 관리(정보·식별자·이미지·설명)와 운영 기록(관리 메모·작업 이력)에 집중한다.
 * 상세 API(GET /neture/products/library/:id)가 additive 로 제공하는 enrichment
 * (identifiers / descriptions / sourceLinks)를 read-only 로 표시한다.
 *
 * WO-O4O-ADMIN-PRODUCT-MASTER-CONSOLE-SIMPLIFICATION-V1:
 *   관리자 책임 범위 밖인 사용 상태·활용 연결(usage-links)·연결 수 표시 제거,
 *   비활성 QR placeholder·dead code 제거. 실제 동작하는 ProductQrSection·관리 메모·작업 이력은 유지.
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import {
  getProductMaster, ProductMasterDetail, ProductDescriptionSummary,
  listProductMasterNotes, addProductMasterNote, deleteProductMasterNote, ProductMasterNote,
  getProductMasterAuditLog, ProductMasterAuditLog,
  uploadProductMasterImage, setProductMasterPrimaryImage,
  listProductMasterImages, hideProductMasterImage, restoreProductMasterImage, ProductMasterImageAdminRow,
  getProductLandingQr, ProductLandingQr,
  listProductMasterStoreDescriptions, saveProductMasterStoreDescription, ProductMasterStoreDescription,
} from '@/api/o4o-product-db.api';
import {
  ProductMasterStatusBadge,
  ProductMasterStatusModal,
  statusActionsFor,
  StatusModalTarget,
} from './ProductMasterStatusControls';

export default function ProductMasterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<ProductMasterDetail | null>(null);
  const [notes, setNotes] = useState<ProductMasterNote[]>([]);
  const [audit, setAudit] = useState<ProductMasterAuditLog | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-ACTION-V1: 이미지 추가 / 대표 지정 (admin write).
  // 권한 게이트는 라우트(AdminProtectedRoute: admin/super_admin) + 백엔드(ADMIN_ROLES). 메모 write 와 동일 패턴.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  // WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-SOFT-DELETE-RESTORE-V1: admin 이미지 목록(숨김 포함).
  // 공유 상세(row.images)는 active 만 → 복원 UI 위해 별도 조회.
  const [images, setImages] = useState<ProductMasterImageAdminRow[]>([]);
  // WO-...-STATUS-ACTIONS-V1: 상태 변경 모달 대상 (null=닫힘)
  const [statusTarget, setStatusTarget] = useState<StatusModalTarget | null>(null);

  const reloadImages = async () => {
    if (!id) return;
    try { setImages(await listProductMasterImages(id)); } catch { /* 무시 */ }
  };

  const reloadMaster = async () => {
    if (!id) return;
    try { setRow(await getProductMaster(id)); } catch { /* 무시 */ }
  };

  const reloadAudit = async () => {
    if (!id) return;
    try { setAudit(await getProductMasterAuditLog(id)); } catch { /* 무시 */ }
  };
  const reloadNotes = async () => {
    if (!id) return;
    try { setNotes(await listProductMasterNotes(id)); await reloadAudit(); } catch { /* 무시(read-only 표시 유지) */ }
  };
  const submitNote = async () => {
    if (!id) return;
    const body = noteText.trim();
    if (!body) return;
    setNoteBusy(true);
    setNoteError(null);
    try {
      await addProductMasterNote(id, body);
      setNoteText('');
      await reloadNotes();
    } catch (e: any) {
      setNoteError(e?.response?.data?.error || e?.message || '메모 추가에 실패했습니다');
    } finally {
      setNoteBusy(false);
    }
  };
  const removeNote = async (noteId: string) => {
    if (!id) return;
    setNoteBusy(true);
    setNoteError(null);
    try {
      await deleteProductMasterNote(id, noteId);
      await reloadNotes();
    } catch (e: any) {
      setNoteError(e?.response?.data?.error || e?.message || '메모 삭제에 실패했습니다');
    } finally {
      setNoteBusy(false);
    }
  };

  const onPickImage = () => fileInputRef.current?.click();
  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!file || !id) return;
    setImageBusy(true);
    setImageError(null);
    try {
      await uploadProductMasterImage(id, file);
      await reloadImages();
      await reloadMaster();
      await reloadAudit();
    } catch (e: any) {
      setImageError(e?.response?.data?.error || e?.message || '이미지 추가에 실패했습니다');
    } finally {
      setImageBusy(false);
    }
  };
  const onSetPrimary = async (imageId: string) => {
    if (!id) return;
    setImageBusy(true);
    setImageError(null);
    try {
      await setProductMasterPrimaryImage(id, imageId);
      await reloadImages();
      await reloadMaster();
      await reloadAudit();
    } catch (e: any) {
      setImageError(e?.response?.data?.error || e?.message || '대표 지정에 실패했습니다');
    } finally {
      setImageBusy(false);
    }
  };
  const onHideImage = async (imageId: string) => {
    if (!id) return;
    if (!window.confirm('이 이미지를 숨기시겠습니까? 원본은 보존되며 언제든 복원할 수 있습니다.')) return;
    setImageBusy(true);
    setImageError(null);
    try {
      const r = await hideProductMasterImage(id, imageId);
      await reloadImages();
      await reloadMaster();
      await reloadAudit();
      // 자동 승계(WO §7): 대표를 숨겼는데 남은 active 가 없어 승계 못한 경우만 안내
      if (r?.wasPrimary && !r?.newPrimaryImageId) setImageError('대표 이미지를 숨겼고 남은 이미지가 없어 대표가 없습니다.');
    } catch (e: any) {
      setImageError(e?.response?.data?.error || e?.message || '이미지 숨김에 실패했습니다');
    } finally {
      setImageBusy(false);
    }
  };
  const onRestoreImage = async (imageId: string) => {
    if (!id) return;
    setImageBusy(true);
    setImageError(null);
    try {
      await restoreProductMasterImage(id, imageId);
      await reloadImages();
      await reloadMaster();
      await reloadAudit();
    } catch (e: any) {
      setImageError(e?.response?.data?.error || e?.message || '이미지 복원에 실패했습니다');
    } finally {
      setImageBusy(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProductMaster(id);
        if (alive) setRow(data);
      } catch (e: any) {
        if (alive) setError(e?.response?.data?.error || e?.message || '기본 상품을 불러오지 못했습니다');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    // 내부 운영 메모(별도 GET)
    listProductMasterNotes(id).then((n) => { if (alive) setNotes(n); }).catch(() => { if (alive) setNotes([]); });
    // 작업 이력(별도 GET)
    getProductMasterAuditLog(id).then((a) => { if (alive) setAudit(a); }).catch(() => { if (alive) setAudit(null); });
    // admin 이미지 목록(숨김 포함, 별도 GET)
    listProductMasterImages(id).then((im) => { if (alive) setImages(im); }).catch(() => { if (alive) setImages([]); });
    return () => { alive = false; };
  }, [id]);

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> 목록으로
      </button>

      {loading ? (
        <div className="text-gray-400 py-10 text-center">불러오는 중…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4">{error}</div>
      ) : !row ? (
        <div className="text-gray-400 py-10 text-center">상품을 찾을 수 없습니다</div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">{row.name || '(이름 없음)'}</h2>
            {/* WO-...-STATUS-ACTIONS-V1: 현재 이용 상태 배지 */}
            <ProductMasterStatusBadge status={row.status} />
            {row.regulatoryType && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">{row.regulatoryType}</span>
            )}
            {row.isMfdsVerified && (
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">MFDS 검증</span>
            )}
            {/* 상태 변경 액션 — 현재 상태에 따라 이용 중단/보관 또는 정상 복원 */}
            <div className="ml-auto flex items-center gap-2">
              {statusActionsFor(row.status ?? 'ACTIVE').map((a) => (
                <button
                  key={a.targetStatus}
                  onClick={() =>
                    setStatusTarget({ id: row.id, name: row.name, currentStatus: row.status ?? 'ACTIVE', targetStatus: a.targetStatus })
                  }
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* 기본 정보 */}
          <Section title="기본 정보">
            <Field label="상품명" value={row.name} />
            <Field label="공식명" value={row.regulatoryName} />
            <Field label="제조사" value={row.manufacturerName} />
            <Field label="브랜드" value={row.brandName || row.brand?.name} />
            <Field label="분류" value={row.category?.name} />
            <Field label="규격" value={row.specification} />
            <Field label="원산지" value={row.originCountry} />
            <Field label="태그" value={row.tags?.length ? row.tags.join(', ') : null} />
            <Field label="생성일" value={row.createdAt} />
          </Section>

          {/* 규제 정보 */}
          <Section title="규제 정보">
            <Field label="규제 구분" value={row.regulatoryType} />
            <Field label="MFDS 검증 여부" value={row.isMfdsVerified ? '검증됨' : '미검증'} />
          </Section>

          {/* 제품 QR / 랜딩 (WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1) */}
          {id && <ProductQrSection masterId={id} />}

          {/* 식별자 — barcode(primary) + ProductIdentifier 목록 (read-only) */}
          <PanelSection title={`식별자 (${row.identifiers?.length ?? 0})`}>
            <div className="mb-3 text-sm">
              <span className="text-gray-500 mr-2">대표 바코드</span>
              <span className="text-gray-900 break-all">{row.barcode || '바코드 없음'}</span>
            </div>
            {row.identifiers?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <ThMini>유형</ThMini>
                      <ThMini>값</ThMini>
                      <ThMini>출처</ThMini>
                      <ThMini>검증 상태</ThMini>
                      <ThMini>primary</ThMini>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {row.identifiers.map((idf) => (
                      <tr key={idf.id}>
                        <TdMini><span className="font-medium text-gray-800">{identifierTypeLabel(idf.type)}</span></TdMini>
                        <TdMini className="break-all">{idf.value}</TdMini>
                        <TdMini className="text-gray-500">{idf.sourceLabel || idf.sourceType || '—'}</TdMini>
                        <TdMini className="text-gray-500">{idf.verificationStatus || '—'}</TdMini>
                        <TdMini>{idf.isPrimary ? <span className="text-green-600">●</span> : <span className="text-gray-300">○</span>}</TdMini>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-400">등록된 식별자가 없습니다.</div>
            )}
          </PanelSection>

          {/* 이미지 — WO-...-IMAGE-ACTION-V1(추가/대표) + WO-...-IMAGE-SOFT-DELETE-RESTORE-V1(숨김/복원) */}
          {(() => {
            const activeImages = images.filter((i) => !i.deletedAt);
            const hiddenImages = images.filter((i) => i.deletedAt);
            return (
          <PanelSection
            title={`이미지 (${activeImages.length}${hiddenImages.length ? ` · 숨김 ${hiddenImages.length}` : ''})`}
            badge={<ImageStatusBadge images={activeImages} />}
          >
            {activeImages.length ? (
              <div className="flex flex-wrap gap-3">
                {activeImages.map((img) => (
                  <MasterThumb
                    key={img.id}
                    img={img}
                    busy={imageBusy}
                    onSetPrimary={() => onSetPrimary(img.id)}
                    onHide={() => onHideImage(img.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">이미지 없음</div>
            )}

            {hiddenImages.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-medium text-gray-500 mb-2">숨긴 이미지 ({hiddenImages.length})</div>
                <div className="flex flex-wrap gap-3">
                  {hiddenImages.map((img) => (
                    <MasterThumb
                      key={img.id}
                      img={img}
                      hidden
                      busy={imageBusy}
                      onRestore={() => onRestoreImage(img.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
              <button
                onClick={onPickImage}
                disabled={imageBusy}
                className="flex items-center gap-1.5 bg-admin-blue text-white px-3 py-2 rounded text-sm disabled:opacity-50"
              >
                <ImagePlus className="w-4 h-4" /> {imageBusy ? '처리 중…' : '이미지 추가'}
              </button>
              <span className="text-xs text-gray-400">첫 이미지는 자동으로 대표가 됩니다. 숨김은 삭제가 아니며(원본 보존) 복원할 수 있습니다.</span>
            </div>
            {imageError && <div className="mt-2 text-sm text-red-600">{imageError}</div>}

            <div className="text-xs text-gray-400 mt-3">
              <button onClick={() => navigate('/admin/o4o-product-db/image-quality')} className="text-admin-blue underline underline-offset-2">이미지 상태 화면</button>
              에서 전체 상품의 이미지 보유/누락 현황을 확인할 수 있습니다.
            </div>
          </PanelSection>
            );
          })()}

          {/* 설명 — WO-O4O-DRUG-CANONICAL-DESCRIPTION-OUTPUT-LINK-V1: 공식 소비자 설명 (매장용 AI 설명 아님) */}
          <PanelSection
            title="공식 소비자 설명"
            badge={row.canonicalDescription
              ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">canonical</span>
              : undefined}
          >
            {row.canonicalDescription ? (
              <>
                <div className="text-xs text-gray-400 mb-2">
                  출처: {row.canonicalDescription.sourceType === 'mfds_easy_drug' ? '식품의약품안전처 e약은요' : row.canonicalDescription.sourceType}
                  {row.canonicalDescription.curatedAt && ` · 승격 ${row.canonicalDescription.curatedAt.slice(0, 10)}`}
                  {' · 매장용 AI 설명이 아닌 공식 소비자 설명입니다'}
                </div>
                <div
                  className="prose prose-sm max-w-none text-gray-800"
                  dangerouslySetInnerHTML={{ __html: row.canonicalDescription.content }}
                />
              </>
            ) : (
              <div className="text-sm text-gray-400">공식 설명 없음</div>
            )}
          </PanelSection>

          {/* 매장용(STORE) 상세설명서 저작 — 관리자 직접 등록 (IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1 §5) */}
          {id && <StoreDescriptionPanel masterId={id} />}

          {/* 설명 후보 — SharedProductDescription 요약 (read-only preview) */}
          <PanelSection title={`설명 후보 (${row.descriptions?.length ?? 0})`}>
            {/* WO-O4O-PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1: 설명서(KO/ZH) 상태 요약 + 보기 동선.
                ko/zh = SPD(master-scope) language 기준. 매장 다국어 콘텐츠는 store-scope(후속 WO). */}
            {(() => {
              const descs = row.descriptions ?? [];
              const pick = (m: (d: ProductDescriptionSummary) => boolean) => {
                const cands = descs.filter(m);
                return cands.find((d) => d.status === 'canonical') || cands[0] || null;
              };
              const ko = pick((d) => !d.language || d.language.toLowerCase().startsWith('ko'));
              const zh = pick((d) => !!d.language && d.language.toLowerCase().startsWith('zh'));
              const pill = (label: string, d: ProductDescriptionSummary | null) => {
                const tone = !d
                  ? 'bg-gray-100 text-gray-500'
                  : d.status === 'canonical'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700';
                const state = !d ? '없음' : d.status === 'canonical' ? '있음' : '초안';
                return (
                  <span className="inline-flex items-center gap-1">
                    <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs ${tone}`}>{label} {state}</span>
                  </span>
                );
              };
              return (
                <div className="flex items-center gap-3 flex-wrap mb-3 pb-3 border-b border-gray-100">
                  <span className="text-xs text-gray-500">설명서 상태</span>
                  {pill('KO', ko)}
                  {pill('ZH', zh)}
                </div>
              );
            })()}
            {row.descriptions?.length ? (
              <ul className="space-y-2">
                {row.descriptions.map((d) => (
                  <li key={d.id} className="border border-gray-200 rounded p-3">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <DescriptionStatusBadge status={d.status} />
                      <span className="text-xs text-gray-400">{d.sourceType}</span>
                      {d.language && <span className="text-xs text-gray-400">· {d.language}</span>}
                      {d.qualityScore != null && <span className="text-xs text-gray-400">· 품질 {d.qualityScore.toFixed(2)}</span>}
                      {d.updatedAt && <span className="text-xs text-gray-400">· {d.updatedAt.slice(0, 10)}</span>}
                    </div>
                    <div className="text-sm text-gray-700 line-clamp-2">
                      {d.summary || d.contentPreview || <span className="text-gray-400">내용 미리보기 없음</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-400">표시할 설명 데이터가 없습니다.</div>
            )}
            <div className="text-xs text-gray-400 mt-2">
              설명은 정부/공공 원문 기반 자료이며, 매장 활용 후 피드백에 따라 수정됩니다.
            </div>
          </PanelSection>

          {/* 후보/원천 연결 — 이 master 로 매칭된 ProductCandidate (read-only) */}
          <PanelSection title={`후보 / 원천 연결 (${row.sourceLinks?.length ?? 0})`}>
            {row.sourceLinks?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <ThMini>후보명</ThMini>
                      <ThMini>제조사</ThMini>
                      <ThMini>source</ThMini>
                      <ThMini>후보 상태</ThMini>
                      <ThMini>매칭 상태</ThMini>
                      <ThMini>생성일</ThMini>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {row.sourceLinks.map((s, i) => (
                      <tr key={s.candidateId ?? i}>
                        <TdMini className="text-gray-800">{s.candidateName || '—'}</TdMini>
                        <TdMini className="text-gray-500">{s.candidateManufacturer || '—'}</TdMini>
                        <TdMini className="text-gray-500">
                          {s.sourceType}{s.sourceLabel ? <span className="text-gray-400"> · {s.sourceLabel}</span> : null}
                        </TdMini>
                        <TdMini className="text-gray-500">{s.candidateStatus || '—'}</TdMini>
                        <TdMini className="text-gray-500">{s.matchStatus || '—'}</TdMini>
                        <TdMini className="text-gray-400">{s.createdAt ? s.createdAt.slice(0, 10) : '—'}</TdMini>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-400">연결된 원천 후보가 없습니다.</div>
            )}
          </PanelSection>

          {/* 관리 메모 — 내부 운영 메모(append + soft delete). ProductMaster 본문 무변경 */}
          <PanelSection title={`관리 메모 (${notes.length})`}>
            <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2 mb-3">
              이 메모는 <b>내부 운영 기록</b>입니다. 상품명·바코드·설명·이미지 데이터는 변경되지 않습니다.
            </div>
            {noteError && <div className="text-xs text-red-600 mb-2">{noteError}</div>}
            <div className="flex flex-col gap-2 mb-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="확인 사항 / 보류 사유 / 후속 작업을 기록하세요"
                rows={3}
                maxLength={4000}
                className="border border-gray-300 rounded px-3 py-2 text-sm resize-y"
              />
              <div className="flex justify-end">
                <button
                  onClick={submitNote}
                  disabled={noteBusy || !noteText.trim()}
                  className="bg-admin-blue text-white px-4 py-1.5 rounded text-sm disabled:opacity-40"
                >
                  메모 추가
                </button>
              </div>
            </div>
            {notes.length === 0 ? (
              <div className="text-sm text-gray-400">아직 등록된 메모가 없습니다.</div>
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                {notes.map((n) => (
                  <li key={n.id} className="px-3 py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{n.note}</p>
                      <div className="text-xs text-gray-400 mt-1">
                        {n.createdByName || n.createdBy?.slice(0, 8)} · {n.createdAt?.slice(0, 16).replace('T', ' ')}
                      </div>
                    </div>
                    <button
                      onClick={() => removeNote(n.id)}
                      disabled={noteBusy}
                      className="text-xs text-gray-400 hover:text-red-500 shrink-0 disabled:opacity-40"
                      title="숨김(soft delete)"
                    >
                      숨김
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </PanelSection>

          {/* 작업 이력 — 확실한 이벤트 source 타임라인 (read-only) */}
          <PanelSection title={`작업 이력 (${audit?.items.length ?? 0})`}>
            {audit && audit.items.length > 0 ? (
              <ol className="relative border-l border-gray-200 ml-2 pl-4 space-y-3">
                {audit.items.map((it) => (
                  <li key={it.id} className="relative">
                    <span className="absolute -left-[1.4rem] top-1 w-2 h-2 rounded-full bg-admin-blue" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <AuditActionBadge action={it.action} />
                      <span className="text-sm text-gray-800 truncate max-w-md">{it.summary}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {it.actorName || (it.actorId ? it.actorId.slice(0, 8) : '시스템')} · {it.occurredAt?.slice(0, 16).replace('T', ' ')}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-sm text-gray-400">
                현재 기록된 작업 이력이 없습니다. 향후 메모·이미지·설명 정비 action이 이 영역에 표시됩니다.
              </div>
            )}
            {audit && audit.gaps.length > 0 && (
              <details className="mt-3 text-xs text-gray-400">
                <summary className="cursor-pointer">아직 기록되지 않는 이력 영역 ({audit.gaps.length})</summary>
                <ul className="mt-1 space-y-1 pl-3 list-disc">
                  {audit.gaps.map((g) => <li key={g.area}><b>{g.area}</b> — {g.reason}</li>)}
                </ul>
              </details>
            )}
          </PanelSection>
        </div>
      )}

      {/* 상태 변경 모달 — WO-...-STATUS-ACTIONS-V1 */}
      <ProductMasterStatusModal
        target={statusTarget}
        onClose={() => setStatusTarget(null)}
        onDone={() => { setStatusTarget(null); reloadMaster(); reloadAudit(); }}
      />
    </div>
  );
}

/** 라벨-값 dl 리스트 섹션 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">{title}</div>
      <dl className="divide-y divide-gray-100">{children}</dl>
    </div>
  );
}

/** 자유 콘텐츠(이미지/설명/placeholder) 패널 섹션 — 헤더에 선택적 badge */
function PanelSection({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        {badge}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex px-4 py-2 text-sm">
      <dt className="w-40 shrink-0 text-gray-500">{label}</dt>
      <dd className="text-gray-900 break-all">{value ?? '—'}</dd>
    </div>
  );
}

function ThMini({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{children}</th>;
}
function TdMini({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top whitespace-nowrap ${className}`}>{children}</td>;
}

/** 이미지 배열 → 3상태 배지(대표 있음 / 대표 없음 / 없음) */
function ImageStatusBadge({ images }: { images?: { isPrimary: boolean }[] }) {
  const count = images?.length ?? 0;
  if (count === 0) return <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">없음</span>;
  if (images!.some((i) => i.isPrimary)) return <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs">대표 있음</span>;
  return <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs">대표 없음</span>;
}

/**
 * 이미지 썸네일 — onError fallback + (admin) 대표 지정 / 숨김 / 복원.
 * active: 대표 배지 + (비대표) 대표로 지정 + 숨김.  hidden: 숨김 오버레이 + 복원.
 */
function MasterThumb({ img, busy, hidden, onSetPrimary, onHide, onRestore }: {
  img: { id: string; imageUrl: string; isPrimary: boolean };
  busy: boolean;
  hidden?: boolean;
  onSetPrimary?: () => void;
  onHide?: () => void;
  onRestore?: () => void;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative">
      {broken ? (
        <div className="w-28 h-28 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">불러올 수 없음</div>
      ) : (
        <img
          src={img.imageUrl}
          alt=""
          className={`w-28 h-28 object-cover rounded border border-gray-200 ${hidden ? 'opacity-40 grayscale' : ''}`}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
      {!hidden && img.isPrimary && <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">대표</span>}
      {hidden && <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-gray-700/80 text-white text-[10px]">숨김</span>}

      {hidden ? (
        <button
          onClick={onRestore}
          disabled={busy}
          className="absolute bottom-1 left-1 right-1 px-1 py-0.5 rounded bg-white/90 border border-gray-200 text-[10px] text-gray-700 hover:bg-green-600 hover:text-white disabled:opacity-50"
        >
          복원
        </button>
      ) : (
        <div className="absolute bottom-1 left-1 right-1 flex gap-1">
          {!img.isPrimary && onSetPrimary && (
            <button
              onClick={onSetPrimary}
              disabled={busy}
              className="flex-1 px-1 py-0.5 rounded bg-white/90 border border-gray-200 text-[10px] text-gray-700 hover:bg-admin-blue hover:text-white disabled:opacity-50"
            >
              대표
            </button>
          )}
          {onHide && (
            <button
              onClick={onHide}
              disabled={busy}
              className="flex-1 px-1 py-0.5 rounded bg-white/90 border border-gray-200 text-[10px] text-gray-700 hover:bg-red-600 hover:text-white disabled:opacity-50"
            >
              숨김
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const AUDIT_ACTION_LABEL: Record<string, { label: string; cls: string }> = {
  note_created: { label: '메모 작성', cls: 'bg-blue-100 text-blue-700' },
  note_hidden: { label: '메모 숨김', cls: 'bg-gray-100 text-gray-500' },
  description_curated: { label: '설명 지정', cls: 'bg-green-100 text-green-700' },
  image_added: { label: '이미지 추가', cls: 'bg-amber-100 text-amber-700' },
  image_primary_changed: { label: '대표 지정', cls: 'bg-green-50 text-green-700' },
  image_hidden: { label: '이미지 숨김', cls: 'bg-gray-100 text-gray-500' },
  image_restored: { label: '이미지 복원', cls: 'bg-blue-50 text-blue-700' },
};
function AuditActionBadge({ action }: { action: string }) {
  const m = AUDIT_ACTION_LABEL[action] ?? { label: action, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

const DESCRIPTION_STATUS_TONE: Record<string, string> = {
  canonical: 'bg-green-100 text-green-700',
  candidate: 'bg-blue-50 text-blue-700',
  hidden: 'bg-gray-100 text-gray-500',
  deprecated: 'bg-gray-100 text-gray-400',
};
function DescriptionStatusBadge({ status }: { status: string }) {
  const tone = DESCRIPTION_STATUS_TONE[status] ?? 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded-full text-xs ${tone}`}>{status}</span>;
}

/** identifier 유형 한글 라벨 (표시용, 없으면 원본 코드) */
const IDENTIFIER_TYPE_LABEL: Record<string, string> = {
  GTIN: '바코드(GTIN)',
  EAN13: '바코드(EAN13)',
  UPC: '바코드(UPC)',
  JAN: '바코드(JAN)',
  INTERNAL_O4O: 'O4O 내부코드',
  SUPPLIER_SKU: '공급자 SKU',
  PHARMACY_LOCAL: '약국 로컬코드',
  STORE_LOCAL: '매장 로컬코드',
  KOREA_DRUG_CODE: '의약품 표준/약가코드',
  KOREA_INSURANCE_CODE: '보험코드',
  ATC_CODE: 'ATC 코드',
  MFDS_CODE: '식약처 코드',
  UDI_DI: '의료기기 UDI-DI',
  UNKNOWN: '기타',
};
function identifierTypeLabel(type: string): string {
  return IDENTIFIER_TYPE_LABEL[type] ?? type;
}

// ─── 매장용(STORE) 상세설명서 저작 (관리자 직접 등록 — 진입점 4) ──────────────────
// IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1 §5. createCandidate(STORE,manual)→setCanonical.
// 저장 즉시 매장 화면(/store/handled-products → b2c-descriptions)에서 조회된다.
const STORE_DESC_LANGS: Array<{ value: string; label: string }> = [
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '중국어' },
  { value: 'en', label: '영어' },
  { value: 'ja', label: '일본어' },
];
function StoreDescriptionPanel({ masterId }: { masterId: string }) {
  const [items, setItems] = useState<ProductMasterStoreDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState('ko');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    listProductMasterStoreDescriptions(masterId)
      .then((rows) => setItems(rows))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [masterId]);

  const save = async () => {
    if (!content.trim()) { setError('설명서 본문을 입력하세요'); return; }
    setBusy(true); setError(null);
    try {
      await saveProductMasterStoreDescription(masterId, { content, summary: summary || null, language });
      setContent(''); setSummary(''); setOpen(false);
      reload();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'STORE 설명서 저장에 실패했습니다');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelSection
      title={`매장용 상세설명서 (${items.length})`}
      badge={<span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">STORE</span>}
    >
      <p className="text-xs text-gray-400 mb-3">
        매장 화면(내 매장 취급상품 → 매장용 상세설명서)에서 조회되는 설명서입니다. 언어별 1건(canonical)으로 저장되며, 같은 언어를 다시 저장하면 대체됩니다.
      </p>

      {loading ? (
        <div className="text-sm text-gray-400">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-400">등록된 매장용 상세설명서가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <div key={d.id} className="flex items-center gap-2 text-sm border border-gray-100 rounded px-3 py-2">
              <span className="inline-block px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                {(d.language || 'ko').toUpperCase()} {d.status === 'canonical' ? '있음' : d.status}
              </span>
              <span className="text-gray-400 text-xs">{(d.updatedAt || '').slice(0, 10)}</span>
            </div>
          ))}
        </div>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 flex items-center gap-1.5 bg-admin-blue text-white px-3 py-2 rounded text-sm"
        >
          매장용 상세설명서 작성
        </button>
      ) : (
        <div className="mt-3 border border-gray-200 rounded p-3 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">언어</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {STORE_DESC_LANGS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="요약(선택)"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="본문 HTML(매장 화면에 그대로 렌더됩니다)"
            rows={10}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={busy} className="bg-admin-blue text-white px-3 py-2 rounded text-sm disabled:opacity-50">
              {busy ? '저장 중…' : '저장(canonical)'}
            </button>
            <button onClick={() => { setOpen(false); setError(null); }} disabled={busy} className="px-3 py-2 rounded text-sm border border-gray-300">
              취소
            </button>
          </div>
        </div>
      )}
    </PanelSection>
  );
}

// ─── 제품 QR / 랜딩 섹션 (WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1) ────────────────
// 제품 대표 QR(동적 생성·비저장) + 공개 랜딩 URL(neture.co.kr/p/{key}). 모든 제품이 보유.
function ProductQrSection({ masterId }: { masterId: string }) {
  const [qr, setQr] = useState<ProductLandingQr | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    getProductLandingQr(masterId, 320)
      .then((d) => { if (alive) setQr(d); })
      .catch((e: any) => { if (alive) setError(e?.response?.data?.error || 'QR 을 불러오지 못했습니다'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [masterId]);

  const copy = () => {
    if (!qr) return;
    navigator.clipboard?.writeText(qr.url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  const downloadSvg = () => {
    if (!qr) return;
    const blob = new Blob([qr.svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${qr.publicKey}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">제품 QR · 랜딩</h3>
      {loading ? (
        <div className="text-sm text-gray-400">QR 불러오는 중…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : qr ? (
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div
            className="w-40 h-40 shrink-0 border border-gray-200 rounded bg-white p-2 [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: qr.svg }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-gray-500 mb-1">공개 랜딩 주소</div>
            <div className="flex items-center gap-2 flex-wrap">
              <a href={qr.url} target="_blank" rel="noopener noreferrer" className="text-sm text-admin-blue hover:underline break-all">{qr.url}</a>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <button onClick={copy} className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">{copied ? '복사됨 ✓' : '주소 복사'}</button>
              <a href={qr.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">랜딩 열기</a>
              <button onClick={downloadSvg} className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">QR 내려받기(SVG)</button>
            </div>
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              이 QR 은 제품 대표 랜딩(<span className="font-mono">/p/{qr.publicKey}</span>)으로 연결됩니다. 스캔 시 제품 설명(있으면)·기본정보가 표시되며, QR 이미지는 저장하지 않고 매번 생성됩니다.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
