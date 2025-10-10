/**
 * General Section Component
 * 일반 설정 섹션
 */

import React from 'react';
import { useCustomizer } from '../../context/CustomizerContext';
import { GeneralPanel } from '../../components/panels/GeneralPanel';

export const GeneralSection: React.FC = () => {
  const { state, setSettings } = useCustomizer();

  const handleChange = (generalSettings: any) => {
    setSettings({
      ...state.settings,
      scrollToTop: generalSettings.scrollToTop,
      buttons: generalSettings.buttons,
      breadcrumbs: generalSettings.breadcrumbs
    });
  };

  return (
    <GeneralPanel
      settings={{
        scrollToTop: state.settings.scrollToTop,
        buttons: state.settings.buttons,
        breadcrumbs: state.settings.breadcrumbs
      }}
      onChange={handleChange}
    />
  );
};