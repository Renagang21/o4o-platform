import React, { createContext, useContext, useEffect, useState } from "react";

export interface SellerProduct {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  createdAt: string;
}

interface SellerProductContextType {
  products: SellerProduct[];
  addProduct: (product: Omit<SellerProduct, "id" | "createdAt">) => void;
  updateProduct: (id: string, data: Partial<Omit<SellerProduct, "id" | "createdAt" | "sellerId">>) => void;
  deleteProduct: (id: string) => void;
}

const SellerProductContext = createContext<SellerProductContextType | undefined>(undefined);

export const SellerProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<SellerProduct[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("sellerProducts");
    if (stored) setProducts(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem("sellerProducts", JSON.stringify(products));
  }, [products]);

  const addProduct = (product: Omit<SellerProduct, "id" | "createdAt">) => {
    setProducts((prev) => [
      {
        ...product,
        id: Math.random().toString(36).slice(2),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const updateProduct = (id: string, data: Partial<Omit<SellerProduct, "id" | "createdAt" | "sellerId">>) => {
    setProducts((prev) => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter(p => p.id !== id));
  };

  return (
    <SellerProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct }}>
      {children}
    </SellerProductContext.Provider>
  );
};

export const useSellerProducts = () => {
  const ctx = useContext(SellerProductContext);
  if (!ctx) throw new Error("useSellerProducts must be used within a SellerProductProvider");
  return ctx;
}; 