// src/rbac/PublicRoute.jsx
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import AppLayout from "../layout/AppLayout";

const PublicRoute = ({ children }) => {
  const userDetails = useSelector((state) => state.userDetails);

  if (userDetails) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

export default PublicRoute;
