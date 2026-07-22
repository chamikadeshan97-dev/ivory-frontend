import axios from "axios";

const apiClient = axios.create({
  baseURL:
    import.meta.env
      .VITE_API_BASE_URL ||
    "http://localhost:5000/api",

  headers: {
    "Content-Type":
      "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "dental_clinic_token",
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) =>
    Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,

  (error) => {
    if (
      error?.response?.status ===
      401
    ) {
      localStorage.removeItem(
        "dental_clinic_token",
      );

      localStorage.removeItem(
        "dental_clinic_user",
      );

      if (
        window.location.pathname !==
        "/login"
      ) {
        window.location.href =
          "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;