/**
 * Test Sample 3: Custom Components (Placeholder Test)
 * Expected: Some valid blocks + placeholders for custom components
 * Placeholders: 2-3 (Carousel, PricingCard, AnimatedCounter)
 */
import { Carousel } from './components/Carousel';
import { PricingCard } from './components/PricingCard';
import { AnimatedCounter } from './components/AnimatedCounter';

export default function CustomComponentsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-8">
        Our Products
      </h1>

      {/* Custom Carousel - should become placeholder */}
      <Carousel
        items={[
          { id: 1, title: 'Product 1' },
          { id: 2, title: 'Product 2' },
        ]}
        autoPlay={true}
        interval={3000}
      />

      <div className="grid grid-cols-3 gap-6 mt-12">
        {/* Custom PricingCard - should become placeholder */}
        <PricingCard
          title="Basic"
          price={29}
          features={['Feature 1', 'Feature 2']}
        />
        <PricingCard
          title="Pro"
          price={79}
          features={['All Basic', 'Feature 3', 'Feature 4']}
          highlighted={true}
        />
        <PricingCard
          title="Enterprise"
          price={199}
          features={['All Pro', 'Feature 5', 'Priority Support']}
        />
      </div>

      <div className="flex justify-center mt-12">
        <div className="text-center">
          <h2 className="text-3xl font-semibold mb-4">Our Users</h2>
          {/* Custom AnimatedCounter - should become placeholder */}
          <AnimatedCounter target={10000} duration={2000} />
        </div>
      </div>
    </div>
  );
}
