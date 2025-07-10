
  const getOptimalQuality = useCallback(() => {
    if (dataSaver || isLowBandwidth) {
      return 60 // 낮은 품질
    }
    
    if (connectionType === '3g') {
      return 75 // 중간 품질
    }
    
    return 90 // 높은 품질
  }, [connectionType, dataSaver, isLowBandwidth])

  const shouldPreloadImages = useCallback(() => {
    // 빠른 연결이고 데이터 절약 모드가 아닌 경우에만 프리로드
    return (connectionType === '4g' || connectionType === 'wifi') && !dataSaver
  }, [connectionType, dataSaver])

  const getOptimalSrcSet = useCallback((image: ProcessedImage) => {
    const srcSetParts: string[] = []
    
    // 저대역폭에서는 제한된 variant만 제공
    if (isLowBandwidth || dataSaver) {
      if (image.variants.thumbnail) {
        srcSetParts.push(`${image.variants.thumbnail} 320w`)
      }
      if (image.variants.mobile) {
        srcSetParts.push(`${image.variants.mobile} 640w`)
      }
    } else {
      // 모든 variant 제공
      if (image.variants.thumbnail) {
        srcSetParts.push(`${image.variants.thumbnail} 320w`)
      }
      if (image.variants.mobile) {
        srcSetParts.push(`${image.variants.mobile} 640w`)
      }
      if (image.variants.tablet) {
        srcSetParts.push(`${image.variants.tablet} 1024w`)
      }
      if (image.variants.desktop) {
        srcSetParts.push(`${image.variants.desktop} 1920w`)
      }
    }
    
    return srcSetParts.join(', ')
  }, [isLowBandwidth, dataSaver])

  return {
    connectionType,
    dataSaver,
    isLowBandwidth,
    getOptimalImageVariant,
    getOptimalQuality,
    shouldPreloadImages,
    getOptimalSrcSet
  }
}
