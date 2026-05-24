/**
 * OperatorResourcesPage — /operator/resources (GlycoPharm)
 *
 * WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1:
 *   747-line 복사본을 OperatorResourcesConsolePage thin wrapper 로 정합.
 *   GP-only AiContentModal 기능은 aiSlot prop 으로 전달 — page 분리 회피.
 * 선행: WO-O4O-GLYCOPHARM-AI-CONTENT-ACTIVATION-V1 (AI 콘텐츠 생성 기능).
 */

import { OperatorResourcesConsolePage } from '@o4o/operator-core-ui/modules/resources';
import { AiContentModal } from '@o4o/content-editor';
import { getAccessToken } from '@o4o/auth-client';
import { glycoResourcesApi } from '@/api/resources';

export default function OperatorResourcesPage() {
  return (
    <OperatorResourcesConsolePage
      serviceKey="glycopharm"
      client={glycoResourcesApi}
      policyBanner="숨김 처리한 자료는 자료실에서 보이지 않습니다. 삭제는 즉시 자료실에서 제거됩니다(soft delete). AI로 생성된 자료는 초안 상태로 저장됩니다."
      aiSlot={{
        buttonLabel: 'AI 콘텐츠 생성',
        render: ({ open, onClose, onSaved }) => (
          <AiContentModal
            open={open}
            onClose={onClose}
            editor={null}
            onChannelSave={async (data) => {
              try {
                await glycoResourcesApi.operatorCreate({
                  title: data.title || '(AI 생성 자료)',
                  summary: data.summary ? data.summary.slice(0, 300) : undefined,
                  blocks: [{ type: 'html', content: data.html }],
                  source_type: 'manual',
                  usage_type: 'READ',
                  reusable_policy: 'platform',
                  status: 'draft',
                });
                onSaved();
                return { success: true, fieldLabel: '자료실' };
              } catch (err: any) {
                return { success: false, error: err?.message || '저장 중 오류가 발생했습니다' };
              }
            }}
            aiRequestHeaders={(() => {
              const token = getAccessToken();
              return token ? { Authorization: `Bearer ${token}` } : undefined;
            })()}
            headerLabel="AI 자료 생성"
          />
        ),
      }}
    />
  );
}
