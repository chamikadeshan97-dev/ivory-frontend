import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  CrownOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  MailOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";

import {
  deleteUser,
  getUsers,
  registerUser,
  updateUser,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";

import "./css/UserRegistration.css";

const {
  Text,
} = Typography;

/* --------------------------------------------------------
   Role configuration
-------------------------------------------------------- */

const USER_ROLES = [
  {
    value: "Admin",
    label: "Administrator",
    color: "red",
    avatarColor: "#cf1322",
    icon: <CrownOutlined />,
    description:
      "Full system access, including user management and configuration.",
  },
  {
    value: "Dentist",
    label: "Dentist",
    color: "blue",
    avatarColor: "#1677ff",
    icon: <MedicineBoxOutlined />,
    description:
      "Access to patients, appointments, treatments and clinical records.",
  },
  {
    value: "Receptionist",
    label: "Receptionist",
    color: "green",
    avatarColor: "#389e0d",
    icon: <CustomerServiceOutlined />,
    description:
      "Access to patients, appointments, queue and follow-up management.",
  },
  {
    value: "Cashier",
    label: "Cashier",
    color: "gold",
    avatarColor: "#d48806",
    icon: <WalletOutlined />,
    description:
      "Access to payments, receipts and payment history.",
  },
];

/* --------------------------------------------------------
   General helpers
-------------------------------------------------------- */

const getUserId = (user) => {
  return (
    user?.id ||
    user?.user_id ||
    user?._id ||
    ""
  );
};

const getRoleDetails = (role) => {
  const normalizedRole = String(
    role || "",
  ).toLowerCase();

  return (
    USER_ROLES.find(
      (item) =>
        item.value.toLowerCase() ===
        normalizedRole,
    ) || {
      value: role || "Unknown",
      label: role || "Unknown",
      color: "default",
      avatarColor: "#8c8c8c",
      icon: <UserOutlined />,
      description: "No role information available.",
    }
  );
};

const getInitials = (name) => {
  const normalizedName = String(
    name || "",
  ).trim();

  if (!normalizedName) {
    return "U";
  }

  const words = normalizedName
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${words[0][0]}${
    words[words.length - 1][0]
  }`.toUpperCase();
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDateTimestamp = (value) => {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
};

/* --------------------------------------------------------
   Component
-------------------------------------------------------- */

const UserRegistration = () => {
  const [userForm] = Form.useForm();

  const [users, setUsers] = useState([]);

  const [loadingUsers, setLoadingUsers] =
    useState(false);

  const [savingUser, setSavingUser] =
    useState(false);

  const [
    deletingUserId,
    setDeletingUserId,
  ] = useState("");

  const [usersError, setUsersError] =
    useState("");

  const [modalError, setModalError] =
    useState("");

  const [searchText, setSearchText] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("All");

  const [userModalOpen, setUserModalOpen] =
    useState(false);

  const [modalMode, setModalMode] =
    useState("create");

  const [selectedUser, setSelectedUser] =
    useState(null);

  /* --------------------------------------------------------
     Load users
  -------------------------------------------------------- */

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError("");

    try {
      const response = await getUsers();

      const responseData = response?.data;

      let loadedUsers = [];

      if (Array.isArray(responseData)) {
        loadedUsers = responseData;
      } else if (
        Array.isArray(responseData?.users)
      ) {
        loadedUsers = responseData.users;
      } else if (
        Array.isArray(responseData?.data)
      ) {
        loadedUsers = responseData.data;
      }

      setUsers(loadedUsers);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to load registered users.";

      setUsersError(errorMessage);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /* --------------------------------------------------------
     Summary statistics
  -------------------------------------------------------- */

  const userStatistics = useMemo(() => {
    const countRole = (role) => {
      return users.filter(
        (user) =>
          String(
            user?.role || "",
          ).toLowerCase() ===
          role.toLowerCase(),
      ).length;
    };

    return {
      total: users.length,
      admins: countRole("Admin"),
      dentists: countRole("Dentist"),
      receptionists:
        countRole("Receptionist"),
      cashiers: countRole("Cashier"),
    };
  }, [users]);

  /* --------------------------------------------------------
     Filter users
  -------------------------------------------------------- */

  const filteredUsers = useMemo(() => {
    const normalizedSearchText = searchText
      .trim()
      .toLowerCase();

    return users.filter((user) => {
      const matchesRole =
        roleFilter === "All" ||
        String(
          user?.role || "",
        ).toLowerCase() ===
          roleFilter.toLowerCase();

      if (!matchesRole) {
        return false;
      }

      if (!normalizedSearchText) {
        return true;
      }

      const searchableValues = [
        user?.id,
        user?.user_id,
        user?.name,
        user?.username,
        user?.email,
        user?.phone,
        user?.role,
      ];

      return searchableValues.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(normalizedSearchText),
      );
    });
  }, [
    roleFilter,
    searchText,
    users,
  ]);

  /* --------------------------------------------------------
     Open add modal
  -------------------------------------------------------- */

  const handleOpenAddModal = () => {
    setModalMode("create");
    setSelectedUser(null);
    setModalError("");

    userForm.resetFields();

    userForm.setFieldsValue({
      role: "Receptionist",
      name: "",
      email: "",
      username: "",
      phone: "",
      password: "",
      confirmPassword: "",
    });

    setUserModalOpen(true);
  };

  /* --------------------------------------------------------
     Open edit modal
  -------------------------------------------------------- */

  const handleOpenEditModal = (user) => {
    setModalMode("edit");
    setSelectedUser(user);
    setModalError("");

    userForm.resetFields();

    userForm.setFieldsValue({
      name: user?.name || "",
      email: user?.email || "",
      username: user?.username || "",
      phone: user?.phone || "",
      role:
        user?.role || "Receptionist",
      password: "",
      confirmPassword: "",
    });

    setUserModalOpen(true);
  };

  /* --------------------------------------------------------
     Close modal
  -------------------------------------------------------- */

  const handleCloseModal = () => {
    if (savingUser) {
      return;
    }

    setUserModalOpen(false);
    setSelectedUser(null);
    setModalError("");
  };

  /* --------------------------------------------------------
     Save user
  -------------------------------------------------------- */

  const handleSaveUser = async (values) => {
    setSavingUser(true);
    setModalError("");

    try {
      const payload = {
        name: values.name.trim(),
        email: values.email
          .trim()
          .toLowerCase(),
        username: values.username
          .trim()
          .toLowerCase(),
        phone:
          values.phone?.trim() || "",
        role: values.role,
      };

      if (
        modalMode === "create" ||
        values.password
      ) {
        payload.password =
          values.password;
      }

      let response;

      if (modalMode === "edit") {
        const userId =
          getUserId(selectedUser);

        if (!userId) {
          throw new Error(
            "Unable to identify the selected user.",
          );
        }

        response = await updateUser(
          userId,
          payload,
        );
      } else {
        response =
          await registerUser(payload);
      }

      message.success(
        response?.data?.message ||
          (modalMode === "edit"
            ? "User updated successfully."
            : "User registered successfully."),
      );

      setUserModalOpen(false);
      setSelectedUser(null);
      userForm.resetFields();

      await loadUsers();
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        (modalMode === "edit"
          ? "Unable to update the user."
          : "Unable to register the user.");

      setModalError(errorMessage);
    } finally {
      setSavingUser(false);
    }
  };

  /* --------------------------------------------------------
     Delete user
  -------------------------------------------------------- */

  const handleDeleteUser = async (user) => {
    const userId = getUserId(user);

    if (!userId) {
      message.error(
        "Unable to identify the selected user.",
      );

      return;
    }

    setDeletingUserId(userId);

    try {
      const response =
        await deleteUser(userId);

      message.success(
        response?.data?.message ||
          "User deleted successfully.",
      );

      await loadUsers();
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to delete the user.";

      message.error(errorMessage);
    } finally {
      setDeletingUserId("");
    }
  };

  /* --------------------------------------------------------
     Table columns
  -------------------------------------------------------- */

  const userColumns = [
    {
      title: "User",
      key: "user",
      width: 260,
      fixed: "left",
      render: (_, record) => {
        const roleDetails =
          getRoleDetails(record?.role);

        return (
          <Space size={12}>
            <Avatar
              size={42}
              style={{
                background:
                  roleDetails.avatarColor,
                flexShrink: 0,
              }}
            >
              {getInitials(record?.name)}
            </Avatar>

            <Space
              direction="vertical"
              size={0}
            >
              <Text strong>
                {record?.name ||
                  "Unnamed User"}
              </Text>

              <Text type="secondary">
                @
                {record?.username ||
                  "no-username"}
              </Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: "User ID",
      key: "userId",
      width: 130,
      render: (_, record) => (
        <Text code>
          {getUserId(record) || "—"}
        </Text>
      ),
    },
    {
      title: "Contact",
      key: "contact",
      width: 260,
      render: (_, record) => (
        <Space
          direction="vertical"
          size={2}
        >
          <Space size={6}>
            <MailOutlined />

            <Text>
              {record?.email || "—"}
            </Text>
          </Space>

          <Space size={6}>
            <PhoneOutlined />

            <Text type="secondary">
              {record?.phone ||
                "No phone number"}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 170,
      render: (role) => {
        const roleDetails =
          getRoleDetails(role);

        return (
          <Tag
            color={roleDetails.color}
            icon={roleDetails.icon}
          >
            {roleDetails.label}
          </Tag>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 190,
      sorter: (
        firstUser,
        secondUser,
      ) => {
        return (
          getDateTimestamp(
            firstUser?.created_at,
          ) -
          getDateTimestamp(
            secondUser?.created_at,
          )
        );
      },
      render: (createdAt) =>
        formatDateTime(createdAt),
    },
    {
      title: "Updated",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 190,
      sorter: (
        firstUser,
        secondUser,
      ) => {
        return (
          getDateTimestamp(
            firstUser?.updated_at,
          ) -
          getDateTimestamp(
            secondUser?.updated_at,
          )
        );
      },
      render: (updatedAt) =>
        formatDateTime(updatedAt),
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      fixed: "right",
      align: "center",
      render: (_, record) => {
        const recordId =
          getUserId(record);

        const isDeleting =
          deletingUserId === recordId;

        return (
          <Space size={8}>
            <Tooltip title="Edit user">
              <Button
                type="primary"
                ghost
                icon={<EditOutlined />}
                onClick={() =>
                  handleOpenEditModal(record)
                }
              />
            </Tooltip>

            <Popconfirm
              title="Delete this user?"
              description={
                <div>
                  <div>
                    This will permanently
                    delete{" "}
                    <Text strong>
                      {record?.name ||
                        "this user"}
                    </Text>
                    .
                  </div>

                  <div>
                    This action cannot be
                    undone.
                  </div>
                </div>
              }
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{
                danger: true,
                loading: isDeleting,
              }}
              onConfirm={() =>
                handleDeleteUser(record)
              }
            >
              <Tooltip title="Delete user">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={isDeleting}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  /* --------------------------------------------------------
     Render
  -------------------------------------------------------- */

  return (
    <ClinicPage
      title="User Management"
      subtitle="Register, view, edit and remove clinic staff accounts."
      icon={<TeamOutlined />}
    >
      <div className="user-management-page">
        {/* ------------------------------------------------
            Summary cards
        ------------------------------------------------ */}

        <Row
          gutter={[16, 16]}
          className="user-summary-row"
        >
          <Col
            xs={24}
            sm={12}
            lg={8}
            xl={4}
          >
            <Card
              bordered={false}
              className="user-summary-card"
            >
              <Statistic
                title="Total Users"
                value={userStatistics.total}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>

          <Col
            xs={24}
            sm={12}
            lg={8}
            xl={5}
          >
            <Card
              bordered={false}
              className="user-summary-card"
            >
              <Statistic
                title="Administrators"
                value={
                  userStatistics.admins
                }
                prefix={<CrownOutlined />}
                valueStyle={{
                  color: "#cf1322",
                }}
              />
            </Card>
          </Col>

          <Col
            xs={24}
            sm={12}
            lg={8}
            xl={5}
          >
            <Card
              bordered={false}
              className="user-summary-card"
            >
              <Statistic
                title="Dentists"
                value={
                  userStatistics.dentists
                }
                prefix={
                  <MedicineBoxOutlined />
                }
                valueStyle={{
                  color: "#1677ff",
                }}
              />
            </Card>
          </Col>

          <Col
            xs={24}
            sm={12}
            lg={8}
            xl={5}
          >
            <Card
              bordered={false}
              className="user-summary-card"
            >
              <Statistic
                title="Receptionists"
                value={
                  userStatistics.receptionists
                }
                prefix={
                  <CustomerServiceOutlined />
                }
                valueStyle={{
                  color: "#389e0d",
                }}
              />
            </Card>
          </Col>

          <Col
            xs={24}
            sm={12}
            lg={8}
            xl={5}
          >
            <Card
              bordered={false}
              className="user-summary-card"
            >
              <Statistic
                title="Cashiers"
                value={
                  userStatistics.cashiers
                }
                prefix={<WalletOutlined />}
                valueStyle={{
                  color: "#d48806",
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* ------------------------------------------------
            Users table
        ------------------------------------------------ */}

        <Card
          bordered={false}
          className="user-table-card"
          title={
            <Space>
              <TeamOutlined />

              <span>Registered Users</span>

              <Tag color="blue">
                {filteredUsers.length}
              </Tag>
            </Space>
          }
          extra={
            <Space wrap>
              <Input
                allowClear
                value={searchText}
                prefix={<SearchOutlined />}
                placeholder="Search users"
                className="user-search-input"
                onChange={(event) =>
                  setSearchText(
                    event.target.value,
                  )
                }
              />

              <Select
                value={roleFilter}
                className="user-role-filter"
                onChange={setRoleFilter}
                options={[
                  {
                    value: "All",
                    label: "All Roles",
                  },
                  ...USER_ROLES.map(
                    (role) => ({
                      value: role.value,
                      label: role.label,
                    }),
                  ),
                ]}
              />

              <Tooltip title="Refresh users">
                <Button
                  icon={<ReloadOutlined />}
                  loading={loadingUsers}
                  onClick={loadUsers}
                >
                  Refresh
                </Button>
              </Tooltip>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={
                  handleOpenAddModal
                }
              >
                Add User
              </Button>
            </Space>
          }
        >
          {usersError && (
            <Alert
              type="error"
              showIcon
              closable
              message={usersError}
              onClose={() =>
                setUsersError("")
              }
              className="user-page-alert"
            />
          )}

          <Table
            rowKey={(record) =>
              getUserId(record)
            }
            loading={loadingUsers}
            columns={userColumns}
            dataSource={filteredUsers}
            scroll={{
              x: 1400,
            }}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: [
                "5",
                "10",
                "20",
                "50",
              ],
              showTotal: (
                total,
                range,
              ) =>
                `${range[0]}-${range[1]} of ${total} users`,
            }}
            locale={{
              emptyText: searchText
                ? "No users match your search."
                : "No registered users found.",
            }}
          />
        </Card>

        {/* ------------------------------------------------
            Role access guide
        ------------------------------------------------ */}

        <Card
          bordered={false}
          className="role-guide-card"
          title={
            <Space>
              <SafetyCertificateOutlined />

              <span>Role Access Guide</span>
            </Space>
          }
        >
          <Row gutter={[16, 16]}>
            {USER_ROLES.map((role) => (
              <Col
                xs={24}
                sm={12}
                xl={6}
                key={role.value}
              >
                <div className="role-guide-item">
                  <Avatar
                    size={42}
                    icon={role.icon}
                    style={{
                      background:
                        role.avatarColor,
                    }}
                  />

                  <div>
                    <Tag
                      color={role.color}
                    >
                      {role.label}
                    </Tag>

                    <div>
                      <Text type="secondary">
                        {role.description}
                      </Text>
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>

        {/* ------------------------------------------------
            Add/Edit user modal
        ------------------------------------------------ */}

        <Modal
          title={
            <Space>
              {modalMode === "edit" ? (
                <EditOutlined />
              ) : (
                <PlusOutlined />
              )}

              <span>
                {modalMode === "edit"
                  ? "Edit User"
                  : "Add New User"}
              </span>
            </Space>
          }
          open={userModalOpen}
          width={760}
          centered
          destroyOnHidden
          maskClosable={!savingUser}
          keyboard={!savingUser}
          confirmLoading={savingUser}
          okText={
            modalMode === "edit"
              ? "Save Changes"
              : "Register User"
          }
          cancelText="Cancel"
          onOk={() =>
            userForm.submit()
          }
          onCancel={handleCloseModal}
          afterClose={() => {
            userForm.resetFields();
            setModalError("");
          }}
        >
          {modalError && (
            <Alert
              type="error"
              showIcon
              closable
              message={modalError}
              onClose={() =>
                setModalError("")
              }
              className="user-modal-alert"
            />
          )}

          {modalMode === "edit" && (
            <Alert
              type="info"
              showIcon
              message="Leave the password fields empty to keep the current password."
              className="user-modal-alert"
            />
          )}

          <Form
            form={userForm}
            layout="vertical"
            requiredMark="optional"
            onFinish={handleSaveUser}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="name"
                  label="Full Name"
                  rules={[
                    {
                      required: true,
                      message:
                        "Please enter the full name.",
                    },
                    {
                      min: 3,
                      message:
                        "Name must contain at least 3 characters.",
                    },
                  ]}
                >
                  <Input
                    size="large"
                    prefix={
                      <UserOutlined />
                    }
                    placeholder="Enter full name"
                    autoComplete="name"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="phone"
                  label="Phone Number"
                  rules={[
                    {
                      pattern:
                        /^[0-9+\-\s]{9,15}$/,
                      message:
                        "Enter a valid phone number.",
                    },
                  ]}
                >
                  <Input
                    size="large"
                    prefix={
                      <PhoneOutlined />
                    }
                    placeholder="0771234567"
                    autoComplete="tel"
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
                      message:
                        "Please enter the email address.",
                    },
                    {
                      type: "email",
                      message:
                        "Enter a valid email address.",
                    },
                  ]}
                >
                  <Input
                    size="large"
                    prefix={
                      <MailOutlined />
                    }
                    placeholder="user@example.com"
                    autoComplete="email"
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
                      message:
                        "Please enter a username.",
                    },
                    {
                      min: 4,
                      message:
                        "Username must contain at least 4 characters.",
                    },
                    {
                      pattern:
                        /^[a-zA-Z0-9._-]+$/,
                      message:
                        "Use only letters, numbers, dots, underscores or hyphens.",
                    },
                  ]}
                >
                  <Input
                    size="large"
                    prefix={
                      <UserOutlined />
                    }
                    placeholder="Enter username"
                    autoComplete="username"
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
                  message:
                    "Please select a user role.",
                },
              ]}
            >
              <Select
                size="large"
                options={USER_ROLES.map(
                  (role) => ({
                    value: role.value,
                    label: role.label,
                  }),
                )}
                suffixIcon={
                  <SafetyCertificateOutlined />
                }
                placeholder="Select role"
              />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="password"
                  label={
                    modalMode === "edit"
                      ? "New Password"
                      : "Password"
                  }
                  hasFeedback
                  rules={[
                    ...(modalMode ===
                    "create"
                      ? [
                          {
                            required: true,
                            message:
                              "Please enter a password.",
                          },
                        ]
                      : []),
                    {
                      min: 6,
                      message:
                        "Password must contain at least 6 characters.",
                    },
                  ]}
                >
                  <Input.Password
                    size="large"
                    prefix={
                      <LockOutlined />
                    }
                    placeholder={
                      modalMode === "edit"
                        ? "Optional new password"
                        : "Enter password"
                    }
                    autoComplete="new-password"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="confirmPassword"
                  label={
                    modalMode === "edit"
                      ? "Confirm New Password"
                      : "Confirm Password"
                  }
                  dependencies={[
                    "password",
                  ]}
                  hasFeedback
                  rules={[
                    ...(modalMode ===
                    "create"
                      ? [
                          {
                            required: true,
                            message:
                              "Please confirm the password.",
                          },
                        ]
                      : []),
                    ({
                      getFieldValue,
                    }) => ({
                      validator(
                        _,
                        value,
                      ) {
                        const password =
                          getFieldValue(
                            "password",
                          );

                        if (
                          !password &&
                          !value
                        ) {
                          return Promise.resolve();
                        }

                        if (
                          password &&
                          !value
                        ) {
                          return Promise.reject(
                            new Error(
                              "Please confirm the password.",
                            ),
                          );
                        }

                        if (
                          password === value
                        ) {
                          return Promise.resolve();
                        }

                        return Promise.reject(
                          new Error(
                            "Passwords do not match.",
                          ),
                        );
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    size="large"
                    prefix={
                      <LockOutlined />
                    }
                    placeholder={
                      modalMode === "edit"
                        ? "Confirm new password"
                        : "Confirm password"
                    }
                    autoComplete="new-password"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </ClinicPage>
  );
};

export default UserRegistration;