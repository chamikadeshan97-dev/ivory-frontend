import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  SearchOutlined,
  StopOutlined,
  UserOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import {
  getAppointmentsByDateRange,
  getDentists,
  getPatientFullDetails,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";
import AppointmentDetailsModal from "../components/AppointmentDetailsModal";

import "./css/DailyAppointments.css";

const {
  Title,
  Text,
} = Typography;

const {
  RangePicker,
} = DatePicker;

/* --------------------------------------------------------
   Constants
-------------------------------------------------------- */

const ACTIVE_STATUSES = [
  "pending",
  "confirmed",
  "checked in",
  "in treatment",
  "treatment done",
  "payment pending",
];

const COMPLETED_STATUSES = [
  "paid",
  "completed",
];

/* --------------------------------------------------------
   Response helpers
-------------------------------------------------------- */

const getDefaultDateRange = () => {
  return [
    dayjs().startOf("month"),
    dayjs(),
  ];
};

const extractData = (response) => {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
};

const extractArray = (response) => {
  const data =
    extractData(response);

  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(data?.appointments)
  ) {
    return data.appointments;
  }

  return [];
};

const getResponseTotal = (
  response,
  fallback,
) => {
  return (
    response?.data?.total ??
    response?.data?.data?.total ??
    fallback
  );
};

/* --------------------------------------------------------
   Appointment helpers
-------------------------------------------------------- */

const normalizeStatus = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const getAppointmentId = (
  appointment,
) => {
  return (
    appointment?.appointment_id ||
    appointment?.id ||
    ""
  );
};

const getAppointmentDate = (
  appointment,
) => {
  return (
    appointment?.appointment_date ||
    appointment?.date ||
    ""
  );
};

const getAppointmentTime = (
  appointment,
) => {
  return (
    appointment?.appointment_time ||
    appointment?.time ||
    ""
  );
};

const getPatientName = (
  appointment,
) => {
  return (
    appointment?.patient_name ||
    appointment?.patient_id ||
    "-"
  );
};

const getPatientPhone = (
  appointment,
) => {
  return (
    appointment?.phone ||
    appointment?.patient_phone ||
    "-"
  );
};

const getDentistName = (
  appointment,
) => {
  return (
    appointment?.dentist_name ||
    appointment?.dentist_id ||
    "-"
  );
};

const getReason = (
  appointment,
) => {
  return (
    appointment?.reason_for_visit ||
    appointment?.reason ||
    "-"
  );
};

