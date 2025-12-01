/**
 * Test Sample 8: Transform, Transition, Animation
 * Tests Phase 7 motion utilities support
 */

export default function TransformAnimationPage() {
  return (
    <div className="px-4 py-16">
      {/* Transform Tests */}
      <div>
        <h1 className="text-4xl text-center mb-12">Transform & Animation Tests</h1>

        {/* Transform: Translate */}
        <div className="mb-8">
          <h2 className="text-2xl mb-4">Translate</h2>
          <div className="flex gap-4">
            <div className="p-4 bg-blue-500 rounded translate-x-4">
              Translate X +4
            </div>
            <div className="p-4 bg-green-500 rounded translate-y-2">
              Translate Y +2
            </div>
            <div className="p-4 bg-red-500 rounded translate-x-2 translate-y-2">
              Translate X+Y
            </div>
          </div>
        </div>

        {/* Transform: Scale */}
        <div className="mb-8">
          <h2 className="text-2xl mb-4">Scale</h2>
          <div className="flex gap-4">
            <div className="p-4 bg-purple-500 rounded scale-105">
              Scale 105
            </div>
            <div className="p-4 bg-yellow-500 rounded scale-110">
              Scale 110
            </div>
            <div className="p-4 bg-pink-500 rounded scale-95">
              Scale 95
            </div>
          </div>
        </div>

        {/* Transform: Rotate */}
        <div className="mb-8">
          <h2 className="text-2xl mb-4">Rotate</h2>
          <div className="flex gap-4">
            <div className="p-4 bg-indigo-500 rounded rotate-6">
              Rotate 6deg
            </div>
            <div className="p-4 bg-teal-500 rounded rotate-12">
              Rotate 12deg
            </div>
            <div className="p-4 bg-orange-500 rounded rotate-45">
              Rotate 45deg
            </div>
          </div>
        </div>

        {/* Transform: Skew */}
        <div className="mb-8">
          <h2 className="text-2xl mb-4">Skew</h2>
          <div className="flex gap-4">
            <div className="p-4 bg-cyan-500 rounded skew-x-6">
              Skew X 6deg
            </div>
            <div className="p-4 bg-lime-500 rounded skew-y-3">
              Skew Y 3deg
            </div>
          </div>
        </div>

        {/* Transform Origin */}
        <div className="mb-8">
          <h2 className="text-2xl mb-4">Transform Origin</h2>
          <div className="flex gap-4">
            <div className="p-4 bg-emerald-500 rounded origin-top-left rotate-12">
              Origin Top Left
            </div>
            <div className="p-4 bg-violet-500 rounded origin-center rotate-12">
              Origin Center
            </div>
            <div className="p-4 bg-fuchsia-500 rounded origin-bottom-right rotate-12">
              Origin Bottom Right
            </div>
          </div>
        </div>
      </div>

      {/* Transition Tests */}
      <div className="mt-16">
        <h1 className="text-3xl text-center mb-12">Transition Tests</h1>

        <div className="flex gap-8">
          {/* Transition Duration */}
          <div>
            <h3 className="text-xl mb-4">Duration</h3>
            <button className="px-6 py-3 bg-blue-600 text-white rounded transition duration-150">
              Duration 150ms
            </button>
          </div>

          {/* Transition Ease */}
          <div>
            <h3 className="text-xl mb-4">Easing</h3>
            <button className="px-6 py-3 bg-green-600 text-white rounded transition duration-300 ease-in-out">
              Ease In Out
            </button>
          </div>

          {/* Transition Colors */}
          <div>
            <h3 className="text-xl mb-4">Transition Colors</h3>
            <button className="px-6 py-3 bg-purple-600 text-white rounded transition-colors duration-200">
              Transition Colors
            </button>
          </div>
        </div>
      </div>

      {/* Animation Tests */}
      <div className="mt-16">
        <h1 className="text-3xl text-center mb-12">Animation Tests</h1>

        <div className="grid grid-cols-4 gap-8">
          {/* Spin */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p>Spin</p>
          </div>

          {/* Ping */}
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping"></div>
              <div className="relative w-16 h-16 bg-purple-600 rounded-full"></div>
            </div>
            <p>Ping</p>
          </div>

          {/* Pulse */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full animate-pulse"></div>
            <p>Pulse</p>
          </div>

          {/* Bounce */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500 rounded animate-bounce"></div>
            <p>Bounce</p>
          </div>
        </div>
      </div>

      {/* Combined Transform + Transition */}
      <div className="mt-16">
        <h1 className="text-3xl text-center mb-12">Combined: Transform + Transition</h1>

        <div className="flex justify-center gap-8">
          <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg transition duration-300 hover:scale-110 shadow-lg">
            Hover to Scale
          </button>

          <button className="px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg transition-all duration-300 hover:rotate-3 hover:shadow-2xl">
            Hover to Rotate
          </button>

          <button className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg transition-transform duration-200 hover:translate-y-1">
            Hover to Move
          </button>
        </div>
      </div>

      {/* Complex Card with Multiple Transforms */}
      <div className="mt-16">
        <h1 className="text-3xl text-center mb-12">Complex Card Example</h1>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="p-6">
              <div className="w-12 h-12 bg-blue-500 rounded-lg mb-4 animate-pulse"></div>
              <h3 className="text-2xl font-bold mb-2">Interactive Card</h3>
              <p className="text-gray-600 mb-4">
                This card demonstrates transform, transition, and animation working together.
              </p>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg transition-all duration-200 hover:bg-blue-700 hover:scale-105">
                Click Me
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
