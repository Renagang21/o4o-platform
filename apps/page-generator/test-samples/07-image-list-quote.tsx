// Test Sample 7: Image, List, Quote Blocks
// Phase 6: 실전 블록 강화 테스트

export default function ImageListQuotePage() {
  return (
    <div className="px-4 py-16">
      {/* Section 1: Image Block Tests */}
      <div className="mb-16">
        <h1 className="text-4xl text-center mb-8">Image Block Tests</h1>

        {/* Basic Image */}
        <div className="mb-8">
          <img
            src="https://via.placeholder.com/800x400"
            alt="Placeholder image"
            className="w-full"
          />
        </div>

        {/* Image with Object Fit and Rounded */}
        <div className="grid grid-cols-3 gap-4">
          <img
            src="https://via.placeholder.com/300x200"
            alt="Cover image"
            className="w-full h-48 object-cover rounded-lg"
          />
          <img
            src="https://via.placeholder.com/300x200"
            alt="Contain image"
            className="w-full h-48 object-contain rounded-xl"
          />
          <img
            src="https://via.placeholder.com/300x200"
            alt="Shadow image"
            className="w-full h-48 object-cover rounded-full shadow-lg"
          />
        </div>
      </div>

      {/* Section 2: List Block Tests */}
      <div className="mb-16">
        <h2 className="text-3xl mb-6">List Block Tests</h2>

        {/* Unordered List */}
        <div className="mb-8">
          <h3 className="text-xl mb-4">Features</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Fast and reliable performance</li>
            <li>Secure authentication system</li>
            <li>Real-time data synchronization</li>
            <li>Responsive design</li>
          </ul>
        </div>

        {/* Ordered List */}
        <div className="mb-8">
          <h3 className="text-xl mb-4">Installation Steps</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Download the package</li>
            <li>Install dependencies</li>
            <li>Configure environment variables</li>
            <li>Run the application</li>
          </ol>
        </div>

        {/* Nested List */}
        <div className="mb-8">
          <h3 className="text-xl mb-4">Project Structure</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Frontend
              <ul className="list-circle list-inside ml-6 mt-2 space-y-1">
                <li>React components</li>
                <li>Tailwind CSS</li>
                <li>State management</li>
              </ul>
            </li>
            <li>Backend
              <ul className="list-circle list-inside ml-6 mt-2 space-y-1">
                <li>Node.js server</li>
                <li>Database models</li>
                <li>API routes</li>
              </ul>
            </li>
          </ul>
        </div>
      </div>

      {/* Section 3: Quote Block Tests */}
      <div className="mb-16">
        <h2 className="text-3xl mb-6">Quote Block Tests</h2>

        {/* Simple Quote */}
        <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-8">
          <p className="text-lg italic text-gray-700">
            "The best way to predict the future is to invent it."
          </p>
        </blockquote>

        {/* Quote with Attribution */}
        <blockquote className="border-l-4 border-green-600 pl-6 py-4 mb-8 bg-gray-50 rounded">
          <p className="text-xl italic text-gray-800 mb-2">
            "Stay hungry, stay foolish."
          </p>
          <footer className="text-sm text-gray-600">
            — Steve Jobs
          </footer>
        </blockquote>

        {/* Quote with Background and Shadow */}
        <blockquote className="border-l-4 border-purple-500 pl-6 py-6 bg-purple-50 rounded-lg shadow-md">
          <p className="text-lg italic text-gray-900 mb-3">
            "Innovation distinguishes between a leader and a follower."
          </p>
          <footer className="text-sm text-purple-700 font-semibold">
            — Steve Jobs, Apple Inc.
          </footer>
        </blockquote>
      </div>

      {/* Section 4: Mixed Content */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <img
            src="https://via.placeholder.com/400x300"
            alt="Article image"
            className="w-full h-64 object-cover rounded-lg shadow-xl mb-4"
          />
          <h3 className="text-2xl mb-3">Article Title</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Key point one</li>
            <li>Key point two</li>
            <li>Key point three</li>
          </ul>
        </div>
        <div>
          <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 mb-6">
            <p className="text-lg italic">
              "Quality is not an act, it is a habit."
            </p>
          </blockquote>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Step one: Research</li>
            <li>Step two: Plan</li>
            <li>Step three: Execute</li>
            <li>Step four: Review</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
