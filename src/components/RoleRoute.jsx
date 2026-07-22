import React from "react";

import {
  Navigate,
} from "react-router-dom";

/* --------------------------------------------------------
   User helper
-------------------------------------------------------- */

const getLoggedInUser = () => {
  const possibleStorageKeys = [
    "user",
    "authUser",
    "auth",
  ];

  for (const key of possibleStorageKeys) {
    const storedValue =
      localStorage.getItem(key);

    if (!storedValue) {
      continue;
    }

    try {
      const parsedValue =
        JSON.parse(storedValue);

      return (
        parsedValue?.user ||
        parsedValue?.data?.user ||
        parsedValue?.data ||
        parsedValue
      );
    } catch (error) {
      console.error(
        `Unable to read ${key}:`,
        error,
      );
    }
  }

  return null;
};

const normalizeRole = (role = "") => {
  return String(role)
    .trim()
    .toLowerCase();
};

/* --------------------------------------------------------
   Role route
-------------------------------------------------------- */

const RoleRoute = ({
  allowedRoles = [],
  children,
}) => {
  const currentUser =
    getLoggedInUser();

  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const currentRole =
    normalizeRole(
      currentUser.role,
    );

  const hasPermission =
    allowedRoles.some(
      (allowedRole) =>
        normalizeRole(
          allowedRole,
        ) === currentRole,
    );

  if (!hasPermission) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return children;
};

export default RoleRoute;