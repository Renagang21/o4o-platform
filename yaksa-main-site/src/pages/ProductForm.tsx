import React, { useRef, useState } from 'react';
import useToast from '../hooks/useToast';

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  stock: string;
  image: File | null;
}

const ProductForm: React.FC = () => {
  const { showToast } = useToast();
  const [form, setForm] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    stock: '',
    image: null,
  });
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = () => {
    if (!form.name || !form.description || !form.price || !form.stock) {
      setError('모든 항목을 입력하세요.');
      return false;
    }
    if (!form.image) {
      setError('상품 이미지를 업로드하세요.');
      return false;
    }
    if (isNaN(Number(form.price)) || isNaN(Number(form.stock))) {
      setError('가격과 재고는 숫자여야 합니다.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    // TODO: 실제 상품 등록 API 연동
    showToast({ type: 'success', message: '상품이 등록되었습니다.' });
    setForm({ name: '', description: '', price: '', stock: '', image: null });
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드 가능합니다.');
        return;
      }
      setForm((prev) => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      setError('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow p-8 flex flex-col gap-4"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">상품 등록</h2>
        <div>
          <label className="block text-gray-700 dark:text-gray-200 mb-1">상품명</label>
          <input
            name="name"
            type="text"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-700 dark:text-white"
            value={form.name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-200 mb-1">설명</label>
          <textarea
            name="description"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-700 dark:text-white"
            value={form.description}
            onChange={handleInputChange}
            rows={3}
            required
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 dark:text-gray-200 mb-1">가격(원)</label>
            <input
              name="price"
              type="number"
              min="0"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-700 dark:text-white"
              value={form.price}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-gray-700 dark:text-gray-200 mb-1">재고(개)</label>
            <input
              name="stock"
              type="number"
              min="0"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-700 dark:text-white"
              value={form.stock}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-200 mb-1">상품 이미지</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="w-full"
            onChange={handleImageChange}
          />
          {preview && (
            <img src={preview} alt="미리보기" className="mt-2 w-32 h-32 object-cover rounded border" />
          )}
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition mt-2"
        >
          상품 등록
        </button>
      </form>
    </div>
  );
};

export default ProductForm; 