import { FC } from 'react';
import { useHomepageTemplate } from '../api/content/contentApi';
import TemplateRenderer from '../components/TemplateRenderer';
import HeroSection from '../components/home/HeroSection';
import StepGuide from '../components/home/StepGuide';
import TrustSlider from '../components/home/TrustSlider';
import BrandPreview from '../components/home/BrandPreview';
import Footer from '../components/home/Footer';

// Loading skeleton component
const HomepageSkeleton = () => (
  <div className="min-h-screen animate-pulse">
    <div className="h-[600px] bg-gray-200" />
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="space-y-8">
        <div className="h-32 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    </div>
  </div>
);

// Error component
const HomepageError = ({ error }: { error: Error }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Failed to load homepage</h1>
      <p className="text-gray-600">{error.message}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Retry
      </button>
    </div>
  </div>
);

// Fallback to static components
const StaticHomepage = () => (
  <>
    <HeroSection />
    <div className="max-w-7xl mx-auto px-4 py-16 space-y-24">
      <StepGuide />
      <TrustSlider />
      <BrandPreview />
    </div>
    <Footer />
  </>
);

const HomeDynamic: FC = () => {
  const { data, isLoading, isError, error } = useHomepageTemplate();

  // Show loading state
  if (isLoading) {
    return <HomepageSkeleton />;
  }

  // Show error state
  if (isError) {
    // Error logging - use proper error handler
    // Fallback to static homepage on error
    return <StaticHomepage />;
  }

  // If we have template data, render it dynamically
  if (data?.success && data.data.blocks && data.data.blocks.length > 0) {
    return (
      <div className="homepage-dynamic">
        <TemplateRenderer blocks={data.data.blocks} />
        <Footer />
      </div>
    );
  }

  // Fallback to static homepage if no blocks
  return <StaticHomepage />;
};

export default HomeDynamic;