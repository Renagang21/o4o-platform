/**
 * Test Sample 5: Tailwind Edge Cases
 * Expected: Test various Tailwind utilities
 * Placeholders: 0-1 (pseudo-elements might become placeholders)
 */
export default function TailwindEdgeCases() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Opacity */}
      <div className="p-6 bg-blue-600 opacity-75 mb-8">
        <h2 className="text-2xl text-white">Opacity Test</h2>
      </div>

      {/* Drop Shadow */}
      <div className="p-6 bg-white drop-shadow-2xl mb-8 rounded-xl">
        <h2 className="text-2xl">Drop Shadow Test</h2>
      </div>

      {/* Flex Wrap */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="px-4 py-2 bg-red-500 text-white rounded">Tag 1</div>
        <div className="px-4 py-2 bg-green-500 text-white rounded">Tag 2</div>
        <div className="px-4 py-2 bg-blue-500 text-white rounded">Tag 3</div>
        <div className="px-4 py-2 bg-yellow-500 text-white rounded">Tag 4</div>
      </div>

      {/* Grid with 5 columns */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        <div className="p-3 bg-gray-200 rounded">1</div>
        <div className="p-3 bg-gray-300 rounded">2</div>
        <div className="p-3 bg-gray-400 rounded">3</div>
        <div className="p-3 bg-gray-500 rounded text-white">4</div>
        <div className="p-3 bg-gray-600 rounded text-white">5</div>
      </div>

      {/* Relative + Absolute positioning */}
      <div className="relative p-12 bg-purple-100 rounded-lg">
        <h3 className="text-xl mb-4">Relative Container</h3>
        <div className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white text-sm rounded">
          Badge
        </div>
        <p>Some content here</p>
      </div>

      {/* Backdrop Effects (might not map directly) */}
      <div className="mt-8 p-6 bg-white/50 backdrop-blur-sm rounded-lg">
        <h3 className="text-xl">Backdrop Blur Test</h3>
        <p className="text-gray-700">This has backdrop blur effect</p>
      </div>
    </div>
  );
}
