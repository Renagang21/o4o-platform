import React from 'react';
import HeroSection from '../components/home/HeroSection';
import StepGuide from '../components/home/StepGuide';
import TrustSlider from '../components/home/TrustSlider';
import BrandPreview from '../components/home/BrandPreview';
import Footer from '../components/home/Footer';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <StepGuide />
      <TrustSlider />
      <BrandPreview />
      <Footer />
    </div>
  );
};

export default Home; 