import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Archive pages
import ForumCategoryArchive from './ForumCategoryArchive';
import ForumPostArchive from './ForumPostArchive';
import UserArchive from './UserArchive';
import SupplierArchive from './SupplierArchive';
import PartnerArchive from './PartnerArchive';

// Form pages
import ForumCategoryForm from './forms/ForumCategoryForm';
import ForumPostForm from './forms/ForumPostForm';
import UserForm from './forms/UserForm';
import SupplierForm from './forms/SupplierForm';

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

const CPTACFRouter: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Forum Category Routes */}
        <Route path="/forum-categories" element={<ForumCategoryArchive />} />
        <Route path="/forum-categories/new" element={<ForumCategoryForm />} />
        <Route path="/forum-categories/edit/:id" element={<ForumCategoryForm />} />

        {/* Forum Post Routes */}
        <Route path="/forum-posts" element={<ForumPostArchive />} />
        <Route path="/forum-posts/new" element={<ForumPostForm />} />
        <Route path="/forum-posts/edit/:id" element={<ForumPostForm />} />

        {/* User Routes */}
        <Route path="/users" element={<UserArchive />} />
        <Route path="/users/new" element={<UserForm />} />
        <Route path="/users/edit/:id" element={<UserForm />} />

        {/* Supplier Routes */}
        <Route path="/suppliers" element={<SupplierArchive />} />
        <Route path="/suppliers/new" element={<SupplierForm />} />
        <Route path="/suppliers/edit/:id" element={<SupplierForm />} />

        {/* Partner Routes */}
        <Route path="/partners" element={<PartnerArchive />} />
        <Route path="/partners/new" element={<div>Partner Form - To be implemented</div>} />
        <Route path="/partners/edit/:id" element={<div>Partner Form - To be implemented</div>} />

        {/* Default redirect to forum categories */}
        <Route path="/" element={<ForumCategoryArchive />} />
      </Routes>
    </Suspense>
  );
};

export default CPTACFRouter;