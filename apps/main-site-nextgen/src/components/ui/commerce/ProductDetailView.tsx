interface ProductDetailViewProps {
  id: string;
  title: string;
  price: number;
  description: string;
  image: string;
  images?: string[];
  category: string;
  stock: number;
  specifications?: Record<string, string>;
  reviews?: {
    rating: number;
    count: number;
  };
}

export function ProductDetailView({
  title,
  price,
  description,
  image,
  images,
  category,
  stock,
  specifications,
  reviews,
}: ProductDetailViewProps) {
  const allImages = [image, ...(images || [])];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
            <img src={allImages[0]} alt={title} className="w-full h-full object-cover" />
          </div>
          {allImages.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {allImages.slice(1, 5).map((img, i) => (
                <div key={i} className="aspect-square rounded overflow-hidden bg-gray-100 cursor-pointer hover:opacity-75">
                  <img src={img} alt={`${title} ${i + 2}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">{category}</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            {reviews && (
              <div className="flex items-center gap-2 text-sm">
                <div className="text-yellow-500">★ {reviews.rating.toFixed(1)}</div>
                <div className="text-gray-500">({reviews.count} reviews)</div>
              </div>
            )}
          </div>

          <div className="text-3xl font-bold text-blue-600">
            ₩{price.toLocaleString()}
          </div>

          <div className="text-gray-700 leading-relaxed">{description}</div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Stock:</span>
            <span className={`text-sm font-medium ${stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stock > 0 ? `${stock} available` : 'Out of stock'}
            </span>
          </div>

          {specifications && Object.keys(specifications).length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Specifications</h3>
              <dl className="space-y-2">
                {Object.entries(specifications).map(([key, value]) => (
                  <div key={key} className="flex gap-4">
                    <dt className="text-sm text-gray-600 w-32">{key}</dt>
                    <dd className="text-sm font-medium flex-1">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="flex gap-4">
            <button className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
              Add to Cart
            </button>
            <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition">
              ♡
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
