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
  Descriptions,
  Empty,
  Modal,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
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
  DollarOutlined,
  HistoryOutlined,
  IdcardOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import {
  createPayment,
  getAppointmentByTreatment,
  getTreatmentPaymentSummary,
  updateAppointmentStatus,
} from "../api/endPoints";

import PaymentModal from "./PaymentModal";

import "./css/TreatmentPaymentDetailsModal.css";

const {
  Text,
  Title,
} = Typography;

/* --------------------------------------------------------
   General helpers
-------------------------------------------------------- */

const toNumber = (value) => {
  const number = Number(value || 0);

  return Number.isFinite(number)
    ? number
    : 0;
};

const hasValue = (value) => {
  return (
    value !== undefined &&
    value !== null &&
    value !== ""
  );
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

const getPaymentAmount = (
  payment,
) => {
  return toNumber(
    payment?.payment_amount ??
      payment?.amount ??
      0,
  );
};

const getTreatmentCharge = (
  record,
) => {
  return toNumber(
    record?.treatment_charge ??
      record?.treatment_fee ??
      record?.charge ??
      0,
  );
};

const extractData = (response) => {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
};

const getPaymentId = (record) => {
  return (
    record?.payment_id ||
    record?.id ||
    "-"
  );
};

const getPaymentStatusColor = (
  status,
) => {
  const colors = {
    Paid: "success",
    Full: "success",
    Partial: "warning",
    Unpaid: "error",
  };

  return colors[status] || "default";
};

/* --------------------------------------------------------
   Summary card
-------------------------------------------------------- */

const PaymentSummaryCard = ({
  title,
  value,
  icon,
  tone,
}) => {
  return (
    <Card
      bordered={false}
      className={`treatment-payment-summary-card treatment-payment-summary-card--${tone}`}
    >
      <div className="treatment-payment-summary-card__content">
        <Statistic
          title={title}
          value={toNumber(value)}
          prefix="Rs."
          precision={2}
        />

        <div className="treatment-payment-summary-card__icon">
          {icon}
        </div>
      </div>
    </Card>
  );
};

/* --------------------------------------------------------
   Main component
-------------------------------------------------------- */

const TreatmentPaymentDetailsModal = ({
  open,
  treatmentId,
  patientName,
  onClose,
}) => {
  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [details, setDetails] =
    useState(null);

  const [
    paymentModalOpen,
    setPaymentModalOpen,
  ] = useState(false);

  /* ------------------------------------------------------
     Load treatment payment details
  ------------------------------------------------------ */

  const loadDetails = useCallback(
    async ({
      silent = false,
    } = {}) => {
      if (!treatmentId) {
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const response =
          await getTreatmentPaymentSummary(
            treatmentId,
          );

        setDetails(
          extractData(response),
        );
      } catch (error) {
        console.error(
          "Failed to load payment details:",
          error,
        );

        message.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Failed to load payment details",
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [treatmentId],
  );

  useEffect(() => {
    if (!open) {
      setDetails(null);
      setPaymentModalOpen(false);

      return;
    }

    if (treatmentId) {
      loadDetails();
    }
  }, [
    open,
    treatmentId,
    loadDetails,
  ]);

  /* ------------------------------------------------------
     Main details
  ------------------------------------------------------ */

  const displayedPatientName =
    patientName ||
    details?.patient_name ||
    details?.patient?.name ||
    "Unknown Patient";

  const patientId =
    details?.patient_id ||
    details?.patient?.patient_id ||
    details?.patient?.id ||
    "-";

  const treatmentName =
    details?.treatment_name ||
    details?.treatment
      ?.treatment_performed ||
    details?.treatment
      ?.treatment_name ||
    "Dental Treatment";

  const treatmentDate =
    details?.treatment_date ||
    details?.treatment
      ?.treatment_date ||
    details?.treatment?.created_at;

  /* ------------------------------------------------------
     Payment records
  ------------------------------------------------------ */

  const payments = useMemo(() => {
    const rows = Array.isArray(
      details?.payments,
    )
      ? details.payments
      : [];

    return [...rows].sort(
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
  }, [details]);

  /* ------------------------------------------------------
     Treatment charge
  ------------------------------------------------------ */

  const treatmentCharge =
    useMemo(() => {
      const summaryCharge =
        toNumber(
          details?.treatment_charge ??
            details?.total_treatment_charge ??
            details?.total_charge ??
            details?.treatment
              ?.treatment_charge ??
            details?.treatment
              ?.treatment_fee ??
            0,
        );

      if (summaryCharge > 0) {
        return summaryCharge;
      }

      return payments.reduce(
        (
          largestCharge,
          payment,
        ) =>
          Math.max(
            largestCharge,
            getTreatmentCharge(
              payment,
            ),
          ),
        0,
      );
    }, [
      details,
      payments,
    ]);

  /* ------------------------------------------------------
     Installment rows
  ------------------------------------------------------ */

  const installmentRows =
    useMemo(() => {
      let runningPaid = 0;

      return payments.map(
        (payment, index) => {
          const currentPayment =
            getPaymentAmount(
              payment,
            );

          const previouslyPaid =
            hasValue(
              payment?.previously_paid,
            )
              ? toNumber(
                  payment.previously_paid,
                )
              : runningPaid;

          const calculatedTotal =
            previouslyPaid +
            currentPayment;

          const totalPaid =
            hasValue(
              payment?.total_paid,
            )
              ? toNumber(
                  payment.total_paid,
                )
              : calculatedTotal;

          const calculatedRemaining =
            Math.max(
              treatmentCharge -
                totalPaid,
              0,
            );

          const remainingAmount =
            hasValue(
              payment?.remaining_amount,
            )
              ? Math.max(
                  toNumber(
                    payment.remaining_amount,
                  ),
                  0,
                )
              : calculatedRemaining;

          runningPaid = Math.max(
            runningPaid,
            totalPaid,
          );

          return {
            ...payment,

            installment_number:
              payment
                ?.installment_number ||
              index + 1,

            calculated_payment:
              currentPayment,

            calculated_previous:
              previouslyPaid,

            calculated_total:
              totalPaid,

            calculated_remaining:
              remainingAmount,

            calculated_status:
              remainingAmount <= 0
                ? "Paid"
                : "Partial",
          };
        },
      );
    }, [
      payments,
      treatmentCharge,
    ]);

  /* ------------------------------------------------------
     Payment summary
  ------------------------------------------------------ */

  const calculatedTotalPaid =
    useMemo(() => {
      return payments.reduce(
        (total, payment) =>
          total +
          getPaymentAmount(
            payment,
          ),
        0,
      );
    }, [payments]);

  const savedTotalPaid = toNumber(
    details?.total_paid,
  );

  const totalPaid = Math.max(
    savedTotalPaid,
    calculatedTotalPaid,
  );

  const savedRemaining =
    hasValue(
      details?.remaining_amount,
    )
      ? toNumber(
          details.remaining_amount,
        )
      : null;

  const remainingAmount =
    savedRemaining !== null
      ? Math.max(
          savedRemaining,
          0,
        )
      : Math.max(
          treatmentCharge -
            totalPaid,
          0,
        );

  const paymentStatus =
    totalPaid <= 0
      ? "Unpaid"
      : remainingAmount > 0
        ? "Partial"
        : "Paid";

  const paidPercentage =
    treatmentCharge > 0
      ? Math.min(
          Math.round(
            (totalPaid /
              treatmentCharge) *
              100,
          ),
          100,
        )
      : 0;

  /* ------------------------------------------------------
     Open and close payment form
  ------------------------------------------------------ */

  const openPaymentModal = () => {
    if (
      !treatmentId ||
      remainingAmount <= 0
    ) {
      return;
    }

    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    if (saving) {
      return;
    }

    setPaymentModalOpen(false);
  };

  /* ------------------------------------------------------
     Save payment
  ------------------------------------------------------ */

  const handlePaymentSubmit =
    async (paymentData) => {
      if (!treatmentId) {
        message.error(
          "Treatment ID is missing",
        );

        return;
      }

      setSaving(true);

      try {
        await createPayment(
          paymentData,
        );

        const appointmentResponse =
          await getAppointmentByTreatment(
            treatmentId,
          );

        const appointmentData =
          extractData(
            appointmentResponse,
          );

        const appointment =
          appointmentData
            ?.appointment ||
          appointmentData;

        const appointmentId =
          appointment
            ?.appointment_id ||
          appointment?.id;

        const paymentAmount =
          toNumber(
            paymentData
              ?.payment_amount,
          );

        const newRemainingAmount =
          Math.max(
            remainingAmount -
              paymentAmount,
            0,
          );

        const isFullPayment =
          newRemainingAmount <= 0;

        if (appointmentId) {
          await updateAppointmentStatus(
            appointmentId,
            isFullPayment
              ? "Paid"
              : "Payment Pending",
          );
        } else {
          console.warn(
            "Appointment ID was not returned for treatment:",
            treatmentId,
          );
        }

        message.success(
          isFullPayment
            ? "Full payment saved successfully"
            : "Partial payment saved successfully",
        );

        setPaymentModalOpen(false);

        await loadDetails({
          silent: true,
        });
      } catch (error) {
        console.error(
          "Could not save payment:",
          error,
        );

        message.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Could not save the payment",
        );

        throw error;
      } finally {
        setSaving(false);
      }
    };

  /* ------------------------------------------------------
     Installment columns
  ------------------------------------------------------ */

  const columns = [
    {
      title: "Installment",
      key: "installment",
      width: 150,
      fixed: "left",

      render: (_, record) => (
        <Space
          size={10}
          align="start"
        >
          <div className="treatment-installment-number">
            #
            {
              record.installment_number
            }
          </div>

          <div className="treatment-payment-date-cell">
            <Text strong>
              {formatDate(
                record?.payment_date ||
                  record?.created_at,
              )}
            </Text>

            <Text type="secondary">
              {record?.receipt_number ||
                "No receipt"}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Payment ID",
      key: "payment_id",
      width: 150,

      render: (_, record) => (
        <div className="treatment-payment-id">
          <Text copyable>
            {getPaymentId(record)}
          </Text>
        </div>
      ),
    },
    {
      title: "This Payment",
      dataIndex:
        "calculated_payment",
      key: "payment",
      width: 150,
      align: "right",

      render: (value) => (
        <Text className="treatment-payment-amount treatment-payment-amount--primary">
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: "Previously Paid",
      dataIndex:
        "calculated_previous",
      key: "previously_paid",
      width: 150,
      align: "right",

      render: (value) => (
        <Text>
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: "Total Paid",
      dataIndex:
        "calculated_total",
      key: "total_paid",
      width: 150,
      align: "right",

      render: (value) => (
        <Text className="treatment-payment-amount treatment-payment-amount--paid">
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: "Balance",
      key: "remaining",
      width: 150,
      align: "right",

      render: (_, record) => (
        <div className="treatment-payment-balance-cell">
          <Text
            className={
              record
                .calculated_remaining >
              0
                ? "treatment-payment-amount treatment-payment-amount--balance"
                : "treatment-payment-amount treatment-payment-amount--paid"
            }
          >
            {formatCurrency(
              record
                .calculated_remaining,
            )}
          </Text>

          <Tag
            color={getPaymentStatusColor(
              record
                .calculated_status,
            )}
            className="treatment-payment-status-tag"
          >
            {
              record.calculated_status
            }
          </Tag>
        </div>
      ),
    },
    {
      title: "Method",
      dataIndex:
        "payment_method",
      key: "payment_method",
      width: 125,
      align: "center",

      render: (value) => (
        <Tag className="treatment-payment-method-tag">
          {value || "-"}
        </Tag>
      ),
    },
  ];

  /* ------------------------------------------------------
     Close main modal
  ------------------------------------------------------ */

  const handleClose = () => {
    if (saving) {
      return;
    }

    setPaymentModalOpen(false);
    setDetails(null);

    onClose();
  };

  /* ------------------------------------------------------
     PaymentModal appointment data
  ------------------------------------------------------ */

  const paymentModalAppointment = {
    treatment_id: treatmentId,

    patient_id: patientId,

    patient_name:
      displayedPatientName,

    treatment_name:
      treatmentName,

    treatment_charge:
      treatmentCharge,

    total_paid:
      totalPaid,

    remaining_amount:
      remainingAmount,

    payment_status:
      paymentStatus,
  };

  return (
    <>
      <Modal
        title={null}
        open={open}
        onCancel={handleClose}
        width={960}
        centered
        destroyOnHidden
        className={
          paymentStatus === "Paid"
            ? "treatment-payment-details-modal treatment-payment-details-modal--paid"
            : "treatment-payment-details-modal"
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
            onClick={handleClose}
            disabled={saving}
          >
            Close
          </Button>,

          ...(remainingAmount > 0
            ? [
                <Button
                  key="payment"
                  type="primary"
                  icon={
                    <DollarOutlined />
                  }
                  onClick={
                    openPaymentModal
                  }
                >
                  Add Payment
                </Button>,
              ]
            : []),
        ]}
      >
        {loading ? (
          <div className="treatment-payment-loading">
            <Spin size="large" />

            <Text type="secondary">
              Loading payment details...
            </Text>
          </div>
        ) : !details ? (
          <div className="treatment-payment-empty">
            <Empty description="No payment details found" />
          </div>
        ) : (
          <>
            {/* Header */}

            <div className="treatment-payment-header">
              <div className="treatment-payment-header__patient">
                <Avatar
                  size={70}
                  icon={
                    <UserOutlined />
                  }
                  className="treatment-payment-header__avatar"
                />

                <div className="treatment-payment-header__identity">
                  <Text className="treatment-payment-header__eyebrow">
                    Treatment Payment
                  </Text>

                  <Space
                    wrap
                    size={8}
                  >
                    <Title level={3}>
                      {displayedPatientName}
                    </Title>

                    <Tag
                      color={getPaymentStatusColor(
                        paymentStatus,
                      )}
                      className="treatment-payment-header__status"
                    >
                      {paymentStatus}
                    </Tag>
                  </Space>

                  <div className="treatment-payment-header__meta">
                    <span>
                      <IdcardOutlined />

                      {patientId}
                    </span>

                    <span>
                      <MedicineBoxOutlined />

                      {treatmentId}
                    </span>

                    <span>
                      <HistoryOutlined />

                      {
                        installmentRows.length
                      }{" "}
                      installment
                      {installmentRows.length ===
                      1
                        ? ""
                        : "s"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="treatment-payment-header__treatment">
                <div className="treatment-payment-header__treatment-icon">
                  <MedicineBoxOutlined />
                </div>

                <div>
                  <Text>
                    Treatment
                  </Text>

                  <Title level={5}>
                    {treatmentName}
                  </Title>

                  <Text>
                    {formatDate(
                      treatmentDate,
                    )}
                  </Text>
                </div>
              </div>
            </div>

            <div className="treatment-payment-content">
              {/* Basic details */}

              <Card
                bordered={false}
                className="treatment-payment-information-card"
              >
                <div className="treatment-payment-section-heading">
                  <div>
                    <Title level={4}>
                      Payment Information
                    </Title>

                    <Text type="secondary">
                      Treatment and patient
                      payment details.
                    </Text>
                  </div>

                  <Tag
                    color={getPaymentStatusColor(
                      paymentStatus,
                    )}
                    icon={
                      paymentStatus ===
                      "Paid" ? (
                        <CheckCircleOutlined />
                      ) : (
                        <WarningOutlined />
                      )
                    }
                  >
                    {paymentStatus}
                  </Tag>
                </div>

                <Descriptions
                  bordered
                  size="small"
                  column={{
                    xs: 1,
                    md: 2,
                  }}
                  className="treatment-payment-descriptions"
                >
                  <Descriptions.Item label="Patient">
                    <Text strong>
                      {
                        displayedPatientName
                      }
                    </Text>
                  </Descriptions.Item>

                  <Descriptions.Item label="Patient ID">
                    <Text copyable>
                      {patientId}
                    </Text>
                  </Descriptions.Item>

                  <Descriptions.Item label="Treatment">
                    {treatmentName}
                  </Descriptions.Item>

                  <Descriptions.Item label="Treatment ID">
                    <Text copyable>
                      {treatmentId}
                    </Text>
                  </Descriptions.Item>

                  <Descriptions.Item label="Treatment Date">
                    <Space size={7}>
                      <CalendarOutlined />

                      {formatDate(
                        treatmentDate,
                      )}
                    </Space>
                  </Descriptions.Item>

                  <Descriptions.Item label="Installments">
                    {
                      installmentRows.length
                    }
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Summary cards */}

              <Row gutter={[14, 14]}>
                <Col
                  xs={24}
                  sm={8}
                >
                  <PaymentSummaryCard
                    title="Treatment Fee"
                    value={
                      treatmentCharge
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
                  <PaymentSummaryCard
                    title="Total Paid"
                    value={totalPaid}
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
                  <PaymentSummaryCard
                    title="Remaining"
                    value={
                      remainingAmount
                    }
                    tone={
                      remainingAmount > 0
                        ? "orange"
                        : "green"
                    }
                    icon={
                      <WalletOutlined />
                    }
                  />
                </Col>
              </Row>

              {/* Progress */}

              <Card
                bordered={false}
                className="treatment-payment-progress-card"
              >
                <div className="treatment-payment-progress-header">
                  <div>
                    <Text strong>
                      Payment Progress
                    </Text>

                    <Text type="secondary">
                      {formatCurrency(
                        totalPaid,
                      )}{" "}
                      received from{" "}
                      {formatCurrency(
                        treatmentCharge,
                      )}
                    </Text>
                  </div>

                  <Text strong>
                    {paidPercentage}%
                  </Text>
                </div>

                <Progress
                  percent={
                    paidPercentage
                  }
                  status={
                    paymentStatus ===
                    "Paid"
                      ? "success"
                      : "active"
                  }
                  showInfo={false}
                />
              </Card>

              {/* Payment state */}

              {remainingAmount > 0 ? (
                <Alert
                  type="warning"
                  showIcon
                  icon={
                    <WarningOutlined />
                  }
                  message="Payment is not completed"
                  description={
                    <div className="treatment-payment-warning-content">
                      <span>
                        Remaining balance:{" "}
                        <strong>
                          {formatCurrency(
                            remainingAmount,
                          )}
                        </strong>
                      </span>

                      <Button
                        type="primary"
                        icon={
                          <DollarOutlined />
                        }
                        onClick={
                          openPaymentModal
                        }
                      >
                        Pay Now
                      </Button>
                    </div>
                  }
                  className="treatment-payment-alert"
                />
              ) : (
                <Alert
                  type="success"
                  showIcon
                  icon={
                    <CheckCircleOutlined />
                  }
                  message="Treatment payment completed"
                  description={`${installmentRows.length} installment${
                    installmentRows.length ===
                    1
                      ? ""
                      : "s"
                  } recorded for this treatment.`}
                  className="treatment-payment-alert"
                />
              )}

              {/* Installment history */}

              <Card
                bordered={false}
                className="treatment-installment-card"
              >
                <div className="treatment-payment-section-heading">
                  <div>
                    <Title level={4}>
                      Installment History
                    </Title>

                    <Text type="secondary">
                      All payment
                      transactions recorded
                      for this treatment.
                    </Text>
                  </div>

                  <Tag color="blue">
                    {
                      installmentRows.length
                    }{" "}
                    record
                    {installmentRows.length ===
                    1
                      ? ""
                      : "s"}
                  </Tag>
                </div>

                <Table
                  rowKey={(
                    record,
                    index,
                  ) =>
                    record?.payment_id ||
                    record?.id ||
                    record
                      ?.receipt_number ||
                    `payment-${index}`
                  }
                  columns={columns}
                  dataSource={
                    installmentRows
                  }
                  pagination={false}
                  scroll={{
                    x: 1050,
                  }}
                  className="treatment-installment-table"
                  locale={{
                    emptyText: (
                      <Empty
                        image={
                          Empty.PRESENTED_IMAGE_SIMPLE
                        }
                        description="No installments found"
                      />
                    ),
                  }}
                />
              </Card>
            </div>
          </>
        )}
      </Modal>

      <PaymentModal
        open={paymentModalOpen}
        loading={saving}
        appointment={
          paymentModalAppointment
        }
        onCancel={
          closePaymentModal
        }
        onSubmit={
          handlePaymentSubmit
        }
      />
    </>
  );
};

export default TreatmentPaymentDetailsModal;