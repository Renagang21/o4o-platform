import React, { useEffect, useState } from 'react';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import { 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Box,
  Typography,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider
} from '@mui/material';
import {
  Payment as PaymentIcon,
  CreditCard as CardIcon,
  AccountBalance as BankIcon,
  PhoneAndroid as MobileIcon,
  AccountBalanceWallet as WalletIcon
} from '@mui/icons-material';

interface TossPaymentButtonProps {
  orderId: string;
  orderName: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  customerMobilePhone?: string;
  onSuccess?: (paymentKey: string, orderId: string) => void;
  onFail?: (error: any) => void;
  buttonText?: string;
  buttonVariant?: 'contained' | 'outlined' | 'text';
  buttonColor?: 'primary' | 'secondary' | 'success' | 'error';
  size?: 'small' | 'medium' | 'large';
}

type PaymentMethod = 'card' | 'transfer' | 'virtual' | 'mobile' | 'tosspay' | 'kakaopay' | 'naverpay';

export const TossPaymentButton: React.FC<TossPaymentButtonProps> = ({
  orderId,
  orderName,
  amount,
  customerName,
  customerEmail,
  customerMobilePhone,
  onSuccess,
  onFail,
  buttonText = '결제하기',
  buttonVariant = 'contained',
  buttonColor = 'primary',
  size = 'medium'
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [tossPayments, setTossPayments] = useState<any>(null);

  // 토스페이먼츠 SDK 초기화
  useEffect(() => {
    const initTossPayments = async () => {
      try {
        const clientKey = process.env.REACT_APP_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';
        const toss = await loadTossPayments(clientKey);
        setTossPayments(toss);
      } catch (error) {
        console.error('Failed to load TossPayments SDK:', error);
        setError('결제 시스템 초기화 실패');
      }
    };

    initTossPayments();
  }, []);

  // 결제 요청
  const handlePayment = async () => {
    if (!tossPayments) {
      setError('결제 시스템이 준비되지 않았습니다');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 백엔드에 결제 요청 생성
      const response = await fetch('/api/v1/payments/toss/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          orderId,
          successUrl: `${window.location.origin}/api/v1/payments/toss/success`,
          failUrl: `${window.location.origin}/api/v1/payments/toss/fail`
        })
      });

      const paymentData = await response.json();

      if (!paymentData.success) {
        throw new Error(paymentData.error || '결제 요청 실패');
      }

      // 결제 방법별 처리
      let paymentPromise;

      switch (paymentMethod) {
        case 'card':
          paymentPromise = tossPayments.requestPayment('카드', {
            amount,
            orderId,
            orderName,
            customerName,
            customerEmail,
            successUrl: paymentData.data.successUrl,
            failUrl: paymentData.data.failUrl,
            cardCompany: null, // 자동 선택
            cardInstallmentPlan: null, // 일시불
            maxCardInstallmentPlan: 12, // 최대 12개월 할부
            useCardPoint: false,
            useAppCardOnly: false
          });
          break;

        case 'transfer':
          paymentPromise = tossPayments.requestPayment('계좌이체', {
            amount,
            orderId,
            orderName,
            customerName,
            customerEmail,
            successUrl: paymentData.data.successUrl,
            failUrl: paymentData.data.failUrl,
            cashReceipt: {
              type: '소득공제'
            }
          });
          break;

        case 'virtual':
          paymentPromise = tossPayments.requestPayment('가상계좌', {
            amount,
            orderId,
            orderName,
            customerName,
            customerEmail,
            customerMobilePhone,
            successUrl: paymentData.data.successUrl,
            failUrl: paymentData.data.failUrl,
            validHours: 24, // 24시간 이내 입금
            cashReceipt: {
              type: '소득공제'
            }
          });
          break;

        case 'mobile':
          paymentPromise = tossPayments.requestPayment('휴대폰', {
            amount,
            orderId,
            orderName,
            customerName,
            customerEmail,
            customerMobilePhone,
            successUrl: paymentData.data.successUrl,
            failUrl: paymentData.data.failUrl
          });
          break;

        case 'tosspay':
          paymentPromise = tossPayments.requestPayment('토스페이', {
            amount,
            orderId,
            orderName,
            successUrl: paymentData.data.successUrl,
            failUrl: paymentData.data.failUrl
          });
          break;

        case 'kakaopay':
          paymentPromise = tossPayments.requestPayment('간편결제', {
            amount,
            orderId,
            orderName,
            successUrl: paymentData.data.successUrl,
            failUrl: paymentData.data.failUrl,
            easyPay: '카카오페이'
          });
          break;

        case 'naverpay':
          paymentPromise = tossPayments.requestPayment('간편결제', {
            amount,
            orderId,
            orderName,
            successUrl: paymentData.data.successUrl,
            failUrl: paymentData.data.failUrl,
            easyPay: '네이버페이'
          });
          break;

        default:
          throw new Error('지원하지 않는 결제 방법입니다');
      }

      // 결제창 호출
      await paymentPromise;
      
      // 결제 성공 시 success URL로 리다이렉트됨
      // 실패 시 fail URL로 리다이렉트됨
      
    } catch (error: any) {
      console.error('Payment failed:', error);
      setError(error.message || '결제 처리 중 오류가 발생했습니다');
      
      if (onFail) {
        onFail(error);
      }
    } finally {
      setLoading(false);
      setDialogOpen(false);
    }
  };

  const handleOpenDialog = () => {
    if (!tossPayments) {
      setError('결제 시스템이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    setDialogOpen(true);
  };

  return (
    <>
      <Button
        variant={buttonVariant}
        color={buttonColor}
        size={size}
        startIcon={<PaymentIcon />}
        onClick={handleOpenDialog}
        disabled={loading || !tossPayments}
      >
        {loading ? <CircularProgress size={20} /> : buttonText}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      <Dialog 
        open={dialogOpen} 
        onClose={() => !loading && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">결제 방법 선택</Typography>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Alert severity="info">
              결제 금액: <strong>₩{amount.toLocaleString()}</strong>
            </Alert>
          </Box>

          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              <FormControlLabel
                value="card"
                control={<Radio />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <CardIcon /> 신용/체크카드
                  </Box>
                }
              />
              
              <FormControlLabel
                value="transfer"
                control={<Radio />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <BankIcon /> 계좌이체
                  </Box>
                }
              />
              
              <FormControlLabel
                value="virtual"
                control={<Radio />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <BankIcon /> 가상계좌
                  </Box>
                }
              />
              
              <FormControlLabel
                value="mobile"
                control={<Radio />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <MobileIcon /> 휴대폰 결제
                  </Box>
                }
              />
              
              <Divider sx={{ my: 2 }}>간편결제</Divider>
              
              <FormControlLabel
                value="tosspay"
                control={<Radio />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <WalletIcon /> 토스페이
                  </Box>
                }
              />
              
              <FormControlLabel
                value="kakaopay"
                control={<Radio />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <WalletIcon /> 카카오페이
                  </Box>
                }
              />
              
              <FormControlLabel
                value="naverpay"
                control={<Radio />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <WalletIcon /> 네이버페이
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setDialogOpen(false)} 
            disabled={loading}
          >
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={handlePayment}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <PaymentIcon />}
          >
            {loading ? '처리 중...' : '결제하기'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};