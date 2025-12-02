interface Slide {
  id: string;
  title: string;
  description?: string;
  json: any;
  thumbnail?: string;
  duration: number;
  category?: string;
  tags?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SlideCardProps {
  slides: Slide[];
}

export function SlideCard({ slides }: SlideCardProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slides</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your digital signage content slides
          </p>
        </div>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Create Slide
        </button>
      </div>

      {slides.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600">No slides created yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Create your first slide to display content
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {slide.thumbnail ? (
                <img
                  src={slide.thumbnail}
                  alt={slide.title}
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div className="h-48 w-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  <span className="text-6xl">🖼️</span>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {slide.title}
                    </h3>
                    {slide.description && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {slide.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      slide.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {slide.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">⏱️</span>
                    <span>{slide.duration}s duration</span>
                  </div>
                  {slide.category && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">📁</span>
                      <span>{slide.category}</span>
                    </div>
                  )}
                  {slide.tags && slide.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {slide.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                        >
                          {tag}
                        </span>
                      ))}
                      {slide.tags.length > 3 && (
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                          +{slide.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Updated {formatDate(slide.updatedAt)}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                    Edit
                  </button>
                  <button className="flex-1 rounded bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                    Preview
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
