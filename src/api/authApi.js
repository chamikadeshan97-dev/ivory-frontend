import apiClient from "./apiClient";

export const loginUser = ({
  username,
  password,
}) => {
  return apiClient.post(
    "/auth/login",
    {
      username,
      password,
    },
  );
};

export const getCurrentUser =
  () => {
    return apiClient.get(
      "/auth/me",
    );
  };

export const logoutUser = () => {
  return apiClient.post(
    "/auth/logout",
  );
};