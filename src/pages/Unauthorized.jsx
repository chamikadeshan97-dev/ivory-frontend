import React from "react";

import {
  Button,
  Space,
  Tag,
  Typography,
} from "antd";

import {
  ArrowLeftOutlined,
  DashboardOutlined,
  LockOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import unauthorizedImage from "../assets/unauthorized.png";

import "./css/Unauthorized.css";

const { Title, Text, Paragraph } = Typography;

const Unauthorized = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuth();

  /* ========================================================
     VALUES
  ======================================================== */

  const userRole =
    user?.role ||
    user?.user_role ||
    user?.userRole ||
    "User";

  const attemptedPath =
    location.state?.from ||
    location.state?.pathname ||
    null;

  /* ========================================================
     ACTIONS
  ======================================================== */

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  const handleDashboard = () => {
    navigate("/");
  };

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout failed:", error);

      navigate("/login", {
        replace: true,
      });
    }
  };

  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-background-shape shape-one" />
      <div className="unauthorized-background-shape shape-two" />

      <div className="unauthorized-container">

        {/* ==================================================
            ILLUSTRATION
        ================================================== */}

        <div className="unauthorized-visual">
          <div className="unauthorized-image-wrapper">

            <div className="unauthorized-image-glow" />

            <img
              src={unauthorizedImage}
              alt="Access denied"
              className="unauthorized-image"
            />

          </div>
        </div>

        {/* ==================================================
            CONTENT
        ================================================== */}

        <div className="unauthorized-content">

          <div className="unauthorized-icon">
            <LockOutlined />
          </div>

          <Tag
            icon={<SafetyCertificateOutlined />}
            className="unauthorized-tag"
          >
            ACCESS RESTRICTED
          </Tag>

          <Title
            level={1}
            className="unauthorized-title"
          >
            You don't have access
          </Title>

          <Paragraph className="unauthorized-description">
            Your account doesn't have permission to access this
            section of the Dental Clinic Management System.
          </Paragraph>

          {/* ================================================
              USER ROLE
          ================================================= */}

          <div className="unauthorized-role-box">

            <div className="unauthorized-role-info">
              <Text className="unauthorized-role-label">
                Signed in as
              </Text>

              <div className="unauthorized-role-value">
                {user?.name ||
                  user?.username ||
                  "Current User"}
              </div>
            </div>

            <Tag className="unauthorized-role-tag">
              {userRole}
            </Tag>

          </div>

          {/* ================================================
              ATTEMPTED PAGE
          ================================================= */}

          {attemptedPath && (
            <div className="unauthorized-path">
              <LockOutlined />

              <span>
                Restricted page:
              </span>

              <code>
                {attemptedPath}
              </code>
            </div>
          )}

          {/* ================================================
              ACTIONS
          ================================================= */}

          <Space
            size={12}
            wrap
            className="unauthorized-actions"
          >

            <Button
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={handleGoBack}
              className="unauthorized-back-button"
            >
              Go Back
            </Button>

            <Button
              type="primary"
              size="large"
              icon={<DashboardOutlined />}
              onClick={handleDashboard}
              className="unauthorized-dashboard-button"
            >
              Dashboard
            </Button>

          </Space>

          {/* ================================================
              LOGOUT
          ================================================= */}

          <div className="unauthorized-footer">

            <Text>
              Signed in with the wrong account?
            </Text>

            <Button
              type="link"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              Sign Out
            </Button>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Unauthorized;