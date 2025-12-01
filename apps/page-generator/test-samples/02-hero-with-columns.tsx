/**
 * Test Sample 2: Hero + 3 Columns + CTA
 * Expected: heading, paragraph, columns(3), button
 * Placeholders: 0
 */
export default function HeroWithColumns() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <h1 className="text-6xl font-bold text-center text-gray-900 mb-6">
          Revolutionary Platform
        </h1>
        <p className="text-2xl text-center text-gray-600 mb-12">
          Transform your workflow with cutting-edge technology
        </p>

        {/* 3 Columns */}
        <div className="grid grid-cols-3 gap-8 mb-12">
          <div className="p-6 bg-white rounded-lg">
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">Fast</h3>
            <p className="text-gray-600">Lightning-fast performance for your users</p>
          </div>
          <div className="p-6 bg-white rounded-lg">
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">Secure</h3>
            <p className="text-gray-600">Enterprise-grade security built-in</p>
          </div>
          <div className="p-6 bg-white rounded-lg">
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">Scalable</h3>
            <p className="text-gray-600">Grows with your business needs</p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <button className="px-12 py-5 bg-green-600 text-white text-xl rounded-full">
            Start Free Trial
          </button>
        </div>
      </section>
    </div>
  );
}
