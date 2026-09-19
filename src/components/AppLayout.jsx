import React, { memo, useCallback, useEffect, useMemo, useState } from "react";

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
  FileImageOutlined,
  LogoutOutlined,
  MedicineBoxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  PhoneOutlined,
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

/* ========================================================
   ROLE CONFIGURATION
======================================================== */

const ROLES = Object.freeze({
  ADMIN: "Admin",
  DENTIST: "Dentist",
  RECEPTIONIST: "Receptionist",
  CASHIER: "Cashier",
});

const ALL_ROLES = Object.freeze([
  ROLES.ADMIN,
  ROLES.DENTIST,
  ROLES.RECEPTIONIST,
  ROLES.CASHIER,
]);

const CLINIC_ROLES = Object.freeze([
  ROLES.ADMIN,
  ROLES.DENTIST,
  ROLES.RECEPTIONIST,
]);

const PAYMENT_ROLES = Object.freeze([
  ROLES.ADMIN,
  ROLES.CASHIER,
  ROLES.DENTIST,
]);

const DOCTOR_ROLES = Object.freeze([ROLES.ADMIN, ROLES.DENTIST]);

/* ========================================================
   HELPERS
======================================================== */

const normalizeRole = (role) =>
  String(role ?? "")
    .trim()
    .toLowerCase();

const hasRoleAccess = (allowedRoles, userRole) => {
  const normalizedUserRole = normalizeRole(userRole);

  return allowedRoles.some(
    (role) => normalizeRole(role) === normalizedUserRole,
  );
};

/* ========================================================
   MENU CONFIGURATION
======================================================== */

const MENU_CONFIG = [
  {
    type: "group",
    label: "Overview",
    children: [
      {
        key: "/",
        title: "Dashboard",
        icon: <DashboardOutlined />,
        roles: ALL_ROLES,
      },
    ],
  },

  {
    type: "group",
    label: "Clinic Records",
    children: [
      {
        key: "/patients",
        title: "Patients",
        icon: <TeamOutlined />,
        roles: CLINIC_ROLES,
      },

      {
        key: "/ortho",
        title: "Orthodontic Patients",
        icon: <MedicineBoxOutlined />,
        roles: ALL_ROLES,
      },
      {
        key: "/dentists",
        title: "Dentists",
        icon: <MedicineBoxOutlined />,
        roles: [ROLES.ADMIN],
      },
      {
        key: "/follow-up-patients",
        title: "Follow-up Patients",
        icon: <PhoneOutlined />,
        roles: CLINIC_ROLES,
      },
    ],
  },

  {
    type: "group",
    label: "Appointments",
    children: [
      {
        key: "/appointments",
        title: "Appointments",
        icon: <CalendarOutlined />,
        roles: CLINIC_ROLES,
      },
      {
        key: "/appointment-history",
        title: "Appointment History",
        icon: <CarryOutOutlined />,
        roles: CLINIC_ROLES,
      },
      // {
      //   key: "/sms-management",
      //   title: "SMS Management",
      //   icon: <MessageOutlined />,
      //   roles: CLINIC_ROLES,
      // },
      {
        key: "/queue-manager",
        title: "Queue Manager",
        icon: <SolutionOutlined />,
        roles: CLINIC_ROLES,
      },
      // {
      //   key: "/simple-appointment-maintenance",
      //   title: "Appointment Maintenance",
      //   icon: <SolutionOutlined />,
      //   roles: CLINIC_ROLES,
      // },
    ],
  },

  {
    type: "group",
    label: "Treatment & Payments",
    children: [
      {
        key: "/current-treatment",
        title: "Doctor Treatment",
        icon: <MedicineBoxOutlined />,
        roles: DOCTOR_ROLES,
      },
    
      
      // {
      //   key: "/payments",
      //   title: "Payments",
      //   icon: <DollarOutlined />,
      //   roles: PAYMENT_ROLES,
      // },
      {
        key: "/daily-income",
        title: "Payment History",
        icon: <DollarOutlined />,
        roles: DOCTOR_ROLES,
      },
    ],
  },

  {
    type: "group",
    label: "System Administration",
    children: [
      {
        key: "/user-registration",
        title: "Register User",
        icon: <UserAddOutlined />,
        roles: [ROLES.ADMIN],
      },
      {
        key: "/common-treatments",
        title: "Common Treatments",
        icon: <MedicineBoxOutlined />,
        roles: [ROLES.ADMIN],
      },
      {
        key: "/drugs",
        title: "Drugs",
        icon: <MedicineBoxOutlined />,
        roles: [ROLES.ADMIN],
      },
      {
        key: "/locations",
        title: "Locations",
        icon: <MedicineBoxOutlined />,
        roles: [ROLES.ADMIN],
      },
    ],
  },
];

/* ========================================================
   BUILD MENU FOR CURRENT ROLE
======================================================== */

const buildMenuItems = (userRole) => {
  return MENU_CONFIG.reduce((groups, group) => {
    const children = (group.children ?? [])
      .filter((item) => hasRoleAccess(item.roles ?? [], userRole))
      .map(({ roles, title, ...item }) => ({
        ...item,
        label: <Link to={item.key}>{title}</Link>,
      }));

    if (children.length === 0) {
      return groups;
    }

    groups.push({
      type: group.type,
      label: group.label,
      children,
    });

    return groups;
  }, []);
};

