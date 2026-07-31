import React, { useEffect, useMemo, useState } from "react";

import {
  Button,
  Drawer,
  Dropdown,
  Grid,
  Layout,
  Menu,
  Space,
  Typography,
  message,
} from "antd";

import {
  CalendarOutlined,
  CarryOutOutlined,
  DashboardOutlined,
  DollarOutlined,
  HistoryOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  ScheduleOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";

import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "./css/AppLayout.css";

const { Header, Sider, Content } = Layout;

const { Title, Text } = Typography;

const { useBreakpoint } = Grid;

/* --------------------------------------------------------
   Role constants
-------------------------------------------------------- */

const ROLES = {
  ADMIN: "Admin",
  DENTIST: "Dentist",
  RECEPTIONIST: "Receptionist",
  CASHIER: "Cashier",
};

const ALL_ROLES = [
  ROLES.ADMIN,
  ROLES.DENTIST,
  ROLES.RECEPTIONIST,
  ROLES.CASHIER,
];

const CLINIC_ROLES = [ROLES.ADMIN, ROLES.DENTIST, ROLES.RECEPTIONIST];

/* --------------------------------------------------------
   Role helper
-------------------------------------------------------- */

const normalizeRole = (role = "") => {
  return String(role).trim().toLowerCase();
};

/* --------------------------------------------------------
   Menu items
-------------------------------------------------------- */

const allMenuItems = [
  {
    type: "group",
    label: "Overview",
    children: [
      {
        key: "/",
        icon: <DashboardOutlined />,
        roles: ALL_ROLES,
        label: <Link to="/">Dashboard</Link>,
      },
    ],
  },

  {
    type: "group",
    label: "Clinic Records",
    children: [
      {
        key: "/patients",
        icon: <TeamOutlined />,
        roles: CLINIC_ROLES,
        label: <Link to="/patients">Patients</Link>,
      },
      {
        key: "/dentists",
        icon: <MedicineBoxOutlined />,
        roles: [ROLES.ADMIN],
        label: <Link to="/dentists">Dentists</Link>,
      },
      {
        key: "/patient-history",
        icon: <HistoryOutlined />,
        roles: ALL_ROLES,
        label: <Link to="/patient-history">Patient History</Link>,
      },
    ],
  },

  {
    type: "group",
    label: "Appointments",
    children: [
      {
        key: "/appointments",
        icon: <CalendarOutlined />,
        roles: CLINIC_ROLES,
        label: <Link to="/appointments">Appointments</Link>,
      },
      {
        key: "/appointment-history",
        icon: <CarryOutOutlined />,
        roles: CLINIC_ROLES,
        label: <Link to="/appointment-history">Appointment History</Link>,
      },

      {
        key: "/appointment-maintenance",
        icon: <SolutionOutlined />,
        roles: CLINIC_ROLES,
        label: (
          <Link to="/appointment-maintenance">Appointment Maintenance</Link>
        ),
      },
    ],
  },

  {
    type: "group",
    label: "Treatment & Payments",
    children: [
      {
        key: "/current-treatment",
        icon: <MedicineBoxOutlined />,
        roles: [ROLES.ADMIN, ROLES.DENTIST],
        label: <Link to="/current-treatment">Doctor Treatment</Link>,
      },
      {
        key: "/cashier-payment",
        icon: <WalletOutlined />,
        roles: [ROLES.ADMIN, ROLES.CASHIER, ROLES.DENTIST],
        label: <Link to="/cashier-payment">Cashier Payment</Link>,
      },
      {
        key: "/payments",
        icon: <DollarOutlined />,
        roles: [ROLES.ADMIN, ROLES.CASHIER, ROLES.DENTIST],
        label: <Link to="/payments">Payments</Link>,
      },
      {
        key: "/daily-income",
        icon: <DollarOutlined />,
        roles: [ROLES.ADMIN, ROLES.DENTIST],
        label: <Link to="/daily-income">Payment History</Link>,
      },
    ],
  },

  {
    type: "group",
    label: "Follow-ups",
    children: [
      {
        key: "/follow-up-patients",
        icon: <PhoneOutlined />,
        roles: CLINIC_ROLES,
        label: <Link to="/follow-up-patients">Follow-up Patients</Link>,
      },
    ],
  },

  {
    type: "group",
    label: "System Administration",
    children: [
      {
        key: "/user-registration",
        icon: <UserAddOutlined />,
        roles: [ROLES.ADMIN],
        label: <Link to="/user-registration">Register User</Link>,
      },
    ],
  },
  {
    type: "group",
    label: "System Administration",
    children: [
      {
        key: "/common-treatments",
        icon: <MedicineBoxOutlined />,
        roles: [ROLES.ADMIN],
        label: <Link to="/common-treatments">Common Treatments</Link>,
      },
    ],
  },
  
];

/* --------------------------------------------------------
   Filter menu by user role
-------------------------------------------------------- */

const getMenuItemsByRole = (menuItems, userRole) => {
  const normalizedUserRole = normalizeRole(userRole);

  return menuItems
    .map((group) => {
      const allowedChildren = (group.children || [])
        .filter((item) => {
          const allowedRoles = item.roles || [];

          return allowedRoles.some(
            (role) => normalizeRole(role) === normalizedUserRole,
          );
        })
        .map((item) => {
          const { roles, ...cleanMenuItem } = item;

          return cleanMenuItem;
        });

      return {
        ...group,
        children: allowedChildren,
      };
    })
    .filter((group) => group.children.length > 0);
};

/* --------------------------------------------------------
   Sidebar content
-------------------------------------------------------- */

const SidebarContent = ({ collapsed = false, selectedKey, menuItems }) => {
  return (
    <>
      {/* Opens Queue Display in a new browser tab */}

      <a
        href="/queue-display"
        target="_blank"
        rel="noopener noreferrer"
        className="clinic-brand-link"
        title="Open Queue Display"
        aria-label="Open Queue Display in a new tab"
      >
        <div
          className={`clinic-brand ${
            collapsed ? "clinic-brand-collapsed" : ""
          }`}
        >
          <div className="clinic-brand-logo">
            <MedicineBoxOutlined />
          </div>

          {!collapsed && (
            <div className="clinic-brand-content">
              <Title level={4} className="clinic-brand-title">
                Dental Clinic
              </Title>

              <Text className="clinic-brand-subtitle">Management System</Text>
            </div>
          )}
        </div>
      </a>

      <div className="clinic-menu-scroll">
        <Menu
          theme="dark"
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={[selectedKey]}
          items={menuItems}
          className="clinic-side-menu"
        />
      </div>
    </>
  );
};

/* --------------------------------------------------------
   Main component
-------------------------------------------------------- */

const AppLayout = ({ children }) => {
  const location = useLocation();

  const navigate = useNavigate();

  const screens = useBreakpoint();

  const { user: currentUser, logout } = useAuth();

  const isMobile = !screens.lg;

  const [collapsed, setCollapsed] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentUserRole = currentUser?.role || "";

  /* --------------------------------------------------------
     Visible menu
  -------------------------------------------------------- */

  const menuItems = useMemo(() => {
    return getMenuItemsByRole(allMenuItems, currentUserRole);
  }, [currentUserRole]);

  /* --------------------------------------------------------
     Close mobile menu after navigation
  -------------------------------------------------------- */

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  /* --------------------------------------------------------
     Selected menu key
  -------------------------------------------------------- */

  const selectedKey = useMemo(() => {
    if (location.pathname === "/") {
      return "/";
    }

    const visibleMenuItems = menuItems.flatMap((group) => group.children || []);

    const matchedItems = visibleMenuItems.filter(
      (item) => item.key !== "/" && location.pathname.startsWith(item.key),
    );

    matchedItems.sort(
      (firstItem, secondItem) => secondItem.key.length - firstItem.key.length,
    );

    return matchedItems[0]?.key || location.pathname;
  }, [location.pathname, menuItems]);

  /* --------------------------------------------------------
     Logout
  -------------------------------------------------------- */

  const handleLogout = () => {
    logout();

    message.success("Logged out successfully.");

    navigate("/login", {
      replace: true,
    });
  };

  /* --------------------------------------------------------
     Profile dropdown
  -------------------------------------------------------- */

  const profileMenuItems = [
    {
      key: "profile-information",
      disabled: true,
      label: (
        <div className="clinic-dropdown-user">
          <Text strong>
            {currentUser?.name || currentUser?.username || "User"}
          </Text>

          <Text type="secondary" className="clinic-dropdown-role">
            {currentUser?.role || "Dental Clinic"}
          </Text>

          {currentUser?.email && (
            <Text type="secondary" className="clinic-dropdown-email">
              {currentUser.email}
            </Text>
          )}
        </div>
      ),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      danger: true,
      icon: <LogoutOutlined />,
      label: "Logout",
    },
  ];

  const handleProfileMenuClick = ({ key }) => {
    if (key === "logout") {
      handleLogout();
    }
  };

  return (
    <Layout className="clinic-app-layout">
      {/* Desktop sidebar */}

      {!isMobile && (
        <Sider
          width={270}
          collapsedWidth={84}
          collapsed={collapsed}
          trigger={null}
          collapsible
          className="clinic-desktop-sider"
        >
          <SidebarContent
            collapsed={collapsed}
            selectedKey={selectedKey}
            menuItems={menuItems}
          />
        </Sider>
      )}

      {/* Mobile sidebar */}

      <Drawer
        placement="left"
        width={280}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        closable={false}
        className="clinic-mobile-drawer"
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        <SidebarContent
          collapsed={false}
          selectedKey={selectedKey}
          menuItems={menuItems}
        />
      </Drawer>

      {/* Main layout */}

      <Layout
        className="clinic-main-layout"
        style={{
          marginLeft: isMobile ? 0 : collapsed ? 84 : 270,
        }}
      >
        <Header className="clinic-header">
          {/* Header left */}

          <Space size={14}>
            <Button
              type="text"
              className="clinic-menu-toggle"
              aria-label={
                isMobile
                  ? "Open navigation menu"
                  : collapsed
                    ? "Expand sidebar"
                    : "Collapse sidebar"
              }
              icon={
                isMobile || collapsed ? (
                  <MenuUnfoldOutlined />
                ) : (
                  <MenuFoldOutlined />
                )
              }
              onClick={() => {
                if (isMobile) {
                  setMobileMenuOpen(true);

                  return;
                }

                setCollapsed((currentValue) => !currentValue);
              }}
            />

            <div className="clinic-header-information">
              <Text className="clinic-header-title">Clinic Administration</Text>

              {!isMobile && (
                <Text className="clinic-header-subtitle">
                  Manage daily clinic operations
                </Text>
              )}
            </div>
          </Space>

          {/* Header right */}

          <Dropdown
            menu={{
              items: profileMenuItems,
              onClick: handleProfileMenuClick,
            }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <Button
              type="text"
              className="clinic-user-menu-button"
              aria-label="Open user profile menu"
            >
              <Space size={10}>
                <div className="clinic-admin-avatar">
                  <UserOutlined />
                </div>

                {!isMobile && (
                  <div className="clinic-admin-details">
                    <Text className="clinic-admin-name">
                      {currentUser?.name || currentUser?.username || "User"}
                    </Text>

                    <Text className="clinic-admin-role">
                      {currentUser?.role || "Dental Clinic"}
                    </Text>
                  </div>
                )}
              </Space>
            </Button>
          </Dropdown>
        </Header>

        <Content className="clinic-content">
          <div className="clinic-content-container">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
