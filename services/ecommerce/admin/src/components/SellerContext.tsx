import React, { createContext, useContext, useEffect, useState } from "react";

export interface Seller {
  id: string;
  name: string;
  email: string;
  storeName: string;
  phone: string;
}

interface SellerContextType {
  seller: Seller | null;
  registerSeller: (data: Omit<Seller, "id">) => void;
  updateSeller: (data: Partial<Omit<Seller, "id">>) => void;
}

const SellerContext = createContext<SellerContextType | undefined>(undefined);

export const SellerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [seller, setSeller] = useState<Seller | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("seller");
    if (stored) setSeller(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (seller) localStorage.setItem("seller", JSON.stringify(seller));
  }, [seller]);

  const registerSeller = (data: Omit<Seller, "id">) => {
    const newSeller = { ...data, id: Math.random().toString(36).slice(2) };
    setSeller(newSeller);
  };

  const updateSeller = (data: Partial<Omit<Seller, "id">>) => {
    setSeller((prev) => prev ? { ...prev, ...data } : prev);
  };

  return (
    <SellerContext.Provider value={{ seller, registerSeller, updateSeller }}>
      {children}
    </SellerContext.Provider>
  );
};

export const useSeller = () => {
  const ctx = useContext(SellerContext);
  if (!ctx) throw new Error("useSeller must be used within a SellerProvider");
  return ctx;
}; 