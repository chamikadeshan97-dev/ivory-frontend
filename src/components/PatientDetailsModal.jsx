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
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileImageOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import {
  getPatientFullDetails,
} from "../api/endPoints";

import PatientMediaTab from "./patient-media/PatientMediaTab";

import "./css/PatientDetailsModal.css";

const {
  Title,
  Text,
} = Typography;

/* ========================================================
   GENERAL HELPERS
======================================================== */

const toBoolean = (value) => {
  return (
    value === true ||
    value === 1 ||
    [
      "true",
      "yes",
      "1",
    ].includes(
      String(value || "")
        .trim()
        .toLowerCase(),
    )
  );
};

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
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

const formatCurrency = (value) => {
  return `Rs. ${toNumber(
    value,
  ).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (
    !value ||
    !dayjs(value).isValid()
  ) {
    return "-";
  }

  return dayjs(value).format(
    "DD MMM YYYY",
  );
};

/* ========================================================
   PAYMENT HELPERS
======================================================== */

const getPaymentStatus = (
  payment,
) => {
  const savedStatus = String(
    payment?.status ||
      payment?.payment_status ||
      "",
  )
    .trim()
    .toLowerCase();

  if (
    savedStatus === "paid" ||
    savedStatus === "full"
  ) {
    return "Full";
  }

  if (
    savedStatus === "partial"
  ) {
    return "Partial";
  }

  const paid = toNumber(
    payment?.payment_amount ??
      payment?.amount,
  );

  const charge = toNumber(
    payment?.treatment_charge ??
      payment?.treatment_fee,
  );

  if (
    charge > 0 &&
    paid >= charge
  ) {
    return "Full";
  }

  if (paid > 0) {
    return "Partial";
  }

  return "Pending";
};

const paymentStatusColors = {
  Full: "success",
  Partial: "warning",
  Pending: "default",
};

const appointmentStatusColors = {
  Pending: "default",
  Confirmed: "blue",
  "Checked In": "cyan",
  "In Treatment": "processing",
  "Treatment Done": "purple",
  "Payment Pending": "orange",
  Paid: "green",
  Completed: "success",
  Cancelled: "error",
};

/* ========================================================
   SUMMARY CARD
======================================================== */

const PatientHistorySummaryCard = ({
  title,
  value,
  icon,
  tone,
  currency = false,
}) => {
  return (
    <Card
      bordered={false}
      className={`patient-history-summary-card patient-history-summary-card--${tone}`}
    >
      <div className="patient-history-summary-card__content">
        <Statistic
          title={title}
          value={
            currency
              ? toNumber(value)
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

        <div className="patient-history-summary-card__icon">
          {icon}
        </div>
      </div>
    </Card>
  );
};

/* ========================================================
   PATIENT DETAILS MODAL
======================================================== */

const PatientDetailsModal = ({
  open,
  patientId,
  initialPatient = null,
  onClose,
  onEdit,
  showEdit = true,
}) => {
  /* ======================================================
     STATE
  ====================================================== */

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    details,
    setDetails,
  ] = useState(null);

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "overview",
  );

  /*
   * Media count is maintained by
   * PatientMediaTab.
   */
  const [
    mediaCount,
    setMediaCount,
  ] = useState(0);

  /* ======================================================
     SELECTED PATIENT ID
  ====================================================== */

  const selectedPatientId =
    patientId ||
    initialPatient?.id ||
    initialPatient?.patient_id;

  /* ======================================================
     RESET WHEN PATIENT CHANGES
  ====================================================== */

  useEffect(() => {
    if (open) {
      setActiveTab(
        "overview",
      );

      setMediaCount(0);
    }
  }, [
    open,
    selectedPatientId,
  ]);

  /* ======================================================
     LOAD COMPLETE PATIENT DETAILS
  ====================================================== */

  useEffect(() => {
    if (!open) {
      setDetails(null);
      return;
    }

    if (!selectedPatientId) {
      return;
    }

    let cancelled = false;

    const loadDetails =
      async () => {
        setLoading(true);

        try {
          const response =
            await getPatientFullDetails(
              selectedPatientId,
            );

          const data =
            response?.data
              ?.data ||
            response?.data ||
            null;

          if (!cancelled) {
            setDetails(
              data,
            );
          }
        } catch (error) {
          console.error(
            "Failed to load patient details:",
            error,
          );

          if (!cancelled) {
            setDetails({
              patient:
                initialPatient,

              summary: {},

              appointments:
                [],

              treatments: [],

              payments: [],
            });

            message.error(
              error?.response
                ?.data
                ?.message ||
                error?.message ||
                "Failed to load patient details",
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(
              false,
            );
          }
        }
      };

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    selectedPatientId,
    initialPatient,
  ]);

  /* ======================================================
     RESPONSE DATA
  ====================================================== */

  const patient =
    details?.patient ||
    initialPatient ||
    null;

  const summary =
    details?.summary ||
    {};

  const appointments =
    toArray(
      details?.appointments,
    );

  const treatments =
    toArray(
      details?.treatments,
    );

  const payments =
    toArray(
      details?.payments,
    );

  /* ======================================================
     PATIENT VALUES
  ====================================================== */

  const patientName =
    patient?.name ||
    patient?.patient_name ||
    "Unknown Patient";

  const displayPatientId =
    patient?.id ||
    patient?.patient_id ||
    selectedPatientId ||
    "-";

  const phone =
    patient?.phone ||
    patient?.phone_number ||
    "-";

  const allergyDetails =
    patient?.allergy_details ||
    patient?.allergies ||
    "";

  const hasAllergies =
    toBoolean(
      patient?.has_allergies ??
        patient?.is_allergies,
    ) ||
    Boolean(
      String(
        allergyDetails,
      ).trim(),
    );

  const isInactive =
    normalizeStatus(
      patient?.status,
    ) === "inactive";

  /* ======================================================
     SUMMARY FALLBACKS
  ====================================================== */

  const calculatedSummary =
    useMemo(() => {
      const totalPaid =
        payments.reduce(
          (
            total,
            payment,
          ) =>
            total +
            toNumber(
              payment?.payment_amount ??
                payment?.amount,
            ),
          0,
        );

      const totalCharges =
        treatments.reduce(
          (
            total,
            treatment,
          ) =>
            total +
            toNumber(
              treatment?.treatment_fee ??
                treatment?.treatment_charge,
            ),
          0,
        );

      const fullPayments =
        payments.filter(
          (payment) =>
            getPaymentStatus(
              payment,
            ) === "Full",
        ).length;

      const partialPayments =
        payments.filter(
          (payment) =>
            getPaymentStatus(
              payment,
            ) ===
            "Partial",
        ).length;

      return {
        totalPaid,

        totalCharges,

        fullPayments,

        partialPayments,

        outstanding:
          Math.max(
            totalCharges -
              totalPaid,
            0,
          ),
      };
    }, [
      treatments,
      payments,
    ]);

  const outstandingBalance =
    summary.outstanding_balance ??
    calculatedSummary.outstanding;

  /* ======================================================
     APPOINTMENT COLUMNS
  ====================================================== */

  const appointmentColumns = [
    {
      title:
        "Appointment ID",

      key:
        "appointment_id",

      width: 155,

      render: (
        _,
        record,
      ) => (
        <div className="patient-history-id">
          {record?.appointment_id ||
            record?.id ||
            "-"}
        </div>
      ),
    },

    {
      title:
        "Date and Time",

      key: "date_time",

      width: 190,

      render: (
        _,
        record,
      ) => (
        <div>
          <Text strong>
            {formatDate(
              record?.appointment_date,
            )}
          </Text>

          <div>
            <Text type="secondary">
              {record?.appointment_time ||
                "-"}
            </Text>
          </div>
        </div>
      ),
    },

    {
      title: "Reason",

      key: "reason",

      render: (
        _,
        record,
      ) => (
        <Text type="secondary">
          {record?.reason_for_visit ||
            "-"}
        </Text>
      ),
    },

    {
      title: "Status",

      key: "status",

      width: 145,

      render: (
        _,
        record,
      ) => {
        const status =
          record?.status ||
          "Unknown";

        return (
          <Tag
            color={
              appointmentStatusColors[
                status
              ] ||
              "default"
            }
          >
            {status}
          </Tag>
        );
      },
    },
  ];

  /* ======================================================
     TREATMENT COLUMNS
  ====================================================== */

  const treatmentColumns = [
    {
      title:
        "Treatment ID",

      key:
        "treatment_id",

      width: 150,

      render: (
        _,
        record,
      ) => (
        <div className="patient-history-id patient-history-id--purple">
          {record?.treatment_id ||
            record?.id ||
            "-"}
        </div>
      ),
    },

    {
      title: "Treatment",

      key: "treatment",

      width: 210,

      render: (
        _,
        record,
      ) => (
        <Text strong>
          {record?.treatment_performed ||
            record?.treatment_name ||
            "-"}
        </Text>
      ),
    },

    {
      title: "Date",

      key: "date",

      width: 140,

      render: (
        _,
        record,
      ) =>
        formatDate(
          record?.treatment_date ||
            record?.created_at,
        ),
    },

    {
      title: "Notes",

      key: "notes",

      render: (
        _,
        record,
      ) => (
        <Text type="secondary">
          {record?.doctor_notes ||
            record?.notes ||
            record?.treatment_notes ||
            "-"}
        </Text>
      ),
    },

    {
      title: "Next Visit",

      key:
        "next_appointment",

      width: 145,

      render: (
        _,
        record,
      ) =>
        formatDate(
          record?.next_appointment_date,
        ),
    },

    {
      title: "Fee",

      key: "fee",

      align: "right",

      width: 145,

      render: (
        _,
        record,
      ) => (
        <Text strong>
          {formatCurrency(
            record?.treatment_fee ??
              record?.treatment_charge,
          )}
        </Text>
      ),
    },
  ];

  /* ======================================================
     PAYMENT COLUMNS
  ====================================================== */

  const paymentColumns = [
    {
      title:
        "Payment ID",

      key: "payment_id",

      width: 145,

      render: (
        _,
        record,
      ) => (
        <div className="patient-history-id patient-history-id--green">
          {record?.payment_id ||
            record?.id ||
            "-"}
        </div>
      ),
    },

    {
      title: "Receipt",

      key: "receipt",

      width: 145,

      render: (
        _,
        record,
      ) => (
        <Text strong>
          {record?.receipt_number ||
            "-"}
        </Text>
      ),
    },

    {
      title: "Date",

      key: "date",

      width: 140,

      render: (
        _,
        record,
      ) =>
        formatDate(
          record?.payment_date,
        ),
    },

    {
      title: "Method",

      key: "method",

      width: 140,

      render: (
        _,
        record,
      ) =>
        record?.payment_method ||
        "-",
    },

    {
      title: "Amount",

      key: "amount",

      align: "right",

      width: 160,

      render: (
        _,
        record,
      ) => (
        <Text strong>
          {formatCurrency(
            record?.payment_amount ??
              record?.amount,
          )}
        </Text>
      ),
    },

    {
      title: "Status",

      key: "status",

      width: 120,

      render: (
        _,
        record,
      ) => {
        const status =
          getPaymentStatus(
            record,
          );

        return (
          <Tag
            color={
              paymentStatusColors[
                status
              ]
            }
          >
            {status}
          </Tag>
        );
      },
    },
  ];

  /* ======================================================
     OVERVIEW CONTENT
  ====================================================== */

  const overviewContent = (
    <div className="patient-overview">
      {/* ================================================
          ALLERGY WARNING
      ================================================ */}

      {hasAllergies && (
        <Alert
          type="error"
          showIcon
          icon={
            <ExclamationCircleOutlined />
          }
          message="Patient Allergy Warning"
          description={
            allergyDetails ||
            "This patient has a recorded allergy."
          }
          className="patient-overview-allergy-alert"
        />
      )}

      {/* ================================================
          PATIENT INFORMATION
      ================================================ */}

      <Card
        bordered={false}
        className="patient-information-card"
      >
        <div className="patient-details-section-heading">
          <div>
            <Title level={4}>
              Patient Information
            </Title>

            <Text type="secondary">
              Personal and medical
              information recorded for
              this patient.
            </Text>
          </div>

          <Tag
            color={
              isInactive
                ? "default"
                : "green"
            }
          >
            {patient?.status ||
              "Active"}
          </Tag>
        </div>

        <Descriptions
          bordered
          size="small"
          column={{
            xs: 1,
            md: 2,
          }}
          className="patient-information-descriptions"
        >
          <Descriptions.Item label="Patient ID">
            <Text strong>
              {displayPatientId}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="Patient Name">
            <Text strong>
              {patientName}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="Phone Number">
            <Space size={7}>
              <PhoneOutlined />

              <Text>
                {phone}
              </Text>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label="Gender">
            {patient?.gender ||
              "-"}
          </Descriptions.Item>

          <Descriptions.Item
            label="Address"
            span={2}
          >
            {patient?.address ||
              "-"}
          </Descriptions.Item>

          <Descriptions.Item
            label="Allergy Status"
            span={2}
          >
            {hasAllergies ? (
              <Space
                wrap
                size={8}
              >
                <Tag
                  color="error"
                  icon={
                    <ExclamationCircleOutlined />
                  }
                >
                  Allergy
                  Recorded
                </Tag>

                <Text type="danger">
                  {allergyDetails ||
                    "Allergy details unavailable"}
                </Text>
              </Space>
            ) : (
              <Tag
                color="success"
                icon={
                  <CheckCircleOutlined />
                }
              >
                No known
                allergies
              </Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* ================================================
          PATIENT SUMMARY
      ================================================ */}

      <div className="patient-details-section-heading patient-details-section-heading--summary">
        <div>
          <Title level={4}>
            Patient Summary
          </Title>

          <Text type="secondary">
            Appointment,
            treatment and payment
            activity.
          </Text>
        </div>
      </div>

      <Row
        gutter={[14, 14]}
      >
        <Col
          xs={24}
          sm={12}
          xl={8}
        >
          <PatientHistorySummaryCard
            title="Appointments"
            value={
              summary.total_appointments ??
              appointments.length
            }
            tone="blue"
            icon={
              <CalendarOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={8}
        >
          <PatientHistorySummaryCard
            title="Treatments"
            value={
              summary.total_treatments ??
              treatments.length
            }
            tone="purple"
            icon={
              <MedicineBoxOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={8}
        >
          <PatientHistorySummaryCard
            title="Full Payments"
            value={
              summary.full_payments ??
              calculatedSummary.fullPayments
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
          xl={8}
        >
          <PatientHistorySummaryCard
            title="Partial Payments"
            value={
              summary.partial_payments ??
              calculatedSummary.partialPayments
            }
            tone="orange"
            icon={
              <WalletOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={8}
        >
          <PatientHistorySummaryCard
            title="Total Paid"
            value={
              summary.total_paid ??
              calculatedSummary.totalPaid
            }
            tone="cyan"
            currency
            icon={
              <DollarOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={8}
        >
          <PatientHistorySummaryCard
            title="Outstanding Balance"
            value={
              outstandingBalance
            }
            tone={
              toNumber(
                outstandingBalance,
              ) > 0
                ? "red"
                : "green"
            }
            currency
            icon={
              <DollarOutlined />
            }
          />
        </Col>
      </Row>
    </div>
  );

  /* ======================================================
     TABS
  ====================================================== */

  const tabs = [
    /* ====================================================
       OVERVIEW
    ==================================================== */

    {
      key: "overview",

      label: (
        <Space size={7}>
          <UserOutlined />

          Overview
        </Space>
      ),

      children:
        overviewContent,
    },

    /* ====================================================
       APPOINTMENTS
    ==================================================== */

    {
      key:
        "appointments",

      label: (
        <Space size={7}>
          <CalendarOutlined />

          Appointments

          <Tag className="patient-tab-count">
            {
              appointments.length
            }
          </Tag>
        </Space>
      ),

      children:
        appointments.length >
        0 ? (
          <div className="patient-history-section">
            <div className="patient-details-section-heading">
              <div>
                <Title level={4}>
                  Appointment
                  History
                </Title>

                <Text type="secondary">
                  Previous and
                  current
                  appointments for
                  this patient.
                </Text>
              </div>
            </div>

            <Table
              rowKey={(
                record,
                index,
              ) =>
                record?.appointment_id ||
                record?.id ||
                index
              }
              columns={
                appointmentColumns
              }
              dataSource={
                appointments
              }
              pagination={{
                pageSize: 5,

                showSizeChanger:
                  false,

                hideOnSinglePage:
                  true,
              }}
              scroll={{
                x: 800,
              }}
              className="patient-history-table"
            />
          </div>
        ) : (
          <Empty
            image={
              Empty.PRESENTED_IMAGE_SIMPLE
            }
            description="No appointments found"
          />
        ),
    },

    /* ====================================================
       TREATMENTS
    ==================================================== */

    {
      key:
        "treatments",

      label: (
        <Space size={7}>
          <MedicineBoxOutlined />

          Treatments

          <Tag className="patient-tab-count">
            {
              treatments.length
            }
          </Tag>
        </Space>
      ),

      children:
        treatments.length >
        0 ? (
          <div className="patient-history-section">
            <div className="patient-details-section-heading">
              <div>
                <Title level={4}>
                  Treatment
                  History
                </Title>

                <Text type="secondary">
                  Diagnoses,
                  treatments,
                  doctor notes and
                  follow-up dates.
                </Text>
              </div>
            </div>

            <Table
              rowKey={(
                record,
                index,
              ) =>
                record?.treatment_id ||
                record?.id ||
                index
              }
              columns={
                treatmentColumns
              }
              dataSource={
                treatments
              }
              pagination={{
                pageSize: 5,

                showSizeChanger:
                  false,

                hideOnSinglePage:
                  true,
              }}
              scroll={{
                x: 1000,
              }}
              className="patient-history-table"
            />
          </div>
        ) : (
          <Empty
            image={
              Empty.PRESENTED_IMAGE_SIMPLE
            }
            description="No treatments found"
          />
        ),
    },

    /* ====================================================
       PAYMENTS
    ==================================================== */

    {
      key: "payments",

      label: (
        <Space size={7}>
          <DollarOutlined />

          Payments

          <Tag className="patient-tab-count">
            {
              payments.length
            }
          </Tag>
        </Space>
      ),

      children:
        payments.length >
        0 ? (
          <div className="patient-history-section">
            <div className="patient-details-section-heading">
              <div>
                <Title level={4}>
                  Payment
                  History
                </Title>

                <Text type="secondary">
                  Receipts,
                  payment methods
                  and payment
                  status.
                </Text>
              </div>
            </div>

            <Table
              rowKey={(
                record,
                index,
              ) =>
                record?.payment_id ||
                record?.receipt_number ||
                record?.id ||
                index
              }
              columns={
                paymentColumns
              }
              dataSource={
                payments
              }
              pagination={{
                pageSize: 5,

                showSizeChanger:
                  false,

                hideOnSinglePage:
                  true,
              }}
              scroll={{
                x: 850,
              }}
              className="patient-history-table"
            />
          </div>
        ) : (
          <Empty
            image={
              Empty.PRESENTED_IMAGE_SIMPLE
            }
            description="No payments found"
          />
        ),
    },

    /* ====================================================
       MEDIA
    ==================================================== */

    {
      key: "media",

      label: (
        <Space size={7}>
          <FileImageOutlined />

          Media

          <Tag className="patient-tab-count">
            {mediaCount}
          </Tag>
        </Space>
      ),

      children: (
        <PatientMediaTab
          patientId={
            displayPatientId
          }
          patient={patient}
          onCountChange={
            setMediaCount
          }
        />
      ),
    },
  ];

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={null}
      width={1080}
      centered
      destroyOnHidden
      className={
        hasAllergies
          ? "patient-details-modal patient-details-modal--allergy"
          : "patient-details-modal"
      }
      footer={[
        <Button
          key="close"
          onClick={onClose}
        >
          Close
        </Button>,

        ...(showEdit &&
        onEdit
          ? [
              <Button
                key="edit"
                type="primary"
                icon={
                  <EditOutlined />
                }
                disabled={
                  !patient
                }
                onClick={() =>
                  onEdit(
                    patient,
                  )
                }
              >
                Edit Patient
              </Button>,
            ]
          : []),
      ]}
      styles={{
        body: {
          maxHeight:
            "80vh",

          overflowY:
            "auto",
        },
      }}
    >
      <Spin
        spinning={loading}
      >
        {!patient &&
        !loading ? (
          <div className="patient-details-empty">
            <Empty description="Patient details not available" />
          </div>
        ) : (
          <>
            {/* ============================================
                PATIENT HEADER
            ============================================ */}

            <div className="patient-details-header">
              <div className="patient-details-header__patient">
                <Avatar
                  size={70}
                  icon={
                    <UserOutlined />
                  }
                  className={
                    hasAllergies
                      ? "patient-details-header__avatar patient-details-header__avatar--allergy"
                      : "patient-details-header__avatar"
                  }
                />

                <div className="patient-details-header__identity">
                  <Space
                    wrap
                    size={8}
                  >
                    <Title
                      level={3}
                    >
                      {
                        patientName
                      }
                    </Title>

                    <Tag
                      color={
                        isInactive
                          ? "default"
                          : "green"
                      }
                    >
                      {patient?.status ||
                        "Active"}
                    </Tag>
                  </Space>

                  <div className="patient-details-header__meta">
                    <span>
                      <UserOutlined />

                      {
                        displayPatientId
                      }
                    </span>

                    <span>
                      <PhoneOutlined />

                      {phone}
                    </span>

                    <span>
                      <HistoryOutlined />

                      {
                        appointments.length
                      }{" "}
                      appointment
                      {appointments.length !==
                      1
                        ? "s"
                        : ""}
                    </span>

                    {/* MEDIA COUNT */}

                    <span>
                      <FileImageOutlined />

                      {mediaCount}{" "}
                      media
                    </span>
                  </div>
                </div>
              </div>

              {/* ==========================================
                  ALLERGY HEADER ALERT
              ========================================== */}

              {hasAllergies && (
                <div className="patient-details-header__allergy">
                  <ExclamationCircleOutlined />

                  <div>
                    <Text strong>
                      Allergy Alert
                    </Text>

                    <Text>
                      {allergyDetails ||
                        "Allergy recorded"}
                    </Text>
                  </div>
                </div>
              )}
            </div>

            {/* ============================================
                TABS
            ============================================ */}

            <div className="patient-details-tabs-wrapper">
              <Tabs
                activeKey={
                  activeTab
                }
                onChange={
                  setActiveTab
                }
                items={tabs}
                className="patient-details-tabs"
              />
            </div>
          </>
        )}
      </Spin>
    </Modal>
  );
};

export default PatientDetailsModal;