/* ========================================================
   FIND ACTIVE MENU ITEM
======================================================== */

const getSelectedMenuKey = (pathname, menuItems) => {
  if (pathname === "/") {
    return "/";
  }

  const items = menuItems.flatMap((group) => group.children ?? []);

  /*
   * Match:
   *
   * /patients
   * /patients/123
   *
   * But avoid accidental matches such as:
   *
   * /patient
   * matching
   * /patient-media
   */
  const matches = items.filter((item) => {
    if (item.key === "/") {
      return false;
    }

    return pathname === item.key || pathname.startsWith(`${item.key}/`);
  });

  if (matches.length === 0) {
    return pathname;
  }

  /*
   * Longest route wins.
   *
   * Example:
   * /patient-media
   * should win over any shorter matching route.
   */
  return matches.reduce((bestMatch, currentItem) =>
    currentItem.key.length > bestMatch.key.length ? currentItem : bestMatch,
  ).key;
};

/* ========================================================
   SIDEBAR
======================================================== */

const SidebarContent = memo(({ collapsed = false, selectedKey, menuItems }) => {
  return (
    <>
      {/* Clinic Brand / Queue Display */}

      <a
        href="/patient-queue"
        target="_blank"
        rel="noopener noreferrer"
        className="clinic-brand-link"
        title="Open Queue Display"
        aria-label="Open Queue Display in a new tab"
      >
        <div
          className={["clinic-brand", collapsed ? "clinic-brand-collapsed" : ""]
            .filter(Boolean)
            .join(" ")}
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

      {/* Navigation */}

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
});

SidebarContent.displayName = "SidebarContent";

/* ========================================================
   APP LAYOUT
======================================================== */

const AppLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const screens = useBreakpoint();

  const { user: currentUser, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* ======================================================
     RESPONSIVE STATE
  ====================================================== */

  const isMobile = screens.lg === false;

  /* ======================================================
     CURRENT USER
  ====================================================== */

  const currentUserRole = currentUser?.role ?? "";

  const currentUserName = currentUser?.name || currentUser?.username || "User";

  const currentUserRoleLabel = currentUser?.role || "Dental Clinic";

  /* ======================================================
     ROLE-BASED MENU
  ====================================================== */

  const menuItems = useMemo(
    () => buildMenuItems(currentUserRole),
    [currentUserRole],
  );

  /* ======================================================
     ACTIVE MENU ITEM
  ====================================================== */

  const selectedKey = useMemo(
    () => getSelectedMenuKey(location.pathname, menuItems),
    [location.pathname, menuItems],
  );

  /* ======================================================
     CLOSE MOBILE MENU AFTER NAVIGATION
  ====================================================== */

  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname]);

  /* ======================================================
     SIDEBAR TOGGLE
  ====================================================== */

  const handleMenuToggle = useCallback(() => {
    if (isMobile) {
      setMobileMenuOpen(true);
      return;
    }

    setCollapsed((currentValue) => !currentValue);
  }, [isMobile]);

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  /* ======================================================
     LOGOUT
  ====================================================== */

  const handleLogout = useCallback(() => {
    logout();

    message.success("Logged out successfully.");

    navigate("/login", {
      replace: true,
    });
  }, [logout, navigate]);

  /* ======================================================
     PROFILE MENU
  ====================================================== */

  const profileMenuItems = useMemo(
    () => [
      {
        key: "profile-information",
        disabled: true,
        label: (
          <div className="clinic-dropdown-user">
            <Text strong>{currentUserName}</Text>

            <Text type="secondary" className="clinic-dropdown-role">
              {currentUserRoleLabel}
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
    ],
    [currentUser?.email, currentUserName, currentUserRoleLabel],
  );

  const handleProfileMenuClick = useCallback(
    ({ key }) => {
      if (key === "logout") {
        handleLogout();
      }
    },
    [handleLogout],
  );

  /* ======================================================
     SIDEBAR WIDTH
  ====================================================== */

  const sidebarWidth = collapsed ? 84 : 270;

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <Layout className="clinic-app-layout">
      {/* ==================================================
          DESKTOP SIDEBAR
      ================================================== */}

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

      {/* ==================================================
          MOBILE SIDEBAR
      ================================================== */}

      <Drawer
        placement="left"
        width={280}
        open={mobileMenuOpen}
        onClose={handleMobileMenuClose}
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

      {/* ==================================================
          MAIN LAYOUT
      ================================================== */}

      <Layout
        className="clinic-main-layout"
        style={{
          marginLeft: isMobile ? 0 : sidebarWidth,
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <Header className="clinic-header">
          {/* Header Left */}

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
              onClick={handleMenuToggle}
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

          {/* Header Right */}

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
                    <Text className="clinic-admin-name">{currentUserName}</Text>

                    <Text className="clinic-admin-role">
                      {currentUserRoleLabel}
                    </Text>
                  </div>
                )}
              </Space>
            </Button>
          </Dropdown>
        </Header>

        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <Content className="clinic-content">
          <div className="clinic-content-container">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
