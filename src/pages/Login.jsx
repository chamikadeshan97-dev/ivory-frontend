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
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "./css/Login.css";

const { Title, Text } = Typography;

const Login = () => {
  const [form] = Form.useForm();

  const [submitting, setSubmitting] = useState(false);

  const [loginError, setLoginError] = useState("");

  const navigate = useNavigate();

  const location = useLocation();

  const { login, isAuthenticated, loading } = useAuth();

  const redirectPath = location.state?.from?.pathname || "/";

  useEffect(() => {
    const rememberedUsername = localStorage.getItem("dental_clinic_username");

    if (rememberedUsername) {
      form.setFieldsValue({
        username: rememberedUsername,
        remember: true,
      });
    }
  }, [form]);

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setLoginError("");

    try {
      await login({
        username: values.username.trim(),
        password: values.password,
      });

      if (values.remember) {
        localStorage.setItem("dental_clinic_username", values.username.trim());
      } else {
        localStorage.removeItem("dental_clinic_username");
      }

      message.success("Welcome to the Dental Clinic Management System.");

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

  return (
    <div className="clinic-login-page">
      <div className="clinic-login-background">
        <div className="clinic-login-circle clinic-login-circle-one" />
        <div className="clinic-login-circle clinic-login-circle-two" />
        <div className="clinic-login-circle clinic-login-circle-three" />
      </div>

      <div className="clinic-login-container">
        <div className="clinic-login-brand-panel">
          <div className="clinic-login-brand-content">
            <div className="clinic-login-logo">
              <MedicineBoxOutlined />
            </div>

            <Title className="clinic-login-main-title">Dental Clinic</Title>

            <Text className="clinic-login-main-subtitle">
              Management System
            </Text>

            <div className="clinic-login-feature-list">
              <div className="clinic-login-feature">
                <SafetyCertificateOutlined />

                <div>
                  <Text strong>Secure access</Text>

                  <Text>Protected clinic records and role-based access.</Text>
                </div>
              </div>

              <div className="clinic-login-feature">
                <UserOutlined />

                <div>
                  <Text strong>Staff management</Text>

                  <Text>
                    Dedicated access for administrators, dentists, receptionists
                    and cashiers.
                  </Text>
                </div>
              </div>

              <div className="clinic-login-feature">
                <MedicineBoxOutlined />

                <div>
                  <Text strong>Clinical workflow</Text>

                  <Text>
                    Manage patients, treatments, appointments and payments.
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="clinic-login-card" bordered={false}>
          <Space direction="vertical" size={4} className="clinic-login-heading">
            <Title level={2}>Welcome back</Title>

            <Text type="secondary">
              Sign in to continue managing clinic operations.
            </Text>
          </Space>

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

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              remember: true,
            }}
            requiredMark={false}
          >
            <Form.Item
              label="Username"
              name="username"
              rules={[
                {
                  required: true,
                  message: "Please enter your username.",
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

            <Form.Item
              label="Password"
              name="password"
              rules={[
                {
                  required: true,
                  message: "Please enter your password.",
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

            <Form.Item
              name="remember"
              valuePropName="checked"
              className="clinic-login-remember"
            >
              <Checkbox>Remember username</Checkbox>
            </Form.Item>

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

          <div className="clinic-login-footer">
            <LockOutlined />

            <Text type="secondary">
              Your session is protected using secure authentication.
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
