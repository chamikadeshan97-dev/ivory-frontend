import React, {
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
  Descriptions,
  Empty,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Steps,
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
  CloseCircleOutlined,
  DollarOutlined,
  HistoryOutlined,
  IdcardOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  UserOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import {
  getAppointmentFullDetails,
} from "../api/endPoints";

import "./css/AppointmentDetailsModal.css";

dayjs.extend(customParseFormat);

const {
  Text,
  Title,
} = Typography;

/* --------------------------------------------------------
   Constants
-------------------------------------------------------- */

const APPOINTMENT_FLOW = [
  "Pending",
  "Confirmed",
  "Checked In",
  "In Treatment",
  "Treatment Done",
  "Payment Pending",
  "Paid",
  "Completed",
];

/* --------------------------------------------------------
   General helpers
-------------------------------------------------------- */

const convertToBoolean = (value) => {
  if (
    value === true ||
    value === 1
  ) {
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

const toSafeNumber = (value) => {
  const number = Number(
    value || 0,
  );

  return Number.isNaN(number)
    ? 0
    : number;
};

const toArray = (value) => {
  return Array.isArray(value)
    ? value
    : [];
};

const normalizeStatus = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
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

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = dayjs(value);

  return date.isValid()
    ? date.format(
        "DD MMM YYYY, h:mm A",
      )
    : value;
};

const formatTime = (value) => {
  if (!value) {
    return "-";
  }

  const time = dayjs(
    String(value),
    [
      "HH:mm",
      "HH:mm:ss",
      "h:mm A",
      "hh:mm A",
    ],
    true,
  );

  return time.isValid()
    ? time.format("h:mm A")
    : value;
};

const formatCurrency = (value) => {
  return `Rs. ${toSafeNumber(
    value,
  ).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getAppointmentId = (
  appointment,
  fallbackId,
) => {
  return (
    appointment?.appointment_id ||
    appointment?.id ||
    fallbackId ||
    "-"
  );
};

const getTreatmentId = (record) => {
  return (
    record?.treatment_id ||
    record?.id ||
    "-"
  );
};

const getPaymentId = (record) => {
  return (
    record?.payment_id ||
    record?.id ||
    "-"
  );
};

const getTreatmentCharge = (
  record,
) => {
  return toSafeNumber(
    record?.treatment_fee ??
      record?.treatment_charge ??
      record?.charge ??
      0,
  );
};

const getPaymentAmount = (
  record,
) => {
  return toSafeNumber(
    record?.payment_amount ??
      record?.amount ??
      0,
  );
};

const getStatusColor = (status) => {
  const colors = {
    Pending: "blue",
    Confirmed: "purple",
    "Checked In": "cyan",
    "In Treatment": "processing",
    "Treatment Done": "geekblue",
    "Payment Pending": "orange",
    Paid: "green",
    Partial: "orange",
    Completed: "success",
    Cancelled: "red",
    Unpaid: "red",
  };

  return colors[status] || "default";
};

/* --------------------------------------------------------
   Summary card
-------------------------------------------------------- */

const AppointmentFinanceCard = ({
  title,
  value,
  icon,
  tone,
  currency = true,
}) => {
  return (
    <Card
      bordered={false}
      className={`appointment-finance-card appointment-finance-card--${tone}`}
    >
      <div className="appointment-finance-card__content">
        <Statistic
          title={title}
          value={
            currency
              ? toSafeNumber(value)
              : value
          }
          prefix={
            currency
              ? "Rs."
              : undefined
          }
          precision={
            currency
              ? 2
              : undefined
          }
        />

        <div className="appointment-finance-card__icon">
          {icon}
        </div>
      </div>
    </Card>
  );
};

/* --------------------------------------------------------
   Component
-------------------------------------------------------- */

const AppointmentDetailsModal = ({
  open,
  appointmentId,
  onClose,
}) => {
  const [loading, setLoading] =
    useState(false);

  const [details, setDetails] =
    useState(null);

  const [
    treatmentModalOpen,
    setTreatmentModalOpen,
  ] = useState(false);

  const [
    paymentModalOpen,
    setPaymentModalOpen,
  ] = useState(false);

  /* ------------------------------------------------------
     Load appointment
  ------------------------------------------------------ */

  useEffect(() => {
    let isActive = true;

    const loadAppointmentDetails =
      async () => {
        if (
          !open ||
          !appointmentId
        ) {
          return;
        }

        setLoading(true);
        setDetails(null);
        setTreatmentModalOpen(false);
        setPaymentModalOpen(false);

        try {
          const response =
            await getAppointmentFullDetails(
              appointmentId,
            );

          const responseData =
            response?.data?.data ??
            response?.data ??
            null;

          if (isActive) {
            setDetails(
              responseData,
            );
          }
        } catch (error) {
          console.error(
            "Failed to load appointment details:",
            error,
          );

          if (isActive) {
            message.error(
              error?.response?.data
                ?.message ||
                error?.message ||
                "Failed to load appointment details",
            );
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

    loadAppointmentDetails();

    return () => {
      isActive = false;
    };
  }, [
    open,
    appointmentId,
  ]);

  /* ------------------------------------------------------
     Main records
  ------------------------------------------------------ */

  const appointment =
    details?.appointment || {};

  const patient =
    details?.patient || {};

  const dentist =
    details?.dentist || {};

  const treatments = toArray(
    details?.treatments,
  );

  const payments = toArray(
    details?.payments,
  );

  const paymentSummary =
    details?.payment_summary || {};

  /* ------------------------------------------------------
     Display values
  ------------------------------------------------------ */

  const appointmentNumber =
    getAppointmentId(
      appointment,
      appointmentId,
    );

  const appointmentStatus =
    appointment?.status ||
    "Pending";

  const patientName =
    patient?.name ||
    appointment?.patient_name ||
    "Unknown Patient";

  const patientId =
    patient?.patient_id ||
    patient?.id ||
    appointment?.patient_id ||
    "-";

  const patientPhone =
    patient?.phone ||
    patient?.phone_number ||
    patient?.mobile ||
    appointment?.phone ||
    "-";

  const dentistName =
    dentist?.name ||
    dentist?.dentist_name ||
    appointment?.dentist_name ||
    "-";

  const dentistId =
    dentist?.dentist_id ||
    dentist?.id ||
    appointment?.dentist_id ||
    "-";

  const dentistPhone =
    dentist?.phone ||
    dentist?.phone_number ||
    dentist?.mobile ||
    "-";

  const hasAllergies =
    convertToBoolean(
      patient?.has_allergies ??
        patient?.is_allergies ??
        patient?.hasAllergies,
    );

  const allergyDetails =
    patient?.allergy_details ||
    patient?.allergies ||
    patient?.allergy ||
    "No allergy details provided";

  const appointmentDate =
    appointment?.appointment_date ||
    appointment?.date;

  const appointmentTime =
    appointment?.appointment_time ||
    appointment?.time;

  /* ------------------------------------------------------
     Unique treatments
  ------------------------------------------------------ */

  const uniqueTreatments = useMemo(() => {
    const treatmentMap =
      new Map();

    treatments.forEach(
      (treatment, index) => {
        const treatmentId =
          String(
            treatment?.treatment_id ||
              treatment?.id ||
              `treatment-${index}`,
          ).trim();

        const existing =
          treatmentMap.get(
            treatmentId,
          );

        if (!existing) {
          treatmentMap.set(
            treatmentId,
            treatment,
          );

          return;
        }

        if (
          getTreatmentCharge(
            treatment,
          ) >
          getTreatmentCharge(
            existing,
          )
        ) {
          treatmentMap.set(
            treatmentId,
            treatment,
          );
        }
      },
    );

    return Array.from(
      treatmentMap.values(),
    );
  }, [treatments]);

  /* ------------------------------------------------------
     Sorted payments
  ------------------------------------------------------ */

  const sortedPayments = useMemo(() => {
    return [...payments].sort(
      (first, second) => {
        const firstDate = dayjs(
          first?.created_at ||
            first?.payment_date,
        );

        const secondDate = dayjs(
          second?.created_at ||
            second?.payment_date,
        );

        if (
          !firstDate.isValid() ||
          !secondDate.isValid()
        ) {
          return 0;
        }

        return (
          firstDate.valueOf() -
          secondDate.valueOf()
        );
      },
    );
  }, [payments]);

  /* ------------------------------------------------------
     Treatment charge map
  ------------------------------------------------------ */

  const treatmentChargeMap =
    useMemo(() => {
      const chargeMap =
        new Map();

      uniqueTreatments.forEach(
        (treatment, index) => {
          const treatmentId =
            String(
              treatment?.treatment_id ||
                treatment?.id ||
                `treatment-${index}`,
            ).trim();

          const charge =
            getTreatmentCharge(
              treatment,
            );

          if (charge > 0) {
            chargeMap.set(
              treatmentId,
              charge,
            );
          }
        },
      );

      payments.forEach(
        (payment) => {
          const treatmentId =
            String(
              payment?.treatment_id ||
                "single-treatment",
            ).trim();

          const charge =
            getTreatmentCharge(
              payment,
            );

          const existingCharge =
            chargeMap.get(
              treatmentId,
            ) || 0;

          if (
            charge >
            existingCharge
          ) {
            chargeMap.set(
              treatmentId,
              charge,
            );
          }
        },
      );

      return chargeMap;
    }, [
      uniqueTreatments,
      payments,
    ]);

  /* ------------------------------------------------------
     Financial summary
  ------------------------------------------------------ */

  const calculatedSummary =
    useMemo(() => {
      const calculatedCharge =
        Array.from(
          treatmentChargeMap.values(),
        ).reduce(
          (total, charge) =>
            total +
            toSafeNumber(charge),
          0,
        );

      const backendCharge =
        toSafeNumber(
          paymentSummary?.treatment_charge ??
            paymentSummary?.total_treatment_charge ??
            paymentSummary?.total_charge ??
            0,
        );

      const totalCharge =
        calculatedCharge > 0
          ? calculatedCharge
          : backendCharge;

      const totalPaid =
        sortedPayments.reduce(
          (total, payment) =>
            total +
            getPaymentAmount(
              payment,
            ),
          0,
        );

      const balance = Math.max(
        totalCharge - totalPaid,
        0,
      );

      const status =
        totalPaid <= 0
          ? "Unpaid"
          : balance > 0
            ? "Partial"
            : "Paid";

      return {
        totalCharge,
        totalPaid,
        balance,
        status,
        installmentCount:
          sortedPayments.length,
      };
    }, [
      treatmentChargeMap,
      paymentSummary,
      sortedPayments,
    ]);

  /* ------------------------------------------------------
     Next appointment
  ------------------------------------------------------ */

  const nextAppointmentDate =
    useMemo(() => {
      const nextDates =
        uniqueTreatments
          .map(
            (treatment) =>
              treatment
                ?.next_appointment_date,
          )
          .filter(Boolean)
          .map((value) =>
            dayjs(value),
          )
          .filter((date) =>
            date.isValid(),
          )
          .sort(
            (first, second) =>
              first.valueOf() -
              second.valueOf(),
          );

      return nextDates.length > 0
        ? nextDates[0]
        : null;
    }, [uniqueTreatments]);

  /* ------------------------------------------------------
     Progress
  ------------------------------------------------------ */

  const currentStatusIndex =
    APPOINTMENT_FLOW.indexOf(
      appointmentStatus,
    );

  const progressCurrent =
    currentStatusIndex >= 0
      ? currentStatusIndex
      : 0;

  /* ------------------------------------------------------
     Payment calculations
  ------------------------------------------------------ */

  const getPaymentValues = (
    record,
    index,
  ) => {
    const currentPayment =
      getPaymentAmount(record);

    const treatmentId =
      String(
        record?.treatment_id ||
          "single-treatment",
      ).trim();

    const previousPayments =
      sortedPayments
        .slice(0, index)
        .filter(
          (payment) =>
            String(
              payment?.treatment_id ||
                "single-treatment",
            ).trim() ===
            treatmentId,
        );

    const calculatedPreviouslyPaid =
      previousPayments.reduce(
        (total, payment) =>
          total +
          getPaymentAmount(
            payment,
          ),
        0,
      );

    const previouslyPaid =
      record?.previously_paid !==
        undefined &&
      record?.previously_paid !==
        null &&
      record?.previously_paid !== ""
        ? toSafeNumber(
            record.previously_paid,
          )
        : calculatedPreviouslyPaid;

    const calculatedTotalPaid =
      calculatedPreviouslyPaid +
      currentPayment;

    const totalPaid =
      record?.total_paid !==
        undefined &&
      record?.total_paid !== null &&
      record?.total_paid !== ""
        ? toSafeNumber(
            record.total_paid,
          )
        : calculatedTotalPaid;

    const treatmentCharge =
      treatmentChargeMap.get(
        treatmentId,
      ) ||
      getTreatmentCharge(
        record,
      ) ||
      calculatedSummary.totalCharge;

    const calculatedRemaining =
      Math.max(
        treatmentCharge -
          totalPaid,
        0,
      );

    const remainingAmount =
      record?.remaining_amount !==
        undefined &&
      record?.remaining_amount !==
        null &&
      record?.remaining_amount !== ""
        ? toSafeNumber(
            record.remaining_amount,
          )
        : calculatedRemaining;

    return {
      currentPayment,
      previouslyPaid,
      totalPaid,
      remainingAmount,
    };
  };

  /* ------------------------------------------------------
     Treatment columns
  ------------------------------------------------------ */

  const treatmentColumns = [
    {
      title: "Treatment ID",
      key: "treatment_id",
      width: 165,
      fixed: "left",

      render: (_, record) => (
        <div className="appointment-detail-id appointment-detail-id--purple">
          <Text copyable>
            {getTreatmentId(
              record,
            )}
          </Text>
        </div>
      ),
    },
    {
      title: "Date",
      key: "treatment_date",
      width: 135,

      render: (_, record) =>
        formatDate(
          record?.treatment_date ||
            record?.created_at,
        ),
    },
    {
      title: "Diagnosis",
      dataIndex: "diagnosis",
      key: "diagnosis",
      width: 190,
      ellipsis: true,

      render: (value) => (
        <Tooltip title={value || ""}>
          <Text>
            {value || "-"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Treatment",
      dataIndex:
        "treatment_performed",
      key: "treatment",
      width: 225,
      ellipsis: true,

      render: (value) => (
        <Tooltip title={value || ""}>
          <Text strong>
            {value || "-"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Fee",
      key: "fee",
      width: 145,
      align: "right",

      render: (_, record) => (
        <Text strong>
          {formatCurrency(
            getTreatmentCharge(
              record,
            ),
          )}
        </Text>
      ),
    },
    {
      title: "Prescription",
      dataIndex: "prescription",
      key: "prescription",
      width: 210,
      ellipsis: true,

      render: (value) => (
        <Tooltip title={value || ""}>
          <Text type="secondary">
            {value || "-"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Doctor Notes",
      dataIndex: "doctor_notes",
      key: "doctor_notes",
      width: 230,
      ellipsis: true,

      render: (value) => (
        <Tooltip title={value || ""}>
          <Text type="secondary">
            {value || "-"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Next Appointment",
      key: "next_appointment",
      width: 165,

      render: (_, record) => {
        const date =
          record
            ?.next_appointment_date;

        return date ? (
          <Tag
            color="blue"
            icon={
              <CalendarOutlined />
            }
          >
            {formatDate(date)}
          </Tag>
        ) : (
          <Text type="secondary">
            Not scheduled
          </Text>
        );
      },
    },
  ];

  /* ------------------------------------------------------
     Payment columns
  ------------------------------------------------------ */

  const paymentColumns = [
    {
      title: "#",
      key: "number",
      width: 65,
      fixed: "left",
      align: "center",

      render: (
        _,
        record,
        index,
      ) => (
        <div className="payment-installment-number">
          {record
            ?.installment_number ||
            index + 1}
        </div>
      ),
    },
    {
      title: "Payment ID",
      key: "payment_id",
      width: 165,

      render: (_, record) => (
        <div className="appointment-detail-id appointment-detail-id--green">
          <Text copyable>
            {getPaymentId(
              record,
            )}
          </Text>
        </div>
      ),
    },
    {
      title: "Treatment ID",
      key: "treatment_id",
      width: 165,

      render: (_, record) => (
        <Text copyable>
          {record?.treatment_id ||
            "-"}
        </Text>
      ),
    },
    {
      title: "Date",
      key: "date",
      width: 135,

      render: (_, record) =>
        formatDate(
          record?.payment_date ||
            record?.created_at,
        ),
    },
    {
      title: "Receipt",
      dataIndex: "receipt_number",
      key: "receipt",
      width: 175,

      render: (value) =>
        value ? (
          <Text copyable>
            {value}
          </Text>
        ) : (
          "-"
        ),
    },
    {
      title: "Installment",
      key: "installment",
      width: 155,
      align: "right",

      render: (
        _,
        record,
        index,
      ) => {
        const values =
          getPaymentValues(
            record,
            index,
          );

        return (
          <Text className="payment-value payment-value--paid">
            {formatCurrency(
              values.currentPayment,
            )}
          </Text>
        );
      },
    },
    {
      title: "Previously Paid",
      key: "previously_paid",
      width: 165,
      align: "right",

      render: (
        _,
        record,
        index,
      ) =>
        formatCurrency(
          getPaymentValues(
            record,
            index,
          ).previouslyPaid,
        ),
    },
    {
      title: "Total Paid",
      key: "total_paid",
      width: 155,
      align: "right",

      render: (
        _,
        record,
        index,
      ) => (
        <Text strong>
          {formatCurrency(
            getPaymentValues(
              record,
              index,
            ).totalPaid,
          )}
        </Text>
      ),
    },
    {
      title: "Remaining",
      key: "remaining",
      width: 155,
      align: "right",

      render: (
        _,
        record,
        index,
      ) => {
        const remaining =
          getPaymentValues(
            record,
            index,
          ).remainingAmount;

        return (
          <Text
            className={
              remaining > 0
                ? "payment-value payment-value--remaining"
                : "payment-value payment-value--paid"
            }
          >
            {formatCurrency(
              remaining,
            )}
          </Text>
        );
      },
    },
    {
      title: "Method",
      dataIndex: "payment_method",
      key: "method",
      width: 135,

      render: (value) =>
        value || "-",
    },
    {
      title: "Status",
      key: "status",
      width: 115,
      fixed: "right",
      align: "center",

      render: (
        _,
        record,
        index,
      ) => {
        const values =
          getPaymentValues(
            record,
            index,
          );

        const status =
          record?.payment_status ||
          record?.status ||
          (values.remainingAmount > 0
            ? "Partial"
            : "Paid");

        return (
          <Tag
            color={getStatusColor(
              status,
            )}
            className="appointment-payment-status"
          >
            {status}
          </Tag>
        );
      },
    },
  ];

  /* ------------------------------------------------------
     Close modal
  ------------------------------------------------------ */

  const handleClose = () => {
    setTreatmentModalOpen(false);
    setPaymentModalOpen(false);
    setDetails(null);

    onClose();
  };

  const isCancelled =
    normalizeStatus(
      appointmentStatus,
    ) === "cancelled";

  /* ------------------------------------------------------
     Render
  ------------------------------------------------------ */

  return (
    <>
      {/* Main appointment modal */}

      <Modal
        title={null}
        open={open}
        onCancel={handleClose}
        width={1120}
        centered
        destroyOnHidden
        className={
          isCancelled
            ? "appointment-details-modal appointment-details-modal--cancelled"
            : "appointment-details-modal"
        }
        styles={{
          body: {
            maxHeight: "80vh",
            overflowY: "auto",
          },
        }}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={handleClose}
          >
            Close
          </Button>,
        ]}
      >
        {loading ? (
          <div className="appointment-details-loading">
            <Spin size="large" />

            <Text type="secondary">
              Loading appointment
              details...
            </Text>
          </div>
        ) : !details ? (
          <div className="appointment-details-empty">
            <Empty description="No appointment details found" />
          </div>
        ) : (
          <>
            {/* Header */}

            <div className="appointment-details-header">
              <div className="appointment-details-header__patient">
                <Avatar
                  size={72}
                  icon={<UserOutlined />}
                  className="appointment-details-header__avatar"
                />

                <div className="appointment-details-header__identity">
                  <Text className="appointment-details-header__eyebrow">
                    Appointment Overview
                  </Text>

                  <Space
                    wrap
                    size={8}
                  >
                    <Title level={3}>
                      {patientName}
                    </Title>

                    <Tag
                      color={getStatusColor(
                        appointmentStatus,
                      )}
                      className="appointment-details-header__status"
                    >
                      {appointmentStatus}
                    </Tag>
                  </Space>

                  <div className="appointment-details-header__meta">
                    <span>
                      <IdcardOutlined />

                      {appointmentNumber}
                    </span>

                    <span>
                      <CalendarOutlined />

                      {formatDate(
                        appointmentDate,
                      )}
                    </span>

                    <span>
                      <ClockCircleOutlined />

                      {formatTime(
                        appointmentTime,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="appointment-details-header__dentist">
                <div className="appointment-details-header__dentist-icon">
                  <MedicineBoxOutlined />
                </div>

                <div>
                  <Text>
                    Assigned Dentist
                  </Text>

                  <Title level={5}>
                    {dentistName}
                  </Title>

                  <Text>
                    {dentist
                      ?.specialization ||
                      "General Dentistry"}
                  </Text>
                </div>
              </div>
            </div>

            <div className="appointment-details-content">
              {/* Allergy warning */}

              {hasAllergies && (
                <Alert
                  type="error"
                  showIcon
                  icon={
                    <WarningOutlined />
                  }
                  message="Patient Allergy Warning"
                  description={
                    allergyDetails
                  }
                  className="appointment-allergy-alert"
                />
              )}

              {/* Appointment progress */}

              {isCancelled ? (
                <Alert
                  type="error"
                  showIcon
                  icon={
                    <CloseCircleOutlined />
                  }
                  message="Appointment Cancelled"
                  description="This appointment is no longer active."
                  className="appointment-cancelled-alert"
                />
              ) : (
                <Card
                  bordered={false}
                  className="appointment-progress-card"
                >
                  <div className="appointment-section-heading">
                    <div>
                      <Title level={4}>
                        Appointment Progress
                      </Title>

                      <Text type="secondary">
                        Current stage of the
                        patient visit.
                      </Text>
                    </div>

                    <Tag
                      color={getStatusColor(
                        appointmentStatus,
                      )}
                    >
                      {appointmentStatus}
                    </Tag>
                  </div>

                  <div className="appointment-progress-scroll">
                    <Steps
                      size="small"
                      current={
                        progressCurrent
                      }
                      items={APPOINTMENT_FLOW.map(
                        (status) => ({
                          title: status,
                        }),
                      )}
                    />
                  </div>
                </Card>
              )}

              {/* Patient and dentist information */}

              <Row gutter={[16, 16]}>
                <Col
                  xs={24}
                  xl={14}
                >
                  <Card
                    bordered={false}
                    className="appointment-information-card"
                  >
                    <div className="appointment-section-heading">
                      <div>
                        <Title level={4}>
                          Patient and
                          Appointment
                        </Title>

                        <Text type="secondary">
                          Patient contact and
                          booking information.
                        </Text>
                      </div>

                      <div className="appointment-section-icon appointment-section-icon--blue">
                        <UserOutlined />
                      </div>
                    </div>

                    <Descriptions
                      bordered
                      size="small"
                      column={{
                        xs: 1,
                        md: 2,
                      }}
                      className="appointment-descriptions"
                    >
                      <Descriptions.Item label="Patient ID">
                        <Text copyable>
                          {patientId}
                        </Text>
                      </Descriptions.Item>

                      <Descriptions.Item label="Patient Name">
                        <Text strong>
                          {patientName}
                        </Text>
                      </Descriptions.Item>

                      <Descriptions.Item label="Phone">
                        <Space size={7}>
                          <PhoneOutlined />

                          <Text>
                            {patientPhone}
                          </Text>
                        </Space>
                      </Descriptions.Item>

                      <Descriptions.Item label="Age / Gender">
                        {patient?.age ||
                          "-"}{" "}
                        /{" "}
                        {patient?.gender ||
                          "-"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Appointment ID">
                        <Text copyable>
                          {appointmentNumber}
                        </Text>
                      </Descriptions.Item>

                      <Descriptions.Item label="Date and Time">
                        {formatDate(
                          appointmentDate,
                        )}{" "}
                        at{" "}
                        {formatTime(
                          appointmentTime,
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item
                        label="Reason"
                        span={2}
                      >
                        {appointment
                          ?.reason_for_visit ||
                          "-"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Queue Number">
                        <Tag color="blue">
                          #
                          {appointment
                            ?.appointment_number ||
                            appointment
                              ?.queue_number ||
                            "-"}
                        </Tag>
                      </Descriptions.Item>

                      <Descriptions.Item label="Status">
                        <Tag
                          color={getStatusColor(
                            appointmentStatus,
                          )}
                        >
                          {appointmentStatus}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>

                <Col
                  xs={24}
                  xl={10}
                >
                  <Card
                    bordered={false}
                    className="appointment-information-card"
                  >
                    <div className="appointment-section-heading">
                      <div>
                        <Title level={4}>
                          Dentist Information
                        </Title>

                        <Text type="secondary">
                          Assigned dental
                          professional.
                        </Text>
                      </div>

                      <div className="appointment-section-icon appointment-section-icon--purple">
                        <MedicineBoxOutlined />
                      </div>
                    </div>

                    <Descriptions
                      bordered
                      size="small"
                      column={1}
                      className="appointment-descriptions"
                    >
                      <Descriptions.Item label="Dentist ID">
                        <Text copyable>
                          {dentistId}
                        </Text>
                      </Descriptions.Item>

                      <Descriptions.Item label="Name">
                        <Text strong>
                          {dentistName}
                        </Text>
                      </Descriptions.Item>

                      <Descriptions.Item label="Phone">
                        <Space size={7}>
                          <PhoneOutlined />

                          <Text>
                            {dentistPhone}
                          </Text>
                        </Space>
                      </Descriptions.Item>

                      <Descriptions.Item label="Specialization">
                        <Tag
                          color="purple"
                          icon={
                            <MedicineBoxOutlined />
                          }
                        >
                          {dentist
                            ?.specialization ||
                            "General Dentistry"}
                        </Tag>
                      </Descriptions.Item>

                      <Descriptions.Item label="Next Appointment">
                        {nextAppointmentDate ? (
                          <Tag
                            color="blue"
                            icon={
                              <CalendarOutlined />
                            }
                          >
                            {formatDate(
                              nextAppointmentDate,
                            )}
                          </Tag>
                        ) : (
                          <Text type="secondary">
                            Not scheduled
                          </Text>
                        )}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              </Row>

              {/* Payment summary */}

              <div className="appointment-section-heading appointment-section-heading--finance">
                <div>
                  <Title level={4}>
                    Payment Summary
                  </Title>

                  <Text type="secondary">
                    Treatment charges,
                    installments and
                    remaining balance.
                  </Text>
                </div>

                <Tag
                  color={getStatusColor(
                    calculatedSummary.status,
                  )}
                  className="appointment-finance-status"
                >
                  {
                    calculatedSummary.status
                  }
                </Tag>
              </div>

              <Row gutter={[14, 14]}>
                <Col
                  xs={24}
                  sm={12}
                  xl={6}
                >
                  <AppointmentFinanceCard
                    title="Treatment Charge"
                    value={
                      calculatedSummary
                        .totalCharge
                    }
                    tone="blue"
                    icon={
                      <MedicineBoxOutlined />
                    }
                  />
                </Col>

                <Col
                  xs={24}
                  sm={12}
                  xl={6}
                >
                  <AppointmentFinanceCard
                    title="Total Paid"
                    value={
                      calculatedSummary
                        .totalPaid
                    }
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
                  <AppointmentFinanceCard
                    title="Balance"
                    value={
                      calculatedSummary
                        .balance
                    }
                    tone={
                      calculatedSummary
                        .balance > 0
                        ? "red"
                        : "green"
                    }
                    icon={
                      <DollarOutlined />
                    }
                  />
                </Col>

                <Col
                  xs={24}
                  sm={12}
                  xl={6}
                >
                  <AppointmentFinanceCard
                    title="Installments"
                    value={
                      calculatedSummary
                        .installmentCount
                    }
                    currency={false}
                    tone="orange"
                    icon={
                      <WalletOutlined />
                    }
                  />
                </Col>
              </Row>

              {/* Detail buttons */}

              <Row
                gutter={[14, 14]}
                className="appointment-detail-actions"
              >
                <Col
                  xs={24}
                  md={12}
                >
                  <Button
                    block
                    size="large"
                    icon={
                      <MedicineBoxOutlined />
                    }
                    onClick={() =>
                      setTreatmentModalOpen(
                        true,
                      )
                    }
                    className="appointment-detail-action appointment-detail-action--treatment"
                  >
                    View Treatment Details

                    <Tag color="purple">
                      {
                        uniqueTreatments.length
                      }
                    </Tag>
                  </Button>
                </Col>

                <Col
                  xs={24}
                  md={12}
                >
                  <Button
                    block
                    size="large"
                    icon={
                      <HistoryOutlined />
                    }
                    onClick={() =>
                      setPaymentModalOpen(
                        true,
                      )
                    }
                    className="appointment-detail-action appointment-detail-action--payment"
                  >
                    View Payment Installments

                    <Tag color="green">
                      {
                        calculatedSummary
                          .installmentCount
                      }
                    </Tag>
                  </Button>
                </Col>
              </Row>
            </div>
          </>
        )}
      </Modal>

      {/* Treatment modal */}

      <Modal
        title={null}
        open={treatmentModalOpen}
        onCancel={() =>
          setTreatmentModalOpen(false)
        }
        centered
        width={1120}
        destroyOnHidden
        className="appointment-sub-modal"
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() =>
              setTreatmentModalOpen(
                false,
              )
            }
          >
            Close
          </Button>,
        ]}
      >
        <div className="appointment-sub-modal__header appointment-sub-modal__header--treatment">
          <div className="appointment-sub-modal__header-icon">
            <MedicineBoxOutlined />
          </div>

          <div>
            <Title level={3}>
              Treatment Details
            </Title>

            <Text>
              Diagnoses, procedures,
              prescriptions and follow-up
              dates.
            </Text>
          </div>
        </div>

        <div className="appointment-sub-modal__content">
          <Row
            gutter={[12, 12]}
            className="appointment-sub-summary"
          >
            <Col
              xs={24}
              md={8}
            >
              <div className="appointment-sub-summary__item">
                <Text type="secondary">
                  Patient
                </Text>

                <Text strong>
                  {patientName}
                </Text>
              </div>
            </Col>

            <Col
              xs={24}
              md={8}
            >
              <div className="appointment-sub-summary__item">
                <Text type="secondary">
                  Appointment
                </Text>

                <Text strong copyable>
                  {appointmentNumber}
                </Text>
              </div>
            </Col>

            <Col
              xs={24}
              md={8}
            >
              <div className="appointment-sub-summary__item">
                <Text type="secondary">
                  Treatments
                </Text>

                <Text strong>
                  {
                    uniqueTreatments.length
                  }
                </Text>
              </div>
            </Col>
          </Row>

          <Table
            rowKey={(
              record,
              index,
            ) =>
              record?.treatment_id ||
              record?.id ||
              `treatment-${index}`
            }
            columns={
              treatmentColumns
            }
            dataSource={
              uniqueTreatments
            }
            pagination={false}
            scroll={{
              x: 1450,
              y: 390,
            }}
            className="appointment-detail-table"
            locale={{
              emptyText: (
                <Empty description="No treatment recorded for this appointment" />
              ),
            }}
          />
        </div>
      </Modal>

      {/* Payment modal */}

      <Modal
        title={null}
        open={paymentModalOpen}
        onCancel={() =>
          setPaymentModalOpen(false)
        }
        centered
        width={1180}
        destroyOnHidden
        className="appointment-sub-modal"
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() =>
              setPaymentModalOpen(
                false,
              )
            }
          >
            Close
          </Button>,
        ]}
      >
        <div className="appointment-sub-modal__header appointment-sub-modal__header--payment">
          <div className="appointment-sub-modal__header-icon">
            <DollarOutlined />
          </div>

          <div>
            <Title level={3}>
              Payment Installments
            </Title>

            <Text>
              Complete payment history
              and remaining balance.
            </Text>
          </div>
        </div>

        <div className="appointment-sub-modal__content">
          <Row
            gutter={[14, 14]}
            className="appointment-payment-summary"
          >
            <Col
              xs={24}
              sm={8}
            >
              <AppointmentFinanceCard
                title="Treatment Charge"
                value={
                  calculatedSummary
                    .totalCharge
                }
                tone="blue"
                icon={
                  <MedicineBoxOutlined />
                }
              />
            </Col>

            <Col
              xs={24}
              sm={8}
            >
              <AppointmentFinanceCard
                title="Total Paid"
                value={
                  calculatedSummary
                    .totalPaid
                }
                tone="green"
                icon={
                  <CheckCircleOutlined />
                }
              />
            </Col>

            <Col
              xs={24}
              sm={8}
            >
              <AppointmentFinanceCard
                title="Remaining"
                value={
                  calculatedSummary
                    .balance
                }
                tone={
                  calculatedSummary
                    .balance > 0
                    ? "red"
                    : "green"
                }
                icon={
                  <DollarOutlined />
                }
              />
            </Col>
          </Row>

          {sortedPayments.length > 0 ? (
            <Table
              rowKey={(
                record,
                index,
              ) =>
                record?.payment_id ||
                record?.id ||
                record?.receipt_number ||
                `payment-${index}`
              }
              columns={
                paymentColumns
              }
              dataSource={
                sortedPayments
              }
              pagination={false}
              scroll={{
                x: 1600,
                y: 370,
              }}
              className="appointment-detail-table"
            />
          ) : (
            <Alert
              type="info"
              showIcon
              message="No payments recorded"
              description="No payment installment has been added for this appointment."
            />
          )}
        </div>
      </Modal>
    </>
  );
};

export default AppointmentDetailsModal;