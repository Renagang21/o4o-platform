export interface Review {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  images?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ReviewFormData {
  productId: string;
  rating: number;
  content: string;
  images?: File[];
} 