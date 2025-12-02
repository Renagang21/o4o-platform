interface WishlistItem {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  price: number;
  inStock: boolean;
  addedAt: string;
}

interface WishlistListProps {
  items: WishlistItem[];
  total?: number;
}

export function WishlistList({ items, total }: WishlistListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">위시리스트</h1>
        {total !== undefined && (
          <div className="text-sm text-gray-600">{total}개 상품</div>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition"
            >
              <div className="relative">
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={item.productImage}
                    alt={item.productTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button className="absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:bg-red-50 transition">
                  <span className="text-red-500">❤️</span>
                </button>
                {!item.inStock && (
                  <div className="absolute bottom-0 left-0 right-0 bg-red-600 text-white text-center py-1 text-sm">
                    품절
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {item.productTitle}
                </h3>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-blue-600">
                    ₩{item.price.toLocaleString()}
                  </div>
                  {item.inStock && (
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition">
                      장바구니
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  추가: {new Date(item.addedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-6xl mb-4">💔</div>
          <p className="text-gray-500 mb-4">위시리스트가 비어있습니다</p>
          <a
            href="/shop"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            쇼핑하러 가기
          </a>
        </div>
      )}
    </div>
  );
}