const getPersonName = (
  person,
  fallback = "-",
) => {
  if (!person) {
    return fallback;
  }

  return (
    person.name ||
    person.full_name ||
    [
      person.first_name,
      person.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    fallback
  );
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

const formatTime = (value) => {
  if (!value) {
    return "-";
  }

  const timeFormats = [
    "HH:mm",
    "HH:mm:ss",
    "h:mm A",
    "hh:mm A",
  ];

  const parsedTime = dayjs(
    String(value),
    timeFormats,
    true,
  );

  return parsedTime.isValid()
    ? parsedTime.format("h:mm A")
    : value;
};

const getStatusColor = (status) => {
  const statusColors = {
    Pending: "blue",
    Confirmed: "purple",
    "Checked In": "cyan",
    "In Treatment": "processing",
    "Treatment Done": "geekblue",
    "Payment Pending": "orange",
    Paid: "green",
    Completed: "success",
    Cancelled: "error",
  };

  return (
    statusColors[status] ||
    "default"
  );
};

/* --------------------------------------------------------
   Summary card
-------------------------------------------------------- */

const AppointmentSummaryCard = ({
  title,
  value,
  helper,
  icon,
  tone,
}) => {
  return (
    <Card
      bordered={false}
      className={`appointment-summary-card appointment-summary-card--${tone}`}
    >
      <div className="appointment-summary-card__content">
        <div>
          <Text className="appointment-summary-card__title">
            {title}
          </Text>

          <div className="appointment-summary-card__value">
            {value}
          </div>

          <Text className="appointment-summary-card__helper">
            {helper}
          </Text>
        </div>

        <div className="appointment-summary-card__icon">
          {icon}
        </div>
      </div>
    </Card>
  );
};

/* --------------------------------------------------------
   Appointment history page
-------------------------------------------------------- */

const DailyAppointments = () => {
  const [loading, setLoading] =
    useState(false);

  const [
    selectedDateRange,
    setSelectedDateRange,
  ] = useState(
    getDefaultDateRange(),
  );

  const [
    appointments,
    setAppointments,
  ] = useState([]);

  const [total, setTotal] =
    useState(0);

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    detailsModalOpen,
    setDetailsModalOpen,
  ] = useState(false);

  const [
    selectedAppointmentId,
    setSelectedAppointmentId,
  ] = useState(null);

  /* ------------------------------------------------------
     Initial load
  ------------------------------------------------------ */

  useEffect(() => {
    loadAppointments(
      getDefaultDateRange(),
    );
  }, []);

  /* ------------------------------------------------------
     Load appointments
  ------------------------------------------------------ */

  const loadAppointments = async (
    dateRange = selectedDateRange,
  ) => {
    if (
      !dateRange ||
      dateRange.length !== 2 ||
      !dateRange[0] ||
      !dateRange[1]
    ) {
      message.warning(
        "Please select a valid date range",
      );

      return;
    }

    const startDate =
      dateRange[0].format(
        "YYYY-MM-DD",
      );

    const endDate =
      dateRange[1].format(
        "YYYY-MM-DD",
      );

    setLoading(true);

    try {
      const [
        appointmentsResponse,
        dentistsResponse,
      ] = await Promise.all([
        getAppointmentsByDateRange(
          startDate,
          endDate,
        ),

        getDentists(),
      ]);

      const appointmentData =
        extractArray(
          appointmentsResponse,
        );

      const dentistData =
        extractArray(
          dentistsResponse,
        );

      /* Dentist ID to name map */

      const dentistNameMap =
        new Map(
          dentistData.map(
            (dentist) => {
              const dentistId =
                dentist?.dentist_id ||
                dentist?.id;

              return [
                String(dentistId),
                getPersonName(
                  dentist,
                  String(
                    dentistId || "-",
                  ),
                ),
              ];
            },
          ),
        );

      /* Unique patient IDs */

      const uniquePatientIds = [
        ...new Set(
          appointmentData
            .map(
              (appointment) =>
                appointment?.patient_id,
            )
            .filter(Boolean)
            .map(String),
        ),
      ];

      /* Load full patient details */

      const patientResults =
        await Promise.allSettled(
          uniquePatientIds.map(
            async (patientId) => {
              const response =
                await getPatientFullDetails(
                  patientId,
                );

              const responseData =
                extractData(response);

              const patient =
                responseData?.patient ||
                responseData;

              return {
                patientId,
                patient,
              };
            },
          ),
        );

      /* Patient ID to details map */

      const patientDetailsMap =
        new Map();

      patientResults.forEach(
        (result) => {
          if (
            result.status !==
            "fulfilled"
          ) {
            console.error(
              "Failed to load patient:",
              result.reason,
            );

            return;
          }

          const {
            patientId,
            patient,
          } = result.value;

          patientDetailsMap.set(
            String(patientId),
            {
              name: getPersonName(
                patient,
                String(patientId),
              ),

              phone:
                patient?.phone ||
                patient?.phone_number ||
                patient?.mobile ||
                "-",
            },
          );
        },
      );

      /* Enrich appointment rows */

      const enrichedAppointments =
        appointmentData.map(
          (appointment) => {
            const patientId =
              appointment?.patient_id;

            const dentistId =
              appointment?.dentist_id;

            const patientDetails =
              patientDetailsMap.get(
                String(patientId),
              );

            return {
              ...appointment,

              patient_name:
                appointment?.patient_name ||
                patientDetails?.name ||
                patientId ||
                "-",

              phone:
                appointment?.phone ||
                appointment?.patient_phone ||
                patientDetails?.phone ||
                "-",

              dentist_name:
                appointment?.dentist_name ||
                dentistNameMap.get(
                  String(dentistId),
                ) ||
                dentistId ||
                "-",
            };
          },
        );

      setAppointments(
        enrichedAppointments,
      );

      setTotal(
        getResponseTotal(
          appointmentsResponse,
          enrichedAppointments.length,
        ),
      );
    } catch (error) {
      console.error(
        "Failed to load appointment range:",
        error,
      );

      setAppointments([]);
      setTotal(0);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load appointments",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------
     Date range
  ------------------------------------------------------ */

  const handleDateRangeChange = (
    dates,
  ) => {
    if (
      !dates ||
      dates.length !== 2 ||
      !dates[0] ||
      !dates[1]
    ) {
      return;
    }

    setSelectedDateRange(dates);
    loadAppointments(dates);
  };

  const formattedDateRange =
    useMemo(() => {
      if (
        !selectedDateRange ||
        !selectedDateRange[0] ||
        !selectedDateRange[1]
      ) {
        return "-";
      }

      const startDate =
        selectedDateRange[0];

      const endDate =
        selectedDateRange[1];

      if (
        startDate.isSame(
          endDate,
          "day",
        )
      ) {
        return startDate.format(
          "DD MMM YYYY",
        );
      }

      return `${startDate.format(
        "DD MMM YYYY",
      )} – ${endDate.format(
        "DD MMM YYYY",
      )}`;
    }, [selectedDateRange]);

  const totalDays = useMemo(() => {
    if (
      !selectedDateRange ||
      !selectedDateRange[0] ||
      !selectedDateRange[1]
    ) {
      return 0;
    }

    return (
      selectedDateRange[1].diff(
        selectedDateRange[0],
        "day",
      ) + 1
    );
  }, [selectedDateRange]);

  /* ------------------------------------------------------
     Summary
  ------------------------------------------------------ */

  const appointmentSummary =
    useMemo(() => {
      const active =
        appointments.filter(
          (appointment) =>
            ACTIVE_STATUSES.includes(
              normalizeStatus(
                appointment?.status,
              ),
            ),
        ).length;

      const completed =
        appointments.filter(
          (appointment) =>
            COMPLETED_STATUSES.includes(
              normalizeStatus(
                appointment?.status,
              ),
            ),
        ).length;

      const cancelled =
        appointments.filter(
          (appointment) =>
            normalizeStatus(
              appointment?.status,
            ) === "cancelled",
        ).length;

      return {
        active,
        completed,
        cancelled,
      };
    }, [appointments]);

  /* ------------------------------------------------------
     Search and status filtering
  ------------------------------------------------------ */

  const filteredAppointments =
    useMemo(() => {
      const keyword = search
        .trim()
        .toLowerCase();

      const filtered =
        appointments.filter(
          (appointment) => {
            const status =
              normalizeStatus(
                appointment?.status,
              );

            const searchableValues = [
              getAppointmentId(
                appointment,
              ),

              getAppointmentDate(
                appointment,
              ),

              getAppointmentTime(
                appointment,
              ),

              getPatientName(
                appointment,
              ),

              getPatientPhone(
                appointment,
              ),

              getDentistName(
                appointment,
              ),

              getReason(
                appointment,
              ),

              appointment?.status,
            ];

            const matchesSearch =
              !keyword ||
              searchableValues.some(
                (value) =>
                  String(value ?? "")
                    .toLowerCase()
                    .includes(keyword),
              );

            const matchesStatus =
              statusFilter === "all" ||
              (statusFilter ===
                "active" &&
                ACTIVE_STATUSES.includes(
                  status,
                )) ||
              (statusFilter ===
                "completed" &&
                COMPLETED_STATUSES.includes(
                  status,
                )) ||
              (statusFilter ===
                "cancelled" &&
                status ===
                  "cancelled");

            return (
              matchesSearch &&
              matchesStatus
            );
          },
        );

      return [...filtered].sort(
        (first, second) => {
          const firstDate =
            dayjs(
              `${getAppointmentDate(
                first,
              )} ${getAppointmentTime(
                first,
              )}`,
            );

          const secondDate =
            dayjs(
              `${getAppointmentDate(
                second,
              )} ${getAppointmentTime(
                second,
              )}`,
            );

          if (
            firstDate.isValid() &&
            secondDate.isValid()
          ) {
            return secondDate.diff(
              firstDate,
            );
          }

          return 0;
        },
      );
    }, [
      appointments,
      search,
      statusFilter,
    ]);

  /* ------------------------------------------------------
     Appointment details
  ------------------------------------------------------ */

  const handleAppointmentRowClick = (
    record,
  ) => {
    const appointmentId =
      getAppointmentId(record);

    if (!appointmentId) {
      message.error(
        "Appointment ID not found",
      );

      return;
    }

    setSelectedAppointmentId(
      appointmentId,
    );

    setDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedAppointmentId(null);
  };

  /* ------------------------------------------------------
     Table columns
  ------------------------------------------------------ */

  const columns = [
    {
      title: "Date and Time",
      key: "date_time",
      width: 190,
      fixed: "left",

      render: (_, record) => (
        <Space
          size={10}
          align="start"
        >
          <div className="appointment-date-icon">
            <CalendarOutlined />
          </div>

          <div className="appointment-date-cell">
            <Text strong>
              {formatDate(
                getAppointmentDate(
                  record,
                ),
              )}
            </Text>

            <Text type="secondary">
              <ClockCircleOutlined />{" "}
              {formatTime(
                getAppointmentTime(
                  record,
                ),
              )}
            </Text>
          </div>
        </Space>
      ),
    },

    {
      title: "Appointment ID",
      key: "appointment_id",
      width: 175,

      render: (_, record) => (
        <div className="appointment-id-badge">
          {getAppointmentId(
            record,
          ) || "-"}
        </div>
      ),
    },

    {
      title: "Patient",
      key: "patient",
      width: 235,

      render: (_, record) => (
        <Space size={10}>
          <Avatar
            size={39}
            icon={<UserOutlined />}
            className="appointment-patient-avatar"
          />

          <div className="appointment-person-cell">
            <Text strong>
              {getPatientName(
                record,
              )}
            </Text>

            <Text type="secondary">
              {record?.patient_id ||
                "Patient"}
            </Text>
          </div>
        </Space>
      ),
    },

    {
      title: "Phone",
      key: "phone",
      width: 155,

      render: (_, record) => (
        <Space size={7}>
          <PhoneOutlined className="appointment-phone-icon" />

          <Text>
            {getPatientPhone(
              record,
            )}
          </Text>
        </Space>
      ),
    },

    {
      title: "Dentist",
      key: "dentist",
      width: 210,

      render: (_, record) => (
        <Space size={9}>
          <div className="appointment-dentist-icon">
            <MedicineBoxOutlined />
          </div>

          <Text strong>
            {getDentistName(
              record,
            )}
          </Text>
        </Space>
      ),
    },

    {
      title: "Reason",
      key: "reason",
      width: 250,
      ellipsis: true,

      render: (_, record) => (
        <Tooltip
          title={getReason(record)}
        >
          <Text type="secondary">
            {getReason(record)}
          </Text>
        </Tooltip>
      ),
    },

    {
      title: "Status",
      key: "status",
      width: 160,

      filters: [
        {
          text: "Pending",
          value: "Pending",
        },
        {
          text: "Confirmed",
          value: "Confirmed",
        },
        {
          text: "Checked In",
          value: "Checked In",
        },
        {
          text: "In Treatment",
          value: "In Treatment",
        },
        {
          text: "Treatment Done",
          value: "Treatment Done",
        },
        {
          text: "Payment Pending",
          value: "Payment Pending",
        },
        {
          text: "Paid",
          value: "Paid",
        },
        {
          text: "Completed",
          value: "Completed",
        },
        {
          text: "Cancelled",
          value: "Cancelled",
        },
      ],

      onFilter: (value, record) =>
        (record?.status ||
          "Pending") === value,

      render: (_, record) => {
        const status =
          record?.status ||
          "Pending";

        return (
          <Tag
            color={getStatusColor(
              status,
            )}
            className="appointment-status-tag"
          >
            {status}
          </Tag>
        );
      },
    },

    {
      title: "",
      key: "action",
      width: 65,
      fixed: "right",

      render: (_, record) => (
        <Tooltip title="View appointment details">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={(event) => {
              event.stopPropagation();

              handleAppointmentRowClick(
                record,
              );
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <ClinicPage
      title="Appointment History"
      subtitle={`Review clinic appointments recorded from ${formattedDateRange}.`}
      icon={<ScheduleOutlined />}
      actions={[
        <div
          key="date-range"
          className="appointment-range-control"
        >
          <div className="appointment-range-control__icon">
            <CalendarOutlined />
          </div>

          <RangePicker
            value={
              selectedDateRange
            }
            format="YYYY-MM-DD"
            allowClear={false}
            onChange={
              handleDateRangeChange
            }
            className="appointment-range-picker"
          />
        </div>,

        <Button
          key="refresh"
          icon={
            <ReloadOutlined />
          }
          onClick={() =>
            loadAppointments(
              selectedDateRange,
            )
          }
          loading={loading}
        >
          Refresh
        </Button>,
      ]}
    >
      {/* Summary cards */}

      <Row
        gutter={[16, 16]}
        className="appointment-summary-row"
      >
        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <AppointmentSummaryCard
            title="Total Appointments"
            value={total}
            helper="Records in selected period"
            tone="blue"
            icon={
              <ScheduleOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <AppointmentSummaryCard
            title="Active Appointments"
            value={
              appointmentSummary.active
            }
            helper="Pending or in progress"
            tone="purple"
            icon={
              <ClockCircleOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <AppointmentSummaryCard
            title="Completed"
            value={
              appointmentSummary.completed
            }
            helper="Paid or completed visits"
            tone="green"
            icon={
              <CheckCircleOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <AppointmentSummaryCard
            title="Selected Period"
            value={totalDays}
            helper={
              totalDays === 1
                ? "1 calendar day"
                : `${totalDays} calendar days`
            }
            tone="orange"
            icon={
              <CalendarOutlined />
            }
          />
        </Col>
      </Row>

      {/* Appointment table */}

      <Card
        bordered={false}
        className="appointment-history-card"
      >
        <div className="appointment-history-card__header">
          <div>
            <Title level={4}>
              Appointment Records
            </Title>

            <Text type="secondary">
              {filteredAppointments.length}{" "}
              appointment
              {filteredAppointments.length ===
              1
                ? ""
                : "s"}{" "}
              shown from{" "}
              {formattedDateRange}.
            </Text>
          </div>

          <Tag
            color="blue"
            className="appointment-result-count"
          >
            {filteredAppointments.length}{" "}
            result
            {filteredAppointments.length !==
            1
              ? "s"
              : ""}
          </Tag>
        </div>

        <div className="appointment-history-toolbar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search appointment, patient, phone, dentist or reason"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            className="appointment-history-search"
          />

          <Segmented
            value={statusFilter}
            onChange={
              setStatusFilter
            }
            className="appointment-status-filter"
            options={[
              {
                label: `All (${appointments.length})`,
                value: "all",
              },
              {
                label: `Active (${appointmentSummary.active})`,
                value: "active",
              },
              {
                label: `Completed (${appointmentSummary.completed})`,
                value: "completed",
              },
              {
                label: `Cancelled (${appointmentSummary.cancelled})`,
                value: "cancelled",
              },
            ]}
          />
        </div>

        <Table
          rowKey={(
            record,
            index,
          ) =>
            getAppointmentId(
              record,
            ) || index
          }
          loading={loading}
          columns={columns}
          dataSource={
            filteredAppointments
          }
          pagination={{
            pageSize: 8,
            showSizeChanger: false,

            showTotal: (tableTotal) =>
              `${tableTotal} appointment${
                tableTotal !== 1
                  ? "s"
                  : ""
              }`,
          }}
          scroll={{
            x: 1450,
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
              return "appointment-row appointment-row--treatment";
            }

            if (
              status ===
              "cancelled"
            ) {
              return "appointment-row appointment-row--cancelled";
            }

            if (
              COMPLETED_STATUSES.includes(
                status,
              )
            ) {
              return "appointment-row appointment-row--completed";
            }

            return "appointment-row";
          }}
          onRow={(record) => ({
            onClick: () =>
              handleAppointmentRowClick(
                record,
              ),
          })}
          locale={{
            emptyText: (
              <Empty
                image={
                  Empty.PRESENTED_IMAGE_SIMPLE
                }
                description={
                  search ||
                  statusFilter !==
                    "all"
                    ? "No matching appointments found"
                    : "No appointments found for the selected period"
                }
              />
            ),
          }}
        />
      </Card>

      <AppointmentDetailsModal
        open={detailsModalOpen}
        appointmentId={
          selectedAppointmentId
        }
        onClose={closeDetailsModal}
      />
    </ClinicPage>
  );
};

export default DailyAppointments;