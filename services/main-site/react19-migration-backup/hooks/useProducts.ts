import { useState, useCallback } from 'react';
import { productApi } from '../api/products/productApi';
import {
  Product,
  ProductCreateRequest,
  ProductUpdateRequest,
  ProductListParams,
  ProductListResponse,
} from '../api/products/types';

export const useProducts = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getProducts = useCallback(async (params: ProductListParams) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await productApi.getProducts(params);
      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getProduct = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const product = await productApi.getProduct(id);
      return product;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProduct = useCallback(async (data: ProductCreateRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      const product = await productApi.createProduct(data);
      return product;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProduct = useCallback(async (id: string, data: ProductUpdateRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      const product = await productApi.updateProduct(id, data);
      return product;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await productApi.deleteProduct(id);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadProductImage = useCallback(async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await productApi.uploadProductImage(file);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProductStatus = useCallback(async (id: string, status: Product['status']) => {
    try {
      setIsLoading(true);
      setError(null);
      const product = await productApi.updateProductStatus(id, status);
      return product;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    updateProductStatus,
  };
}; 