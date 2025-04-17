export interface PaymentInfo {
  method: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  accountNumber?: string;
  bankName?: string;
  mobileCarrier?: string;
  phoneNumber?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
}

export interface PaymentHistory {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
} 