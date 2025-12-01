/**
 * Test Sample 4: Grid + Flex Mixed Layout
 * Expected: Complex nested layout with grid and flex
 * Placeholders: 0
 */
export default function GridFlexMix() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-5xl font-bold text-center mb-12">Features</h1>

      {/* Grid Container */}
      <div className="grid grid-cols-2 gap-8">
        {/* Column 1: Flex vertical */}
        <div className="flex flex-col gap-4 p-6 bg-blue-50 rounded-lg">
          <h2 className="text-3xl font-semibold">Design Tools</h2>
          <p className="text-gray-700">Create stunning designs with our intuitive tools</p>

          {/* Nested flex horizontal */}
          <div className="flex flex-row gap-2 mt-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded">
              Learn More
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Column 2: Flex with centering */}
        <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg">
          <h2 className="text-3xl font-semibold mb-4">Analytics</h2>
          <p className="text-center text-gray-700 mb-6">
            Track your performance with real-time analytics
          </p>
          <button className="px-6 py-3 bg-green-600 text-white rounded-lg">
            View Dashboard
          </button>
        </div>
      </div>

      {/* Grid with 4 columns */}
      <div className="grid grid-cols-4 gap-4 mt-12">
        <div className="p-4 bg-gray-100 rounded text-center">
          <h3 className="font-semibold">Metric 1</h3>
        </div>
        <div className="p-4 bg-gray-100 rounded text-center">
          <h3 className="font-semibold">Metric 2</h3>
        </div>
        <div className="p-4 bg-gray-100 rounded text-center">
          <h3 className="font-semibold">Metric 3</h3>
        </div>
        <div className="p-4 bg-gray-100 rounded text-center">
          <h3 className="font-semibold">Metric 4</h3>
        </div>
      </div>
    </div>
  );
}
