import React from 'react';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  thumbnail?: string | null;
}

const ProductCard: React.FC<ProductCardProps> = ({ id, title, price, thumbnail }) => {
  return (
    <Link to={`/product/${id}`} className="block">
      <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {thumbnail && (
          <div className="aspect-w-1 aspect-h-1">
            <img
              src={thumbnail}
              alt={title}
              className="object-cover w-full h-full"
            />
          </div>
        )}
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-gray-600">${price.toFixed(2)}</p>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard; 