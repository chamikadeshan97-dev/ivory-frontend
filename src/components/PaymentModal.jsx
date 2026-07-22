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
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";

import {
  BankOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
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

import {
  getTreatmentPaymentSummary,
} from "../api/endPoints";

import "./css/PaymentModal.css";

const {
  Text,
  Title,
} = Typography;

/* --------------------------------------------------------
   Options
-------------------------------------------------------- */

const PAYMENT_METHODS = [
  {
    value: "Cash",
    label: "Cash",
    icon: <WalletOutlined />,
  },
  {
    value: "Card",
    label: "Card",
    icon: <CreditCardOutlined />,
  },
  {
    value: "Bank Transfer",
    label: "Bank Transfer",
    icon: <BankOutlined />,
  },
  {
    value: "Online",
    label: "Online",
    icon: <DollarOutlined />,
  },
];

const COMMON_AMOUNTS = [
  500,
  1000,
  2000,
  3000,
  5000,
  6000,
];

/* --------------------------------------------------------
   Helpers
-------------------------------------------------------- */

const toNumber = (value) => {
  const number = Number(value || 0);

  return Number.isFinite(number)
    ? number
    : 0;
};

const formatMoney = (amount) => {
  return toNumber(amount).toLocaleString(
    "en-LK",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
};

const formatCurrency = (amount) => {
  return `Rs. ${formatMoney(amount)}`;
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

const extractResponseData = (
  response,
) => {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
};

const getStatusColor = (status) => {
  const colors = {
    Paid: "success",
    Partial: "warning",
    Pending: "default",
  };

  return colors[status] || "default";
};

/* --------------------------------------------------------
   Financial summary card
-------------------------------------------------------- */

const PaymentFinancialCard = ({
  title,
  value,
  tone,
  icon,
}) => {
  return (
    <Card
      bordered={false}
      className={`receive-payment-summary-card receive-payment-summary-card--${tone}`}
    >
      <div className="receive-payment-summary-card__content">
        <Statistic
          title={title}
          value={toNumber(value)}
          prefix="Rs."
          precision={2}
        />

        <div className="receive-payment-summary-card__icon">
          {icon}
        </div>
      </div>
    </Card>
  );
};

/* --------------------------------------------------------
   Component
-------------------------------------------------------- */

const PaymentModal = ({
  open,
  loading,
  appointment,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();

  const [
    summaryLoading,
    setSummaryLoading,
  ] = useState(false);

  const [
    paymentSummary,
    setPaymentSummary,
  ] = useState(null);

  const [
    summaryError,
    setSummaryError,
  ] = useState("");

  const [
    showInstallmentHistory,
    setShowInstallmentHistory,
  ] = useState(false);

  /* ------------------------------------------------------
     Watched values
  ------------------------------------------------------ */

  const selectedPaymentMethod =
    Form.useWatch(
      "payment_method",
      form,
    ) || "Cash";

  const paymentAmount = toNumber(
    Form.useWatch(
      "payment_amount",
      form,
    ),
  );

  /* ------------------------------------------------------
     Display information
  ------------------------------------------------------ */

  const displayedPatientName =
    appointment?.patient_name ||
    paymentSummary?.patient_name ||
    paymentSummary?.patient?.name ||
    "Unknown Patient";

  const patientId =
    appointment?.patient_id ||
    paymentSummary?.patient_id ||
    paymentSummary?.patient
      ?.patient_id ||
    paymentSummary?.patient?.id ||
    "-";

  const phone =
    appointment?.phone ||
    paymentSummary?.phone ||
    paymentSummary?.patient?.phone ||
    paymentSummary?.patient
      ?.phone_number ||
    "-";

  const treatmentId =
    appointment?.treatment_id ||
    paymentSummary?.treatment_id ||
    "-";

  const treatmentName =
    appointment?.treatment_name ||
    paymentSummary?.treatment_name ||
    paymentSummary?.treatment
      ?.treatment_performed ||
    paymentSummary?.treatment
      ?.treatment_name ||
    "Dental Treatment";

  /* ------------------------------------------------------
     Financial values
  ------------------------------------------------------ */

  const treatmentCharge = toNumber(
    paymentSummary?.treatment_charge ??
      paymentSummary
        ?.total_treatment_charge ??
      paymentSummary?.total_charge ??
      appointment?.treatment_fee ??
      appointment?.treatment_charge ??
      0,
  );

  const totalPaid = toNumber(
    paymentSummary?.total_paid ??
      appointment?.total_paid ??
      0,
  );

  const payableAmount = Math.max(
    toNumber(
      paymentSummary
        ?.remaining_amount ??
        appointment
          ?.remaining_amount ??
        treatmentCharge -
          totalPaid,
    ),
    0,
  );

  const paymentHistory = useMemo(() => {
    const payments = Array.isArray(
      paymentSummary?.payments,
    )
      ? paymentSummary.payments
      : [];

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
  }, [paymentSummary]);

  const installmentCount = toNumber(
    paymentSummary
      ?.installment_count ??
      paymentHistory.length,
  );

  const balanceAfterPayment =
    Math.max(
      payableAmount -
        paymentAmount,
      0,
    );

  const halfPaymentAmount =
    payableAmount > 0
      ? Number(
          (
            payableAmount / 2
          ).toFixed(2),
        )
      : 0;

  const isFullyPaid =
    !summaryLoading &&
    treatmentCharge > 0 &&
    payableAmount <= 0;

  const paymentStatus =
    isFullyPaid
      ? "Paid"
      : totalPaid > 0
        ? "Partial"
        : "Pending";

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
     Load payment summary
  ------------------------------------------------------ */

  useEffect(() => {
    let isActive = true;

    const loadPaymentSummary =
      async () => {
        form.resetFields();

        setPaymentSummary(null);
        setSummaryError("");
        setShowInstallmentHistory(
          false,
        );

        form.setFieldsValue({
          payment_method: "Cash",
        });

        if (
          !open ||
          !appointment?.treatment_id
        ) {
          return;
        }

        setSummaryLoading(true);

        try {
          const response =
            await getTreatmentPaymentSummary(
              appointment
                .treatment_id,
            );

          const summary =
            extractResponseData(
              response,
            );

          if (!summary) {
            throw new Error(
              "Payment summary was not returned",
            );
          }

          if (!isActive) {
            return;
          }

          const remainingAmount =
            Math.max(
              toNumber(
                summary
                  .remaining_amount ??
                  appointment
                    ?.remaining_amount ??
                  0,
              ),
              0,
            );

          setPaymentSummary(
            summary,
          );

          form.setFieldsValue({
            payment_amount:
              remainingAmount > 0
                ? remainingAmount
                : null,

            payment_method:
              "Cash",
          });
        } catch (error) {
          if (!isActive) {
            return;
          }

          console.error(
            "Failed to load treatment payments:",
            error,
          );

          setSummaryError(
            error?.response?.data
              ?.message ||
              error?.message ||
              "Unable to load payment history",
          );

          form.setFieldsValue({
            payment_amount: null,
            payment_method:
              "Cash",
          });
        } finally {
          if (isActive) {
            setSummaryLoading(false);
          }
        }
      };

    loadPaymentSummary();

    return () => {
      isActive = false;
    };
  }, [
    open,
    appointment?.treatment_id,
    appointment?.remaining_amount,
    form,
  ]);

  /* ------------------------------------------------------
     Quick amount
  ------------------------------------------------------ */

  const setPaymentAmount = (
    amount,
  ) => {
    const numericAmount =
      toNumber(amount);

    const validAmount =
      Math.min(
        numericAmount,
        payableAmount,
      );

    form.setFieldValue(
      "payment_amount",
      validAmount,
    );

    form
      .validateFields([
        "payment_amount",
      ])
      .catch(() => {});
  };

  /* ------------------------------------------------------
     Payment method
  ------------------------------------------------------ */

  const setPaymentMethod = (
    method,
  ) => {
    form.setFieldValue(
      "payment_method",
      method,
    );
  };

  /* ------------------------------------------------------
     Submit
  ------------------------------------------------------ */

  const handleSubmit = async () => {
    try {
      const values =
        await form.validateFields();

      if (
        !appointment?.treatment_id
      ) {
        throw new Error(
          "Treatment record is missing",
        );
      }

      if (!paymentSummary) {
        throw new Error(
          "Payment summary has not been loaded",
        );
      }

      const amount = toNumber(
        values.payment_amount,
      );

      const paymentData = {
        patient_id:
          paymentSummary?.patient_id ||
          appointment?.patient_id ||
          "",

        treatment_id:
          appointment.treatment_id,

        payment_amount: amount,

        payment_method:
          values.payment_method,

        payment_date:
          dayjs().format(
            "YYYY-MM-DD",
          ),

        receipt_number:
          `REC-${Date.now()}`,
      };

      await onSubmit(paymentData);

      form.resetFields();

      setShowInstallmentHistory(
        false,
      );
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error(
        "Payment validation failed:",
        error,
      );
    }
  };

  /* ------------------------------------------------------
     Cancel
  ------------------------------------------------------ */

  const handleCancel = () => {
    if (loading) {
      return;
    }

    form.resetFields();

    setPaymentSummary(null);
    setSummaryError("");

    setShowInstallmentHistory(
      false,
    );

    onCancel();
  };

  /* ------------------------------------------------------
     Installment history columns
  ------------------------------------------------------ */

  const paymentHistoryColumns = [
    {
      title: "Installment",
      key: "installment",
      width: 125,
      fixed: "left",

      render: (
        _,
        record,
        index,
      ) => (
        <div className="receive-payment-installment-cell">
          <div className="receive-payment-installment-number">
            #
            {record
              ?.installment_number ||
              index + 1}
          </div>

          <Text type="secondary">
            {formatDate(
              record?.payment_date ||
                record?.created_at,
            )}
          </Text>
        </div>
      ),
    },
    {
      title: "Receipt",
      dataIndex:
        "receipt_number",
      key: "receipt_number",
      width: 165,

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
      title: "Method",
      dataIndex:
        "payment_method",
      key: "payment_method",
      width: 140,

      render: (value) => (
        <Tag className="receive-payment-method-tag">
          {value || "-"}
        </Tag>
      ),
    },
    {
      title: "This Payment",
      dataIndex:
        "payment_amount",
      key: "payment_amount",
      width: 145,
      align: "right",

      render: (value) => (
        <Text className="receive-payment-value receive-payment-value--primary">
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: "Total Paid",
      dataIndex: "total_paid",
      key: "total_paid",
      width: 145,
      align: "right",

      render: (value) => (
        <Text className="receive-payment-value receive-payment-value--paid">
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: "Remaining",
      dataIndex:
        "remaining_amount",
      key: "remaining_amount",
      width: 145,
      align: "right",

      render: (value) => (
        <Text
          className={
            toNumber(value) > 0
              ? "receive-payment-value receive-payment-value--balance"
              : "receive-payment-value receive-payment-value--paid"
          }
        >
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      align: "center",

      render: (value, record) => {
        const status =
          value ||
          record?.payment_status ||
          (toNumber(
            record?.remaining_amount,
          ) <= 0
            ? "Paid"
            : "Partial");

        return (
          <Tag
            color={getStatusColor(
              status,
            )}
            className="receive-payment-status-tag"
          >
            {status}
          </Tag>
        );
      },
    },
  ];

  return (
    <>
      {/* Receive payment modal */}

      <Modal
        title={null}
        open={open}
        onCancel={handleCancel}
        centered
        width={1080}
        destroyOnHidden
        maskClosable={!loading}
        closable={!loading}
        className="receive-payment-modal"
        styles={{
          body: {
            maxHeight: "80vh",
            overflowY: "auto",
          },
        }}
        footer={[
          <Button
            key="cancel"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>,

          <Button
            key="save"
            type="primary"
            icon={
              <DollarOutlined />
            }
            loading={loading}
            disabled={
              loading ||
              summaryLoading ||
              Boolean(summaryError) ||
              !paymentSummary ||
              !appointment?.treatment_id ||
              treatmentCharge <= 0 ||
              isFullyPaid
            }
            onClick={handleSubmit}
            className="receive-payment-save-button"
          >
            Save Payment
          </Button>,
        ]}
      >
        {summaryLoading ? (
          <div className="receive-payment-loading">
            <Spin size="large" />

            <Text type="secondary">
              Loading treatment payment
              details...
            </Text>
          </div>
        ) : (
          <>
            {/* Header */}

            <div
              className={
                isFullyPaid
                  ? "receive-payment-header receive-payment-header--paid"
                  : "receive-payment-header"
              }
            >
              <div className="receive-payment-header__patient">
                <Avatar
                  size={70}
                  icon={
                    <UserOutlined />
                  }
                  className="receive-payment-header__avatar"
                />

                <div className="receive-payment-header__identity">
                  <Text className="receive-payment-header__eyebrow">
                    Receive Payment
                  </Text>

                  <Space
                    wrap
                    size={8}
                  >
                    <Title level={3}>
                      {
                        displayedPatientName
                      }
                    </Title>

                    <Tag
                      color={getStatusColor(
                        paymentStatus,
                      )}
                      className="receive-payment-header__status"
                    >
                      {paymentStatus}
                    </Tag>
                  </Space>

                  <div className="receive-payment-header__meta">
                    <span>
                      <IdcardOutlined />

                      {patientId}
                    </span>

                    <span>
                      <PhoneOutlined />

                      {phone}
                    </span>

                    <span>
                      <MedicineBoxOutlined />

                      {treatmentId}
                    </span>
                  </div>
                </div>
              </div>

              <div className="receive-payment-header__treatment">
                <div className="receive-payment-header__treatment-icon">
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
                    {installmentCount}{" "}
                    payment
                    {installmentCount === 1
                      ? ""
                      : "s"}{" "}
                    recorded
                  </Text>
                </div>
              </div>
            </div>

            <div className="receive-payment-content">
              {!appointment?.treatment_id && (
                <Alert
                  type="warning"
                  showIcon
                  message="Payment cannot be added"
                  description="The treatment record is missing."
                  className="receive-payment-alert"
                />
              )}

              {summaryError && (
                <Alert
                  type="error"
                  showIcon
                  message="Payment details could not be loaded"
                  description={
                    summaryError
                  }
                  className="receive-payment-alert"
                />
              )}

              {isFullyPaid &&
                appointment?.treatment_id && (
                  <Alert
                    type="success"
                    showIcon
                    icon={
                      <CheckCircleOutlined />
                    }
                    message="Treatment fully paid"
                    description={`The full treatment fee of ${formatCurrency(
                      treatmentCharge,
                    )} has been paid.`}
                    className="receive-payment-alert"
                  />
                )}

              {/* Financial summary */}

              <Row gutter={[14, 14]}>
                <Col
                  xs={24}
                  sm={8}
                >
                  <PaymentFinancialCard
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
                  <PaymentFinancialCard
                    title="Already Paid"
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
                  <PaymentFinancialCard
                    title="Remaining Balance"
                    value={
                      payableAmount
                    }
                    tone={
                      payableAmount > 0
                        ? "orange"
                        : "green"
                    }
                    icon={
                      <WalletOutlined />
                    }
                  />
                </Col>
              </Row>

              <Card
                bordered={false}
                className="receive-payment-progress-card"
              >
                <div className="receive-payment-progress-header">
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
                  showInfo={false}
                  status={
                    isFullyPaid
                      ? "success"
                      : "active"
                  }
                />
              </Card>

              <Row gutter={[18, 18]}>
                {/* Treatment information */}

                <Col
                  xs={24}
                  lg={9}
                >
                  <Card
                    bordered={false}
                    className="receive-payment-information-card"
                  >
                    <div className="receive-payment-section-heading">
                      <div>
                        <Title level={4}>
                          Payment Account
                        </Title>

                        <Text type="secondary">
                          Patient and
                          treatment information.
                        </Text>
                      </div>

                      <div className="receive-payment-section-icon">
                        <UserOutlined />
                      </div>
                    </div>

                    <Descriptions
                      bordered
                      size="small"
                      column={1}
                      className="receive-payment-descriptions"
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

                      <Descriptions.Item label="Phone">
                        <Space size={7}>
                          <PhoneOutlined />

                          <Text>
                            {phone}
                          </Text>
                        </Space>
                      </Descriptions.Item>

                      <Descriptions.Item label="Treatment">
                        {treatmentName}
                      </Descriptions.Item>

                      <Descriptions.Item label="Treatment ID">
                        <Text copyable>
                          {treatmentId}
                        </Text>
                      </Descriptions.Item>

                      <Descriptions.Item label="Installments">
                        {installmentCount}
                      </Descriptions.Item>

                      <Descriptions.Item label="Status">
                        <Tag
                          color={getStatusColor(
                            paymentStatus,
                          )}
                        >
                          {paymentStatus}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>

                    <Button
                      block
                      size="large"
                      icon={
                        <HistoryOutlined />
                      }
                      onClick={() =>
                        setShowInstallmentHistory(
                          true,
                        )
                      }
                      className="receive-payment-history-button"
                    >
                      Installment History

                      <Tag color="blue">
                        {installmentCount}
                      </Tag>
                    </Button>
                  </Card>
                </Col>

                {/* Payment form */}

                <Col
                  xs={24}
                  lg={15}
                >
                  <Card
                    bordered={false}
                    className="receive-payment-form-card"
                  >
                    <div className="receive-payment-section-heading">
                      <div>
                        <Title level={4}>
                          New Payment
                        </Title>

                        <Text type="secondary">
                          Enter the received
                          amount and payment
                          method.
                        </Text>
                      </div>

                      <div className="receive-payment-section-icon receive-payment-section-icon--payment">
                        <DollarOutlined />
                      </div>
                    </div>

                    <Form
                      form={form}
                      layout="vertical"
                      requiredMark={false}
                    >
                      <Form.Item
                        label="Payment Amount"
                        name="payment_amount"
                        rules={[
                          {
                            required: true,
                            message:
                              "Enter the payment amount",
                          },
                          {
                            type: "number",
                            min: 1,
                            message:
                              "Payment must be greater than 0",
                          },
                          {
                            validator: (
                              _,
                              value,
                            ) => {
                              const amount =
                                toNumber(
                                  value,
                                );

                              if (
                                amount >
                                payableAmount
                              ) {
                                return Promise.reject(
                                  new Error(
                                    `Maximum payment is ${formatCurrency(
                                      payableAmount,
                                    )}`,
                                  ),
                                );
                              }

                              return Promise.resolve();
                            },
                          },
                        ]}
                      >
                        <InputNumber
                          min={1}
                          max={
                            payableAmount >
                            0
                              ? payableAmount
                              : undefined
                          }
                          precision={2}
                          prefix="Rs."
                          size="large"
                          disabled={
                            isFullyPaid ||
                            Boolean(
                              summaryError,
                            )
                          }
                          placeholder="Enter installment amount"
                          formatter={(
                            value,
                          ) =>
                            value
                              ? `${value}`.replace(
                                  /\B(?=(\d{3})+(?!\d))/g,
                                  ",",
                                )
                              : ""
                          }
                          parser={(
                            value,
                          ) =>
                            value
                              ? value.replace(
                                  /,/g,
                                  "",
                                )
                              : ""
                          }
                          className="receive-payment-amount-input"
                        />
                      </Form.Item>

                      {!isFullyPaid &&
                        !summaryError && (
                        <div className="receive-payment-quick-section">
                          <Text className="receive-payment-field-label">
                            Quick Amount
                          </Text>

                          <div className="receive-payment-quick-buttons">
                            {halfPaymentAmount >
                              0 && (
                              <Button
                                htmlType="button"
                                type={
                                  paymentAmount ===
                                  halfPaymentAmount
                                    ? "primary"
                                    : "default"
                                }
                                onClick={() =>
                                  setPaymentAmount(
                                    halfPaymentAmount,
                                  )
                                }
                              >
                                Half
                              </Button>
                            )}

                            {COMMON_AMOUNTS.filter(
                              (amount) =>
                                amount <
                                payableAmount,
                            ).map(
                              (amount) => (
                                <Button
                                  key={
                                    amount
                                  }
                                  htmlType="button"
                                  type={
                                    paymentAmount ===
                                    amount
                                      ? "primary"
                                      : "default"
                                  }
                                  onClick={() =>
                                    setPaymentAmount(
                                      amount,
                                    )
                                  }
                                >
                                  Rs.{" "}
                                  {amount.toLocaleString(
                                    "en-LK",
                                  )}
                                </Button>
                              ),
                            )}

                            {payableAmount >
                              0 && (
                              <Button
                                htmlType="button"
                                type={
                                  paymentAmount ===
                                  payableAmount
                                    ? "primary"
                                    : "default"
                                }
                                onClick={() =>
                                  setPaymentAmount(
                                    payableAmount,
                                  )
                                }
                              >
                                Full Amount
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {paymentAmount > 0 &&
                        !summaryError && (
                        <Alert
                          type={
                            balanceAfterPayment >
                            0
                              ? "warning"
                              : "success"
                          }
                          showIcon
                          icon={
                            balanceAfterPayment >
                            0 ? (
                              <WarningOutlined />
                            ) : (
                              <CheckCircleOutlined />
                            )
                          }
                          message={
                            balanceAfterPayment >
                            0
                              ? "Partial payment"
                              : "Full payment"
                          }
                          description={
                            balanceAfterPayment >
                            0
                              ? `Balance after this payment: ${formatCurrency(
                                  balanceAfterPayment,
                                )}`
                              : "This payment will complete the treatment balance."
                          }
                          className="receive-payment-preview-alert"
                        />
                      )}

                      <Form.Item
                        name="payment_method"
                        hidden
                      >
                        <Input />
                      </Form.Item>

                      <div className="receive-payment-method-section">
                        <Text className="receive-payment-field-label">
                          Payment Method
                        </Text>

                        <Row
                          gutter={[10, 10]}
                        >
                          {PAYMENT_METHODS.map(
                            (method) => (
                              <Col
                                xs={24}
                                sm={12}
                                key={
                                  method.value
                                }
                              >
                                <Button
                                  block
                                  htmlType="button"
                                  icon={
                                    method.icon
                                  }
                                  type={
                                    selectedPaymentMethod ===
                                    method.value
                                      ? "primary"
                                      : "default"
                                  }
                                  disabled={
                                    isFullyPaid ||
                                    Boolean(
                                      summaryError,
                                    )
                                  }
                                  onClick={() =>
                                    setPaymentMethod(
                                      method.value,
                                    )
                                  }
                                  className="receive-payment-method-button"
                                >
                                  {
                                    method.label
                                  }
                                </Button>
                              </Col>
                            ),
                          )}
                        </Row>
                      </div>
                    </Form>
                  </Card>
                </Col>
              </Row>
            </div>
          </>
        )}
      </Modal>

      {/* Installment history modal */}

      <Modal
        title={null}
        open={
          showInstallmentHistory
        }
        onCancel={() =>
          setShowInstallmentHistory(
            false,
          )
        }
        centered
        width={1000}
        destroyOnHidden
        className="payment-history-modal"
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() =>
              setShowInstallmentHistory(
                false,
              )
            }
          >
            Close
          </Button>,
        ]}
      >
        <div className="payment-history-header">
          <div className="payment-history-header__icon">
            <HistoryOutlined />
          </div>

          <div>
            <Title level={3}>
              Installment History
            </Title>

            <Text>
              Previous payments recorded
              for this treatment.
            </Text>
          </div>
        </div>

        <div className="payment-history-content">
          <Row
            gutter={[12, 12]}
            className="payment-history-summary"
          >
            <Col
              xs={24}
              md={8}
            >
              <div className="payment-history-summary__item">
                <Text type="secondary">
                  Patient
                </Text>

                <Text strong>
                  {
                    displayedPatientName
                  }
                </Text>
              </div>
            </Col>

            <Col
              xs={24}
              md={8}
            >
              <div className="payment-history-summary__item">
                <Text type="secondary">
                  Treatment ID
                </Text>

                <Text strong copyable>
                  {treatmentId}
                </Text>
              </div>
            </Col>

            <Col
              xs={24}
              md={8}
            >
              <div className="payment-history-summary__item">
                <Text type="secondary">
                  Total Installments
                </Text>

                <Text strong>
                  {installmentCount}
                </Text>
              </div>
            </Col>
          </Row>

          {paymentHistory.length >
          0 ? (
            <Table
              rowKey={(
                record,
                index,
              ) =>
                record?.id ||
                record?.payment_id ||
                record
                  ?.receipt_number ||
                `payment-${index}`
              }
              columns={
                paymentHistoryColumns
              }
              dataSource={
                paymentHistory
              }
              pagination={false}
              scroll={{
                x: 1050,
                y: 360,
              }}
              className="payment-history-table"
            />
          ) : (
            <Alert
              type="info"
              showIcon
              message="No previous payments"
              description="This treatment does not have any installment payments yet."
              className="receive-payment-alert"
            />
          )}
        </div>
      </Modal>
    </>
  );
};

export default PaymentModal;