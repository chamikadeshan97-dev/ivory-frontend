import React from "react";
import {
  Navigate,
  Outlet,
} from "react-router-dom";

const ProtectedRoute = () => {
  const storedUser =
    localStorage.getItem("user");

  let user = null;

  try {
    user = storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch {
    localStorage.removeItem("user");
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;