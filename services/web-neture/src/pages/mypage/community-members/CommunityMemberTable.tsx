import {
  canApproveJoin,
  type JoinRequestRow,
} from '../../../lib/api/communityOperator';
import {
  MEMBER_ROLE_LABEL,
  MEMBER_STATUS_LABEL,
  type MemberAction,
} from './memberWorkflow';

export function CommunityMemberTable({
  rows,
  locked,
  canRestrict,
  onAction,
  onHistory,
}: {
  rows: JoinRequestRow[];
  locked: boolean;
  canRestrict: boolean;
  onAction: (row: JoinRequestRow, action: MemberAction) => void;
  onHistory: (row: JoinRequestRow) => void;
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            <th className="py-2">이름</th>
            <th>이메일</th>
            <th>서비스 이용</th>
            <th>역할</th>
            <th>신청일</th>
            <th className="text-right">처리</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-100">
              <td className="py-2 text-gray-800">{row.name ?? '-'}</td>
              <td className="text-gray-600">{row.emailMasked ?? '-'}</td>
              <td>
                {row.serviceMembershipStatus
                  ? (MEMBER_STATUS_LABEL[row.serviceMembershipStatus] ??
                    row.serviceMembershipStatus)
                  : '미가입'}
              </td>
              <td>{MEMBER_ROLE_LABEL[row.role]}</td>
              <td>{new Date(row.createdAt).toLocaleDateString('ko-KR')}</td>
              <td className="whitespace-nowrap py-2 text-right">
                {row.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      disabled={locked || !canApproveJoin(row)}
                      title={
                        canApproveJoin(row)
                          ? undefined
                          : '서비스 가입이 비활성 상태입니다. 서비스 회원 관리에서 처리한 뒤 승인해 주세요.'
                      }
                      className="min-h-11 rounded bg-primary-600 px-3 text-xs text-white disabled:opacity-50"
                      onClick={() => onAction(row, 'approve')}
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      disabled={locked}
                      className="ml-2 min-h-11 rounded border px-3 text-xs disabled:opacity-50"
                      onClick={() => onAction(row, 'reject')}
                    >
                      거절
                    </button>
                  </>
                )}
                {canRestrict && (
                  <button
                    type="button"
                    disabled={locked}
                    className="ml-2 min-h-11 rounded border px-3 text-xs disabled:opacity-50"
                    onClick={() => onHistory(row)}
                  >
                    이력
                  </button>
                )}
                {canRestrict &&
                  (row.status === 'active' || row.status === 'suspended') && (
                    <>
                      <button
                        type="button"
                        disabled={locked}
                        className="ml-2 min-h-11 rounded border px-3 text-xs disabled:opacity-50"
                        onClick={() =>
                          onAction(
                            row,
                            row.status === 'active' ? 'suspend' : 'restore',
                          )
                        }
                      >
                        {row.status === 'active' ? '정지' : '정지 해제'}
                      </button>
                      <button
                        type="button"
                        disabled={locked}
                        className="ml-2 min-h-11 rounded border border-red-300 px-3 text-xs text-red-700 disabled:opacity-50"
                        onClick={() => onAction(row, 'withdraw')}
                      >
                        커뮤니티 탈퇴
                      </button>
                    </>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
