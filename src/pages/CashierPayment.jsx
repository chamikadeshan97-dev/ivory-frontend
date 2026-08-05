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
  Drawer,
  Empty,
  Input,
  Progress,
  Row,
  Segmented,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DollarOutlined,
  EyeOutlined,
  IdcardOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import PaymentModal from "../components/PaymentModal";
import ClinicPage from "../components/ClinicPage";

import {
  createPayment,
  getAppointments,
  getPatients,
  updateAppointmentStatus,
} from "../api/endPoints";

import "./css/CashierPayment.css";

dayjs.extend(customParseFormat);

const {
  Title,
  Text,
} = Typography;

/* ========================================================
   Constants
======================================================== */

const PAYMENT_QUEUE_STATUSES = [
  "Treatment Done",
  "Payment Pending",
];

const PAYMENT_STATUS_COLORS = {
  "Treatment Done": "purple",
  "Payment Pending": "orange",
  Paid: "green",
  Completed: "success",
};

/* ========================================================
   General helpers
======================================================== */

const extractArray = (response) => {
  const data =
    response?.data?.data ||
    response?.data ||
    [];

  return Array.isArray(data)
    ? data
    : [];
};

const toNumber = (value) => {
  const number = Number(value || 0);

  return Number.isFinite(number)
    ? number
    : 0;
};

