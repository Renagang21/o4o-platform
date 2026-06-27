/**
 * OperatorResourcesPage — /operator/resources (GlycoPharm)
 *
 * WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1:
 *   747-line 복사본을 OperatorResourcesConsolePage thin wrapper 로 정합.
 * WO-O4O-GP-KCOS-POP-QR-BLOG-AI-ENTRY-REMOVE-V1:
 *   페이지형 AI 자료 생성 진입(aiSlot "AI 콘텐츠 생성" → AiContentModal → operatorCreate) 제거.
 *   직접 자료 등록/관리 흐름은 공통 console 에서 그대로 유지. 공통 컴포넌트·백엔드 API 무변경.
 */

import { OperatorResourcesConsolePage } from '@o4o/operator-core-ui/modules/resources';
import { glycoResourcesApi } from '@/api/resources';

export default function OperatorResourcesPage() {
  return (
    <OperatorResourcesConsolePage
      serviceKey="glycopharm"
      client={glycoResourcesApi}
      policyBanner="숨김 처리한 자료는 자료실에서 보이지 않습니다. 삭제는 즉시 자료실에서 제거됩니다(soft delete)."
    />
  );
}
