
  return (
    <ProductImageContainer 
      $variant={variant} 
      className={className}
      onClick={handleZoomToggle}
    >
      <ResponsiveImage
        image={image}
        alt={`${productName} 상품 이미지`}
        priority={variant === 'detail'}
        showOriginalToggle={shouldShowOriginalToggle}
      />
      
      {enableZoom && !isZoomed && (
        <ZoomOverlay />
      )}
    </ProductImageContainer>
  )
}
