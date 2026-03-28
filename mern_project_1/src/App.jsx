// src/App.jsx
import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";

import { serverEndpoint } from "./config/config";
import { SET_USER } from "./redux/user/actions";

import AppLayout from "./layout/AppLayout";
import UserLayout from "./layout/UserLayout";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Error from "./pages/Error";
import Logout from "./pages/Logout";
import ManageUsers from "./pages/users/ManageUsers";
import ManagePayments from "./pages/payments/ManagePayments";
import AnalyticsDashboard from "./pages/links/AnalyticsDashboard";
import ForgetPassword from "./pages/ForgetPassword";
import ResetPassword from "./pages/ResetPassword";

import UnauthorizedAccess from "./components/UnauthorizedAccess";
import ProtectedRoute from "./rbac/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  const dispatch = useDispatch();
  const userDetails = useSelector((state) => state.userDetails);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isUserLoggedIn = async () => {
      try {
        const res = await axios.post(
          `${serverEndpoint}/auth/is-user-logged-in`,
          {},
          { withCredentials: true }
        );
        dispatch({
          type: SET_USER,
          payload: res.data.user,
        });
      } catch (error) {
        console.error("Auth Check Failed:", error);
      } finally {
        setLoading(false);
      }
    };
    isUserLoggedIn();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* --- Public Routes --- */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <Home />
          </PublicRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgetPassword />
          </PublicRoute>
        }
      />

      {/* --- Private Routes --- */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/manage-payments"
        element={
          <PrivateRoute>
            <ManagePayments />
          </PrivateRoute>
        }
      />
      <Route
        path="/analytics/:id"
        element={
          <PrivateRoute>
            <AnalyticsDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/unauthorized-access"
        element={
          <PrivateRoute>
            <UnauthorizedAccess />
          </PrivateRoute>
        }
      />

      {/* Logout doesn't need a layout, just the logic check */}
      <Route
        path="/logout"
        element={userDetails ? <Logout /> : <Navigate to="/login" />}
      />

      {/* --- Protected Route (Admin Only) --- */}
      <Route
        path="/users"
        element={
          <PrivateRoute>
            <ProtectedRoute roles={["admin"]}>
              <ManageUsers />
            </ProtectedRoute>
          </PrivateRoute>
        }
      />

      {/* --- Hybrid Routes (Accessible to both, layout changes based on state) --- */}
      <Route
        path="/reset-password"
        element={
          userDetails ? (
            <UserLayout>
              <ResetPassword />
            </UserLayout>
          ) : (
            <AppLayout>
              <ResetPassword />
            </AppLayout>
          )
        }
      />
      <Route
        path="/error"
        element={
          userDetails ? (
            <UserLayout>
              <Error />
            </UserLayout>
          ) : (
            <AppLayout>
              <Error />
            </AppLayout>
          )
        }
      />
    </Routes>
  );
}

export default App;
