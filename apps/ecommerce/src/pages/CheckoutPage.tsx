import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Button, Input, Card, Select } from '@o4o/ui';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, Smartphone, Building, DollarSign } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
import { formatCurrency } from '@o4o/utils';

interface CheckoutForm {
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  paymentMethod: 'card' | 'kakao_pay' | 'naver_pay' | 'virtual_account' | 'bank_transfer';
  deliveryRequest: string;
  agreeToTerms: boolean;
}

const paymentMethods = [
  { value: 'card', label: 'Credit Card', icon: CreditCard },
  { value: 'virtual_account', label: 'Virtual Account', icon: Building }
];

const deliveryRequests = [
  'Leave at door',
  'Leave with concierge',
  'Call before delivery'
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const mockTotal = 83000;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CheckoutForm>({
    defaultValues: {
      recipientName: user?.name || '',
      paymentMethod: 'card',
      deliveryRequest: deliveryRequests[0],
      agreeToTerms: false
    }
  });

  const agreeToTerms = watch('agreeToTerms');

  const createOrderMutation = useMutation({
    mutationFn: async (_data: CheckoutForm) => { return { id: 'mock' }; },
    onSuccess: () => { alert('Order Placed'); navigate('/'); }
  });

  const onSubmit = (data: CheckoutForm) => { createOrderMutation.mutate(data); };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Shipping Information</h2>
            <Card className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recipientName">Name</Label>
                    <Input id="recipientName" {...register('recipientName', { required: true })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="recipientPhone">Phone</Label>
                    <Input id="recipientPhone" {...register('recipientPhone', { required: true })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input placeholder="Detail Address" {...register('address')} className="mt-1" />
                </div>
                <div>
                  <Label className="mb-2 block">Delivery Request</Label>
                  <Select onValueChange={(val) => setValue('deliveryRequest', val)} defaultValue={deliveryRequests[0]}>
                    {deliveryRequests.map((req: string) => <option key={req} value={req}>{req}</option>)}
                  </Select>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Payment Method</h2>
            <Card className="p-6">
              <RadioGroup value={watch('paymentMethod')} onValueChange={(value) => setValue('paymentMethod', value as any)}>
                <div className="grid grid-cols-2 gap-4">
                  {paymentMethods.map((method: any) => {
                    const Icon = method.icon;
                    return (
                      <div key={method.value}>
                        <RadioGroupItem value={method.value} id={method.value} className="peer sr-only" />
                        <Label htmlFor={method.value} className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-muted peer-checked:border-primary peer-checked:bg-primary/5 transition-all">
                          <Icon className="h-5 w-5 text-gray-500 peer-checked:text-primary" />
                          <span className="font-medium">{method.label}</span>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </Card>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <Card className="p-6">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(mockTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(mockTotal)}</span>
                </div>
              </div>

              <div className="space-y-4 mb-6 pt-4 border-t">
                <div className="flex items-start space-x-2">
                  <Checkbox id="agreeToTerms" {...register('agreeToTerms', { required: true })} className="mt-0.5" />
                  <div className="space-y-1">
                    <Label htmlFor="agreeToTerms" className="text-sm font-medium cursor-pointer">
                      I agree to the terms and conditions.
                    </Label>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={!agreeToTerms} className="w-full h-12 text-lg font-bold" size="lg">
                Pay Now
              </Button>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}