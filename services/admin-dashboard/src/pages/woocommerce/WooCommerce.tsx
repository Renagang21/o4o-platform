import React from 'react'
import { Routes, Route } from 'react-router-dom'

// Products
import AllProducts from './products/AllProducts'
import AddProduct from './products/AddProduct'
import Categories from './products/Categories'
import Attributes from './products/Attributes'
import Tags from './products/Tags'
import Reviews from './products/Reviews'

// Orders
import AllOrders from './orders/AllOrders'
import OrderDetail from './orders/OrderDetail'

// Customers
import AllCustomers from './customers/AllCustomers'
import CustomerDetail from './customers/CustomerDetail'

// Coupons
import AllCoupons from './coupons/AllCoupons'
import AddCoupon from './coupons/AddCoupon'

// Inventory
import StockManagement from './inventory/StockManagement'
import LowStock from './inventory/LowStock'

// Reports
import SalesReports from './reports/SalesReports'
import ProductAnalytics from './reports/ProductAnalytics'

// Settings
import GeneralSettings from './settings/GeneralSettings'

const WooCommerce: React.FC = () => {
  return (
    <Routes>
      {/* Products */}
      <Route path="products" element={<AllProducts />} />
      <Route path="products/add" element={<AddProduct />} />
      <Route path="products/:productId/edit" element={<AddProduct />} />
      <Route path="products/categories" element={<Categories />} />
      <Route path="products/attributes" element={<Attributes />} />
      <Route path="products/tags" element={<Tags />} />
      <Route path="products/reviews" element={<Reviews />} />

      {/* Orders */}
      <Route path="orders" element={<AllOrders />} />
      <Route path="orders/:orderId" element={<OrderDetail />} />

      {/* Customers */}
      <Route path="customers" element={<AllCustomers />} />
      <Route path="customers/:customerId" element={<CustomerDetail />} />

      {/* Coupons */}
      <Route path="coupons" element={<AllCoupons />} />
      <Route path="coupons/add" element={<AddCoupon />} />
      <Route path="coupons/:couponId/edit" element={<AddCoupon />} />

      {/* Inventory */}
      <Route path="inventory" element={<StockManagement />} />
      <Route path="inventory/low-stock" element={<LowStock />} />

      {/* Reports */}
      <Route path="reports/sales" element={<SalesReports />} />
      <Route path="reports/products" element={<ProductAnalytics />} />

      {/* Settings */}
      <Route path="settings" element={<GeneralSettings />} />

      {/* Default redirect */}
      <Route index element={<AllProducts />} />
    </Routes>
  )
}

export default WooCommerce