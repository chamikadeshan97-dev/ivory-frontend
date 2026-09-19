// src/pages/Login.jsx

import React, { useEffect, useState } from "react";

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Space,
  Typography,
  message,
} from "antd";

import {
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import loginImage from "../assets/login1.png";
import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "./css/Login.css";

const { Title, Text } = Typography;

const Login = () => {
  const [form] = Form.useForm();

  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const {
    login,
    isAuthenticated,
    loading,
  } = useAuth();

  /* ========================================================
     REDIRECT PATH
  ======================================================== */

  const redirectPath =
    location.state?.from?.pathname || "/";

  /* ========================================================
     LOAD REMEMBERED USERNAME
  ======================================================== */

  useEffect(() => {
    const rememberedUsername =
      localStorage.getItem("dental_clinic_username");

    if (rememberedUsername) {
      form.setFieldsValue({
        username: rememberedUsername,
        remember: true,
      });
    }
  }, [form]);

  /* ========================================================
     ALREADY AUTHENTICATED
  ======================================================== */

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  /* ========================================================
     LOGIN
  ======================================================== */

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setLoginError("");

    try {
      const username = values.username.trim();

      await login({
        username,
        password: values.password,
      });

      /* ----------------------------------------------------
         Remember Username
      ---------------------------------------------------- */

      if (values.remember) {
        localStorage.setItem(
          "dental_clinic_username",
          username,
        );
      } else {
        localStorage.removeItem(
          "dental_clinic_username",
        );
      }

      message.success(
        "Welcome to the Dental Clinic Management System.",
      );

      navigate(redirectPath, {
        replace: true,
      });
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Login failed. Please check your username and password.";

      setLoginError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  /* ========================================================
     UI
  ======================================================== */

  return (
    <div className="clinic-login-page">
      {/* ====================================================
          BACKGROUND DECORATION
      ==================================================== */}

      <div className="clinic-login-background">
        <div className="clinic-login-circle clinic-login-circle-one" />

        <div className="clinic-login-circle clinic-login-circle-two" />

        <div className="clinic-login-circle clinic-login-circle-three" />
      </div>

      {/* ====================================================
          LOGIN CONTAINER
      ==================================================== */}

      <div className="clinic-login-container">
        {/* ==================================================
            LEFT SIDE - IMAGE ONLY
        ================================================== */}

        <div className="clinic-login-brand-panel">
          <div className="clinic-login-image-wrapper">
            <img
             src={loginImage}
              alt="Dental clinic"
              className="clinic-login-image"
            />
          </div>
        </div>

        {/* ==================================================
            RIGHT SIDE - LOGIN FORM
        ================================================== */}

        <Card
          className="clinic-login-card"
          bordered={false}
        >
          {/* ------------------------------------------------
              Heading
          ------------------------------------------------ */}

          <Space
            direction="vertical"
            size={4}
            className="clinic-login-heading"
          >
            <Title level={2}>
              Welcome back
            </Title>

            <Text type="secondary">
              Sign in to continue managing clinic
              operations.
            </Text>
          </Space>

          {/* ------------------------------------------------
              Login Error
          ------------------------------------------------ */}

          {loginError && (
            <Alert
              type="error"
              showIcon
              closable
              message="Login failed"
              description={loginError}
              onClose={() => setLoginError("")}
              className="clinic-login-alert"
            />
          )}

          {/* ------------------------------------------------
              Login Form
          ------------------------------------------------ */}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              remember: true,
            }}
            requiredMark={false}
          >
            {/* Username */}

            <Form.Item
              label="Username"
              name="username"
              rules={[
                {
                  required: true,
                  message:
                    "Please enter your username.",
                },
              ]}
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="Enter username"
                autoComplete="username"
              />
            </Form.Item>

            {/* Password */}

            <Form.Item
              label="Password"
              name="password"
              rules={[
                {
                  required: true,
                  message:
                    "Please enter your password.",
                },
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </Form.Item>

            {/* Remember Username */}

            <Form.Item
              name="remember"
              valuePropName="checked"
              className="clinic-login-remember"
            >
              <Checkbox>
                Remember username
              </Checkbox>
            </Form.Item>

            {/* Sign In Button */}

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitting}
              className="clinic-login-button"
            >
              Sign In
            </Button>
          </Form>

          {/* ------------------------------------------------
              Footer
          ------------------------------------------------ */}

          <div className="clinic-login-footer">
            <LockOutlined />

            <Text type="secondary">
              Your session is protected using secure
              authentication.
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;