const normalizeValue = (value) => {
  return String(value ?? "")
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

const getPatientId = (patient) => {
  return (
    patient?.patient_id ||
    patient?.id ||
    ""
  );
};

const getPatientName = (patient) => {
  if (!patient) {
    return "Unknown Patient";
  }

  return (
    patient?.name ||
    [
      patient?.first_name,
      patient?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unknown Patient"
  );
};

const getPatientPhone = (patient) => {
  return (
    patient?.phone ||
    patient?.phone_number ||
    patient?.mobile ||
    patient?.mobile_number ||
    "-"
  );
};

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

const getTreatmentCharge = (
  appointment,
) => {
  return toNumber(
    appointment?.treatment_charge ??
      appointment?.treatment_fee ??
      appointment?.charge ??
      0,
  );
};

const getTotalPaid = (
  appointment,
) => {
  return toNumber(
    appointment?.total_paid ??
      appointment?.paid_amount ??
      0,
  );
};

const getRemainingAmount = (
  appointment,
) => {
  const treatmentCharge =
    getTreatmentCharge(
      appointment,
    );

  const totalPaid =
    getTotalPaid(appointment);

  const storedRemaining =
    appointment?.remaining_amount;

  if (
    storedRemaining !== undefined &&
    storedRemaining !== null &&
    storedRemaining !== ""
  ) {
    return Math.max(
      toNumber(storedRemaining),
      0,
    );
  }

  return Math.max(
    treatmentCharge -
      totalPaid,
    0,
  );
};

const formatMoney = (amount) => {
  return toNumber(
    amount,
  ).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatCurrency = (amount) => {
  return `Rs. ${formatMoney(
    amount,
  )}`;
};

const getPaymentPercentage = (
  appointment,
) => {
  const treatmentCharge =
    getTreatmentCharge(
      appointment,
    );

  const totalPaid =
    getTotalPaid(appointment);

  if (treatmentCharge <= 0) {
    return 0;
  }

  return Math.min(
    Math.round(
      (totalPaid /
        treatmentCharge) *
        100,
    ),
    100,
  );
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = dayjs(value);

  return date.isValid()
    ? date.format("DD MMMM YYYY")
    : String(value);
};

const formatTime = (value) => {
  if (!value) {
    return "-";
  }

  const parsedTime = dayjs(
    String(value).trim(),
    [
      "HH:mm",
      "HH:mm:ss",
      "h:mm A",
      "hh:mm A",
    ],
    true,
  );

  if (parsedTime.isValid()) {
    return parsedTime.format(
      "hh:mm A",
    );
  }

  const parsedDate = dayjs(value);

  return parsedDate.isValid()
    ? parsedDate.format("hh:mm A")
    : String(value);
};

/* ========================================================
   Summary card
======================================================== */

const CashierSummaryCard = ({
  title,
  value,
  helper,
  icon,
  tone,
  currency = false,
}) => {
  return (
    <Card
      bordered={false}
      className={`cashier-summary-card cashier-summary-card--${tone}`}
    >
      <div className="cashier-summary-card__content">
        <div>
          <Text className="cashier-summary-card__title">
            {title}
          </Text>

          <div className="cashier-summary-card__value">
            {currency
              ? formatCurrency(value)
              : value}
          </div>

          <Text className="cashier-summary-card__helper">
            {helper}
          </Text>
        </div>

        <div className="cashier-summary-card__icon">
          {icon}
        </div>
      </div>
    </Card>
  );
};

/* ========================================================
   Cashier page
======================================================== */

const CashierPayment = () => {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    appointments,
    setAppointments,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    paymentFilter,
    setPaymentFilter,
  ] = useState("all");

  const [
    selectedAppointment,
    setSelectedAppointment,
  ] = useState(null);

  const [
    paymentModalOpen,
    setPaymentModalOpen,
  ] = useState(false);

  const [
    detailsDrawerOpen,
    setDetailsDrawerOpen,
  ] = useState(false);

  /* ========================================================
     Load payment patients
  ======================================================== */

  const loadPaymentPatients =
    useCallback(async () => {
      setLoading(true);

      try {
        const [
          appointmentsResponse,
          patientsResponse,
        ] = await Promise.all([
          getAppointments(),
          getPatients(),
        ]);

        const appointmentList =
          extractArray(
            appointmentsResponse,
          );

        const patientList =
          extractArray(
            patientsResponse,
          );

        const patientMap =
          new Map(
            patientList.map(
              (patient) => [
                String(
                  getPatientId(
                    patient,
                  ),
                ),
                patient,
              ],
            ),
          );

        const paymentPatients =
          appointmentList
            .map(
              (appointment) => {
                const patient =
                  patientMap.get(
                    String(
                      appointment
                        ?.patient_id,
                    ),
                  );

                const allergyValue =
                  appointment
                    ?.has_allergies ??
                  appointment
                    ?.is_allergies ??
                  patient
                    ?.has_allergies ??
                  patient
                    ?.is_allergies ??
                  patient
                    ?.hasAllergies ??
                  false;

                return {
                  ...appointment,

                  patient_name:
                    appointment
                      ?.patient_name ||
                    getPatientName(
                      patient,
                    ),

                  phone:
                    appointment
                      ?.phone ||
                    getPatientPhone(
                      patient,
                    ),

                  patient_age:
                    appointment
                      ?.patient_age ??
                    patient?.age ??
                    "",

                  patient_gender:
                    appointment
                      ?.patient_gender ||
                    patient?.gender ||
                    "",

                  patient_address:
                    appointment
                      ?.patient_address ||
                    patient?.address ||
                    "",

                  patient_has_allergies:
                    convertToBoolean(
                      allergyValue,
                    ),

                  patient_allergy_details:
                    appointment
                      ?.allergy_details ||
                    appointment
                      ?.allergies ||
                    patient
                      ?.allergy_details ||
                    patient?.allergies ||
                    patient?.allergy ||
                    "",
                };
              },
            )
            .filter(
              (appointment) => {
                const waitingForPayment =
                  PAYMENT_QUEUE_STATUSES.includes(
                    appointment
                      ?.status,
                  );

                const remainingAmount =
                  getRemainingAmount(
                    appointment,
                  );

                const treatmentMissing =
                  !appointment
                    ?.treatment_id;

                return (
                  waitingForPayment &&
                  (
                    remainingAmount >
                      0 ||
                    treatmentMissing
                  )
                );
              },
            )
            .sort(
              (first, second) => {
                const firstStatus =
                  first?.status ===
                  "Payment Pending"
                    ? 0
                    : 1;

                const secondStatus =
                  second?.status ===
                  "Payment Pending"
                    ? 0
                    : 1;

                if (
                  firstStatus !==
                  secondStatus
                ) {
                  return (
                    firstStatus -
                    secondStatus
                  );
                }

                const firstTime =
                  String(
                    first
                      ?.appointment_time ||
                      first?.time ||
                      "",
                  );

                const secondTime =
                  String(
                    second
                      ?.appointment_time ||
                      second?.time ||
                      "",
                  );

                if (
                  firstTime !==
                  secondTime
                ) {
                  return firstTime.localeCompare(
                    secondTime,
                  );
                }

                return String(
                  first
                    ?.patient_name ||
                    "",
                ).localeCompare(
                  String(
                    second
                      ?.patient_name ||
                      "",
                  ),
                );
              },
            );

        setAppointments(
          paymentPatients,
        );

        setSelectedAppointment(
          (current) => {
            if (!current) {
              return null;
            }

            return (
              paymentPatients.find(
                (appointment) =>
                  getAppointmentId(
                    appointment,
                  ) ===
                  getAppointmentId(
                    current,
                  ),
              ) || null
            );
          },
        );
      } catch (error) {
        console.error(
          "Could not load payment patients:",
          error,
        );

        message.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Could not load patients waiting for payment",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadPaymentPatients();
  }, [loadPaymentPatients]);

  /* ========================================================
     Summary
  ======================================================== */

  const cashierSummary =
    useMemo(() => {
      const newPayments =
        appointments.filter(
          (appointment) =>
            appointment?.status ===
            "Treatment Done",
        ).length;

      const partialPayments =
        appointments.filter(
          (appointment) =>
            appointment?.status ===
              "Payment Pending" ||
            getTotalPaid(
              appointment,
            ) > 0,
        ).length;

      const missingTreatment =
        appointments.filter(
          (appointment) =>
            !appointment
              ?.treatment_id,
        ).length;

      const outstanding =
        appointments.reduce(
          (
            total,
            appointment,
          ) =>
            total +
            getRemainingAmount(
              appointment,
            ),
          0,
        );

      return {
        total:
          appointments.length,

        newPayments,

        partialPayments,

        missingTreatment,

        outstanding,
      };
    }, [appointments]);

  /* ========================================================
     Search and filters
  ======================================================== */

  const filteredAppointments =
    useMemo(() => {
      const keyword =
        normalizeValue(search);

      return appointments.filter(
        (appointment) => {
          const treatmentMissing =
            !appointment
              ?.treatment_id;

          const totalPaid =
            getTotalPaid(
              appointment,
            );

          const matchesSearch =
            !keyword ||
            [
              appointment
                ?.patient_name,
              appointment?.phone,
              appointment
                ?.patient_id,
              getAppointmentId(
                appointment,
              ),
              appointment
                ?.treatment_id,
              appointment?.status,
              appointment
                ?.reason_for_visit,
            ].some((value) =>
              normalizeValue(
                value,
              ).includes(keyword),
            );

          const matchesFilter =
            paymentFilter ===
              "all" ||
            (
              paymentFilter ===
                "new" &&
              appointment?.status ===
                "Treatment Done" &&
              totalPaid <= 0
            ) ||
            (
              paymentFilter ===
                "partial" &&
              (
                appointment
                  ?.status ===
                  "Payment Pending" ||
                totalPaid > 0
              )
            ) ||
            (
              paymentFilter ===
                "not-ready" &&
              treatmentMissing
            );

          return (
            matchesSearch &&
            matchesFilter
          );
        },
      );
    }, [
      appointments,
      search,
      paymentFilter,
    ]);

  /* ========================================================
     Details drawer
  ======================================================== */

  const openDetailsDrawer = (
    appointment,
  ) => {
    setSelectedAppointment(
      appointment,
    );

    setDetailsDrawerOpen(true);
  };

  const closeDetailsDrawer = () => {
    setDetailsDrawerOpen(false);
  };

  /* ========================================================
     Payment modal
  ======================================================== */

  const openPaymentModal = (
    appointment,
  ) => {
    setSelectedAppointment(
      appointment,
    );

    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    if (saving) {
      return;
    }

    setPaymentModalOpen(false);

    if (!detailsDrawerOpen) {
      setSelectedAppointment(
        null,
      );
    }
  };

  /* ========================================================
     Save payment
  ======================================================== */

  const handlePaymentSubmit =
    async (paymentData) => {
      if (!selectedAppointment) {
        message.error(
          "Appointment information is missing",
        );

        return;
      }

      setSaving(true);

      try {
        await createPayment(
          paymentData,
        );

        const appointmentId =
          getAppointmentId(
            selectedAppointment,
          );

        const currentRemaining =
          getRemainingAmount(
            selectedAppointment,
          );

        const paymentAmount =
          toNumber(
            paymentData
              ?.payment_amount,
          );

        const newRemaining =
          Math.max(
            currentRemaining -
              paymentAmount,
            0,
          );

        const isFullPayment =
          newRemaining <= 0;

        if (!appointmentId) {
          throw new Error(
            "Appointment ID was not found",
          );
        }

        await updateAppointmentStatus(
          appointmentId,
          isFullPayment
            ? "Paid"
            : "Payment Pending",
        );

        message.success(
          isFullPayment
            ? "Full payment saved successfully"
            : "Partial payment saved successfully",
        );

        setPaymentModalOpen(
          false,
        );

        setDetailsDrawerOpen(
          false,
        );

        setSelectedAppointment(
          null,
        );

        await loadPaymentPatients();
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

  /* ========================================================
     Payment card
  ======================================================== */

  const renderPaymentCard = (
    appointment,
  ) => {
    const appointmentId =
      getAppointmentId(
        appointment,
      );

    const treatmentCharge =
      getTreatmentCharge(
        appointment,
      );

    const totalPaid =
      getTotalPaid(
        appointment,
      );

    const remainingAmount =
      getRemainingAmount(
        appointment,
      );

    const paymentPercentage =
      getPaymentPercentage(
        appointment,
      );

    const treatmentMissing =
      !appointment
        ?.treatment_id;

    const hasAllergies =
      appointment
        ?.patient_has_allergies ===
      true;

    const isPartial =
      appointment?.status ===
        "Payment Pending" ||
      totalPaid > 0;

    return (
      <Col
        xs={24}
        sm={12}
        lg={8}
        xl={6}
        key={appointmentId}
      >
        <Card
          bordered={false}
          role="button"
          tabIndex={0}
          className={[
            "cashier-patient-card",

            hasAllergies
              ? "cashier-patient-card--allergy"
              : "",

            isPartial
              ? "cashier-patient-card--partial"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() =>
            openDetailsDrawer(
              appointment,
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === " "
            ) {
              event.preventDefault();

              openDetailsDrawer(
                appointment,
              );
            }
          }}
        >
          <div className="cashier-card-view-hint">
            <EyeOutlined />
            View
          </div>

          {/* Patient information */}

          <div className="cashier-patient-card__header">
            <div className="cashier-patient-card__identity">
              <Avatar
                size={48}
                icon={
                  <UserOutlined />
                }
                className={
                  hasAllergies
                    ? "cashier-patient-avatar cashier-patient-avatar--allergy"
                    : "cashier-patient-avatar"
                }
              />

              <div className="cashier-patient-card__patient">
                <Tooltip
                  title={
                    appointment
                      ?.patient_name
                  }
                >
                  <Text
                    strong
                    ellipsis
                  >
                    {appointment
                      ?.patient_name ||
                      "Unknown Patient"}
                  </Text>
                </Tooltip>

                <Text type="secondary">
                  <PhoneOutlined />{" "}
                  {appointment?.phone ||
                    "-"}
                </Text>
              </div>
            </div>

            <Tag
              color={
                isPartial
                  ? "orange"
                  : "purple"
              }
              className="cashier-payment-state"
            >
              {isPartial
                ? "Partial"
                : "New"}
            </Tag>
          </div>

          <div className="cashier-patient-card__identifiers">
            <span>
              <IdcardOutlined />

              {appointment
                ?.patient_id ||
                "-"}
            </span>

            <span>
              <MedicineBoxOutlined />

              {appointment
                ?.treatment_id ||
                "Treatment pending"}
            </span>
          </div>

          {hasAllergies && (
            <Alert
              type="error"
              showIcon
              icon={
                <WarningOutlined />
              }
              message="Allergy Warning"
              description={
                appointment
                  ?.patient_allergy_details ||
                "Review the patient's allergy information before proceeding."
              }
              className="cashier-allergy-alert"
            />
          )}

          {/* Payment values */}

          <div className="cashier-payment-values">
            <div className="cashier-payment-value-row">
              <Text type="secondary">
                Treatment Fee
              </Text>

              <Text strong>
                {formatCurrency(
                  treatmentCharge,
                )}
              </Text>
            </div>

            <div className="cashier-payment-value-row">
              <Text type="secondary">
                Already Paid
              </Text>

              <Text className="cashier-paid-value">
                {formatCurrency(
                  totalPaid,
                )}
              </Text>
            </div>
          </div>

          {treatmentCharge > 0 && (
            <div className="cashier-payment-progress">
              <div className="cashier-payment-progress__header">
                <Text type="secondary">
                  Payment progress
                </Text>

                <Text strong>
                  {paymentPercentage}%
                </Text>
              </div>

              <Progress
                percent={
                  paymentPercentage
                }
                showInfo={false}
                status={
                  paymentPercentage >=
                  100
                    ? "success"
                    : "active"
                }
                size="small"
              />
            </div>
          )}

          {/* Remaining amount */}

          <div className="cashier-amount-due">
            <div className="cashier-amount-due__icon">
              <WalletOutlined />
            </div>

            <div>
              <Text>
                Amount to Pay
              </Text>

              <Title level={3}>
                {formatCurrency(
                  remainingAmount,
                )}
              </Title>
            </div>
          </div>

          {treatmentMissing && (
            <Alert
              type="warning"
              showIcon
              message="Payment is not ready"
              description="Treatment information has not been linked to this appointment yet."
              className="cashier-not-ready-alert"
            />
          )}

          <Button
            block
            type="primary"
            size="large"
            icon={
              <DollarOutlined />
            }
            disabled={
              treatmentMissing ||
              treatmentCharge <= 0 ||
              remainingAmount <= 0
            }
            className="cashier-pay-button"
            onClick={(event) => {
              event.stopPropagation();

              openPaymentModal(
                appointment,
              );
            }}
          >
            Pay Now
          </Button>
        </Card>
      </Col>
    );
  };

  /* ========================================================
     Selected drawer values
  ======================================================== */

  const selectedTreatmentCharge =
    selectedAppointment
      ? getTreatmentCharge(
          selectedAppointment,
        )
      : 0;

  const selectedTotalPaid =
    selectedAppointment
      ? getTotalPaid(
          selectedAppointment,
        )
      : 0;

  const selectedRemainingAmount =
    selectedAppointment
      ? getRemainingAmount(
          selectedAppointment,
        )
      : 0;

  const selectedPercentage =
    selectedAppointment
      ? getPaymentPercentage(
          selectedAppointment,
        )
      : 0;

  const selectedTreatmentMissing =
    selectedAppointment
      ? !selectedAppointment
          ?.treatment_id
      : false;

  const selectedCanPay =
    selectedAppointment &&
    !selectedTreatmentMissing &&
    selectedTreatmentCharge > 0 &&
    selectedRemainingAmount > 0;

  /* ========================================================
     Render
  ======================================================== */

  return (
    <ClinicPage
      title="Cashier Payments"
      subtitle="Receive full or partial payments from patients after treatment."
      icon={<DollarOutlined />}
      actions={[
        <Button
          key="refresh"
          icon={
            <ReloadOutlined />
          }
          loading={loading}
          onClick={
            loadPaymentPatients
          }
        >
          Refresh
        </Button>,
      ]}
    >
      {/* Summary cards */}

      <Row
        gutter={[16, 16]}
        className="cashier-summary-row"
      >
        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <CashierSummaryCard
            title="Waiting for Payment"
            value={
              cashierSummary.total
            }
            helper="Patients in cashier queue"
            tone="blue"
            icon={
              <UserOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <CashierSummaryCard
            title="New Payments"
            value={
              cashierSummary.newPayments
            }
            helper="Treatment completed"
            tone="purple"
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
          <CashierSummaryCard
            title="Partial Payments"
            value={
              cashierSummary.partialPayments
            }
            helper="Patients with balances"
            tone="orange"
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
          <CashierSummaryCard
            title="Outstanding Amount"
            value={
              cashierSummary.outstanding
            }
            helper="Total amount to collect"
            tone="green"
            currency
            icon={
              <WalletOutlined />
            }
          />
        </Col>
      </Row>

      {/* Search and filter */}

      <Card
        bordered={false}
        className="cashier-search-card"
      >
        <div className="cashier-search-card__header">
          <div>
            <Title level={4}>
              Payment Queue
            </Title>

            <Text type="secondary">
              Search and select a
              patient to record a
              payment.
            </Text>
          </div>

          <Tag
            color="blue"
            className="cashier-result-count"
          >
            {filteredAppointments.length}{" "}
            patient
            {filteredAppointments.length ===
            1
              ? ""
              : "s"}
          </Tag>
        </div>

        <div className="cashier-search-toolbar">
          <Input
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            value={search}
            placeholder="Search patient, phone, appointment or treatment ID"
            className="cashier-search-input"
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />

          <Segmented
            value={paymentFilter}
            onChange={
              setPaymentFilter
            }
            className="cashier-payment-filter"
            options={[
              {
                label: `All (${cashierSummary.total})`,
                value: "all",
              },
              {
                label: `New (${cashierSummary.newPayments})`,
                value: "new",
              },
              {
                label: `Partial (${cashierSummary.partialPayments})`,
                value: "partial",
              },
              {
                label: `Not Ready (${cashierSummary.missingTreatment})`,
                value: "not-ready",
              },
            ]}
          />
        </div>
      </Card>

      {/* Patient cards */}

      <Spin spinning={loading}>
        {filteredAppointments.length ===
        0 ? (
          <Card
            bordered={false}
            className="cashier-empty-card"
          >
            <Empty
              image={
                Empty.PRESENTED_IMAGE_SIMPLE
              }
              description={
                <div className="cashier-empty-content">
                  <Title level={4}>
                    {search
                      ? "Patient not found"
                      : paymentFilter !==
                          "all"
                        ? "No matching payment records"
                        : "No patients are waiting for payment"}
                  </Title>

                  <Text type="secondary">
                    {search
                      ? "Try another patient name, phone number, appointment ID or treatment ID."
                      : "Patients appear here after the doctor completes their treatment."}
                  </Text>
                </div>
              }
            />

            {(search ||
              paymentFilter !==
                "all") && (
              <Button
                type="link"
                onClick={() => {
                  setSearch("");
                  setPaymentFilter(
                    "all",
                  );
                }}
              >
                Clear filters
              </Button>
            )}
          </Card>
        ) : (
          <Row gutter={[18, 18]}>
            {filteredAppointments.map(
              renderPaymentCard,
            )}
          </Row>
        )}
      </Spin>

      {/* Details drawer */}

      <Drawer
        open={detailsDrawerOpen}
        width={480}
        placement="right"
        destroyOnClose
        closeIcon={
          <CloseOutlined />
        }
        className="cashier-details-drawer"
        title={
          <div className="cashier-drawer-title">
            <div className="cashier-drawer-title__icon">
              <WalletOutlined />
            </div>

            <div>
              <Text className="cashier-drawer-title__eyebrow">
                Payment Details
              </Text>

              <Title
                level={5}
                className="cashier-drawer-title__text"
              >
                {selectedAppointment
                  ?.patient_name ||
                  "Patient Payment"}
              </Title>
            </div>
          </div>
        }
        onClose={
          closeDetailsDrawer
        }
      >
        {selectedAppointment && (
          <div className="cashier-drawer-content">
            <div
              className={[
                "cashier-drawer-hero",

                selectedAppointment
                  ?.patient_has_allergies
                  ? "cashier-drawer-hero--allergy"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Avatar
                size={64}
                icon={
                  <UserOutlined />
                }
                className={
                  selectedAppointment
                    ?.patient_has_allergies
                    ? "cashier-drawer-avatar cashier-drawer-avatar--allergy"
                    : "cashier-drawer-avatar"
                }
              />

              <div className="cashier-drawer-patient">
                <Text className="cashier-drawer-patient__name">
                  {selectedAppointment
                    ?.patient_name ||
                    "Unknown Patient"}
                </Text>

                <Text className="cashier-drawer-patient__phone">
                  <PhoneOutlined />
                  {selectedAppointment
                    ?.phone || "-"}
                </Text>

                <Tag
                  color={
                    PAYMENT_STATUS_COLORS[
                      selectedAppointment
                        ?.status
                    ] || "default"
                  }
                  className="cashier-drawer-status"
                >
                  {selectedAppointment
                    ?.status ||
                    "Treatment Done"}
                </Tag>
              </div>
            </div>

            {selectedAppointment
              ?.patient_has_allergies && (
              <Alert
                type="error"
                showIcon
                icon={
                  <WarningOutlined />
                }
                message="Allergy Warning"
                description={
                  selectedAppointment
                    ?.patient_allergy_details ||
                  "Review the patient's allergy information before proceeding."
                }
                className="cashier-drawer-allergy"
              />
            )}

            <Descriptions
              bordered
              size="small"
              column={1}
              className="cashier-drawer-descriptions"
            >
              <Descriptions.Item
                label={
                  <Space size={6}>
                    <IdcardOutlined />
                    Patient ID
                  </Space>
                }
              >
                {selectedAppointment
                  ?.patient_id || "-"}
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <Space size={6}>
                    <CalendarOutlined />
                    Appointment ID
                  </Space>
                }
              >
                {getAppointmentId(
                  selectedAppointment,
                ) || "-"}
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <Space size={6}>
                    <MedicineBoxOutlined />
                    Treatment ID
                  </Space>
                }
              >
                {selectedAppointment
                  ?.treatment_id ||
                  "Treatment pending"}
              </Descriptions.Item>

              <Descriptions.Item
                label="Age"
              >
                {selectedAppointment
                  ?.patient_age || "-"}
              </Descriptions.Item>

              <Descriptions.Item
                label="Gender"
              >
                {selectedAppointment
                  ?.patient_gender || "-"}
              </Descriptions.Item>

              <Descriptions.Item
                label="Address"
              >
                {selectedAppointment
                  ?.patient_address || "-"}
              </Descriptions.Item>

              <Descriptions.Item
                label="Appointment Date"
              >
                {formatDate(
                  selectedAppointment
                    ?.appointment_date,
                )}
              </Descriptions.Item>

              <Descriptions.Item
                label="Appointment Time"
              >
                {formatTime(
                  selectedAppointment
                    ?.appointment_time,
                )}
              </Descriptions.Item>

              <Descriptions.Item
                label="Reason"
              >
                {selectedAppointment
                  ?.reason_for_visit ||
                  "General consultation"}
              </Descriptions.Item>
            </Descriptions>

            <div className="cashier-drawer-payment-card">
              <div className="cashier-drawer-payment-row">
                <Text type="secondary">
                  Treatment Fee
                </Text>

                <Text strong>
                  {formatCurrency(
                    selectedTreatmentCharge,
                  )}
                </Text>
              </div>

              <div className="cashier-drawer-payment-row">
                <Text type="secondary">
                  Already Paid
                </Text>

                <Text className="cashier-drawer-paid">
                  {formatCurrency(
                    selectedTotalPaid,
                  )}
                </Text>
              </div>

              <div className="cashier-drawer-progress">
                <div className="cashier-drawer-progress__header">
                  <Text type="secondary">
                    Payment Progress
                  </Text>

                  <Text strong>
                    {selectedPercentage}%
                  </Text>
                </div>

                <Progress
                  percent={
                    selectedPercentage
                  }
                  showInfo={false}
                  status={
                    selectedPercentage >=
                    100
                      ? "success"
                      : "active"
                  }
                />
              </div>

              <div className="cashier-drawer-amount">
                <div className="cashier-drawer-amount__icon">
                  <WalletOutlined />
                </div>

                <div>
                  <Text>
                    Remaining Balance
                  </Text>

                  <Title level={3}>
                    {formatCurrency(
                      selectedRemainingAmount,
                    )}
                  </Title>
                </div>
              </div>
            </div>

            {selectedTreatmentMissing && (
              <Alert
                type="warning"
                showIcon
                message="Payment is not ready"
                description="Treatment information has not been linked to this appointment."
              />
            )}

            <Button
              block
              type="primary"
              size="large"
              icon={
                <DollarOutlined />
              }
              disabled={
                !selectedCanPay
              }
              className="cashier-drawer-pay-button"
              onClick={() =>
                openPaymentModal(
                  selectedAppointment,
                )
              }
            >
              Pay Now
            </Button>
          </div>
        )}
      </Drawer>

      <PaymentModal
        open={paymentModalOpen}
        loading={saving}
        appointment={
          selectedAppointment
        }
        onCancel={
          closePaymentModal
        }
        onSubmit={
          handlePaymentSubmit
        }
      />
    </ClinicPage>
  );
};

export default CashierPayment;