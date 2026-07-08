/**
 * MediaPickerModal — K-Cosmetics wrapper
 *
 * WO-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1
 *
 * UI/로직은 공용 컴포넌트(@o4o/store-ui-core)로 통합됨. 이 파일은 K-Cosmetics 서비스의
 * mediaApi(IO 어댑터) + 운영자 권한만 주입하는 얇은 wrapper 이다.
 */

import { MediaPickerModal as SharedMediaPickerModal, type MediaAssetItem } from '@o4o/store-ui-core';
import { mediaApi } from '../../lib/api/media';
import { useAuth } from '../../contexts/AuthContext';

export type { MediaAssetItem };

export interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAssetItem) => void;
  title?: string;
  defaultFolder?: string;
}

export default function MediaPickerModal(props: MediaPickerModalProps) {
  const { user } = useAuth();
  const isOperator = user?.roles?.some((r: string) =>
    r.includes('admin') || r.includes('operator') || r.includes('super_admin')
  ) ?? false;

  return (
    <SharedMediaPickerModal
      {...props}
      api={mediaApi}
      isOperator={isOperator}
    />
  );
}
