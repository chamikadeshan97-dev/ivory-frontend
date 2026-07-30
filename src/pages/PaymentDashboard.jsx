import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Progress,
  Row,
  Segmented,
  Space,
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
  EyeOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import {
  getAppointmentsTreatmentsByDateRange,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";
import TreatmentPaymentDetailsModal from "../components/TreatmentPaymentDetailsModal";

import "./css/PaymentDashboard.css";

const { RangePicker } = DatePicker;

const { Text, Title } = Typography;

/* --------------------------------------------------------
   Helpers
-------------------------------------------------------- */

const getDefaultDateRange = () => {
  return [
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ];
};

const convertToNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const cleanedValue = String(value).replace(
    /[^0-9.-]/g,
    "",
  );

  const parsedValue = Number(cleanedValue);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : 0;
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(convertToNumber(value));
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

const getPaymentStatus = (
  treatmentCharge,
  totalPaid,
  remainingAmount,
) => {
  const charge = convertToNumber(
    treatmentCharge,
  );

  const paid = convertToNumber(totalPaid);

  const remaining = convertToNumber(
    remainingAmount,
  );

  if (charge > 0 && remaining <= 0) {
    return "Paid";
  }

  if (paid > 0) {
    return "Partial";
  }

  return "Unpaid";
};

const getStatusColor = (status) => {
  switch (status) {
    case "Paid":
      return "green";

    case "Partial":
      return "orange";

    case "Unpaid":
      return "red";

    default:
      return "default";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "Paid":
      return <CheckCircleOutlined />;

    case "Partial":
      return <ClockCircleOutlined />;

    case "Unpaid":
      return <WarningOutlined />;

    default:
      return null;
  }
};

/* --------------------------------------------------------
   Payment Dashboard
-------------------------------------------------------- */

const PaymentDashboard = () => {
  const [dateRange, setDateRange] = useState(
    getDefaultDateRange,
  );

  const [appointments, setAppointments] =
    useState([]);

  const [summary, setSummary] = useState({
    appointment_count: 0,
    treatment_count: 0,
    payment_count: 0,
    total_treatment_charge: 0,
    total_paid: 0,
    total_remaining: 0,
  });

  const [loading, setLoading] =
    useState(false);

  const [searchText, setSearchText] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [
    selectedTreatment,
    setSelectedTreatment,
  ] = useState(null);

  /* ------------------------------------------------------
     Modal helpers
  ------------------------------------------------------ */

  const openPaymentDetails = (record) => {
    setSelectedTreatment(record);
  };

  const closePaymentDetails = () => {
    setSelectedTreatment(null);
  };

  /* ------------------------------------------------------
     Load dashboard data
  ------------------------------------------------------ */

  const loadPaymentDashboard =
    useCallback(async () => {
      if (
        !dateRange?.[0] ||
        !dateRange?.[1]
      ) {
        message.warning(
          "Please select a valid date range.",
        );

        return;
      }

      try {
        setLoading(true);

        const startDate =
          dateRange[0].format(
            "YYYY-MM-DD",
          );

        const endDate =
          dateRange[1].format(
            "YYYY-MM-DD",
          );

        console.log(
          "Loading payment dashboard:",
          {
            startDate,
            endDate,
          },
        );

        const response =
          await getAppointmentsTreatmentsByDateRange(
            startDate,
            endDate,
          );

        console.log(
          "Payment dashboard response:",
          response,
        );

        const result =
          response?.data || {};

        const appointmentData =
          Array.isArray(result.data)
            ? result.data
            : [];

        setAppointments(appointmentData);

        setSummary({
          appointment_count:
            convertToNumber(
              result.summary
                ?.appointment_count,
            ),

          treatment_count:
            convertToNumber(
              result.summary
                ?.treatment_count,
            ),

          payment_count:
            convertToNumber(
              result.summary
                ?.payment_count,
            ),

          total_treatment_charge:
            convertToNumber(
              result.summary
                ?.total_treatment_charge,
            ),

          total_paid:
            convertToNumber(
              result.summary?.total_paid,
            ),

          total_remaining:
            convertToNumber(
              result.summary
                ?.total_remaining,
            ),
        });

        console.log(
          "Payment dashboard loaded:",
          {
            appointments:
              appointmentData.length,
            summary: result.summary,
          },
        );
      } catch (error) {
        console.error(
          "Load payment dashboard error:",
          error,
        );

        message.error(
          error.response?.data?.message ||
            error.message ||
            "Failed to load payment dashboard.",
        );

        setAppointments([]);

        setSummary({
          appointment_count: 0,
          treatment_count: 0,
          payment_count: 0,
          total_treatment_charge: 0,
          total_paid: 0,
          total_remaining: 0,
        });
      } finally {
        setLoading(false);
      }
    }, [dateRange]);

  useEffect(() => {
    loadPaymentDashboard();
  }, [loadPaymentDashboard]);

  /* ------------------------------------------------------
     Flatten appointments and treatments
  ------------------------------------------------------ */

  const treatmentRows = useMemo(() => {
    return appointments.flatMap(
      (appointment, appointmentIndex) => {
        const treatments =
          Array.isArray(
            appointment.treatments,
          )
            ? appointment.treatments
            : [];

        return treatments.map(
          (treatment, treatmentIndex) => {
            const payments =
              Array.isArray(
                treatment.payments,
              )
                ? treatment.payments
                : [];

            const treatmentCharge =
              convertToNumber(
                treatment.payment_summary
                  ?.treatment_charge ??
                  treatment.treatment_fee,
              );

            const totalPaid =
              convertToNumber(
                treatment.payment_summary
                  ?.total_paid,
              );

            const remainingAmount =
              convertToNumber(
                treatment.payment_summary
                  ?.remaining_amount,
              );

            const status =
              treatment.payment_summary
                ?.status ||
              getPaymentStatus(
                treatmentCharge,
                totalPaid,
                remainingAmount,
              );

            const paymentMethods = [
              ...new Set(
                payments
                  .map(
                    (payment) =>
                      payment.payment_method,
                  )
                  .filter(Boolean),
              ),
            ];

            const receiptNumbers =
              payments
                .map(
                  (payment) =>
                    payment.receipt_number,
                )
                .filter(Boolean);

            const lastPayment = [
              ...payments,
            ]
              .filter(
                (payment) =>
                  payment.payment_date,
              )
              .sort(
                (
                  firstPayment,
                  secondPayment,
                ) =>
                  dayjs(
                    secondPayment.payment_date,
                  ).valueOf() -
                  dayjs(
                    firstPayment.payment_date,
                  ).valueOf(),
              )[0];

            return {
              key:
                treatment.id ||
                `${appointment.id || appointmentIndex}-${treatmentIndex}`,

              appointment_id:
                appointment.id,

              patient_id:
                treatment.patient_id ||
                appointment.patient_id,

              patient_name:
                treatment.patient_name ||
                appointment.patient_name ||
                appointment.patient?.name ||
                null,

              patient_phone:
                treatment.patient_phone ||
                appointment.patient_phone ||
                appointment.patient?.phone ||
                null,

              dentist_id:
                treatment.dentist_id ||
                appointment.dentist_id,

              appointment_date:
                appointment.appointment_date,

              appointment_time:
                appointment.appointment_time,

              appointment_status:
                appointment.status,

              reason_for_visit:
                appointment.reason_for_visit,

              treatment_id:
                treatment.id,

              treatment_date:
                treatment.treatment_date,

              diagnosis:
                treatment.diagnosis,

              tooth_number:
                treatment.tooth_number,

              treatment_details:
                treatment.treatment_details,

              prescription:
                treatment.prescription,

              doctor_notes:
                treatment.doctor_notes,

              treatment_charge:
                treatmentCharge,

              total_paid: totalPaid,

              remaining_amount:
                remainingAmount,

              payment_status: status,

              installment_count:
                payments.length,

              payment_methods:
                paymentMethods,

              receipt_numbers:
                receiptNumbers,

              last_payment_date:
                lastPayment?.payment_date ||
                null,

              payments,

              rawAppointment: appointment,

              rawTreatment: treatment,
            };
          },
        );
      },
    );
  }, [appointments]);

  /* ------------------------------------------------------
     Filter treatment rows
  ------------------------------------------------------ */

  const filteredRows = useMemo(() => {
    const normalizedSearch =
      searchText
        .trim()
        .toLowerCase();

    return treatmentRows.filter(
      (record) => {
        const matchesStatus =
          statusFilter === "All" ||
          record.payment_status ===
            statusFilter;

        if (!matchesStatus) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const searchableContent = [
          record.appointment_id,
          record.treatment_id,
          record.patient_id,
          record.patient_name,
          record.patient_phone,
          record.dentist_id,
          record.diagnosis,
          record.treatment_details,
          record.tooth_number,
          record.reason_for_visit,
          record.payment_status,
          record.payment_methods.join(" "),
          record.receipt_numbers.join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableContent.includes(
          normalizedSearch,
        );
      },
    );
  }, [
    searchText,
    statusFilter,
    treatmentRows,
  ]);

  /* ------------------------------------------------------
     Payment status counts
  ------------------------------------------------------ */

  const paymentCounts = useMemo(() => {
    return treatmentRows.reduce(
      (counts, record) => {
        const status =
          record.payment_status;

        if (status === "Paid") {
          counts.paid += 1;
        }

        if (status === "Partial") {
          counts.partial += 1;
        }

        if (status === "Unpaid") {
          counts.unpaid += 1;
        }

        return counts;
      },
      {
        paid: 0,
        partial: 0,
        unpaid: 0,
      },
    );
  }, [treatmentRows]);

  /* ------------------------------------------------------
     Collection percentage
  ------------------------------------------------------ */

  const collectionPercentage =
    useMemo(() => {
      const totalCharge =
        convertToNumber(
          summary.total_treatment_charge,
        );

      const totalPaid =
        convertToNumber(
          summary.total_paid,
        );

      if (totalCharge <= 0) {
        return 0;
      }

      return Math.min(
        Math.round(
          (totalPaid / totalCharge) *
            100,
        ),
        100,
      );
    }, [summary]);

  /* ------------------------------------------------------
     Date shortcuts
  ------------------------------------------------------ */

  const selectToday = () => {
    setDateRange([
      dayjs().startOf("day"),
      dayjs().endOf("day"),
    ]);
  };

  const selectThisWeek = () => {
    setDateRange([
      dayjs().startOf("week"),
      dayjs().endOf("week"),
    ]);
  };

  const selectThisMonth = () => {
    setDateRange([
      dayjs().startOf("month"),
      dayjs().endOf("month"),
    ]);
  };

  /* ------------------------------------------------------
     Main table columns
  ------------------------------------------------------ */

  const columns = [
    {
      title: "Appointment",
      key: "appointment",
      width: 180,
      fixed: "left",

      render: (_, record) => (
        <Space
          direction="vertical"
          size={1}
        >
          <Text strong>
            {record.appointment_id ||
              "-"}
          </Text>

          <Text type="secondary">
            <CalendarOutlined />{" "}
            {formatDate(
              record.appointment_date,
            )}
          </Text>

          <Text type="secondary">
            <ClockCircleOutlined />{" "}
            {record.appointment_time ||
              "-"}
          </Text>
        </Space>
      ),
    },

    {
      title: "Patient",
      key: "patient",
      width: 190,

      render: (_, record) => (
        <Space
          direction="vertical"
          size={1}
        >
          <Space>
            <TeamOutlined />

            <Text strong>
              {record.patient_name ||
                record.patient_id ||
                "-"}
            </Text>
          </Space>

          {record.patient_name &&
            record.patient_id && (
              <Text type="secondary">
                {record.patient_id}
              </Text>
            )}

          {record.patient_phone && (
            <Text type="secondary">
              {record.patient_phone}
            </Text>
          )}
        </Space>
      ),
    },

    {
      title: "Treatment",
      key: "treatment",
      width: 260,

      render: (_, record) => (
        <Space
          direction="vertical"
          size={2}
        >
          <Text strong>
            {record.treatment_details ||
              "Treatment"}
          </Text>

          <Text type="secondary">
            {record.diagnosis ||
              "No diagnosis recorded"}
          </Text>

          <Space
            wrap
            size={[4, 4]}
          >
            <Tag>
              {record.treatment_id ||
                "-"}
            </Tag>

            {record.tooth_number && (
              <Tag color="blue">
                Tooth{" "}
                {record.tooth_number}
              </Tag>
            )}
          </Space>
        </Space>
      ),
    },

    {
      title: "Charge",
      dataIndex: "treatment_charge",
      key: "treatment_charge",
      width: 145,
      align: "right",

      sorter: (first, second) =>
        first.treatment_charge -
        second.treatment_charge,

      render: (value) => (
        <Text strong>
          {formatCurrency(value)}
        </Text>
      ),
    },

    {
      title: "Paid",
      dataIndex: "total_paid",
      key: "total_paid",
      width: 145,
      align: "right",

      sorter: (first, second) =>
        first.total_paid -
        second.total_paid,

      render: (value) => (
        <Text className="payment-paid-text">
          {formatCurrency(value)}
        </Text>
      ),
    },

    {
      title: "Balance",
      dataIndex: "remaining_amount",
      key: "remaining_amount",
      width: 145,
      align: "right",

      sorter: (first, second) =>
        first.remaining_amount -
        second.remaining_amount,

      render: (value) => (
        <Text
          className={
            convertToNumber(value) > 0
              ? "payment-balance-text"
              : "payment-zero-balance-text"
          }
        >
          {formatCurrency(value)}
        </Text>
      ),
    },

    {
      title: "Status",
      dataIndex: "payment_status",
      key: "payment_status",
      width: 120,
      align: "center",

      filters: [
        {
          text: "Paid",
          value: "Paid",
        },
        {
          text: "Partial",
          value: "Partial",
        },
        {
          text: "Unpaid",
          value: "Unpaid",
        },
      ],

      onFilter: (value, record) =>
        record.payment_status === value,

      render: (status) => (
        <Tag
          color={getStatusColor(
            status,
          )}
          icon={getStatusIcon(status)}
          className="payment-status-tag"
        >
          {status}
        </Tag>
      ),
    },

    {
      title: "Payments",
      key: "payments",
      width: 155,

      render: (_, record) => (
        <Space
          direction="vertical"
          size={2}
        >
          <Text strong>
            {record.installment_count}{" "}
            {record.installment_count ===
            1
              ? "payment"
              : "payments"}
          </Text>

          <Text type="secondary">
            {record.payment_methods
              .length > 0
              ? record.payment_methods.join(
                  ", ",
                )
              : "No payment"}
          </Text>
        </Space>
      ),
    },

    {
      title: "Last Payment",
      dataIndex: "last_payment_date",
      key: "last_payment_date",
      width: 145,

      sorter: (first, second) =>
        dayjs(
          first.last_payment_date,
        ).valueOf() -
        dayjs(
          second.last_payment_date,
        ).valueOf(),

      render: (value) =>
        value
          ? formatDate(value)
          : "-",
    },

    {
      title: "Action",
      key: "action",
      width: 90,
      fixed: "right",
      align: "center",

      render: (_, record) => (
        <Tooltip title="View payment details">
          <Button
            type="primary"
            shape="circle"
            icon={<EyeOutlined />}
            disabled={
              !record.treatment_id
            }
            onClick={() =>
              openPaymentDetails(record)
            }
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <ClinicPage
      title="Payment Dashboard"
      subtitle="Monitor treatment charges, payments, balances, and installment history"
      icon={<WalletOutlined />}
      actions={
        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={
              loadPaymentDashboard
            }
          >
            Refresh
          </Button>
        </Space>
      }
    >
      {/* Date controls */}

      <Card className="payment-filter-card">
        <Row
          gutter={[16, 16]}
          align="middle"
          justify="space-between"
        >
          <Col
            xs={24}
            lg={12}
          >
            <Space wrap>
              <RangePicker
                value={dateRange}
                format="DD MMM YYYY"
                allowClear={false}
                onChange={(dates) => {
                  if (
                    dates?.[0] &&
                    dates?.[1]
                  ) {
                    setDateRange(dates);
                  }
                }}
              />

              <Button
                type="primary"
                icon={<SearchOutlined />}
                loading={loading}
                onClick={
                  loadPaymentDashboard
                }
              >
                Load Report
              </Button>
            </Space>
          </Col>

          <Col
            xs={24}
            lg={12}
          >
            <div className="payment-date-shortcuts">
              <Button
                onClick={selectToday}
              >
                Today
              </Button>

              <Button
                onClick={
                  selectThisWeek
                }
              >
                This Week
              </Button>

              <Button
                onClick={
                  selectThisMonth
                }
              >
                This Month
              </Button>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Financial summary */}

      <Row
        gutter={[16, 16]}
        className="payment-summary-row"
      >
        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <Card className="payment-summary-card charge-card">
            <Statistic
              title="Treatment Charges"
              value={
                summary.total_treatment_charge
              }
              formatter={(value) =>
                formatCurrency(value)
              }
              prefix={
                <MedicineBoxOutlined />
              }
            />

            <Text type="secondary">
              {summary.treatment_count}{" "}
              treatments
            </Text>
          </Card>
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <Card className="payment-summary-card paid-card">
            <Statistic
              title="Total Collected"
              value={
                summary.total_paid
              }
              formatter={(value) =>
                formatCurrency(value)
              }
              prefix={
                <CheckCircleOutlined />
              }
            />

            <Text type="secondary">
              {summary.payment_count}{" "}
              payment records
            </Text>
          </Card>
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <Card className="payment-summary-card balance-card">
            <Statistic
              title="Outstanding Balance"
              value={
                summary.total_remaining
              }
              formatter={(value) =>
                formatCurrency(value)
              }
              prefix={
                <WarningOutlined />
              }
            />

            <Text type="secondary">
              Amount still to be
              collected
            </Text>
          </Card>
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <Card className="payment-summary-card appointment-card">
            <Statistic
              title="Appointments"
              value={
                summary.appointment_count
              }
              prefix={
                <CalendarOutlined />
              }
            />

            <Text type="secondary">
              Within selected date
              range
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Collection progress */}

      <Card className="payment-progress-card">
        <Row
          gutter={[20, 20]}
          align="middle"
        >
          <Col
            xs={24}
            md={8}
          >
            <div className="payment-progress-heading">
              <div className="payment-progress-icon">
                <DollarOutlined />
              </div>

              <div>
                <Title level={4}>
                  Collection Progress
                </Title>

                <Text type="secondary">
                  Percentage of
                  treatment charges
                  collected
                </Text>
              </div>
            </div>
          </Col>

          <Col
            xs={24}
            md={16}
          >
            <Progress
              percent={
                collectionPercentage
              }
              status={
                collectionPercentage >=
                100
                  ? "success"
                  : "active"
              }
              strokeWidth={14}
            />
          </Col>
        </Row>
      </Card>

      {/* Payment records */}

      <Card
        className="payment-table-card"
        title={
          <Space>
            <div className="payment-card-title-icon">
              <FileTextOutlined />
            </div>

            <div>
              <Text
                strong
                className="payment-card-title"
              >
                Treatment Payment
                Records
              </Text>

              <div>
                <Text type="secondary">
                  View charges,
                  installments, and
                  outstanding balances
                </Text>
              </div>
            </div>
          </Space>
        }
        extra={
          <Tag className="payment-record-count">
            {filteredRows.length}{" "}
            records
          </Tag>
        }
      >
        <Row
          gutter={[16, 16]}
          className="payment-table-controls"
        >
          <Col
            xs={24}
            lg={12}
          >
            <Input
              allowClear
              prefix={
                <SearchOutlined />
              }
              placeholder="Search appointment, patient, treatment, diagnosis or receipt"
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value,
                )
              }
            />
          </Col>

          <Col
            xs={24}
            lg={12}
          >
            <div className="payment-status-filter">
              <Segmented
                block
                value={statusFilter}
                onChange={
                  setStatusFilter
                }
                options={[
                  {
                    label: `All (${treatmentRows.length})`,
                    value: "All",
                  },
                  {
                    label: `Paid (${paymentCounts.paid})`,
                    value: "Paid",
                  },
                  {
                    label: `Partial (${paymentCounts.partial})`,
                    value: "Partial",
                  },
                  {
                    label: `Unpaid (${paymentCounts.unpaid})`,
                    value: "Unpaid",
                  },
                ]}
              />
            </div>
          </Col>
        </Row>

        <Table
          rowKey="key"
          columns={columns}
          dataSource={filteredRows}
          loading={loading}
          scroll={{
            x: 1700,
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: [
              "10",
              "20",
              "50",
            ],
            showTotal: (total) =>
              `${total} treatment records`,
          }}
          locale={{
            emptyText: (
              <Empty description="No payment records found for the selected date range" />
            ),
          }}
          rowClassName={(record) => {
            if (
              record.payment_status ===
              "Unpaid"
            ) {
              return "payment-unpaid-row";
            }

            if (
              record.payment_status ===
              "Partial"
            ) {
              return "payment-partial-row";
            }

            return "";
          }}
        />
      </Card>

      {/* Common treatment payment details modal */}

      <TreatmentPaymentDetailsModal
        open={Boolean(
          selectedTreatment,
        )}
        treatmentId={
          selectedTreatment?.treatment_id ||
          null
        }
        patientName={
          selectedTreatment?.patient_name ||
          selectedTreatment?.patient_id ||
          "Unknown Patient"
        }
        onClose={
          closePaymentDetails
        }
      />
    </ClinicPage>
  );
};

export default PaymentDashboard;