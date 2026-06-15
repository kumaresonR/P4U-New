import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRouteLayout() {
  const { isInitializing, isAuthenticated } = useAuth();
  if (isInitializing) {
    return (
      <div className='vh-100 d-flex align-items-center justify-content-center text-secondary-light'>
        Loading session...
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
