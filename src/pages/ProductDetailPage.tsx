
  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner>상품 정보를 불러오는 중...</LoadingSpinner>
      </PageContainer>
    )
  }

  if (!product) {
    return (
      <PageContainer>
        <div>상품을 찾을 수 없습니다.</div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <ProductHeader>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <div className="price">{product.price.toLocaleString()}원</div>
      </ProductHeader>
      
      {/* 상품 이미지 갤러리 */}
      <ImageGallery>
        {product.images.map((image, index) => (
          <div key={index} style={{ position: 'relative' }}>
            <ProductImage
              image={image}
              productName={product.name}
              variant="detail"
              enableZoom={true}
            />
            {isAdmin && (
              <button
                onClick={() => handleDeleteImage(index)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  background: 'rgba(220, 53, 69, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                삭제
              </button>
            )}
          </div>
        ))}
      </ImageGallery>

      {/* 관리자 전용 이미지 업로드 */}
      {isAdmin && (
        <AdminSection>
          <h3>이미지 관리</h3>
          {uploadError && (
            <div style={{ color: '#dc3545', marginBottom: '16px' }}>
              {uploadError}
            </div>
          )}
          <ImageUploadWidget
            onUploadComplete={handleImageUpload}
            onUploadError={handleUploadError}
            category="detail"
            maxFileSize={15} // 상세 이미지는 15MB까지
          />
        </AdminSection>
      )}
    </PageContainer>
  )
}
