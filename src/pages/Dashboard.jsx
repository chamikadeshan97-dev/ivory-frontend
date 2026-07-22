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
  Empty,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import {
  ArrowRightOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import {
  useNavigate,
} from "react-router-dom";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import ClinicPage from "../components/ClinicPage";

import {
  getDailyAppointments,
  getDailyIncome,
  getDailyNextAppointments,
} from "../api/endPoints";

import "./Dashboard.css";

dayjs.extend(customParseFormat);

const {
  Text,
  Title,
} = Typography;

/* --------------------------------------------------------
   Route configuration

   Change only these paths if your application routes
   use different names.
-------------------------------------------------------- */

const DASHBOARD_ROUTES = {
  appointments: "/appointments",
  patients: "/patients",
  queue: "/current-treatment",
  payments: "/daily-income",
  followUps: "/follow-up-patients",
};

/* --------------------------------------------------------
   Constants
-------------------------------------------------------- */

const COMPLETED_STATUSES = [
  "completed",
  "paid",
];

const PAYMENT_PENDING_STATUSES = [
  "treatment done",
  "payment pending",
];

const WAITING_STATUSES = [
  "checked in",
];

const ACTIVE_STATUSES = [
  "pending",
  "confirmed",
  "checked in",
  "in treatment",
  "treatment done",
  "payment pending",
];

/* --------------------------------------------------------
   General helpers
-------------------------------------------------------- */

const normalizeStatus = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const convertToBoolean = (value) => {
  if (value === true || value === 1) {
    return true;
  }

  return [
    "true",
    "yes",
    "1",
  ].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
};

const toNumber = (value) => {
  const number = Number(value || 0);

  return Number.isNaN(number)
    ? 0
    : number;
};

const formatCurrency = (value) => {
  return `Rs. ${toNumber(value).toLocaleString(
    "en-LK",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
};

const formatTime = (value) => {
  if (!value) {
    return "-";
  }

  const formats = [
    "HH:mm",
    "HH:mm:ss",
    "h:mm A",
    "hh:mm A",
  ];

  const parsedTime = dayjs(
    String(value),
    formats,
    true,
  );

  return parsedTime.isValid()
    ? parsedTime.format("h:mm A")
    : value;
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = dayjs(value);

  return date.isValid()
    ? date.format("DD MMM YYYY")
    : value;
};

const extractArray = (response) => {
  const possibleData = [
    response?.data?.data,
    response?.data?.appointments,
    response?.data?.followUps,
    response?.data?.nextAppointments,
    response?.data,
  ];

  const foundArray = possibleData.find(
    Array.isArray,
  );

  return foundArray || [];
};

const getAppointmentId = (appointment) => {
  return (
    appointment?.appointment_id ||
    appointment?.id ||
    "-"
  );
};

const getPatientId = (record) => {
  return (
    record?.patient_id ||
    record?.patient?.id ||
    "-"
  );
};

const getPatientName = (record) => {
  return (
    record?.patient_name ||
    record?.name ||
    record?.patient?.name ||
    "Unknown Patient"
  );
};

const getPatientPhone = (record) => {
  return (
    record?.patient_phone ||
    record?.phone ||
    record?.patient?.phone ||
    "-"
  );
};

const getAppointmentTime = (appointment) => {
  return (
    appointment?.appointment_time ||
    appointment?.time ||
    "-"
  );
};

const getQueueNumber = (appointment) => {
  return (
    appointment?.queue_number ||
    appointment?.appointment_number ||
    appointment?.queue_no ||
    "-"
  );
};

const getReason = (appointment) => {
  return (
    appointment?.reason_for_visit ||
    appointment?.reason ||
    "General consultation"
  );
};

const hasAllergy = (record) => {
  return convertToBoolean(
    record?.has_allergies ??
      record?.patient?.has_allergies,
  );
};

const getAllergyDetails = (record) => {
  return (
    record?.allergy_details ||
    record?.patient?.allergy_details ||
    "Allergy information recorded"
  );
};

const getStatusColor = (statusValue) => {
  const status = normalizeStatus(statusValue);

  const colors = {
    pending: "orange",
    confirmed: "blue",
    "checked in": "cyan",
    "in treatment": "purple",
    "treatment done": "geekblue",
    "payment pending": "gold",
    paid: "green",
    completed: "green",
    cancelled: "red",
  };

  return colors[status] || "default";
};

const getIncomeTotal = (response) => {
  const data =
    response?.data?.data ||
    response?.data ||
    {};

  const possibleTotals = [
    data?.total_income,
    data?.totalIncome,
    data?.total_payment,
    data?.totalPayment,
    data?.income,
    data?.total,
    data?.summary?.total_income,
  ];

  const availableTotal = possibleTotals.find(
    (value) => value !== undefined && value !== null,
  );

  if (availableTotal !== undefined) {
    return toNumber(availableTotal);
  }

  const payments = Array.isArray(data)
    ? data
    : data?.payments;

  if (Array.isArray(payments)) {
    return payments.reduce(
      (total, payment) =>
        total +
        toNumber(
          payment?.payment_amount ??
            payment?.amount,
        ),
      0,
    );
  }

  return 0;
};

const getCheckInTime = (appointment) => {
  return (
    appointment?.checked_in_at ||
    appointment?.check_in_time ||
    appointment?.updated_at ||
    null
  );
};

const getWaitingMinutes = (appointment) => {
  const checkInTime = getCheckInTime(
    appointment,
  );

  if (!checkInTime) {
    return null;
  }

  const date = dayjs(checkInTime);

  if (!date.isValid()) {
    return null;
  }

  const difference = dayjs().diff(
    date,
    "minute",
  );

  return difference >= 0
    ? difference
    : null;
};

/* --------------------------------------------------------
   Summary card
-------------------------------------------------------- */

const SummaryCard = ({
  title,
  value,
  icon,
  tone,
  helper,
  onClick,
  loading,
}) => {
  return (
    <Card
      bordered={false}
      className={`dashboard-summary-card dashboard-summary-card--${tone}`}
      onClick={onClick}
    >
      <div className="dashboard-summary-card__content">
        <div>
          <Text className="dashboard-summary-card__title">
            {title}
          </Text>

          <Statistic
            loading={loading}
            value={value}
            valueStyle={{
              fontSize: 28,
              fontWeight: 750,
              color: "#172033",
            }}
          />

          <Text className="dashboard-summary-card__helper">
            {helper}
          </Text>
        </div>

        <div className="dashboard-summary-card__icon">
          {icon}
        </div>
      </div>
    </Card>
  );
};

/* --------------------------------------------------------
   Main component
-------------------------------------------------------- */

const Dashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(false);

  const [appointments, setAppointments] =
    useState([]);

  const [followUps, setFollowUps] =
    useState([]);

  const [todayIncome, setTodayIncome] =
    useState(0);

  const selectedDate = useMemo(
    () => dayjs(),
    [],
  );

  /* ------------------------------------------------------
     Load dashboard data
  ------------------------------------------------------ */

  const loadDashboard = useCallback(
    async () => {
      const date =
        selectedDate.format("YYYY-MM-DD");

      setLoading(true);

      try {
        const [
          appointmentsResult,
          incomeResult,
          followUpsResult,
        ] = await Promise.allSettled([
          getDailyAppointments(date),
          getDailyIncome(date),
          getDailyNextAppointments(date),
        ]);

        if (
          appointmentsResult.status ===
          "fulfilled"
        ) {
          setAppointments(
            extractArray(
              appointmentsResult.value,
            ),
          );
        } else {
          setAppointments([]);
        }

        if (
          incomeResult.status ===
          "fulfilled"
        ) {
          setTodayIncome(
            getIncomeTotal(
              incomeResult.value,
            ),
          );
        } else {
          setTodayIncome(0);
        }

        if (
          followUpsResult.status ===
          "fulfilled"
        ) {
          setFollowUps(
            extractArray(
              followUpsResult.value,
            ),
          );
        } else {
          setFollowUps([]);
        }

        const failedRequests = [
          appointmentsResult,
          incomeResult,
          followUpsResult,
        ].filter(
          (result) =>
            result.status === "rejected",
        );

        if (failedRequests.length > 0) {
          message.warning(
            "Some dashboard information could not be loaded",
          );
        }
      } catch (error) {
        console.error(
          "Dashboard load error:",
          error,
        );

        message.error(
          "Unable to load dashboard information",
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedDate],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ------------------------------------------------------
     Calculated information
  ------------------------------------------------------ */

  const dashboardData = useMemo(() => {
    const currentTreatment =
      appointments.find(
        (appointment) =>
          normalizeStatus(
            appointment?.status,
          ) === "in treatment",
      ) || null;

    const waitingPatients = appointments
      .filter((appointment) =>
        WAITING_STATUSES.includes(
          normalizeStatus(
            appointment?.status,
          ),
        ),
      )
      .sort((first, second) => {
        const firstQueue = toNumber(
          getQueueNumber(first),
        );

        const secondQueue = toNumber(
          getQueueNumber(second),
        );

        return firstQueue - secondQueue;
      });

    const paymentPending =
      appointments.filter(
        (appointment) =>
          PAYMENT_PENDING_STATUSES.includes(
            normalizeStatus(
              appointment?.status,
            ),
          ),
      );

    const completed =
      appointments.filter(
        (appointment) =>
          COMPLETED_STATUSES.includes(
            normalizeStatus(
              appointment?.status,
            ),
          ),
      );

    const activeAppointments =
      appointments.filter(
        (appointment) =>
          ACTIVE_STATUSES.includes(
            normalizeStatus(
              appointment?.status,
            ),
          ),
      );

    const cancelled =
      appointments.filter(
        (appointment) =>
          normalizeStatus(
            appointment?.status,
          ) === "cancelled",
      );

    return {
      currentTreatment,
      waitingPatients,
      paymentPending,
      completed,
      activeAppointments,
      cancelled,
    };
  }, [appointments]);

  const completionPercentage =
    appointments.length > 0
      ? Math.round(
          (dashboardData.completed.length /
            appointments.length) *
            100,
        )
      : 0;

  /* ------------------------------------------------------
     Alerts
  ------------------------------------------------------ */

  const dashboardAlerts = useMemo(() => {
    const alerts = [];

    const allergyPatients =
      dashboardData.waitingPatients.filter(
        hasAllergy,
      );

    const longWaitingPatients =
      dashboardData.waitingPatients.filter(
        (appointment) => {
          const minutes =
            getWaitingMinutes(appointment);

          return (
            minutes !== null &&
            minutes >= 30
          );
        },
      );

    if (
      dashboardData.paymentPending.length >
      0
    ) {
      alerts.push({
        key: "payments",
        type: "warning",
        title: `${dashboardData.paymentPending.length} payment${
          dashboardData.paymentPending
            .length === 1
            ? ""
            : "s"
        } pending`,
        description:
          "Treatment is completed, but payment processing is still required.",
      });
    }

    if (followUps.length > 0) {
      alerts.push({
        key: "followups",
        type: "info",
        title: `${followUps.length} follow-up patient${
          followUps.length === 1
            ? ""
            : "s"
        } due today`,
        description:
          "Contact these patients and create appointments when necessary.",
      });
    }

    if (allergyPatients.length > 0) {
      alerts.push({
        key: "allergies",
        type: "error",
        title: `${allergyPatients.length} waiting patient${
          allergyPatients.length === 1
            ? ""
            : "s"
        } with allergies`,
        description:
          "Review allergy information before beginning treatment.",
      });
    }

    if (longWaitingPatients.length > 0) {
      alerts.push({
        key: "waiting",
        type: "warning",
        title: `${longWaitingPatients.length} patient${
          longWaitingPatients.length === 1
            ? ""
            : "s"
        } waiting over 30 minutes`,
        description:
          "Check the queue and inform delayed patients.",
      });
    }

    return alerts;
  }, [
    dashboardData.paymentPending,
    dashboardData.waitingPatients,
    followUps,
  ]);

  /* ------------------------------------------------------
     Waiting queue columns
  ------------------------------------------------------ */

  const waitingColumns = [
    {
      title: "Queue",
      key: "queue",
      width: 80,
      render: (_, record, index) => (
        <div className="dashboard-queue-number">
          {getQueueNumber(record) !== "-"
            ? String(
                getQueueNumber(record),
              ).padStart(2, "0")
            : index + 1}
        </div>
      ),
    },
    {
      title: "Patient",
      key: "patient",
      render: (_, record) => (
        <Space size={10}>
          <Avatar
            icon={<UserOutlined />}
            className="dashboard-patient-avatar"
          />

          <div>
            <Space size={6}>
              <Text strong>
                {getPatientName(record)}
              </Text>

              {hasAllergy(record) && (
                <Tag color="red">
                  Allergy
                </Tag>
              )}
            </Space>

            <div>
              <Text type="secondary">
                <PhoneOutlined />{" "}
                {getPatientPhone(record)}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Appointment",
      key: "appointment",
      width: 150,
      render: (_, record) => (
        <div>
          <Text strong>
            {formatTime(
              getAppointmentTime(record),
            )}
          </Text>

          <div>
            <Text type="secondary">
              {getReason(record)}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Waiting",
      key: "waiting",
      width: 120,
      render: (_, record) => {
        const minutes =
          getWaitingMinutes(record);

        if (minutes === null) {
          return (
            <Text type="secondary">
              Checked in
            </Text>
          );
        }

        return (
          <Tag
            color={
              minutes >= 30
                ? "red"
                : minutes >= 15
                  ? "orange"
                  : "blue"
            }
          >
            {minutes} min
          </Tag>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status || "Checked In"}
        </Tag>
      ),
    },
    {
      title: "",
      key: "action",
      width: 60,
      render: () => (
        <Button
          type="text"
          icon={<ArrowRightOutlined />}
          onClick={() =>
            navigate(
              DASHBOARD_ROUTES.queue,
            )
          }
        />
      ),
    },
  ];

  /* ------------------------------------------------------
     Follow-up columns
  ------------------------------------------------------ */

  const followUpColumns = [
    {
      title: "Patient",
      key: "patient",
      render: (_, record) => (
        <Space size={10}>
          <Avatar
            icon={<UserOutlined />}
          />

          <div>
            <Text strong>
              {getPatientName(record)}
            </Text>

            <div>
              <Text type="secondary">
                {getPatientPhone(record)}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Previous Treatment",
      key: "treatment",
      render: (_, record) => (
        <div>
          <Text>
            {record?.treatment_performed ||
              record?.diagnosis ||
              "Previous treatment"}
          </Text>

          <div>
            <Text type="secondary">
              {formatDate(
                record?.treatment_date,
              )}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Doctor Note",
      key: "note",
      render: (_, record) => (
        <Text type="secondary">
          {record?.doctor_notes ||
            "Follow-up recommended"}
        </Text>
      ),
    },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          icon={<CalendarOutlined />}
          onClick={() =>
            navigate(
              DASHBOARD_ROUTES.appointments,
              {
                state: {
                  patientId:
                    getPatientId(record),
                  patientName:
                    getPatientName(record),
                },
              },
            )
          }
        >
          Book Visit
        </Button>
      ),
    },
  ];

  /* ------------------------------------------------------
     Appointment columns
  ------------------------------------------------------ */

  const appointmentColumns = [
    {
      title: "Time",
      key: "time",
      width: 110,
      render: (_, record) => (
        <Text strong>
          {formatTime(
            getAppointmentTime(record),
          )}
        </Text>
      ),
    },
    {
      title: "Queue",
      key: "queue",
      width: 85,
      render: (_, record) => (
        <Tag color="blue">
          #{getQueueNumber(record)}
        </Tag>
      ),
    },
    {
      title: "Patient",
      key: "patient",
      render: (_, record) => (
        <Space size={8}>
          <Text strong>
            {getPatientName(record)}
          </Text>

          {hasAllergy(record) && (
            <WarningOutlined
              style={{
                color: "#dc2626",
              }}
            />
          )}
        </Space>
      ),
    },
    {
      title: "Reason",
      key: "reason",
      render: (_, record) => (
        <Text type="secondary">
          {getReason(record)}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 145,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status || "Pending"}
        </Tag>
      ),
    },
  ];

  return (
    <ClinicPage
      title="Clinic Dashboard"
      subtitle={`${selectedDate.format(
        "dddd, DD MMMM YYYY",
      )} · Today's clinic overview`}
      icon={<MedicineBoxOutlined />}
      actions={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={loadDashboard}
        >
          Refresh
        </Button>,

        <Button
          key="appointment"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() =>
            navigate(
              DASHBOARD_ROUTES.appointments,
            )
          }
        >
          New Appointment
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        {/* Summary cards */}

        <Row
          gutter={[16, 16]}
          className="dashboard-summary-row"
        >
          <Col
            xs={24}
            sm={12}
            xl={4}
          >
            <SummaryCard
              title="Appointments"
              value={appointments.length}
              helper="Scheduled today"
              tone="blue"
              icon={<CalendarOutlined />}
              loading={loading}
              onClick={() =>
                navigate(
                  DASHBOARD_ROUTES.appointments,
                )
              }
            />
          </Col>

          <Col
            xs={24}
            sm={12}
            xl={4}
          >
            <SummaryCard
              title="Waiting"
              value={
                dashboardData
                  .waitingPatients.length
              }
              helper="Checked-in patients"
              tone="cyan"
              icon={<TeamOutlined />}
              loading={loading}
              onClick={() =>
                navigate(
                  DASHBOARD_ROUTES.queue,
                )
              }
            />
          </Col>

          <Col
            xs={24}
            sm={12}
            xl={4}
          >
            <SummaryCard
              title="In Treatment"
              value={
                dashboardData
                  .currentTreatment
                  ? 1
                  : 0
              }
              helper="Current patient"
              tone="purple"
              icon={<MedicineBoxOutlined />}
              loading={loading}
            />
          </Col>

          <Col
            xs={24}
            sm={12}
            xl={4}
          >
            <SummaryCard
              title="Payment Pending"
              value={
                dashboardData
                  .paymentPending.length
              }
              helper="Requires attention"
              tone="orange"
              icon={<DollarOutlined />}
              loading={loading}
              onClick={() =>
                navigate(
                  DASHBOARD_ROUTES.payments,
                )
              }
            />
          </Col>

          <Col
            xs={24}
            sm={12}
            xl={4}
          >
            <SummaryCard
              title="Today's Income"
              value={formatCurrency(
                todayIncome,
              )}
              helper="Payments received"
              tone="green"
              icon={<DollarOutlined />}
              loading={loading}
              onClick={() =>
                navigate(
                  DASHBOARD_ROUTES.payments,
                )
              }
            />
          </Col>

          <Col
            xs={24}
            sm={12}
            xl={4}
          >
            <SummaryCard
              title="Follow-ups"
              value={followUps.length}
              helper="Due today"
              tone="red"
              icon={<BellOutlined />}
              loading={loading}
              onClick={() =>
                navigate(
                  DASHBOARD_ROUTES.followUps,
                )
              }
            />
          </Col>
        </Row>

        {/* Quick actions */}

        <Card
          bordered={false}
          className="dashboard-card dashboard-quick-actions"
        >
          <div className="dashboard-section-heading">
            <div>
              <Title level={4}>
                Quick Actions
              </Title>

              <Text type="secondary">
                Frequently used clinic
                operations
              </Text>
            </div>
          </div>

          <Space
            wrap
            size={[10, 10]}
          >
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              onClick={() =>
                navigate(
                  DASHBOARD_ROUTES.appointments,
                )
              }
            >
              New Appointment
            </Button>

            <Button
              icon={<UserAddOutlined />}
              onClick={() =>
                navigate(
                  DASHBOARD_ROUTES.patients,
                )
              }
            >
              Register Patient
            </Button>

            <Button
              icon={<TeamOutlined />}
              onClick={() =>
                navigate(
                  DASHBOARD_ROUTES.queue,
                )
              }
            >
              Open Queue
            </Button>

            <Button
              icon={<DollarOutlined />}
              onClick={() =>
                navigate(
                  DASHBOARD_ROUTES.payments,
                )
              }
            >
              View Payments
            </Button>

            <Button
              icon={<BellOutlined />}
              onClick={() =>
                navigate(
                  DASHBOARD_ROUTES.followUps,
                )
              }
            >
              Follow-up Patients
            </Button>
          </Space>
        </Card>

        {/* Current treatment and alerts */}

        <Row gutter={[16, 16]}>
          <Col
            xs={24}
            xl={14}
          >
            <Card
              bordered={false}
              className="dashboard-card dashboard-current-treatment"
            >
              <div className="dashboard-section-heading">
                <div>
                  <Space>
                    <div className="dashboard-section-icon dashboard-section-icon--purple">
                      <MedicineBoxOutlined />
                    </div>

                    <div>
                      <Title level={4}>
                        Currently Treating
                      </Title>

                      <Text type="secondary">
                        Active treatment session
                      </Text>
                    </div>
                  </Space>
                </div>

                {dashboardData.currentTreatment && (
                  <Tag color="purple">
                    In Treatment
                  </Tag>
                )}
              </div>

              {dashboardData.currentTreatment ? (
                <div className="dashboard-treatment-content">
                  <div className="dashboard-current-patient">
                    <Avatar
                      size={64}
                      icon={<UserOutlined />}
                      className="dashboard-current-patient__avatar"
                    />

                    <div>
                      <Space
                        wrap
                        size={8}
                      >
                        <Title level={3}>
                          {getPatientName(
                            dashboardData.currentTreatment,
                          )}
                        </Title>

                        {hasAllergy(
                          dashboardData.currentTreatment,
                        ) && (
                          <Tag
                            color="red"
                            icon={
                              <WarningOutlined />
                            }
                          >
                            Allergy
                          </Tag>
                        )}
                      </Space>

                      <Space
                        wrap
                        size={16}
                      >
                        <Text type="secondary">
                          <PhoneOutlined />{" "}
                          {getPatientPhone(
                            dashboardData.currentTreatment,
                          )}
                        </Text>

                        <Text type="secondary">
                          <ClockCircleOutlined />{" "}
                          {formatTime(
                            getAppointmentTime(
                              dashboardData.currentTreatment,
                            ),
                          )}
                        </Text>
                      </Space>
                    </div>
                  </div>

                  {hasAllergy(
                    dashboardData.currentTreatment,
                  ) && (
                    <Alert
                      type="error"
                      showIcon
                      message="Patient Allergy Warning"
                      description={getAllergyDetails(
                        dashboardData.currentTreatment,
                      )}
                    />
                  )}

                  <Row
                    gutter={[12, 12]}
                    className="dashboard-treatment-details"
                  >
                    <Col
                      xs={24}
                      md={8}
                    >
                      <div className="dashboard-detail-box">
                        <Text type="secondary">
                          Queue Number
                        </Text>

                        <Title level={4}>
                          #
                          {getQueueNumber(
                            dashboardData.currentTreatment,
                          )}
                        </Title>
                      </div>
                    </Col>

                    <Col
                      xs={24}
                      md={8}
                    >
                      <div className="dashboard-detail-box">
                        <Text type="secondary">
                          Reason
                        </Text>

                        <Title level={5}>
                          {getReason(
                            dashboardData.currentTreatment,
                          )}
                        </Title>
                      </div>
                    </Col>

                    <Col
                      xs={24}
                      md={8}
                    >
                      <div className="dashboard-detail-box">
                        <Text type="secondary">
                          Appointment ID
                        </Text>

                        <Title level={5}>
                          {getAppointmentId(
                            dashboardData.currentTreatment,
                          )}
                        </Title>
                      </div>
                    </Col>
                  </Row>

                  <Button
                    type="primary"
                    icon={<ArrowRightOutlined />}
                    onClick={() =>
                      navigate(
                        DASHBOARD_ROUTES.queue,
                      )
                    }
                  >
                    Open Current Appointment
                  </Button>
                </div>
              ) : (
                <Empty
                  image={
                    Empty.PRESENTED_IMAGE_SIMPLE
                  }
                  description={
                    <div>
                      <Text strong>
                        No patient is currently
                        in treatment
                      </Text>

                      <div>
                        <Text type="secondary">
                          Start treatment from
                          the daily queue.
                        </Text>
                      </div>
                    </div>
                  }
                >
                  <Button
                    type="primary"
                    onClick={() =>
                      navigate(
                        DASHBOARD_ROUTES.queue,
                      )
                    }
                  >
                    Open Daily Queue
                  </Button>
                </Empty>
              )}
            </Card>
          </Col>

          <Col
            xs={24}
            xl={10}
          >
            <Card
              bordered={false}
              className="dashboard-card dashboard-alert-card"
            >
              <div className="dashboard-section-heading">
                <Space>
                  <div className="dashboard-section-icon dashboard-section-icon--orange">
                    <BellOutlined />
                  </div>

                  <div>
                    <Title level={4}>
                      Important Alerts
                    </Title>

                    <Text type="secondary">
                      Items requiring attention
                    </Text>
                  </div>
                </Space>

                <Tag
                  color={
                    dashboardAlerts.length >
                    0
                      ? "orange"
                      : "green"
                  }
                >
                  {dashboardAlerts.length}
                </Tag>
              </div>

              {dashboardAlerts.length > 0 ? (
                <Space
                  direction="vertical"
                  size={10}
                  style={{
                    width: "100%",
                  }}
                >
                  {dashboardAlerts.map(
                    (alert) => (
                      <Alert
                        key={alert.key}
                        type={alert.type}
                        showIcon
                        message={alert.title}
                        description={
                          alert.description
                        }
                      />
                    ),
                  )}
                </Space>
              ) : (
                <div className="dashboard-all-clear">
                  <CheckCircleOutlined />

                  <Title level={4}>
                    Everything looks good
                  </Title>

                  <Text type="secondary">
                    There are no urgent clinic
                    alerts at the moment.
                  </Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Waiting queue */}

        <Card
          bordered={false}
          className="dashboard-card"
        >
          <div className="dashboard-section-heading">
            <Space>
              <div className="dashboard-section-icon dashboard-section-icon--blue">
                <TeamOutlined />
              </div>

              <div>
                <Title level={4}>
                  Waiting Queue
                </Title>

                <Text type="secondary">
                  Checked-in patients waiting
                  for treatment
                </Text>
              </div>
            </Space>

            <Button
              type="link"
              onClick={() =>
                navigate(
                  DASHBOARD_ROUTES.queue,
                )
              }
            >
              View Full Queue{" "}
              <ArrowRightOutlined />
            </Button>
          </div>

          <Table
            rowKey={(record) =>
              getAppointmentId(record)
            }
            columns={waitingColumns}
            dataSource={
              dashboardData.waitingPatients
            }
            pagination={false}
            scroll={{
              x: 850,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={
                    Empty.PRESENTED_IMAGE_SIMPLE
                  }
                  description="No patients are waiting"
                />
              ),
            }}
            rowClassName={(
              _record,
              index,
            ) =>
              index === 0
                ? "dashboard-next-patient-row"
                : ""
            }
          />
        </Card>

        {/* Follow-ups */}

        <Card
          bordered={false}
          className="dashboard-card"
        >
          <div className="dashboard-section-heading">
            <Space>
              <div className="dashboard-section-icon dashboard-section-icon--red">
                <BellOutlined />
              </div>

              <div>
                <Title level={4}>
                  Follow-ups Due Today
                </Title>

                <Text type="secondary">
                  Patients requested to return
                  by the doctor
                </Text>
              </div>
            </Space>

            <Tag color="red">
              {followUps.length} Due
            </Tag>
          </div>

          <Table
            rowKey={(record, index) =>
              record?.treatment_id ||
              record?.id ||
              index
            }
            columns={followUpColumns}
            dataSource={followUps}
            pagination={false}
            scroll={{
              x: 800,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={
                    Empty.PRESENTED_IMAGE_SIMPLE
                  }
                  description="No follow-up patients are due today"
                />
              ),
            }}
          />
        </Card>

        {/* Daily progress and appointments */}

        <Row gutter={[16, 16]}>
          <Col
            xs={24}
            xl={7}
          >
            <Card
              bordered={false}
              className="dashboard-card dashboard-progress-card"
            >
              <div className="dashboard-section-heading">
                <div>
                  <Title level={4}>
                    Daily Progress
                  </Title>

                  <Text type="secondary">
                    Appointment completion
                  </Text>
                </div>
              </div>

              <Progress
                type="dashboard"
                percent={
                  completionPercentage
                }
                strokeWidth={10}
              />

              <div className="dashboard-progress-statistics">
                <div>
                  <Text type="secondary">
                    Completed
                  </Text>

                  <Title level={4}>
                    {
                      dashboardData.completed
                        .length
                    }
                  </Title>
                </div>

                <div>
                  <Text type="secondary">
                    Active
                  </Text>

                  <Title level={4}>
                    {
                      dashboardData
                        .activeAppointments
                        .length
                    }
                  </Title>
                </div>

                <div>
                  <Text type="secondary">
                    Cancelled
                  </Text>

                  <Title level={4}>
                    {
                      dashboardData.cancelled
                        .length
                    }
                  </Title>
                </div>
              </div>
            </Card>
          </Col>

          <Col
            xs={24}
            xl={17}
          >
            <Card
              bordered={false}
              className="dashboard-card"
            >
              <div className="dashboard-section-heading">
                <Space>
                  <div className="dashboard-section-icon dashboard-section-icon--green">
                    <CalendarOutlined />
                  </div>

                  <div>
                    <Title level={4}>
                      Today's Appointments
                    </Title>

                    <Text type="secondary">
                      Complete appointment
                      schedule
                    </Text>
                  </div>
                </Space>

                <Button
                  type="link"
                  onClick={() =>
                    navigate(
                      DASHBOARD_ROUTES.appointments,
                    )
                  }
                >
                  Manage Appointments
                </Button>
              </div>

              <Table
                rowKey={(record) =>
                  getAppointmentId(record)
                }
                columns={appointmentColumns}
                dataSource={appointments}
                pagination={{
                  pageSize: 5,
                  hideOnSinglePage: true,
                }}
                scroll={{
                  x: 700,
                }}
                locale={{
                  emptyText: (
                    <Empty description="No appointments scheduled today" />
                  ),
                }}
                rowClassName={(record) => {
                  const status =
                    normalizeStatus(
                      record?.status,
                    );

                  if (
                    status ===
                    "in treatment"
                  ) {
                    return "dashboard-treatment-row";
                  }

                  if (hasAllergy(record)) {
                    return "dashboard-allergy-row";
                  }

                  return "";
                }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </ClinicPage>
  );
};

export default Dashboard;