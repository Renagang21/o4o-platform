/**
 * OperatorSemiFranchisePage — 담당 약국 협력사업 (/operator/semi-franchises)
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 · DESIGN §3-2 · §3-4 · §3-5 · §3-6
 *   담당 지정된 약국 협력사업만 보인다(담당 관계는 API 가 판정 — 아니면 403).
 *   탭: 가입 신청 / 공급 제안 / 이벤트 / 모집 조건 / 콘텐츠.
 *   콘텐츠: 운영자가 작성 · 게시. 게시본은 활성 가입 약국만 열람하고 매장 사본으로 복사한다.
 *   ?key=&tab= 쿼리로 약국 협력사업 · 탭을 지정해 진입할 수 있다(콘텐츠 작성 화면 복귀용).
 *   가입 신청 목록은 내 매장(약국) 신청 원장의 사업자번호 · 면허번호 · 내 매장 신청 상태를 함께 보여준다.
 *   승인 시 서버가 신청자의 Neture 가입 승인(active)을 직접 확인한다(아니면 409).
 */
import type { ReactNode } from 'react';
import type { Tab } from './assignedBusinessModel';
import { Link } from 'react-router-dom';
import {
  neturePharmacyOperatorApi as api,
  MEMBERSHIP_ACTIONS_BY_STATUS,
  formatDateTime,
  formatWon,
  type SemiFranchise,
  type SemiFranchiseContent,
  type SemiFranchiseEvent,
  type SemiFranchiseMembership,
  type SemiFranchiseRecruitment,
  type SupplyProposal,
} from './api';
import {
  ActionButton,
  EmptyRow,
  Message,
  PageHeader,
  StatusBadge,
  StatusFilter,
  TD,
  TH,
} from './PharmacyCommerceUi';
import { TABS, FILTERS, PROPOSAL_ACTIONS, EVENT_ACTIONS, CONTENT_ACTIONS, RECRUITMENT_ACTIONS } from './assignedBusinessModel';
import { useAssignedBusinessWorkspace } from './useAssignedBusinessWorkspace';
import { BusinessDecisionDialog } from './BusinessDecisionDialog';

type BusinessPageProps = Readonly<{
  businessKey?: string;
  contentEditHref?: (businessKey: string, contentId?: string) => string;
  tabs?: readonly Tab[];
  forumHref?: (business: SemiFranchise) => string;
  renderBusinessHome?: (business: SemiFranchise) => ReactNode;
}>;

export default function OperatorSemiFranchisePage(props: BusinessPageProps = {}) {
  return <AssignedBusinessPanel key={props.businessKey ?? 'all'} {...props} />;
}

