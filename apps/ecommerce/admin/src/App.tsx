import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./components/AuthContext";
import { CartProvider } from "./components/CartContext";
import { OrderProvider } from "./components/OrderContext";
import { SellerProvider } from "./components/SellerContext";
import { SellerProductProvider } from "./components/SellerProductContext";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import StoreManage from "./components/StoreManage";
import ShopList from "./components/ShopList";
import ShopDetail from "./components/ShopDetail";
import Cart from "./components/Cart";
import Checkout from "./components/Checkout";
import Orders from "./components/Orders";
import ProtectedRoute from "./components/ProtectedRoute";
import CheckoutConfirm from "./components/CheckoutConfirm";
import OrderDetail from "./components/OrderDetail";
import AdminOrders from "./components/AdminOrders";
import Profile from "./components/Profile";
import ChangePassword from "./components/ChangePassword";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import AdminLogin from "./components/AdminLogin";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import { AdminAuthProvider, useAdminAuth } from "./components/AdminAuthContext";
import AdminUserList from "./components/AdminUserList";
import AdminUserNew from "./components/AdminUserNew";
import AdminUserEdit from "./components/AdminUserEdit";
import { AdminUserProvider } from "./components/AdminUserContext";
import AdminRoleProtectedRoute from "./components/AdminRoleProtectedRoute";
import SellerLogin from "./components/SellerLogin";
import SellerRegister from "./components/SellerRegister";
import SellerDashboard from "./components/SellerDashboard";
import { SellerAuthProvider, useSellerAuth } from "./components/SellerAuthContext";
import SellerProtectedRoute from "./components/SellerProtectedRoute";
import AdminProductList from "./components/AdminProductList";
import AdminProductNew from "./components/AdminProductNew";
import AdminProductEdit from "./components/AdminProductEdit";
import AdminDashboard from "./components/AdminDashboard";
import Settings from '../../../web/src/pages/admin/Settings';
// import ProductForm from "./components/ProductForm";
// import InventoryList from "./components/InventoryList";
// import StoreDummy from "./components/StoreDummy";

// 판매자 관련 컴포넌트 (추후 구현)
function SellerStore() { return <div>내 스토어 정보 (구현 예정)</div>; }
function SellerProducts() { return <div>내 상품 목록 (구현 예정)</div>; }
function SellerProductNew() { return <div>상품 등록 (구현 예정)</div>; }

// 인증 관련 컴포넌트 (추후 구현)
function Register() { return <div>회원가입 (구현 예정)</div>; }
function Login() { return <div>로그인 (구현 예정)</div>; }

