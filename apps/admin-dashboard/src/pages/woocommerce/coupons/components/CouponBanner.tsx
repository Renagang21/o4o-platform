import React, { useState, useEffect } from 'react'
import { 
  X,
  Copy,
  CheckCircle,
  Gift,
  Sparkles,
  Clock,
  Tag,
  ArrowRight,
  Users,
  Star,
  Zap
} from 'lucide-react'
import { Coupon, CouponBanner as CouponBannerType } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

interface CouponBannerProps {
  banner: CouponBannerType
  coupon?: Coupon
  onClose?: () => void
  onCouponClaim?: (couponCode: string) => void
  onAnalytics?: (event: 'view' | 'click' | 'copy', bannerId: string) => void
  isPreview?: boolean
  className?: string
}

const CouponBanner: React.FC<CouponBannerProps> = ({
  banner,
  coupon,
  onClose,
  onCouponClaim,
  onAnalytics,
  isPreview = false,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isCopied, setIsCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    // Track banner view
    if (!isPreview && onAnalytics) {
      onAnalytics('view', banner.id)
    }

    // Set up countdown timer if banner has end date
    if (banner.endDate) {
      const timer = setInterval(() => {
        const now = new Date().getTime()
        const endTime = new Date(banner.endDate!).getTime()
        const difference = endTime - now

        if (difference > 0) {
          setTimeLeft({
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((difference % (1000 * 60)) / 1000)
          })
        } else {
          setTimeLeft(null)
          setIsVisible(false)
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [banner, isPreview, onAnalytics])

  const handleCopyCoupon = async () => {
    if (!coupon?.code) return

    try {
      await navigator.clipboard.writeText(coupon.code)
      setIsCopied(true)
      toast.success('쿠폰 코드가 복사되었습니다!')
      
      if (!isPreview && onAnalytics) {
        onAnalytics('copy', banner.id)
      }
      
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      toast.error('쿠폰 코드 복사에 실패했습니다.')
    }
  }

  const handleClaimCoupon = () => {
    if (!coupon?.code) return

    if (!isPreview && onAnalytics) {
      onAnalytics('click', banner.id)
    }

    if (onCouponClaim) {
      onCouponClaim(coupon.code)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    if (onClose) {
      onClose()
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  const getDiscountDisplay = () => {
    if (!coupon) return ''
    
    if (coupon.discountType === 'percent') {
      return `${coupon.amount}%`
    }
    return formatPrice(coupon.amount)
  }

  const getDiscountLabel = () => {
    if (!coupon) return '할인'
    
    if (coupon.discountType === 'percent') {
      return '할인'
    }
    return '즉시 할인'
  }

  const getBannerIcon = () => {
    const iconMap = {
      hero: Gift,
      header: Tag,
      sidebar: Star,
      footer: Sparkles,
      popup: Zap,
      inline: Gift
    }
    return iconMap[banner.position as keyof typeof iconMap] || Gift
  }

  if (!isVisible) return null

  const Icon = getBannerIcon()

  // Different layouts based on position
  const renderHeroBanner = () => (
    <div 
      className={`relative overflow-hidden rounded-lg ${className}`}
      style={{
        backgroundColor: banner.backgroundColor,
        color: banner.textColor,
        backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {banner.imageUrl && (
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      )}
      
      <div className="relative z-10 p-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Icon className="w-10 h-10" />
          <div>
            <h2 className="text-4xl font-bold">{banner.title}</h2>
            {banner.description && (
              <p className="text-lg mt-2 opacity-90">{banner.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 mb-6">
          <div className="text-center">
            <div className="text-5xl font-bold">
              {getDiscountDisplay()}
            </div>
            <div className="text-lg opacity-80">
              {getDiscountLabel()}
            </div>
          </div>

          {timeLeft && (
            <div className="text-center">
              <div className="text-sm opacity-80 mb-1">남은 시간</div>
              <div className="flex items-center gap-2 text-lg font-medium">
                <Clock className="w-4 h-4" />
                <span>
                  {timeLeft.days > 0 && `${timeLeft.days}일 `}
                  {String(timeLeft.hours).padStart(2, '0')}:
                  {String(timeLeft.minutes).padStart(2, '0')}:
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleClaimCoupon}
            className="px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-lg"
            style={{
              backgroundColor: banner.buttonColor,
              color: banner.buttonTextColor
            }}
          >
            쿠폰 받기
            <ArrowRight className="w-5 h-5 ml-2 inline" />
          </button>

          {coupon?.code && (
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-80">코드:</span>
              <button
                onClick={handleCopyCoupon}
                className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all duration-200"
              >
                <span className="font-mono font-bold">{coupon.code}</span>
                {isCopied ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
        </div>

        {coupon?.minimumAmount && (
          <p className="text-sm opacity-80 mt-4">
            {formatPrice(coupon.minimumAmount)} 이상 구매시 사용 가능
          </p>
        )}
      </div>

      {onClose && (
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )

  const renderCompactBanner = () => (
    <div 
      className={`relative flex items-center justify-between p-4 rounded-lg ${className}`}
      style={{
        backgroundColor: banner.backgroundColor,
        color: banner.textColor
      }}
    >
      <div className="flex items-center gap-4">
        <Icon className="w-6 h-6" />
        <div>
          <h3 className="font-bold text-lg">{banner.title}</h3>
          {banner.description && (
            <p className="text-sm opacity-90">{banner.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{getDiscountDisplay()}</div>
          <div className="text-xs opacity-80">{getDiscountLabel()}</div>
        </div>

        <button
          onClick={handleClaimCoupon}
          className="px-4 py-2 rounded font-medium transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: banner.buttonColor,
            color: banner.buttonTextColor
          }}
        >
          받기
        </button>

        {onClose && (
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )

  const renderSidebarBanner = () => (
    <div 
      className={`relative p-4 rounded-lg text-center ${className}`}
      style={{
        backgroundColor: banner.backgroundColor,
        color: banner.textColor
      }}
    >
      <div className="mb-3">
        <Icon className="w-8 h-8 mx-auto mb-2" />
        <h3 className="font-bold">{banner.title}</h3>
        {banner.description && (
          <p className="text-sm opacity-90 mt-1">{banner.description}</p>
        )}
      </div>

      <div className="mb-3">
        <div className="text-2xl font-bold">{getDiscountDisplay()}</div>
        <div className="text-xs opacity-80">{getDiscountLabel()}</div>
      </div>

      {timeLeft && (
        <div className="mb-3 text-xs opacity-80">
          <Clock className="w-3 h-3 inline mr-1" />
          {timeLeft.days > 0 ? `${timeLeft.days}일 ` : ''}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </div>
      )}

      <button
        onClick={handleClaimCoupon}
        className="w-full px-3 py-2 rounded font-medium text-sm transition-all duration-200 hover:scale-105 mb-2"
        style={{
          backgroundColor: banner.buttonColor,
          color: banner.buttonTextColor
        }}
      >
        쿠폰 받기
      </button>

      {coupon?.code && (
        <button
          onClick={handleCopyCoupon}
          className="w-full flex items-center justify-center gap-2 px-3 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30 transition-all duration-200"
        >
          <span className="font-mono">{coupon.code}</span>
          {isCopied ? (
            <CheckCircle className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      )}

      {onClose && (
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 p-1 hover:bg-white hover:bg-opacity-20 rounded transition-all duration-200"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )

  const renderPopupBanner = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className={`relative max-w-md w-full rounded-lg overflow-hidden ${className}`}
        style={{
          backgroundColor: banner.backgroundColor,
          color: banner.textColor,
          backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {banner.imageUrl && (
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        )}
        
        <div className="relative z-10 p-6 text-center">
          <Icon className="w-12 h-12 mx-auto mb-4" />
          
          <h2 className="text-2xl font-bold mb-2">{banner.title}</h2>
          {banner.description && (
            <p className="mb-4 opacity-90">{banner.description}</p>
          )}

          <div className="mb-4">
            <div className="text-4xl font-bold">{getDiscountDisplay()}</div>
            <div className="opacity-80">{getDiscountLabel()}</div>
          </div>

          {timeLeft && (
            <div className="mb-4 text-sm opacity-80">
              <Clock className="w-4 h-4 inline mr-1" />
              <span>
                {timeLeft.days > 0 && `${timeLeft.days}일 `}
                {String(timeLeft.hours).padStart(2, '0')}:
                {String(timeLeft.minutes).padStart(2, '0')}:
                {String(timeLeft.seconds).padStart(2, '0')} 남음
              </span>
            </div>
          )}

          <button
            onClick={handleClaimCoupon}
            className="w-full px-6 py-3 rounded-lg font-semibold text-lg mb-3 transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: banner.buttonColor,
              color: banner.buttonTextColor
            }}
          >
            지금 쿠폰 받기
          </button>

          {coupon?.code && (
            <button
              onClick={handleCopyCoupon}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all duration-200"
            >
              <span>코드: </span>
              <span className="font-mono font-bold">{coupon.code}</span>
              {isCopied ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}

          {coupon?.minimumAmount && (
            <p className="text-xs opacity-80 mt-3">
              {formatPrice(coupon.minimumAmount)} 이상 구매시 사용 가능
            </p>
          )}
        </div>

        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  // Render based on banner position
  switch (banner.position) {
    case 'hero':
      return renderHeroBanner()
    case 'header':
    case 'footer':
      return renderCompactBanner()
    case 'sidebar':
      return renderSidebarBanner()
    case 'popup':
      return renderPopupBanner()
    case 'inline':
    default:
      return renderHeroBanner()
  }
}

export default CouponBanner