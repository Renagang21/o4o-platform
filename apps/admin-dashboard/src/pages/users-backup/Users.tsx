import { useState, useEffect, useCallback, useMemo, useRef, Fragment, FC } from 'react'
import { Routes, Route } from 'react-router-dom'
import AllUsers from './AllUsers'
import PendingApproval from './PendingApproval'
import UserDetail from './UserDetail'
import AddUser from './AddUser'
import Roles from './Roles'

const Users: FC = () => {
  return (
    <Routes>
      <Route index element={<AllUsers />} />
      <Route path="pending" element={<PendingApproval />} />
      <Route path="business" element={<AllUsers />} />
      <Route path="affiliates" element={<AllUsers />} />
      <Route path="add" element={<AddUser />} />
      <Route path="roles" element={<Roles />} />
      <Route path=":userId" element={<UserDetail />} />
      <Route path=":userId/edit" element={<AddUser />} />
    </Routes>
  )
}

export default Users