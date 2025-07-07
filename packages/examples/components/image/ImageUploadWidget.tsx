
  return (
    <UploadContainer
      className={isDragOver ? 'dragover' : ''}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <HiddenInput
        id="file-input"
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        disabled={isUploading}
      />
      
      <div style={{ fontSize: '48px' }}>📷</div>
      
      <UploadText>
        {isUploading ? (
          <div>
            <div className="primary">업로드 중...</div>
            <ProgressBar $progress={uploadProgress} />
          </div>
        ) : (
          <div>
            <div className="primary">
              클릭하거나 파일을 드래그하세요
            </div>
            <div className="secondary">
              최대 {maxFileSize}MB, {acceptedFormats.map(f => f.split('/')[1]).join(', ')} 형식 지원
            </div>
          </div>
        )}
      </UploadText>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </UploadContainer>
  )
}
