import { useCallback, FC } from 'react';
import { Upload, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface LabelUploaderProps {
  onUpload: (file: File) => void;
  currentLabel: File | null;
}

const LabelUploader: FC<LabelUploaderProps> = ({
  onUpload,
  currentLabel
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles: 1
  });

  const handleRemove = () => {
    onUpload(null as any);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        라벨 업로드
      </h2>
      {currentLabel ? (
        <div className="relative">
          <div className="aspect-w-16 aspect-h-9 mb-4">
            <img
              src={URL.createObjectURL(currentLabel)}
              alt="Uploaded label"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-sm text-gray-500">
            {currentLabel.name} ({(currentLabel.size / 1024).toFixed(1)}KB)
          </p>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">
            {isDragActive
              ? '파일을 여기에 놓으세요'
              : 'JPG 또는 PNG 파일을 드래그하거나 클릭하여 업로드하세요'}
          </p>
          <p className="text-sm text-gray-500">
            최대 파일 크기: 5MB
          </p>
        </div>
      )}
    </div>
  );
};

export default LabelUploader; 