import axios from "axios";
const axiosInstance = axios.create({
  // baseURL: import.meta.env.VITE_API_BASE_URL || "https://ivory-backend-3km8.onrender.com/api",
  
 baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Something went wrong";

    return Promise.reject({ ...error, message });
  }
);

export default axiosInstance;
