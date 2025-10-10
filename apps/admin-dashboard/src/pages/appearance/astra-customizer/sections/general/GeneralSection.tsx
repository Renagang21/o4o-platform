/**
 * General Section Component
 * 일반 설정 섹션
 */

import React, { useContext } from 'react';
import { CustomizerContext } from '../../context/CustomizerContext';
import { GeneralPanel } from '../../components/panels/GeneralPanel';

export const GeneralSection: React.FC = () => {
  const { settings, updateSettings } = useContext(CustomizerContext);

  const handleChange = (generalSettings: any) => {
    updateSettings({
      ...settings,
      scrollToTop: generalSettings.scrollToTop,
      buttons: generalSettings.buttons,
      breadcrumbs: generalSettings.breadcrumbs
    });
  };

  return (
    <GeneralPanel
      settings={{
        scrollToTop: settings.scrollToTop,
        buttons: settings.buttons,
        breadcrumbs: settings.breadcrumbs
      }}
      onChange={handleChange}
    />
  );
};