// src/pages/DailyIncome.jsx

import React, {
  useCallback,
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
  Progress,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  MedicineBoxOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import {
  getIncomeByDateRange,
  getPatients,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";
import TreatmentPaymentDetailsModal from "../components/TreatmentPaymentDetailsModal";

import "./css/DailyIncome.css";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/* ========================================================
   GENERAL HELPERS
======================================================== */

const getDefaultDateRange = () => {
  return [
    dayjs().subtract(6, "day").startOf("day"),
    dayjs().endOf("day"),
  ];
};

const hasValue = (value) => {
  return (
    value !== undefined &&
    value !== null &&
    value !== ""
  );
};

const toNumber = (value) => {
  const number = Number(value || 0);

  return Number.isNaN(number)
    ? 0
    : number;
};

const normalizeValue = (value) => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

const getPaymentAmount = (payment) => {
  return toNumber(
    payment?.payment_amount ??
      payment?.amount ??
      0,
  );
};

const getTreatmentCharge = (payment) => {
  return toNumber(
    payment?.treatment_charge ??
      payment?.treatment_fee ??
      payment?.charge ??
      0,
  );
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

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = dayjs(value);

  return date.isValid()
    ? date.format("DD MMM YYYY")
    : value;
};

const getPaymentDateValue = (record) => {
  const date = dayjs(
    record?.created_at ||
      record?.payment_date,
  );

  return date.isValid()
    ? date.valueOf()
    : 0;
};

const getPaymentStatus = (balance) => {
  return toNumber(balance) <= 0
    ? "Full"
    : "Partial";
};

const getStatusColor = (status) => {
  return status === "Full"
    ? "success"
    : "warning";
};

/* ========================================================
   STATUS TAG
======================================================== */

const StatusTag = ({ status }) => {
  return (
    <Tag
      color={getStatusColor(status)}
      icon={
        status === "Full" ? (
          <CheckCircleOutlined />
        ) : (
          <WarningOutlined />
        )
      }
      className="income-status-tag"
    >
      {status}
    </Tag>
  );
};

/* ========================================================
   PATIENT DISPLAY
======================================================== */

const PatientDisplay = ({
  name,
  patientId,
}) => {
  return (
    <Space size={10} align="center">
      <Avatar
        size={39}
        icon={<UserOutlined />}
        className="income-patient-avatar"
      />

      <div className="income-patient-cell">
        <Text
          strong
          ellipsis={{
            tooltip:
              name || "Unknown Patient",
          }}
        >
          {name || "Unknown Patient"}
        </Text>

        <Text type="secondary">
          {patientId || "-"}
        </Text>
      </div>
    </Space>
  );
};

/* ========================================================
   DASHBOARD SUMMARY CARD
======================================================== */

const DashboardSummaryCard = ({
  title,
  value,
  helper,
  icon,
  tone,
}) => {
  return (
    <Card
      bordered={false}
      className={`income-dashboard-stat income-dashboard-stat--${tone}`}
    >
      <Text className="income-dashboard-stat__label">
        {title}
      </Text>

      <div className="income-dashboard-stat__value">
        <span className="income-dashboard-stat__value-icon">
          {icon}
        </span>

        <span>{value}</span>
      </div>

      <Text
        type="secondary"
        className="income-dashboard-stat__helper"
      >
        {helper}
      </Text>
    </Card>
  );
};

/* ========================================================
   COMPONENT
======================================================== */

const DailyIncome = () => {
  const [loading, setLoading] =
    useState(false);

  const [patients, setPatients] =
    useState([]);

  const [report, setReport] =
    useState(null);

  const [
    selectedDateRange,
    setSelectedDateRange,
  ] = useState(
    getDefaultDateRange(),
  );

  const [viewMode, setViewMode] =
    useState("treatments");

  const [search, setSearch] =
    useState("");

  const [
    paymentModalOpen,
    setPaymentModalOpen,
  ] = useState(false);

  const [
    selectedPayment,
    setSelectedPayment,
  ] = useState(null);

  /* ======================================================
     LOAD PATIENTS
  ====================================================== */

  const loadPatients =
    useCallback(async () => {
      try {
        const response =
          await getPatients();

        const data =
          response?.data?.data ??
          response?.data ??
          [];

        setPatients(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (error) {
        console.error(
          "Failed to load patients:",
          error,
        );

        setPatients([]);
      }
    }, []);

  /* ======================================================
     LOAD INCOME
  ====================================================== */

  const loadIncome = useCallback(
    async (
      dateRange =
        selectedDateRange,
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
        const response =
          await getIncomeByDateRange(
            startDate,
            endDate,
          );

        setReport(
          response?.data?.data ??
            response?.data ??
            null,
        );
      } catch (error) {
        console.error(
          "Failed to load income:",
          error,
        );

        setReport(null);

        message.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Failed to load payment history",
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedDateRange],
  );

  useEffect(() => {
    const initialRange =
      getDefaultDateRange();

    loadIncome(initialRange);
    loadPatients();
  }, [
    loadIncome,
    loadPatients,
  ]);

  /* ======================================================
     DATE RANGE
  ====================================================== */

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
  };

  const setQuickDateRange = (
    type,
  ) => {
    let range = null;

    if (type === "today") {
      range = [
        dayjs().startOf("day"),
        dayjs().endOf("day"),
      ];
    }

    if (type === "week") {
      range = [
        dayjs()
          .subtract(6, "day")
          .startOf("day"),
        dayjs().endOf("day"),
      ];
    }

    if (type === "month") {
      range = [
        dayjs().startOf("month"),
        dayjs().endOf("day"),
      ];
    }

    if (!range) {
      return;
    }

    setSelectedDateRange(range);
    loadIncome(range);
  };

  /* ======================================================
     PAYMENT ROWS
  ====================================================== */

  const paymentRows = useMemo(() => {
    if (Array.isArray(report)) {
      return report;
    }

    if (
      Array.isArray(
        report?.payments,
      )
    ) {
      return report.payments;
    }

    if (
      Array.isArray(report?.data)
    ) {
      return report.data;
    }

    if (
      Array.isArray(
        report?.data?.payments,
      )
    ) {
      return report.data.payments;
    }

    return [];
  }, [report]);

  /* ======================================================
     PATIENT LOOKUP
  ====================================================== */

  const patientNameMap =
    useMemo(() => {
      const map = new Map();

      patients.forEach(
        (patient) => {
          const patientId =
            patient?.patient_id ||
            patient?.id;

          if (!patientId) {
            return;
          }

          map.set(
            String(
              patientId,
            ).trim(),
            patient?.name ||
              patient?.patient_name ||
              "Unknown Patient",
          );
        },
      );

      return map;
    }, [patients]);

  const getPatientName =
    useCallback(
      (record) => {
        const patientId =
          String(
            record?.patient_id ||
              "",
          ).trim();

        return (
          record
            ?.calculated_patient_name ||
          record?.patient_name ||
          record?.patient?.name ||
          record?.name ||
          patientNameMap.get(
            patientId,
          ) ||
          "Unknown Patient"
        );
      },
      [patientNameMap],
    );

  /* ======================================================
     TREATMENT GROUPS
  ====================================================== */

  const treatmentGroups =
    useMemo(() => {
      const groupMap =
        new Map();

      paymentRows.forEach(
        (payment, index) => {
          const treatmentId =
            String(
              payment?.treatment_id ||
                `unknown-${index}`,
            ).trim();

          const patientId =
            String(
              payment?.patient_id ||
                "",
            ).trim();

          const patientName =
            getPatientName(payment);

          if (
            !groupMap.has(
              treatmentId,
            )
          ) {
            groupMap.set(
              treatmentId,
              {
                treatmentId,
                patientId,
                patientName,

                treatmentName:
                  payment
                    ?.treatment_name ||
                  payment?.treatment ||
                  "Dental Treatment",

                treatmentCharge: 0,
                periodReceived: 0,
                calculatedPaymentTotal:
                  0,
                savedTotalPaid: 0,
                payments: [],
              },
            );
          }

          const group =
            groupMap.get(
              treatmentId,
            );

          group.treatmentCharge =
            Math.max(
              group.treatmentCharge,
              getTreatmentCharge(
                payment,
              ),
            );

          const currentPayment =
            getPaymentAmount(
              payment,
            );

          group.periodReceived +=
            currentPayment;

          group.calculatedPaymentTotal +=
            currentPayment;

          if (
            hasValue(
              payment?.total_paid,
            )
          ) {
            group.savedTotalPaid =
              Math.max(
                group.savedTotalPaid,
                toNumber(
                  payment.total_paid,
                ),
              );
          }

          group.payments.push(
            payment,
          );
        },
      );

      return Array.from(
        groupMap.values(),
      )
        .map((group) => {
          const sortedPayments = [
            ...group.payments,
          ].sort(
            (first, second) =>
              getPaymentDateValue(
                first,
              ) -
              getPaymentDateValue(
                second,
              ),
          );

          const latestPayment =
            sortedPayments[
              sortedPayments.length -
                1
            ] || null;

          const totalPaid =
            Math.max(
              group.savedTotalPaid,
              group
                .calculatedPaymentTotal,
            );

          const savedRemaining =
            latestPayment &&
            hasValue(
              latestPayment
                ?.remaining_amount,
            )
              ? toNumber(
                  latestPayment
                    .remaining_amount,
                )
              : null;

          const balance =
            savedRemaining !== null
              ? Math.max(
                  savedRemaining,
                  0,
                )
              : Math.max(
                  group
                    .treatmentCharge -
                    totalPaid,
                  0,
                );

          return {
            ...group,

            payments:
              sortedPayments,

            latestPayment,

            latestPaymentDate:
              latestPayment
                ?.payment_date ||
              latestPayment
                ?.created_at,

            totalPaid,
            balance,

            installmentCount:
              sortedPayments.length,

            status:
              getPaymentStatus(
                balance,
              ),
          };
        })
        .sort(
          (first, second) =>
            getPaymentDateValue(
              second.latestPayment,
            ) -
            getPaymentDateValue(
              first.latestPayment,
            ),
        );
    }, [
      paymentRows,
      getPatientName,
    ]);

  /* ======================================================
     INSTALLMENT ROWS
  ====================================================== */

  const installmentRows =
    useMemo(() => {
      return treatmentGroups
        .flatMap((group) => {
          let runningTotal = 0;

          return group.payments.map(
            (payment, index) => {
              const currentPayment =
                getPaymentAmount(
                  payment,
                );

              const previouslyPaid =
                hasValue(
                  payment
                    ?.previously_paid,
                )
                  ? toNumber(
                      payment
                        .previously_paid,
                    )
                  : runningTotal;

              const totalPaid =
                hasValue(
                  payment?.total_paid,
                )
                  ? toNumber(
                      payment
                        .total_paid,
                    )
                  : previouslyPaid +
                    currentPayment;

              const remainingAmount =
                hasValue(
                  payment
                    ?.remaining_amount,
                )
                  ? Math.max(
                      toNumber(
                        payment
                          .remaining_amount,
                      ),
                      0,
                    )
                  : Math.max(
                      group
                        .treatmentCharge -
                        totalPaid,
                      0,
                    );

              runningTotal =
                totalPaid;

              return {
                ...payment,

                calculated_patient_name:
                  group.patientName,

                calculated_treatment_name:
                  group.treatmentName,

                installment_number:
                  payment
                    ?.installment_number ||
                  index + 1,

                calculated_treatment_charge:
                  group
                    .treatmentCharge,

                calculated_previous_paid:
                  previouslyPaid,

                calculated_total_paid:
                  totalPaid,

                calculated_remaining:
                  remainingAmount,

                calculated_status:
                  getPaymentStatus(
                    remainingAmount,
                  ),
              };
            },
          );
        })
        .sort(
          (first, second) =>
            getPaymentDateValue(
              second,
            ) -
            getPaymentDateValue(
              first,
            ),
        );
    }, [treatmentGroups]);

  /* ======================================================
     PATIENT GROUPS
  ====================================================== */

  const patientGroups =
    useMemo(() => {
      const groupMap =
        new Map();

      treatmentGroups.forEach(
        (treatment) => {
          const patientKey =
            treatment.patientId ||
            `name:${treatment.patientName}`;

          if (
            !groupMap.has(
              patientKey,
            )
          ) {
            groupMap.set(
              patientKey,
              {
                patientKey,

                patientId:
                  treatment.patientId,

                patientName:
                  treatment.patientName,

                treatments: [],

                totalCharge: 0,
                totalPaid: 0,
                periodReceived: 0,
                totalBalance: 0,
                installmentCount: 0,
              },
            );
          }

          const patientGroup =
            groupMap.get(
              patientKey,
            );

          patientGroup.treatments.push(
            treatment,
          );

          patientGroup.totalCharge +=
            treatment.treatmentCharge;

          patientGroup.totalPaid +=
            treatment.totalPaid;

          patientGroup.periodReceived +=
            treatment.periodReceived;

          patientGroup.totalBalance +=
            treatment.balance;

          patientGroup.installmentCount +=
            treatment.installmentCount;
        },
      );

      return Array.from(
        groupMap.values(),
      )
        .map((group) => ({
          ...group,

          treatmentCount:
            group.treatments.length,

          status:
            group.totalBalance <= 0
              ? "Full"
              : "Partial",
        }))
        .sort(
          (first, second) =>
            second.periodReceived -
            first.periodReceived,
        );
    }, [treatmentGroups]);

  /* ======================================================
     FINANCIAL SUMMARY
  ====================================================== */

  const totalIncome = useMemo(() => {
    return paymentRows.reduce(
      (total, payment) =>
        total +
        getPaymentAmount(payment),
      0,
    );
  }, [paymentRows]);

  const totalTreatmentCharge =
    useMemo(() => {
      return treatmentGroups.reduce(
        (total, treatment) =>
          total +
          treatment.treatmentCharge,
        0,
      );
    }, [treatmentGroups]);

  const totalOutstanding =
    useMemo(() => {
      return treatmentGroups.reduce(
        (total, treatment) =>
          total +
          treatment.balance,
        0,
      );
    }, [treatmentGroups]);

  const fullPaymentCount =
    useMemo(() => {
      return treatmentGroups.filter(
        (group) =>
          group.status === "Full",
      ).length;
    }, [treatmentGroups]);

  const partialPaymentCount =
    treatmentGroups.length -
    fullPaymentCount;

  const collectionPercentage =
    useMemo(() => {
      if (
        totalTreatmentCharge <= 0
      ) {
        return 0;
      }

      return Math.min(
        Math.round(
          (totalIncome /
            totalTreatmentCharge) *
            100,
        ),
        100,
      );
    }, [
      totalIncome,
      totalTreatmentCharge,
    ]);

  const formattedDateRange =
    useMemo(() => {
      if (
        !selectedDateRange?.[0] ||
        !selectedDateRange?.[1]
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

  /* ======================================================
     DETAILS MODAL
  ====================================================== */

  const openPaymentDetails = (
    payment,
  ) => {
    setSelectedPayment(payment);
    setPaymentModalOpen(true);
  };

  const openTreatmentDetails = (
    treatment,
  ) => {
    const selectedRecord = {
      ...(treatment.latestPayment ||
        {}),

      treatment_id:
        treatment.treatmentId,

      patient_id:
        treatment.patientId,

      calculated_patient_name:
        treatment.patientName,
    };

    setSelectedPayment(
      selectedRecord,
    );

    setPaymentModalOpen(true);
  };

  const closePaymentDetails = () => {
    setPaymentModalOpen(false);
    setSelectedPayment(null);
  };

  /* ======================================================
     INSTALLMENT COLUMNS
  ====================================================== */

  const installmentColumns = [
    {
      title: "Payment",
      key: "date_installment",
      width: 160,
      fixed: "left",

      render: (_, record) => (
        <Space
          size={10}
          align="start"
        >
          <div className="income-installment-number">
            #
            {record
              ?.installment_number ||
              1}
          </div>

          <div className="income-date-cell">
            <Text strong>
              {formatDate(
                record?.payment_date ||
                  record?.created_at,
              )}
            </Text>

            <Text type="secondary">
              {record
                ?.receipt_number ||
                "No receipt"}
            </Text>
          </div>
        </Space>
      ),
    },

    {
      title: "Patient",
      key: "patient",
      width: 230,

      render: (_, record) => (
        <PatientDisplay
          name={
            record
              ?.calculated_patient_name
          }
          patientId={
            record?.patient_id
          }
        />
      ),
    },

    {
      title: "Treatment",
      key: "treatment",
      width: 215,

      render: (_, record) => (
        <div className="income-treatment-cell">
          <Text
            strong
            ellipsis={{
              tooltip:
                record
                  ?.calculated_treatment_name,
            }}
          >
            {record
              ?.calculated_treatment_name ||
              "Dental Treatment"}
          </Text>

          <Text
            type="secondary"
            ellipsis={{
              tooltip:
                record
                  ?.treatment_id,
            }}
          >
            {record?.treatment_id ||
              "-"}
          </Text>
        </div>
      ),
    },

    {
      title: "Treatment Charge",
      key: "charge",
      width: 165,
      align: "right",

      render: (_, record) => (
        <Text strong>
          {formatCurrency(
            record
              ?.calculated_treatment_charge,
          )}
        </Text>
      ),
    },

    {
      title: "This Payment",
      key: "current_payment",
      width: 155,
      align: "right",

      render: (_, record) => (
        <div className="income-amount-cell">
          <Text className="income-amount income-amount--received">
            {formatCurrency(
              getPaymentAmount(
                record,
              ),
            )}
          </Text>

          <Text type="secondary">
            Total{" "}
            {formatCurrency(
              record
                ?.calculated_total_paid,
            )}
          </Text>
        </div>
      ),
    },

    {
      title: "Balance",
      key: "balance",
      width: 155,
      align: "right",

      render: (_, record) => (
        <div className="income-amount-cell">
          <Text
            className={
              record
                ?.calculated_remaining >
              0
                ? "income-amount income-amount--balance"
                : "income-amount income-amount--received"
            }
          >
            {formatCurrency(
              record
                ?.calculated_remaining,
            )}
          </Text>

          <StatusTag
            status={
              record
                ?.calculated_status
            }
          />
        </div>
      ),
    },

    {
      title: "Method",
      dataIndex:
        "payment_method",
      key: "payment_method",
      width: 130,
      align: "center",

      render: (value) => (
        <Tag className="income-method-tag">
          {value || "-"}
        </Tag>
      ),
    },
  ];

  /* ======================================================
     TREATMENT COLUMNS
  ====================================================== */

  const treatmentColumns = [
    {
      title: "Patient",
      key: "patient",
      width: 230,

      render: (_, record) => (
        <PatientDisplay
          name={record.patientName}
          patientId={
            record.patientId
          }
        />
      ),
    },

    {
      title: "Treatment",
      key: "treatment",
      width: 230,

      render: (_, record) => (
        <div className="income-treatment-cell">
          <Text
            strong
            ellipsis={{
              tooltip:
                record.treatmentName,
            }}
          >
            {record.treatmentName}
          </Text>

          <Text
            type="secondary"
            ellipsis={{
              tooltip:
                record.treatmentId,
            }}
          >
            {record.treatmentId}
          </Text>
        </div>
      ),
    },

    {
      title: "Payment Activity",
      key: "activity",
      width: 175,
      align: "center",

      render: (_, record) => (
        <div className="income-activity-cell">
          <Text strong>
            {
              record.installmentCount
            }{" "}
            installment
            {record.installmentCount ===
            1
              ? ""
              : "s"}
          </Text>

          <Text type="secondary">
            Latest{" "}
            {formatDate(
              record.latestPaymentDate,
            )}
          </Text>
        </div>
      ),
    },

    {
      title: "Charge",
      dataIndex:
        "treatmentCharge",
      key: "treatmentCharge",
      width: 150,
      align: "right",

      render: (value) => (
        <Text strong>
          {formatCurrency(value)}
        </Text>
      ),
    },

    {
      title: "Period Received",
      dataIndex:
        "periodReceived",
      key: "periodReceived",
      width: 165,
      align: "right",

      render: (value) => (
        <Text className="income-amount income-amount--primary">
          {formatCurrency(value)}
        </Text>
      ),
    },

    {
      title: "Total Paid",
      dataIndex: "totalPaid",
      key: "totalPaid",
      width: 150,
      align: "right",

      render: (value) => (
        <Text className="income-amount income-amount--received">
          {formatCurrency(value)}
        </Text>
      ),
    },

    {
      title: "Balance",
      key: "balance",
      width: 155,
      align: "right",

      render: (_, record) => (
        <div className="income-amount-cell">
          <Text
            className={
              record.balance > 0
                ? "income-amount income-amount--balance"
                : "income-amount income-amount--received"
            }
          >
            {formatCurrency(
              record.balance,
            )}
          </Text>

          <StatusTag
            status={record.status}
          />
        </div>
      ),
    },
  ];

  /* ======================================================
     PATIENT COLUMNS
  ====================================================== */

  const patientColumns = [
    {
      title: "Patient",
      key: "patient",
      width: 260,

      render: (_, record) => (
        <PatientDisplay
          name={record.patientName}
          patientId={
            record.patientId
          }
        />
      ),
    },

    {
      title: "Activity",
      key: "activity",
      width: 175,
      align: "center",

      render: (_, record) => (
        <div className="income-activity-cell">
          <Text strong>
            {
              record.treatmentCount
            }{" "}
            treatment
            {record.treatmentCount ===
            1
              ? ""
              : "s"}
          </Text>

          <Text type="secondary">
            {
              record.installmentCount
            }{" "}
            installment
            {record.installmentCount ===
            1
              ? ""
              : "s"}
          </Text>
        </div>
      ),
    },

    {
      title: "Total Charges",
      dataIndex: "totalCharge",
      key: "totalCharge",
      width: 165,
      align: "right",

      render: (value) => (
        <Text strong>
          {formatCurrency(value)}
        </Text>
      ),
    },

    {
      title: "Period Received",
      dataIndex:
        "periodReceived",
      key: "periodReceived",
      width: 170,
      align: "right",

      render: (value) => (
        <Text className="income-amount income-amount--primary">
          {formatCurrency(value)}
        </Text>
      ),
    },

    {
      title: "Total Paid",
      dataIndex: "totalPaid",
      key: "totalPaid",
      width: 155,
      align: "right",

      render: (value) => (
        <Text className="income-amount income-amount--received">
          {formatCurrency(value)}
        </Text>
      ),
    },

    {
      title: "Balance",
      key: "balance",
      width: 160,
      align: "right",

      render: (_, record) => (
        <div className="income-amount-cell">
          <Text
            className={
              record.totalBalance >
              0
                ? "income-amount income-amount--balance"
                : "income-amount income-amount--received"
            }
          >
            {formatCurrency(
              record.totalBalance,
            )}
          </Text>

          <StatusTag
            status={record.status}
          />
        </div>
      ),
    },
  ];

  /* ======================================================
     EXPANDED PATIENT TREATMENTS
  ====================================================== */

  const renderPatientTreatments = (
    patientGroup,
  ) => {
    return (
      <div className="income-expanded-section">
        <div className="income-expanded-section__header">
          <div>
            <Title level={5}>
              Treatments for{" "}
              {patientGroup.patientName}
            </Title>

            <Text type="secondary">
              Select a treatment to view
              its complete payment history.
            </Text>
          </div>

          <Tag color="purple">
            {
              patientGroup.treatmentCount
            }{" "}
            treatment
            {patientGroup.treatmentCount ===
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
            record.treatmentId ||
            `treatment-${index}`
          }
          columns={treatmentColumns}
          dataSource={
            patientGroup.treatments
          }
          pagination={false}
          scroll={{
            x: 1250,
          }}
          size="small"
          className="income-expanded-table"
          onRow={(record) => ({
            onClick: (event) => {
              event.stopPropagation();

              openTreatmentDetails(
                record,
              );
            },

            className:
              "income-clickable-row",

            title:
              "View treatment payment details",
          })}
        />
      </div>
    );
  };

  /* ======================================================
     TABLE CONFIGURATION
  ====================================================== */

  const tableConfiguration =
    useMemo(() => {
      if (
        viewMode === "treatments"
      ) {
        return {
          title:
            "Treatment Summary",

          description:
            "Payment progress grouped by individual treatment.",

          rows: treatmentGroups,

          columns:
            treatmentColumns,

          scrollWidth: 1280,
        };
      }

      if (
        viewMode === "patients"
      ) {
        return {
          title:
            "Patient Summary",

          description:
            "Financial activity grouped by patient. Expand a row to view treatments.",

          rows: patientGroups,

          columns:
            patientColumns,

          scrollWidth: 1150,
        };
      }

      return {
        title:
          "Installment Records",

        description:
          "Every payment received within the selected date range.",

        rows: installmentRows,

        columns:
          installmentColumns,

        scrollWidth: 1250,
      };
    }, [
      viewMode,
      treatmentGroups,
      patientGroups,
      installmentRows,
    ]);

  /* ======================================================
     SEARCH
  ====================================================== */

  const filteredTableRows =
    useMemo(() => {
      const keyword =
        normalizeValue(search);

      if (!keyword) {
        return tableConfiguration.rows;
      }

      return tableConfiguration.rows.filter(
        (record) => {
          let searchableValues = [];

          if (
            viewMode ===
            "treatments"
          ) {
            searchableValues = [
              record.patientName,
              record.patientId,
              record.treatmentName,
              record.treatmentId,
              record.status,
              record.latestPaymentDate,
            ];
          } else if (
            viewMode === "patients"
          ) {
            searchableValues = [
              record.patientName,
              record.patientId,
              record.status,
            ];
          } else {
            searchableValues = [
              record
                ?.calculated_patient_name,
              record?.patient_id,
              record
                ?.calculated_treatment_name,
              record?.treatment_id,
              record?.payment_id,
              record?.receipt_number,
              record?.payment_method,
              record?.payment_date,
              record
                ?.calculated_status,
            ];
          }

          return searchableValues.some(
            (value) =>
              normalizeValue(
                value,
              ).includes(keyword),
          );
        },
      );
    }, [
      search,
      viewMode,
      tableConfiguration,
    ]);

  const tableSearchPlaceholder =
    useMemo(() => {
      if (
        viewMode === "patients"
      ) {
        return "Search patient name, ID or payment status";
      }

      if (
        viewMode === "treatments"
      ) {
        return "Search patient, treatment, ID or status";
      }

      return "Search patient, treatment, payment, receipt or method";
    }, [viewMode]);

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <ClinicPage
      title="Payment History"
      subtitle={`Clinic income and outstanding balances • ${formattedDateRange}`}
      icon={<DollarOutlined />}
      actions={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() =>
            loadIncome(
              selectedDateRange,
            )
          }
        >
          Refresh
        </Button>,
      ]}
    >
      {/* ==================================================
          DATE FILTER
      =================================================== */}

      <Card
        bordered={false}
        className="income-filter-card"
      >
        <div className="income-filter-layout">
          <div className="income-filter-left">
            <RangePicker
              value={
                selectedDateRange
              }
              format="DD MMM YYYY"
              allowClear={false}
              onChange={
                handleDateRangeChange
              }
              className="income-main-range-picker"
            />

            <Button
              type="primary"
              icon={<SearchOutlined />}
              loading={loading}
              onClick={() =>
                loadIncome(
                  selectedDateRange,
                )
              }
              className="income-load-button"
            >
              Load Report
            </Button>
          </div>

          <div className="income-quick-ranges">
            <Button
              onClick={() =>
                setQuickDateRange(
                  "today",
                )
              }
            >
              Today
            </Button>

            <Button
              onClick={() =>
                setQuickDateRange(
                  "week",
                )
              }
            >
              This Week
            </Button>

            <Button
              onClick={() =>
                setQuickDateRange(
                  "month",
                )
              }
            >
              This Month
            </Button>
          </div>
        </div>
      </Card>

      {/* ==================================================
          SUMMARY
      =================================================== */}

      <Row
        gutter={[16, 16]}
        className="income-dashboard-summary"
      >
        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <DashboardSummaryCard
            title="Treatment Charges"
            value={formatCurrency(
              totalTreatmentCharge,
            )}
            helper={`${
              treatmentGroups.length
            } treatment${
              treatmentGroups.length ===
              1
                ? ""
                : "s"
            }`}
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
          <DashboardSummaryCard
            title="Total Collected"
            value={formatCurrency(
              totalIncome,
            )}
            helper={`${
              installmentRows.length
            } payment record${
              installmentRows.length ===
              1
                ? ""
                : "s"
            }`}
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
          <DashboardSummaryCard
            title="Outstanding Balance"
            value={formatCurrency(
              totalOutstanding,
            )}
            helper={
              totalOutstanding > 0
                ? "Amount still to be collected"
                : "All payments completed"
            }
            tone={
              totalOutstanding > 0
                ? "red"
                : "green"
            }
            icon={
              <WarningOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <DashboardSummaryCard
            title="Treatments"
            value={
              treatmentGroups.length
            }
            helper="Within selected date range"
            tone="purple"
            icon={
              <CalendarOutlined />
            }
          />
        </Col>
      </Row>

      {/* ==================================================
          COLLECTION PROGRESS
      =================================================== */}

      <Card
        bordered={false}
        className="income-collection-card"
      >
        <div className="income-collection-layout">
          <div className="income-collection-info">
            <div className="income-collection-icon">
              <DollarOutlined />
            </div>

            <div>
              <Title level={4}>
                Collection Progress
              </Title>

              <Text type="secondary">
                Percentage of treatment
                charges collected
              </Text>
            </div>
          </div>

          <div className="income-collection-progress">
            <Progress
              percent={
                collectionPercentage
              }
              strokeWidth={13}
              status="normal"
            />

            <div className="income-collection-numbers">
              <Text>
                Collected{" "}
                <strong>
                  {formatCurrency(
                    totalIncome,
                  )}
                </strong>
              </Text>

              <Text type="secondary">
                of{" "}
                {formatCurrency(
                  totalTreatmentCharge,
                )}
              </Text>
            </div>
          </div>
        </div>
      </Card>

      {/* ==================================================
          REPORT
      =================================================== */}

      <Card
        bordered={false}
        className="income-report-card"
      >
        <div className="income-report-header">
          <div>
            <Title level={4}>
              {
                tableConfiguration.title
              }
            </Title>

            <Text type="secondary">
              {
                tableConfiguration.description
              }
            </Text>
          </div>

          <div className="income-report-header__meta">
            <Tag color="blue">
              {filteredTableRows.length}{" "}
              result
              {filteredTableRows.length ===
              1
                ? ""
                : "s"}
            </Tag>

            <Tag>
              {formattedDateRange}
            </Tag>
          </div>
        </div>

        {/* Toolbar */}

        <div className="income-report-toolbar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={
              tableSearchPlaceholder
            }
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            className="income-search-input"
          />

          <Segmented
            value={viewMode}
            onChange={(value) => {
              setViewMode(value);
              setSearch("");
            }}
            className="income-view-selector"
            options={[
              {
                label:
                  "Installments",
                value:
                  "installments",
                icon:
                  <UnorderedListOutlined />,
              },
              {
                label:
                  "Treatments",
                value:
                  "treatments",
                icon:
                  <MedicineBoxOutlined />,
              },
              {
                label:
                  "Patients",
                value:
                  "patients",
                icon:
                  <TeamOutlined />,
              },
            ]}
          />
        </div>

        {/* Table */}

        <Table
          rowKey={(
            record,
            index,
          ) => {
            if (
              viewMode ===
              "treatments"
            ) {
              return (
                record.treatmentId ||
                `treatment-${index}`
              );
            }

            if (
              viewMode ===
              "patients"
            ) {
              return (
                record.patientKey ||
                `patient-${index}`
              );
            }

            return (
              record?.payment_id ||
              record?.id ||
              record
                ?.receipt_number ||
              `payment-${index}`
            );
          }}
          loading={loading}
          columns={
            tableConfiguration.columns
          }
          dataSource={
            filteredTableRows
          }
          pagination={{
            pageSize: 10,
            showSizeChanger: false,

            showTotal: (total) =>
              `${total} record${
                total === 1
                  ? ""
                  : "s"
              }`,
          }}
          scroll={{
            x:
              tableConfiguration.scrollWidth,
          }}
          className="income-report-table"
          rowClassName={(record) => {
            const status =
              record
                ?.calculated_status ||
              record?.status;

            return status === "Partial"
              ? "income-table-row income-table-row--partial"
              : "income-table-row income-table-row--full";
          }}
          onRow={(record) => {
            if (
              viewMode ===
              "patients"
            ) {
              return {
                className:
                  "income-clickable-row",

                title:
                  "Expand patient treatments",
              };
            }

            return {
              onClick: () => {
                if (
                  viewMode ===
                  "treatments"
                ) {
                  openTreatmentDetails(
                    record,
                  );
                } else {
                  openPaymentDetails(
                    record,
                  );
                }
              },

              className:
                "income-clickable-row",

              title:
                "View payment details",
            };
          }}
          expandable={
            viewMode === "patients"
              ? {
                  expandedRowRender:
                    renderPatientTreatments,

                  expandRowByClick:
                    true,

                  rowExpandable: (
                    record,
                  ) =>
                    record.treatments
                      .length > 0,
                }
              : undefined
          }
          locale={{
            emptyText: (
              <Empty
                image={
                  Empty.PRESENTED_IMAGE_SIMPLE
                }
                description={
                  search
                    ? "No matching payment records found"
                    : "No payment records found for the selected date range"
                }
              />
            ),
          }}
        />
      </Card>

      {/* ==================================================
          PAYMENT DETAILS
      =================================================== */}

      <TreatmentPaymentDetailsModal
        open={paymentModalOpen}
        treatmentId={
          selectedPayment
            ?.treatment_id
        }
        patientName={
          selectedPayment
            ?.calculated_patient_name ||
          selectedPayment
            ?.patient_name ||
          selectedPayment?.name ||
          "Unknown Patient"
        }
        onClose={
          closePaymentDetails
        }
      />
    </ClinicPage>
  );
};

export default DailyIncome;