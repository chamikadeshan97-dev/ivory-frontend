import React, { useState } from "react";

import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Typography,
  message,
} from "antd";

import {
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { registerUser } from "../api/endPoints";

const { Title, Text } = Typography;

const USER_ROLES = [
  {
    value: "Admin",
    label: "Administrator",
  },
  {
    value: "Dentist",
    label: "Dentist",
  },
  {
    value: "Receptionist",
    label: "Receptionist",
  },
  {
    value: "Cashier",
    label: "Cashier",
  },
];

const UserRegistration = () => {
  const [form] = Form.useForm();

  const [submitting, setSubmitting] = useState(false);

  const [registrationError, setRegistrationError] = useState("");

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setRegistrationError("");

    try {
      const payload = {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        username: values.username.trim().toLowerCase(),
        password: values.password,
        phone: values.phone?.trim() || "",
        role: values.role,
      };

      const response = await registerUser(payload);

      message.success(
        response?.data?.message || "User registered successfully.",
      );

      form.resetFields();

      form.setFieldsValue({
        role: "Receptionist",
      });
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to register the user.";

      setRegistrationError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="user-registration-page">
      <div
        style={{
          marginBottom: 24,
        }}
      >
        <Space align="start" size={14}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#e6f4ff",
              color: "#1677ff",
              fontSize: 22,
            }}
          >
            <UserAddOutlined />
          </div>

          <div>
            <Title
              level={2}
              style={{
                margin: 0,
              }}
            >
              User Registration
            </Title>

            <Text type="secondary">
              Create login accounts for clinic staff.
            </Text>
          </div>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} xl={16}>
          <Card
            bordered={false}
            style={{
              borderRadius: 16,
            }}
          >
            {registrationError && (
              <Alert
                type="error"
                showIcon
                closable
                message={registrationError}
                onClose={() => setRegistrationError("")}
                style={{
                  marginBottom: 24,
                }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              requiredMark="optional"
              initialValues={{
                role: "Receptionist",
              }}
              onFinish={handleSubmit}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="name"
                    label="Full Name"
                    rules={[
                      {
                        required: true,
                        message: "Please enter the full name.",
                      },
                      {
                        min: 3,
                        message: "Name must contain at least 3 characters.",
                      },
                    ]}
                  >
                    <Input
                      size="large"
                      prefix={<UserOutlined />}
                      placeholder="Enter full name"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="phone"
                    label="Phone Number"
                    rules={[
                      {
                        pattern: /^[0-9+\-\s]{9,15}$/,
                        message: "Enter a valid phone number.",
                      },
                    ]}
                  >
                    <Input
                      size="large"
                      prefix={<PhoneOutlined />}
                      placeholder="0771234567"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label="Email Address"
                    rules={[
                      {
                        required: true,
                        message: "Please enter the email address.",
                      },
                      {
                        type: "email",
                        message: "Enter a valid email address.",
                      },
                    ]}
                  >
                    <Input
                      size="large"
                      prefix={<MailOutlined />}
                      placeholder="user@example.com"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="username"
                    label="Username"
                    rules={[
                      {
                        required: true,
                        message: "Please enter a username.",
                      },
                      {
                        min: 4,
                        message: "Username must contain at least 4 characters.",
                      },
                      {
                        pattern: /^[a-zA-Z0-9._-]+$/,
                        message:
                          "Use only letters, numbers, dots, underscores or hyphens.",
                      },
                    ]}
                  >
                    <Input
                      size="large"
                      prefix={<UserOutlined />}
                      placeholder="Enter username"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="role"
                label="User Role"
                rules={[
                  {
                    required: true,
                    message: "Please select a user role.",
                  },
                ]}
              >
                <Select
                  size="large"
                  options={USER_ROLES}
                  suffixIcon={<SafetyCertificateOutlined />}
                  placeholder="Select role"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="password"
                    label="Password"
                    rules={[
                      {
                        required: true,
                        message: "Please enter a password.",
                      },
                      {
                        min: 6,
                        message: "Password must contain at least 6 characters.",
                      },
                    ]}
                    hasFeedback
                  >
                    <Input.Password
                      size="large"
                      prefix={<LockOutlined />}
                      placeholder="Enter password"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="confirmPassword"
                    label="Confirm Password"
                    dependencies={["password"]}
                    hasFeedback
                    rules={[
                      {
                        required: true,
                        message: "Please confirm the password.",
                      },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("password") === value) {
                            return Promise.resolve();
                          }

                          return Promise.reject(
                            new Error("Passwords do not match."),
                          );
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      size="large"
                      prefix={<LockOutlined />}
                      placeholder="Confirm password"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Space
                style={{
                  marginTop: 8,
                }}
              >
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<UserAddOutlined />}
                  loading={submitting}
                >
                  Register User
                </Button>

                <Button
                  size="large"
                  disabled={submitting}
                  onClick={() => {
                    form.resetFields();

                    form.setFieldsValue({
                      role: "Receptionist",
                    });

                    setRegistrationError("");
                  }}
                >
                  Clear
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            bordered={false}
            title="Role Permissions"
            style={{
              borderRadius: 16,
            }}
          >
            <Space direction="vertical" size={18}>
              <div>
                <Text strong>Administrator</Text>

                <br />

                <Text type="secondary">
                  Full system access, including user registration.
                </Text>
              </div>

              <div>
                <Text strong>Dentist</Text>

                <br />

                <Text type="secondary">
                  Patient history, appointments and treatment access.
                </Text>
              </div>

              <div>
                <Text strong>Receptionist</Text>

                <br />

                <Text type="secondary">
                  Patient, appointment, queue and follow-up access.
                </Text>
              </div>

              <div>
                <Text strong>Cashier</Text>

                <br />

                <Text type="secondary">
                  Payment and payment history access.
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default UserRegistration;
