import { FC, useState  } from 'react';
import { formatDateFromNow } from '@o4o/utils';
import type { ShortcodeProps, ShortcodeDefinition } from '@o4o/shortcodes';

interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  helpful: number;
  images?: string[];
}

interface CustomerReviewsProps {
  productId?: string;
  limit?: number;
  sort?: 'newest' | 'helpful' | 'rating-high' | 'rating-low';
  showImages?: boolean;
  showVerified?: boolean;
  minRating?: number;
}

const CustomerReviewsComponent: FC<CustomerReviewsProps> = ({
  productId: _productId,  // In real app, this would be used to fetch reviews
  limit = 10,
  sort = 'newest',
  showImages = true,
  showVerified = true,
  minRating = 0
}) => {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set());

  // Mock reviews data - in real app, this would come from API
  const mockReviews: Review[] = [
    {
      id: '1',
      author: 'John Doe',
      rating: 5,
      date: new Date(Date.now() - 86400000).toISOString(),
      comment: 'Excellent product! Exactly what I was looking for. High quality and fast shipping.',
      verified: true,
      helpful: 15,
      images: ['/api/placeholder/100/100']
    },
    {
      id: '2',
      author: 'Jane Smith',
      rating: 4,
      date: new Date(Date.now() - 172800000).toISOString(),
      comment: 'Good quality overall. The size runs a bit small, so order one size up.',
      verified: true,
      helpful: 8
    },
    {
      id: '3',
      author: 'Mike Johnson',
      rating: 5,
      date: new Date(Date.now() - 259200000).toISOString(),
      comment: 'Amazing! Best purchase I\'ve made this year. Highly recommend!',
      verified: false,
      helpful: 5
    },
    {
      id: '4',
      author: 'Sarah Williams',
      rating: 3,
      date: new Date(Date.now() - 345600000).toISOString(),
      comment: 'It\'s okay. Not bad but not great either. Average quality for the price.',
      verified: true,
      helpful: 3
    },
    {
      id: '5',
      author: 'Robert Brown',
      rating: 5,
      date: new Date(Date.now() - 432000000).toISOString(),
      comment: 'Perfect! Love everything about it. Will definitely buy again.',
      verified: true,
      helpful: 12,
      images: ['/api/placeholder/100/100', '/api/placeholder/100/100']
    }
  ];

  // Filter and sort reviews
  let filteredReviews = mockReviews
    .filter(review => review.rating >= minRating)
    .filter(review => selectedRating === null || review.rating === selectedRating);

  // Sort reviews
  filteredReviews.sort((a, b) => {
    switch (sort) {
      case 'helpful':
        return b.helpful - a.helpful;
      case 'rating-high':
        return b.rating - a.rating;
      case 'rating-low':
        return a.rating - b.rating;
      case 'newest':
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  // Limit reviews
  const displayReviews = filteredReviews.slice(0, limit);

  // Calculate rating summary
  const ratingCounts = mockReviews.reduce((acc, review) => {
    acc[review.rating] = (acc[review.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const totalReviews = mockReviews.length;
  const averageRating = mockReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

  const handleHelpful = (reviewId: string) => {
    setHelpfulReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Rating Summary */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center">
              <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
              <div className="ml-2 flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-6 h-6 ${i < Math.floor(averageRating) ? 'fill-current' : 'stroke-current'}`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-gray-600 mt-1">Based on {totalReviews} reviews</p>
          </div>
          
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map(rating => (
              <button
                key={rating}
                onClick={() => setSelectedRating(selectedRating === rating ? null : rating)}
                className={`flex items-center text-sm hover:bg-gray-100 px-2 py-1 rounded ${
                  selectedRating === rating ? 'bg-gray-200' : ''
                }`}
              >
                <span className="w-4">{rating}</span>
                <div className="flex text-yellow-400 mx-2">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-3 h-3 ${i < rating ? 'fill-current' : 'stroke-current'}`}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2 ml-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{ width: `${((ratingCounts[rating] || 0) / totalReviews) * 100}%` }}
                  />
                </div>
                <span className="ml-2 text-gray-600">({ratingCounts[rating] || 0})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {displayReviews.map((review) => (
          <div key={review.id} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center">
                  <span className="font-semibold">{review.author}</span>
                  {showVerified && review.verified && (
                    <span className="ml-2 text-green-600 text-sm flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified Purchase
                    </span>
                  )}
                </div>
                <div className="flex items-center mt-1">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'stroke-current'}`}
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-500">
                    {formatDateFromNow(review.date)}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-gray-700 mb-3">{review.comment}</p>

            {showImages && review.images && review.images.length > 0 && (
              <div className="flex space-x-2 mb-3">
                {review.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Review image ${index + 1}`}
                    className="w-20 h-20 object-cover rounded"
                  />
                ))}
              </div>
            )}

            <div className="flex items-center text-sm text-gray-500">
              <button
                onClick={() => handleHelpful(review.id)}
                className={`flex items-center hover:text-gray-700 ${
                  helpfulReviews.has(review.id) ? 'text-blue-600' : ''
                }`}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                Helpful ({review.helpful + (helpfulReviews.has(review.id) ? 1 : 0)})
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredReviews.length > limit && (
        <div className="text-center mt-6">
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Show More Reviews
          </button>
        </div>
      )}
    </div>
  );
};

// Wrapper component that accepts ShortcodeProps
export const CustomerReviews: FC<ShortcodeProps> = ({ attributes }) => {
  const props: CustomerReviewsProps = {
    productId: attributes.productId as string,
    limit: attributes.limit ? Number(attributes.limit) : undefined,
    sort: attributes.sort as 'newest' | 'helpful' | 'rating-high' | 'rating-low',
    showImages: attributes.showImages !== false,
    showVerified: attributes.showVerified !== false,
    minRating: attributes.minRating ? Number(attributes.minRating) : undefined
  };

  return <CustomerReviewsComponent {...props} />;
};

export const customerReviewsDefinition: ShortcodeDefinition = {
  name: 'customer-reviews',
  component: CustomerReviews,
  attributes: {
    productId: { type: 'string' },
    limit: { type: 'number' },
    sort: { type: 'string' },
    showImages: { type: 'boolean' },
    showVerified: { type: 'boolean' },
    minRating: { type: 'number' }
  }
};