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
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  IdcardOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import PaymentModal from "../components/PaymentModal";
import ClinicPage from "../components/ClinicPage";

import {
  createPayment,
  getAppointments,
  getPatients,
  updateAppointmentStatus,
} from "../api/endPoints";

import "./css/CashierPayment.css";

const {
  Title,
  Text,
} = Typography;

/* --------------------------------------------------------
   Constants
-------------------------------------------------------- */

const PAYMENT_QUEUE_STATUSES = [
  "Treatment Done",
  "Payment Pending",
];

/* --------------------------------------------------------
   General helpers
-------------------------------------------------------- */

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

/* --------------------------------------------------------
   Summary card
-------------------------------------------------------- */

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

/* --------------------------------------------------------
   Cashier page
-------------------------------------------------------- */

const CashierPayment = () => {
  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    appointments,
    setAppointments,
  ] = useState([]);

  const [search, setSearch] =
    useState("");

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

  /* ------------------------------------------------------
     Load patients waiting for payment
  ------------------------------------------------------ */

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
                  (remainingAmount >
                    0 ||
                    treatmentMissing)
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

  /* ------------------------------------------------------
     Summary
  ------------------------------------------------------ */

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

  /* ------------------------------------------------------
     Search and payment filter
  ------------------------------------------------------ */

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
            ].some((value) =>
              normalizeValue(
                value,
              ).includes(keyword),
            );

          const matchesFilter =
            paymentFilter ===
              "all" ||
            (paymentFilter ===
              "new" &&
              appointment?.status ===
                "Treatment Done" &&
              totalPaid <= 0) ||
            (paymentFilter ===
              "partial" &&
              (appointment
                ?.status ===
                "Payment Pending" ||
                totalPaid > 0)) ||
            (paymentFilter ===
              "not-ready" &&
              treatmentMissing);

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

  /* ------------------------------------------------------
     Payment modal
  ------------------------------------------------------ */

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

    setSelectedAppointment(
      null,
    );
  };

  /* ------------------------------------------------------
     Save payment
  ------------------------------------------------------ */

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

  /* ------------------------------------------------------
     Render payment card
  ------------------------------------------------------ */

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
          className={
            hasAllergies
              ? `cashier-patient-card cashier-patient-card--allergy ${
                  isPartial
                    ? "cashier-patient-card--partial"
                    : ""
                }`
              : `cashier-patient-card ${
                  isPartial
                    ? "cashier-patient-card--partial"
                    : ""
                }`
          }
        >
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
            onClick={() =>
              openPaymentModal(
                appointment,
              )
            }
            className="cashier-pay-button"
          >
            Pay Now
          </Button>
        </Card>
      </Col>
    );
  };

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
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search patient, phone, appointment or treatment ID"
            className="cashier-search-input"
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
          </Card>
        ) : (
          <Row gutter={[18, 18]}>
            {filteredAppointments.map(
              renderPaymentCard,
            )}
          </Row>
        )}
      </Spin>

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