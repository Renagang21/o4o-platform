// TipTap 블록 공통 모듈 import
// common-core 저장소의 tiptap-blocks 모듈을 사용

// TODO: 향후 common-core가 npm 패키지로 배포되면 변경
// import * from '@o4o/common-core/tiptap-blocks';

// 현재는 로컬 경로 사용 (개발 환경)
export * from '../../../../../common-core/src/tiptap-blocks';

// 또는 상대 경로로 직접 import
// export * from '../../../../../common-core/src/tiptap-blocks/types';
// export * from '../../../../../common-core/src/tiptap-blocks/css-system/css-generator';
// export * from '../../../../../common-core/src/tiptap-blocks/ui-components/base/UAGBPanel';
// export * from '../../../../../common-core/src/tiptap-blocks/ui-components/base/UAGBTabs';
// export * from '../../../../../common-core/src/tiptap-blocks/ui-components/form-controls/UAGBTextControl';
// export * from '../../../../../common-core/src/tiptap-blocks/utils';