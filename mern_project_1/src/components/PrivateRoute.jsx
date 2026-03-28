// src/rbac/PrivateRoute.jsx
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import UserLayout from "../layout/UserLayout";

const PrivateRoute = ({ children }) => {
  const userDetails = useSelector((state) => state.userDetails);

  if (!userDetails) {
    return <Navigate to="/login" replace />;
  }

  return <UserLayout>{children}</UserLayout>;
};

export default PrivateRoute;
