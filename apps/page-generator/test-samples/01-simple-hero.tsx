/**
 * Test Sample 1: Simple Hero Section
 * Expected: 3 blocks (heading, paragraph, button)
 * Placeholders: 0
 */
export default function SimpleHero() {
  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="text-5xl font-bold text-center text-gray-900 mb-4">
        Welcome to O4O Platform
      </h1>
      <p className="text-xl text-center text-gray-600 mb-8">
        Build amazing websites with AI-powered page generation
      </p>
      <div className="flex justify-center">
        <button className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg">
          Get Started
        </button>
      </div>
    </div>
  );
}
