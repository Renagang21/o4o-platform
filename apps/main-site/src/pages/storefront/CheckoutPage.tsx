/**
 * Checkout Page (Modernized)
 * R-6-8: Checkout Modernization with component composition
 *
 * Features:
 * - Component-based architecture
 * - Toast notifications
 * - Skeleton loading states
 * - Shipping/Payment options UI
 * - Toss Payments integration
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { ArrowLeft } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { useToastContext } from '../../contexts/ToastProvider';
import { storefrontAPI } from '../../services/storefrontApi';
import { loadTossPaymentsSDK, requestTossPayment, generateOrderName } from '../../utils/tossPayments';

// Checkout Components
import { CheckoutProgress } from '../../components/checkout/CheckoutProgress';
import { CustomerInfoForm, CustomerInfo } from '../../components/checkout/CustomerInfoForm';
import { ShippingAddressForm, ShippingAddress } from '../../components/checkout/ShippingAddressForm';
import { ShippingOptions, ShippingOption } from '../../components/checkout/ShippingOptions';
import { PaymentMethodSelector, PaymentMethod } from '../../components/checkout/PaymentMethodSelector';
import { OrderSummaryCheckout } from '../../components/checkout/OrderSummaryCheckout';
import { CheckoutSkeleton } from '../../components/checkout/CheckoutSkeleton';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const cartStore = useCartStore();
  const toast = useToastContext();

  // Loading States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tossSDKLoaded, setTossSDKLoaded] = useState(false);

  // Form States
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
  });

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    postcode: '',
    address: '',
    address_detail: '',
  });

  const [orderNote, setOrderNote] = useState('');
  const [shippingOption, setShippingOption] = useState<ShippingOption>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');

  // Validation Errors
  const [customerErrors, setCustomerErrors] = useState<Partial<Record<keyof CustomerInfo, string>>>({});
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});

  // Load Toss Payments SDK
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);

    loadTossPaymentsSDK()
      .then(() => setTossSDKLoaded(true))
      .catch((err) => {
        console.error('Failed to load Toss SDK:', err);
        toast.error('결제 시스템을 불러오는데 실패했습니다.');
      });

    return () => clearTimeout(timer);
  }, [toast]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!loading && cartStore.items.length === 0) {
      toast.warning('장바구니가 비어있습니다.');
      navigate('/cart');
    }
  }, [loading, cartStore.items.length, navigate, toast]);

  // Format Currency
  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    if (currency === 'KRW') {
      return `₩${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  // Calculate Shipping Fee
  const calculateShippingFee = (): number => {
    const freeShippingThreshold = 30000;
    if (cartStore.total_amount >= freeShippingThreshold) {
      return 0;
    }
    return shippingOption === 'express' ? 6000 : 3000;
  };

  const shippingFee = calculateShippingFee();
  const totalAmount = cartStore.total_amount + shippingFee;

  // Validate Form
  const validateForm = (): boolean => {
    const custErrors: Partial<Record<keyof CustomerInfo, string>> = {};
    const addrErrors: Partial<Record<keyof ShippingAddress, string>> = {};

    // Customer Info Validation
    if (!customerInfo.name.trim()) {
      custErrors.name = '이름을 입력해주세요.';
    }

    if (!customerInfo.email.trim()) {
      custErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      custErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!customerInfo.phone.trim()) {
      custErrors.phone = '전화번호를 입력해주세요.';
    } else {
      const phoneDigits = customerInfo.phone.replace(/[^0-9]/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        custErrors.phone = '올바른 전화번호 형식이 아닙니다.';
      }
    }

    // Shipping Address Validation
    if (!shippingAddress.postcode.trim()) {
      addrErrors.postcode = '우편번호를 입력해주세요.';
    }

    if (!shippingAddress.address.trim()) {
      addrErrors.address = '주소를 입력해주세요.';
    }

    setCustomerErrors(custErrors);
    setAddressErrors(addrErrors);

    const hasErrors = Object.keys(custErrors).length > 0 || Object.keys(addrErrors).length > 0;

    if (hasErrors) {
      toast.error('필수 정보를 정확히 입력해주세요.');
    }

    return !hasErrors;
  };

  // Handle Submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (cartStore.items.length === 0) {
      toast.error('장바구니가 비어있습니다.');
      return;
    }

    if (!tossSDKLoaded) {
      toast.error('결제 시스템이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      // Create Order (PENDING status)
      const response = await storefrontAPI.createOrder({
        customer: {
          ...customerInfo,
          shipping_address: shippingAddress,
          order_note: orderNote,
        },
        items: cartStore.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          seller_id: item.seller_id,
        })),
        payment_method: paymentMethod,
      });

      if (response.success) {
        const order = response.data;
        const orderName = generateOrderName(cartStore.items);
        const baseUrl = window.location.origin;

        // Initiate Toss Payment
        await requestTossPayment({
          orderId: order.orderNumber,
          orderName,
          amount: totalAmount,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          successUrl: `${baseUrl}/payment/success`,
          failUrl: `${baseUrl}/payment/fail`,
        });

        // User will be redirected to Toss checkout page
      } else {
        throw new Error(response.message || '주문 생성에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('결제 시작 실패:', err);
      toast.error(err.message || '결제를 시작할 수 없습니다.');
      setSubmitting(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <Layout>
        <CheckoutSkeleton />
      </Layout>
    );
  }

  // Empty Cart (should redirect, but render for safety)
  if (cartStore.items.length === 0) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Indicator */}
          <CheckoutProgress currentStep="checkout" />

          {/* Back Button */}
          <button
            onClick={() => navigate('/cart')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            장바구니로 돌아가기
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">주문하기</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Info */}
              <CustomerInfoForm
                value={customerInfo}
                onChange={setCustomerInfo}
                errors={customerErrors}
              />

              {/* Shipping Address */}
              <ShippingAddressForm
                value={shippingAddress}
                onChange={setShippingAddress}
                orderNote={orderNote}
                onOrderNoteChange={setOrderNote}
                errors={addressErrors}
              />

              {/* Shipping Options */}
              <ShippingOptions
                selected={shippingOption}
                onChange={setShippingOption}
              />

              {/* Payment Method */}
              <PaymentMethodSelector
                selected={paymentMethod}
                onChange={setPaymentMethod}
              />
            </div>

            {/* Right Column: Order Summary */}
            <div className="lg:col-span-1">
              <OrderSummaryCheckout
                items={cartStore.items}
                subtotal={cartStore.total_amount}
                shippingFee={shippingFee}
                discount={0}
                formatCurrency={formatCurrency}
                onRemoveItem={(productId) => {
                  const result = cartStore.removeItem(productId);
                  if (result.success) {
                    toast.success('상품을 제거했습니다.');
                  }
                }}
                onSubmit={handleSubmit}
                isSubmitting={submitting}
                isDisabled={!tossSDKLoaded}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;
