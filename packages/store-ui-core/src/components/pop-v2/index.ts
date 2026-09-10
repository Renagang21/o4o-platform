/**
 * POP V2 공통 Core — WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 *          공통 POP V2 Core (이 폴더)
 *                  ↑
 *          KPA adapter / PH adapter
 *
 * 서비스는 PopV2Api 만 주입한다. 화면 본체를 복제하지 않는다.
 */

export { StorePopV2ListView } from './StorePopV2ListView';
export type { StorePopV2ListViewProps } from './StorePopV2ListView';

export { StorePopV2EditorView } from './StorePopV2EditorView';
export type { StorePopV2EditorViewProps } from './StorePopV2EditorView';

export { usePopV2List } from './usePopV2List';
export type { UsePopV2ListOptions, PopV2ListState } from './usePopV2List';

export { usePopV2Editor } from './usePopV2Editor';
export type { UsePopV2EditorOptions, PopV2EditorState } from './usePopV2Editor';

export { createPopV2Api } from './createPopV2Api';
export type {
  CreatePopV2ApiOptions,
  PopV2Request,
  PopV2RequestOptions,
} from './createPopV2Api';

export {
  POP_V2_CONTENT_TYPE_LABELS,
  POP_V2_RESOLVED_FROM_LABELS,
  POP_V2_STATUS_LABELS,
} from './types';

export type {
  PopV2Kind,
  PopV2ContentType,
  PopV2SourceOrigin,
  PopV2Status,
  PopV2Layout,
  PopV2Format,
  PopV2Source,
  PopV2Fields,
  PopV2Document,
  PopV2DocumentInput,
  PopV2ContentCandidate,
  PopV2ResolvedFrom,
  PopV2ResolvedSource,
  PopV2RenderResult,
  PopV2ProductOption,
  PopV2Api,
  PopV2Notify,
  PopV2AccentTheme,
  PopV2TemplateOption,
} from './types';
