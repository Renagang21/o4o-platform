import { IsString, IsOptional, IsObject, IsNotEmpty, IsEmail, MinLength, MaxLength } from 'class-validator';

export interface CheckoutAddress {
  recipientName: string;
  phone: string;
  email?: string;
  company?: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  city: string;
  state?: string;
  country: string;
  deliveryRequest?: string;
}

export class CheckoutDto {
  @IsObject()
  @IsNotEmpty()
  billingAddress!: CheckoutAddress;

  @IsObject()
  @IsNotEmpty()
  shippingAddress!: CheckoutAddress;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  customerNotes?: string;

  @IsString()
  @IsOptional()
  shippingMethod?: string;

  @IsString()
  @IsOptional()
  couponCode?: string;

  @IsString()
  @IsOptional()
  referralCode?: string;

  @IsString()
  @IsOptional()
  partnerId?: string;
}

export class ValidateAddressDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  recipientName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(20)
  phone!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(10)
  zipCode!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  address!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  detailAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  city!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  state?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(3)
  country!: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  deliveryRequest?: string;
}