function App() {
  return (
    <AdminAuthProvider>
      <SellerAuthProvider>
        <AuthProvider>
          <CartProvider>
            <OrderProvider>
              <SellerProvider>
                <SellerProductProvider>
                  <Router>
                    <div className="max-w-2xl mx-auto space-y-6 p-4">
                      <AdminNav />
                      <SellerNav />
                      <Routes>
                        <Route path="/products" element={<ProductList />} />
                        <Route path="/products/:id" element={<ProductDetail />} />
                        <Route path="/store" element={<StoreManage />} />
                        {/* 사용자용 라우트 */}
                        <Route path="/shop" element={<ShopList />} />
                        <Route path="/product/:id" element={<ShopDetail />} />
                        <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                        <Route path="/checkout/confirm" element={<ProtectedRoute><CheckoutConfirm /></ProtectedRoute>} />
                        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                        <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                        {/* 판매자용 라우트 */}
                        <Route path="/seller/login" element={<SellerLogin />} />
                        <Route path="/seller/register" element={<SellerRegister />} />
                        <Route path="/seller/dashboard" element={<SellerProtectedRoute><SellerDashboard /></SellerProtectedRoute>} />
                        <Route path="/seller/store" element={<ProtectedRoute><SellerStore /></ProtectedRoute>} />
                        <Route path="/seller/products" element={<ProtectedRoute><SellerProducts /></ProtectedRoute>} />
                        <Route path="/seller/products/new" element={<ProtectedRoute><SellerProductNew /></ProtectedRoute>} />
                        {/* 인증 관련 라우트 */}
                        <Route path="/register" element={<Register />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password/:token" element={<ResetPassword />} />
                        <Route path="/admin/login" element={<AdminLogin />} />
                        <Route path="/admin/orders" element={<AdminProtectedRoute><AdminOrders /></AdminProtectedRoute>} />
                        <Route path="/admin/users" element={<AdminProtectedRoute><AdminRoleProtectedRoute role="superadmin"><AdminUserProvider><AdminUserList /></AdminUserProvider></AdminRoleProtectedRoute></AdminProtectedRoute>} />
                        <Route path="/admin/users/new" element={<AdminProtectedRoute><AdminRoleProtectedRoute role="superadmin"><AdminUserProvider><AdminUserNew /></AdminUserProvider></AdminRoleProtectedRoute></AdminProtectedRoute>} />
                        <Route path="/admin/users/:id/edit" element={<AdminProtectedRoute><AdminRoleProtectedRoute role="superadmin"><AdminUserProvider><AdminUserEdit /></AdminUserProvider></AdminRoleProtectedRoute></AdminProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                        <Route path="/profile/password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
                        <Route path="/admin/products" element={<AdminProtectedRoute><AdminRoleProtectedRoute role="manager"><AdminProductList /></AdminRoleProtectedRoute></AdminProtectedRoute>} />
                        <Route path="/admin/products/new" element={<AdminProtectedRoute><AdminRoleProtectedRoute role="manager"><AdminProductNew /></AdminRoleProtectedRoute></AdminProtectedRoute>} />
                        <Route path="/admin/products/:id/edit" element={<AdminProtectedRoute><AdminRoleProtectedRoute role="manager"><AdminProductEdit /></AdminRoleProtectedRoute></AdminProtectedRoute>} />
                        <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                        <Route path="/admin/settings" element={<AdminProtectedRoute><Settings /></AdminProtectedRoute>} />
                        <Route path="*" element={<ProductList />} />
                      </Routes>
                    </div>
                  </Router>
                </SellerProductProvider>
              </SellerProvider>
            </OrderProvider>
          </CartProvider>
        </AuthProvider>
      </SellerAuthProvider>
    </AdminAuthProvider>
  );
}

function AdminNav() {
  const { admin, logout } = useAdminAuth();
  return (
    <nav className="flex flex-wrap gap-4 mb-4 border-b pb-2">
      <Link to="/products" className="text-blue-600">상품 목록</Link>
      <Link to="/store" className="text-blue-600">스토어 관리</Link>
      <Link to="/shop" className="text-green-600">쇼핑몰</Link>
      <Link to="/cart" className="text-green-600">장바구니</Link>
      <Link to="/checkout" className="text-purple-600">주문하기</Link>
      <Link to="/orders" className="text-purple-600">주문내역</Link>
      <Link to="/checkout/confirm" className="text-purple-600">결제 요약/확정</Link>
      <Link to="/seller/register" className="text-orange-600">판매자 등록</Link>
      <Link to="/seller/store" className="text-orange-600">내 스토어</Link>
      <Link to="/seller/products" className="text-orange-600">내 상품</Link>
      <Link to="/seller/products/new" className="text-orange-600">상품 등록</Link>
      <Link to="/register" className="text-gray-600">회원가입</Link>
      <Link to="/login" className="text-gray-600">로그인</Link>
      <Link to="/forgot-password" className="text-gray-600">비밀번호 찾기</Link>
      <Link to="/profile" className="text-gray-600">내 프로필</Link>
      {admin ? (
        <>
          <Link to="/admin/orders" className="text-purple-600">관리자 주문 관리</Link>
          <Link to="/admin/users" className="text-purple-600">관리자 유저 관리</Link>
          <Link to="/admin/products" className="text-purple-600">관리자 상품 관리</Link>
          <Link to="/admin/dashboard" className="text-purple-600">관리자 대시보드</Link>
          <Link to="/admin/settings" className="text-purple-600">관리자 설정</Link>
          <button onClick={logout} className="text-red-600 ml-2">관리자 로그아웃</button>
        </>
      ) : (
        <Link to="/admin/login" className="text-purple-600">관리자 로그인</Link>
      )}
    </nav>
  );
}

function SellerNav() {
  const { seller, logout } = useSellerAuth();
  return (
    <nav className="flex flex-wrap gap-4 mb-4 border-b pb-2">
      {seller ? (
        <>
          <span className="text-green-700 font-bold">{seller.name}님</span>
          <Link to="/seller/dashboard" className="text-green-600">판매자 대시보드</Link>
          <button onClick={logout} className="text-red-600 ml-2">판매자 로그아웃</button>
        </>
      ) : (
        <>
          <Link to="/seller/login" className="text-green-600">판매자 로그인</Link>
          <Link to="/seller/register" className="text-green-600">판매자 회원가입</Link>
        </>
      )}
    </nav>
  );
}

export default App;
