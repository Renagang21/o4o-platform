
  if (error) {
    return (
      <div className={className}>
        <div style={{ 
          aspectRatio: image.metadata.aspectRatio,
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999'
        }}>
          이미지를 불러올 수 없습니다
        </div>
      </div>
    )
  }

  return (
    <ImageContainer className={className}>
      {isLoading && (
        <LoadingPlaceholder $aspectRatio={image.metadata.aspectRatio} />
      )}
      
      <StyledImage
        src={currentSrc}
        srcSet={generateSrcSet()}
        sizes={generateSizes()}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        onLoad={handleLoad}
        onError={handleError}
        $isLoading={isLoading}
      />
      
      {showOriginalToggle && (
        <QualityToggle onClick={toggleOriginal}>
          {showOriginal ? '최적화' : '원본'}
        </QualityToggle>
      )}
    </ImageContainer>
  )
}
