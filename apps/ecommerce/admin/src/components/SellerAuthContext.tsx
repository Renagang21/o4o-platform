import React, { createContext, useContext, useEffect, useState } from "react";

interface SellerAuthContextType {
  seller: { email: string; name: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<boolean>;
}

const SellerAuthContext = createContext<SellerAuthContextType | undefined>(undefined);

export const SellerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [seller, setSeller] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    const email = localStorage.getItem("seller_email");
    const name = localStorage.getItem("seller_name");
    if (email && name) setSeller({ email, name });
  }, []);

  const login = async (email: string, password: string) => {
    const sellers = JSON.parse(localStorage.getItem("sellers") || "[]");
    const found = sellers.find((s: any) => s.email === email && s.password === password);
    if (found) {
      localStorage.setItem("seller_jwt", "dummy-seller-token");
      localStorage.setItem("seller_email", found.email);
      localStorage.setItem("seller_name", found.name);
      setSeller({ email: found.email, name: found.name });
      return true;
    }
    setSeller(null);
    localStorage.removeItem("seller_jwt");
    localStorage.removeItem("seller_email");
    localStorage.removeItem("seller_name");
    return false;
  };

  const logout = () => {
    setSeller(null);
    localStorage.removeItem("seller_jwt");
    localStorage.removeItem("seller_email");
    localStorage.removeItem("seller_name");
  };

  const register = async (name: string, email: string, password: string) => {
    const sellers = JSON.parse(localStorage.getItem("sellers") || "[]");
    if (sellers.find((s: any) => s.email === email)) return false;
    sellers.push({ name, email, password });
    localStorage.setItem("sellers", JSON.stringify(sellers));
    // 자동 로그인
    return await login(email, password);
  };

  return (
    <SellerAuthContext.Provider value={{ seller, login, logout, register }}>
      {children}
    </SellerAuthContext.Provider>
  );
};

export const useSellerAuth = () => {
  const ctx = useContext(SellerAuthContext);
  if (!ctx) throw new Error("useSellerAuth must be used within a SellerAuthProvider");
  return ctx;
}; 