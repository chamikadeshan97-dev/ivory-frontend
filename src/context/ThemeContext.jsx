// src/context/ThemeContext.jsx

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ConfigProvider, theme as antdTheme } from "antd";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem("dental_theme") || "light";
  });

  const isDark = themeMode === "dark";

  useEffect(() => {
    localStorage.setItem("dental_theme", themeMode);

    document.documentElement.setAttribute(
      "data-theme",
      themeMode,
    );
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((current) =>
      current === "light" ? "dark" : "light",
    );
  };

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      toggleTheme,
      setThemeMode,
    }),
    [themeMode, isDark],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        theme={{
          algorithm: isDark
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,

          token: {
            colorPrimary: "#2563eb",
            borderRadius: 10,
            fontFamily:
              "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          },

          components: {
            Layout: {
              bodyBg: isDark ? "#0f172a" : "#f5f7fb",
              headerBg: isDark ? "#111827" : "#ffffff",
              siderBg: isDark ? "#111827" : "#ffffff",
            },

            Card: {
              colorBgContainer: isDark
                ? "#111827"
                : "#ffffff",
            },

            Table: {
              headerBg: isDark
                ? "#1f2937"
                : "#f8fafc",
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider",
    );
  }

  return context;
};