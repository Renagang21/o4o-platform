import React from "react";
import { useSellerAuth } from "./SellerAuthContext";
import { Navigate } from "react-router-dom";

export default function SellerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { seller } = useSellerAuth();
  if (!seller) return <Navigate to="/seller/login" replace />;
  return <>{children}</>;
} 