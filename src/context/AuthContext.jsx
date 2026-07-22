import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  loginUser,
} from "../api/endPoints";

const AuthContext = createContext(null);

const getStoredUser = () => {
  try {
    const storedUser =
      localStorage.getItem("user");

    return storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch (error) {
    localStorage.removeItem("user");
    return null;
  }
};

export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] =
    useState(getStoredUser);

  const [token, setToken] =
    useState(() =>
      localStorage.getItem("token"),
    );

  const login = async (
    credentials,
  ) => {
    const response =
      await loginUser(credentials);

    const responseData =
      response?.data?.data ||
      response?.data;

    const loggedInUser =
      responseData?.user;

    const accessToken =
      responseData?.token;

    if (!loggedInUser) {
      throw new Error(
        "User information was not returned by the server.",
      );
    }

    localStorage.setItem(
      "user",
      JSON.stringify(loggedInUser),
    );

    if (accessToken) {
      localStorage.setItem(
        "token",
        accessToken,
      );
    }

    setUser(loggedInUser);
    setToken(accessToken || null);

    return loggedInUser;
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");

    setUser(null);
    setToken(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      isAuthenticated:
        Boolean(user),
    }),
    [user, token],
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    );
  }

  return context;
};