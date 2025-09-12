import React from 'react';
import { AstraCustomizer } from './astra-customizer/AstraCustomizer';
import { useNavigate } from 'react-router-dom';

const Customize: React.FC = () => {
  const navigate = useNavigate();
  
  const handleClose = () => {
    navigate('/appearance/themes');
  };
  
  const handleSave = async (settings: any) => {
    console.log('Saving customizer settings:', settings);
    // TODO: Implement API call to save settings
    localStorage.setItem('astra-customizer-settings', JSON.stringify(settings));
  };
  
  return (
    <AstraCustomizer
      onClose={handleClose}
      previewUrl="/"
      siteName="O4O Platform"
      onSave={handleSave}
    />
  );
};

export default Customize;