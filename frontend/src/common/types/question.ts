export interface Question {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  content: string;
  answer?: string;
  answeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
} 