function AssignedBusinessPanel({ businessKey, forumHref, renderBusinessHome, contentEditHref, tabs }: BusinessPageProps) {
  const workspace = useAssignedBusinessWorkspace(businessKey, tabs);
  const {
    franchises, sfKey, tab, status, rows, loading, busyId, message, loadError, assignmentError,
    interactionLocked, decision, reason, setReason, decisionError, run, confirmDecision, cancelDecision,
    load, retryAssignments, selectBusiness, selectTab, selectStatus,
  } = workspace;

  const positive = (a: string) => a === 'approve' || a === 'reactivate';

  if (assignmentError) return <div role="alert" className="space-y-3 p-6 text-sm text-red-700">
    <p>{assignmentError}</p><button type="button" className="rounded border px-3 py-2" onClick={retryAssignments}>담당 사업 다시 조회</button>
  </div>;

  if (franchises === null) {
    return <div className="p-6 text-sm text-gray-500">불러오는 중...</div>;
  }

  if (franchises.length === 0) {
    return (
      <div className="space-y-4 p-6">
        <PageHeader title="담당 약국 협력사업" />
        <Message message={message} />
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          담당으로 지정된 약국 협력사업이 없습니다. 전체 관리자에게 담당 지정을 요청하세요.
        </div>
      </div>
    );
  }

  const currentBusiness = franchises.find(f => f.key === sfKey);
  return (
    <div className="space-y-4 p-6">
      {decision && <BusinessDecisionDialog decision={decision} businessName={currentBusiness?.name || sfKey}
        reason={reason} onReasonChange={setReason} error={decisionError} saving={busyId !== null}
        onConfirm={() => void confirmDecision()} onCancel={cancelDecision} />}
      <PageHeader title="담당 약국 협력사업" description="담당으로 지정된 약국 협력사업의 가입 · 공급 제안 · 이벤트 · 모집 조건 · 콘텐츠를 처리합니다.">
        <select
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={sfKey}
          aria-label="담당 사업"
          disabled={interactionLocked}
          onChange={(e) => selectBusiness(e.target.value)}
        >
          {franchises.map((f) => (
            <option key={f.key} value={f.key}>
              {f.name} ({f.key}){f.status === 'closed' ? ' · 마감' : ''}
            </option>
          ))}
        </select>
      </PageHeader>

      <BusinessNavigation business={currentBusiness} forumHref={forumHref} renderBusinessHome={renderBusinessHome} />
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.filter(t => !tabs || tabs.includes(t.key)).map((t) => (
          <button
            key={t.key}
            type="button"
            disabled={interactionLocked}
            onClick={() => selectTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'contents' && (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <ul className="list-disc space-y-1 pl-5">
            <li>공급자가 요청한 자료는 검토 대기 상태입니다. 내용을 확인한 후 승인·게시하거나 사유를 적어 반려하세요. 커뮤니티에는 게시되지 않습니다.</li>
            <li>게시된 콘텐츠는 이 약국 협력사업에 활성 가입한 약국에만 보입니다.</li>
            <li>약국은 게시된 콘텐츠를 자기 매장 사본으로 복사해 씁니다. 이후 여기서 수정해도 이미 만든 매장 사본에는 반영되지 않습니다.</li>
            <li>보관하면 약국 화면에서 내려가지만, 이미 만든 매장 사본은 그대로 남습니다.</li>
          </ul>
          <Link
            to={contentEditHref?.(sfKey) ?? `/operator/semi-franchises/${encodeURIComponent(sfKey)}/contents/new`}
            className="shrink-0 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            콘텐츠 작성
          </Link>
        </div>
      )}

      <fieldset disabled={interactionLocked}>
        <StatusFilter value={status} options={FILTERS[tab]} onChange={selectStatus} />
      </fieldset>
      <Message message={message} />
      {loadError && <div role="alert" className="space-y-2 text-sm text-red-700">
        <p>{loadError}</p><button type="button" className="rounded border px-3 py-2" onClick={() => void load()}>목록 다시 조회</button>
      </div>}

      {!loadError && <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {tab === 'memberships' && (
          <table className="w-full min-w-[640px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH}>약국</th>
                <th className={TH}>사업자등록번호</th>
                <th className={TH}>약사 면허번호</th>
                <th className={TH}>내 매장 신청</th>
                <th className={TH}>신청일</th>
                <th className={TH}>상태</th>
                <th className={TH}>처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <EmptyRow colSpan={7} text="불러오는 중..." />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={7} text="해당하는 가입 신청이 없습니다." />
              ) : (
                (rows as SemiFranchiseMembership[]).map((m) => (
                  <tr key={m.id}>
                    <td className={TD}>
                      <div className="font-medium text-gray-900">{m.organizationName || '-'}</div>
                      {m.application?.note && <p className="text-xs whitespace-pre-wrap">신청 내용: {m.application.note}</p>}
                      {m.application?.conditions && <p className="text-xs whitespace-pre-wrap">신청 시 가입 조건: {m.application.conditions}</p>}
                      {m.organizationAddress && <div className="text-xs text-gray-500">{m.organizationAddress}</div>}
                    </td>
                    <td className={TD}>{m.businessNumber || '-'}</td>
                    <td className={TD}>{m.pharmacistLicenseNumber || '-'}</td>
                    <td className={TD}>{m.basicMembershipStatus ? <StatusBadge status={m.basicMembershipStatus} /> : '-'}</td>
                    <td className={TD}>{formatDateTime(m.appliedAt)}</td>
                    <td className={TD}>
                      <StatusBadge status={m.status} />
                      {m.reason && <div className="mt-1 text-xs text-gray-500">{m.reason}</div>}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1">
                        {(MEMBERSHIP_ACTIONS_BY_STATUS[m.status] ?? []).map((a) => (
                          <ActionButton
                            key={a.action}
                            label={a.label}
                            action={a.action}
                            disabled={interactionLocked || loading}
                            onClick={() =>
                              run(m.id, a.label, !positive(a.action), (reason) => api.decideSfMembership(sfKey, m.id, a.action, reason), m.organizationName || m.id)
                            }
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === 'proposals' && (
          <table className="w-full min-w-[640px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH}>제품</th>
                <th className={TH}>공급자</th>
                <th className={TH}>제안 가격</th>
                <th className={TH}>대상</th>
                <th className={TH}>메모</th>
                <th className={TH}>상태</th>
                <th className={TH}>처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <EmptyRow colSpan={7} text="불러오는 중..." />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={7} text="해당하는 공급 제안이 없습니다." />
              ) : (
                (rows as SupplyProposal[]).map((p) => (
                  <tr key={p.id}>
                    <td className={TD}>
                      <div className="font-medium text-gray-900">{p.productName}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(p.createdAt)}</div>
                    </td>
                    <td className={TD}>{p.supplierName || '-'}</td>
                    <td className={TD}>
                      {formatWon(p.unitPrice)}
                      {p.priceGeneral !== null && <div className="text-xs text-gray-500">공급가 {formatWon(p.priceGeneral)}</div>}
                    </td>
                    <td className={TD}>{p.targetOrganizationName || '약국 협력사업 전체'}</td>
                    <td className={TD}>{p.note || '-'}</td>
                    <td className={TD}>
                      <StatusBadge status={p.status} />
                      {p.reason && <div className="mt-1 text-xs text-gray-500">{p.reason}</div>}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1">
                        {(PROPOSAL_ACTIONS[p.status] ?? []).map((a) => (
                          <ActionButton
                            key={a.action}
                            label={a.label}
                            action={a.action}
                            disabled={interactionLocked || loading}
                            onClick={() =>
                              run(p.id, a.label, !positive(a.action), (reason) => api.decideProposal(sfKey, p.id, a.action, reason), p.productName)
                            }
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === 'events' && (
          <table className="w-full min-w-[640px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH}>제품</th>
                <th className={TH}>공급자</th>
                <th className={TH}>이벤트 가격</th>
                <th className={TH}>기간</th>
                <th className={TH}>수량 · 한도</th>
                <th className={TH}>상태</th>
                <th className={TH}>처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <EmptyRow colSpan={7} text="불러오는 중..." />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={7} text="해당하는 이벤트가 없습니다." />
              ) : (
                (rows as SemiFranchiseEvent[]).map((ev) => (
                  <tr key={ev.id}>
                    <td className={TD}>
                      <div className="font-medium text-gray-900">{ev.productName}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(ev.createdAt)}</div>
                    </td>
                    <td className={TD}>{ev.supplierName || '-'}</td>
                    <td className={TD}>
                      {formatWon(ev.eventPrice)}
                      {ev.priceGeneral !== null && <div className="text-xs text-gray-500">공급가 {formatWon(ev.priceGeneral)}</div>}
                    </td>
                    <td className={TD}>
                      {formatDateTime(ev.startAt)}
                      <div className="text-xs text-gray-500">~ {formatDateTime(ev.endAt)}</div>
                    </td>
                    <td className={TD}>
                      <div className="text-xs">총 {ev.totalQuantity ?? '제한 없음'}</div>
                      <div className="text-xs">매장당 {ev.perStoreLimit ?? '-'} · 주문당 {ev.perOrderLimit ?? '-'}</div>
                    </td>
                    <td className={TD}>
                      <StatusBadge status={ev.status} />
                      {ev.reason && <div className="mt-1 text-xs text-gray-500">{ev.reason}</div>}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1">
                        {(EVENT_ACTIONS[ev.status] ?? []).map((a) => (
                          <ActionButton
                            key={a.action}
                            label={a.label}
                            action={a.action}
                            disabled={interactionLocked || loading}
                            onClick={() =>
                              run(ev.id, a.label, !positive(a.action), (reason) => api.decideEvent(sfKey, ev.id, a.action, reason), ev.productName)
                            }
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === 'recruitments' && (
          <table className="w-full min-w-[640px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH}>제품</th>
                <th className={TH}>공급자</th>
                <th className={TH}>모집 공급가</th>
                <th className={TH}>소비자가</th>
                <th className={TH}>모집 상태</th>
                <th className={TH}>조건 승인</th>
                <th className={TH}>처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <EmptyRow colSpan={7} text="불러오는 중..." />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={7} text="해당하는 모집 조건이 없습니다." />
              ) : (
                (rows as SemiFranchiseRecruitment[]).map((r) => (
                  <tr key={r.id}>
                    <td className={TD}>
                      <div className="font-medium text-gray-900">{r.productName}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(r.createdAt)}</div>
                    </td>
                    <td className={TD}>{r.supplierName || '-'}</td>
                    <td className={TD}>{formatWon(r.supplyUnitPrice)}</td>
                    <td className={TD}>{r.consumerPrice ? formatWon(r.consumerPrice) : '-'}</td>
                    <td className={TD}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className={TD}>
                      <StatusBadge status={r.exposureStatus} />
                      {r.exposureReviewNote && <div className="mt-1 text-xs text-gray-500">{r.exposureReviewNote}</div>}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1">
                        {(RECRUITMENT_ACTIONS[r.exposureStatus] ?? []).map((a) => (
                          <ActionButton
                            key={a.action}
                            label={a.label}
                            action={a.action}
                            disabled={interactionLocked || loading}
                            onClick={() =>
                              run(r.id, a.label, a.action === 'reject', (note) => api.decideRecruitment(sfKey, r.id, a.action, note), r.productName)
                            }
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === 'contents' && <OperatorContentsTable workspace={workspace} contentEditHref={contentEditHref} />}
      </div>}
    </div>
  );
}


function BusinessNavigation({ business, forumHref, renderBusinessHome }: {
  business: SemiFranchise | undefined;
  forumHref?: BusinessPageProps['forumHref'];
  renderBusinessHome?: BusinessPageProps['renderBusinessHome'];
}) {
  if (business?.status !== 'active') return null;
  const forum = forumHref?.(business) ?? `/communities/${encodeURIComponent(business.community_key || `business:${business.key}`)}/forum`;
  return <nav aria-label="담당 사업 커뮤니티" className="flex flex-wrap gap-3 rounded-lg border bg-white p-4 text-sm text-primary-700">
    {renderBusinessHome?.(business)}
    <Link to={forum}>참여자 게시판</Link>
    <p className="text-gray-600">회원 안내는 참여자 게시판의 공지로, 배포 자료는 콘텐츠 탭에서 관리합니다.</p>
  </nav>;
}


function OperatorContentsTable({ workspace, contentEditHref }: Readonly<{ workspace: ReturnType<typeof useAssignedBusinessWorkspace>; contentEditHref?: BusinessPageProps["contentEditHref"] }>) {
  const { rows, loading, interactionLocked, sfKey, run } = workspace;
  let contentRows: ReactNode;
  if (loading) contentRows = <EmptyRow colSpan={6} text="불러오는 중..." />;
  else if (!rows.length) contentRows = <EmptyRow colSpan={6} text="해당하는 콘텐츠가 없습니다." />;
  else contentRows = (rows as SemiFranchiseContent[]).map((c) => (
                  <tr key={c.id}>
                    <td className={TD}>
                      <div className="font-medium text-gray-900">{c.title}</div>
                      {c.sourceItemId && <div className="text-xs text-blue-700">공급자 등재 요청</div>}
                      {c.summary && <div className="text-xs text-gray-500">{c.summary}</div>}
                    </td>
                    <td className={TD}>{c.tags?.length ? c.tags.join(', ') : '-'}</td>
                    <td className={TD}>{formatDateTime(c.publishedAt)}</td>
                    <td className={TD}>{formatDateTime(c.updatedAt)}</td>
                    <td className={TD}>
                      <StatusBadge status={c.status} />
                      {c.reviewReason && <p className="text-xs text-gray-500">{c.reviewReason}</p>}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1">
                        {!['archived', 'rejected'].includes(c.status) && (
                          <Link
                            to={contentEditHref?.(sfKey, c.id) ?? `/operator/semi-franchises/${encodeURIComponent(sfKey)}/contents/${encodeURIComponent(c.id)}/edit`}
                            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            수정
                          </Link>
                        )}
                        {(c.sourceItemId && c.status === 'archived' ? [] : CONTENT_ACTIONS[c.status] ?? []).map((a) => (
                          <ActionButton
                            key={a.action}
                            label={a.label}
                            action={a.action}
                            disabled={interactionLocked || loading}
                            onClick={() => run(c.id, a.label, a.action === 'reject', (reason) => api.setContentStatus(sfKey, c.id, a.action, reason), c.title, a.action === 'reject')}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ));
  return (<table className="w-full min-w-[640px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH}>제목</th>
                <th className={TH}>태그</th>
                <th className={TH}>게시일</th>
                <th className={TH}>수정일</th>
                <th className={TH}>상태</th>
                <th className={TH}>처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contentRows}
            </tbody>
          </table>);
}
