import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Select,
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
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  WarningOutlined,
  WalletOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import { getPatientHistory, getPatients } from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";

dayjs.extend(customParseFormat);

const { Text, Title } = Typography;

/* --------------------------------------------------------
   Constants
-------------------------------------------------------- */

const TABLE_PAGE_SIZE_OPTIONS = [5, 10, 20];

const STATUS_COLORS = {
  pending: "default",
  confirmed: "blue",
  "checked in": "cyan",
  "in treatment": "processing",
  "treatment done": "purple",
  "payment pending": "orange",
  partial: "orange",
  paid: "green",
  completed: "green",
  cancelled: "red",
};

/* --------------------------------------------------------
   Shared styles
-------------------------------------------------------- */

const sectionCardStyle = {
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
};

const summaryCardStyle = {
  ...sectionCardStyle,
  height: "100%",
};

const statusTagStyle = {
  marginInlineEnd: 0,
  borderRadius: 999,
  paddingInline: 10,
  fontWeight: 600,
};

const multilineContentStyle = {
  minWidth: 300,
  whiteSpace: "pre-wrap",
  lineHeight: 1.7,
};

/* --------------------------------------------------------
   Response helpers
-------------------------------------------------------- */

const extractArray = (response) => {
  const responseData = response?.data?.data ?? response?.data ?? [];

  return Array.isArray(responseData) ? responseData : [];
};

const normalizeHistoryResponse = (response) => {
  const responseData = response?.data?.data ?? response?.data ?? {};

  return responseData &&
    typeof responseData === "object" &&
    !Array.isArray(responseData)
    ? responseData
    : {};
};

const getErrorMessage = (error, fallbackMessage) => {
  return error?.response?.data?.message || error?.message || fallbackMessage;
};

/* --------------------------------------------------------
   Value helpers
-------------------------------------------------------- */

const convertToBoolean = (value) => {
  if (value === true || value === 1) {
    return true;
  }

  return ["true", "yes", "1"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
};

const toNumber = (value) => {
  const parsedNumber = Number(value || 0);

  return Number.isNaN(parsedNumber) ? 0 : parsedNumber;
};

const formatCurrency = (value) => {
  return `Rs. ${toNumber(value).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatStatisticCurrency = (value) => {
  return toNumber(value).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsedDate = dayjs(value);

  return parsedDate.isValid() ? parsedDate.format("DD MMM YYYY") : value;
};

const formatTime = (value) => {
  if (!value) {
    return "-";
  }

  const supportedFormats = ["HH:mm", "HH:mm:ss", "h:mm A", "hh:mm A"];

  for (const supportedFormat of supportedFormats) {
    const parsedTime = dayjs(value, supportedFormat, true);

    if (parsedTime.isValid()) {
      return parsedTime.format("h:mm A");
    }
  }

  return value;
};

const getStatusColor = (statusValue) => {
  const normalizedStatus = String(statusValue || "")
    .trim()
    .toLowerCase();

  return STATUS_COLORS[normalizedStatus] || "default";
};

const getStatusIcon = (statusValue) => {
  const normalizedStatus = String(statusValue || "")
    .trim()
    .toLowerCase();

  if (normalizedStatus === "completed" || normalizedStatus === "paid") {
    return <CheckCircleOutlined />;
  }

  if (normalizedStatus === "pending" || normalizedStatus === "confirmed") {
    return <ClockCircleOutlined />;
  }

  return null;
};

/* --------------------------------------------------------
   Component
-------------------------------------------------------- */

const PatientHistory = () => {
  /* --------------------------------------------------------
     State
  -------------------------------------------------------- */

  const [patientsLoading, setPatientsLoading] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);

  const [patients, setPatients] = useState([]);

  const [selectedPatientId, setSelectedPatientId] = useState("");

  const [history, setHistory] = useState(null);

  /* --------------------------------------------------------
     Load patients
  -------------------------------------------------------- */

  const loadPatients = useCallback(async () => {
    setPatientsLoading(true);

    try {
      const response = await getPatients();

      const patientRecords = extractArray(response);

      setPatients(patientRecords);
    } catch (error) {
      console.error("Failed to load patients:", error);

      message.error(getErrorMessage(error, "Failed to load patients."));
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  /* --------------------------------------------------------
     Load patient history
  -------------------------------------------------------- */

  const loadPatientHistory = useCallback(
    async (patientId, showSuccessMessage = false) => {
      if (!patientId) {
        setHistory(null);
        return;
      }

      setHistoryLoading(true);

      try {
        const response = await getPatientHistory(patientId);

        const patientHistory = normalizeHistoryResponse(response);

        setHistory(patientHistory);

        if (showSuccessMessage) {
          message.success("Patient history refreshed.");
        }
      } catch (error) {
        console.error("Failed to load patient history:", error);

        setHistory(null);

        message.error(
          getErrorMessage(error, "Failed to load patient history."),
        );
      } finally {
        setHistoryLoading(false);
      }
    },
    [],
  );

  /* --------------------------------------------------------
     Event handlers
  -------------------------------------------------------- */

  const handlePatientChange = (patientId) => {
    const normalizedPatientId = patientId || "";

    setSelectedPatientId(normalizedPatientId);

    if (!normalizedPatientId) {
      setHistory(null);
      return;
    }

    setHistory(null);

    loadPatientHistory(normalizedPatientId);
  };

  const handleReloadHistory = () => {
    if (!selectedPatientId) {
      return;
    }

    loadPatientHistory(selectedPatientId, true);
  };

  /* --------------------------------------------------------
     Normalized history data
  -------------------------------------------------------- */

  const patient = history?.personal_information ?? null;

  const appointments = Array.isArray(history?.appointment_history)
    ? history.appointment_history
    : [];

  const treatments = Array.isArray(history?.treatment_history)
    ? history.treatment_history
    : [];

  const prescriptions = Array.isArray(history?.prescription_history)
    ? history.prescription_history
    : [];

  const payments = Array.isArray(history?.payment_history)
    ? history.payment_history
    : [];

  const doctorNotes = Array.isArray(history?.doctor_notes)
    ? history.doctor_notes
    : [];

  /* --------------------------------------------------------
     Patient search options
  -------------------------------------------------------- */

  const patientOptions = useMemo(() => {
    return patients
      .map((patientRecord) => {
        const patientId = patientRecord?.id || "";

        const patientName = patientRecord?.name || "Unnamed Patient";

        const patientPhone = patientRecord?.phone || "No phone";

        return {
          value: patientId,
          label: `${patientName} • ${patientPhone} • ${patientId}`,
        };
      })
      .filter((patientOption) => patientOption.value);
  }, [patients]);

  /* --------------------------------------------------------
     Summary calculations
  -------------------------------------------------------- */

  const totalTreatmentCharge = useMemo(() => {
    const treatmentChargeMap = new Map();

    payments.forEach((paymentRecord) => {
      const treatmentId = paymentRecord?.treatment_id;

      if (!treatmentId) {
        return;
      }

      const currentTreatmentCharge = treatmentChargeMap.get(treatmentId) || 0;

      const paymentTreatmentCharge = toNumber(paymentRecord?.treatment_charge);

      treatmentChargeMap.set(
        treatmentId,
        Math.max(currentTreatmentCharge, paymentTreatmentCharge),
      );
    });

    return Array.from(treatmentChargeMap.values()).reduce(
      (totalCharge, treatmentCharge) => totalCharge + treatmentCharge,
      0,
    );
  }, [payments]);

  const totalPaid = useMemo(() => {
    return payments.reduce((totalPaymentAmount, paymentRecord) => {
      return totalPaymentAmount + toNumber(paymentRecord?.payment_amount);
    }, 0);
  }, [payments]);

  const outstandingBalance = Math.max(totalTreatmentCharge - totalPaid, 0);

  const upcomingAppointments = useMemo(() => {
    const today = dayjs().startOf("day");

    return appointments.filter((appointmentRecord) => {
      const appointmentDate = dayjs(appointmentRecord?.appointment_date);

      const appointmentStatus = String(appointmentRecord?.status || "")
        .trim()
        .toLowerCase();

      return (
        appointmentDate.isValid() &&
        !appointmentDate.isBefore(today) &&
        !["cancelled", "completed"].includes(appointmentStatus)
      );
    });
  }, [appointments]);

  const lastTreatment = useMemo(() => {
    return [...treatments]
      .filter((treatmentRecord) => treatmentRecord?.treatment_date)
      .sort((firstTreatment, secondTreatment) => {
        return (
          dayjs(secondTreatment.treatment_date).valueOf() -
          dayjs(firstTreatment.treatment_date).valueOf()
        );
      })[0];
  }, [treatments]);

  const hasAllergies = convertToBoolean(
    patient?.has_allergies ?? patient?.is_allergies,
  );

  const allergyDetails =
    patient?.allergy_details ||
    patient?.allergies ||
    "No allergy details have been provided.";

  /* --------------------------------------------------------
     Appointment table columns
  -------------------------------------------------------- */

  const appointmentColumns = useMemo(
    () => [
      {
        title: "Date",
        dataIndex: "appointment_date",
        key: "appointment_date",
        width: 150,
        render: (value) => (
          <Space size={7}>
            <CalendarOutlined
              style={{
                color: "#1677ff",
              }}
            />

            <Text>{formatDate(value)}</Text>
          </Space>
        ),
      },
      {
        title: "Time",
        dataIndex: "appointment_time",
        key: "appointment_time",
        width: 120,
        render: formatTime,
      },
      {
        title: "Appointment ID",
        dataIndex: "id",
        key: "id",
        width: 190,
        render: (value) => <Text code>{value || "-"}</Text>,
      },
      {
        title: "Reason for Visit",
        dataIndex: "reason_for_visit",
        key: "reason_for_visit",
        width: 260,
        render: (value) => <Text>{value || "-"}</Text>,
      },
      {
        title: "Dentist",
        dataIndex: "dentist_name",
        key: "dentist",
        width: 180,
        render: (value, appointmentRecord) => (
          <Text>{value || appointmentRecord?.dentist_id || "-"}</Text>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 160,
        fixed: "right",
        render: (value) => {
          const appointmentStatus = value || "Pending";

          return (
            <Tag
              color={getStatusColor(appointmentStatus)}
              icon={getStatusIcon(appointmentStatus)}
              style={statusTagStyle}
            >
              {appointmentStatus}
            </Tag>
          );
        },
      },
    ],
    [],
  );

  /* --------------------------------------------------------
     Treatment table columns
  -------------------------------------------------------- */

  const treatmentColumns = useMemo(
    () => [
      {
        title: "Date",
        dataIndex: "treatment_date",
        key: "treatment_date",
        width: 150,
        render: formatDate,
      },
      {
        title: "Treatment ID",
        dataIndex: "id",
        key: "id",
        width: 190,
        render: (value) => <Text code>{value || "-"}</Text>,
      },
      {
        title: "Appointment",
        dataIndex: "appointment_id",
        key: "appointment_id",
        width: 190,
        render: (value) => <Text>{value || "-"}</Text>,
      },
      {
        title: "Diagnosis",
        dataIndex: "diagnosis",
        key: "diagnosis",
        width: 240,
        render: (value) => <Text>{value || "-"}</Text>,
      },
      {
        title: "Treatment Performed",
        dataIndex: "treatment_performed",
        key: "treatment_performed",
        width: 300,
        render: (value) => <Text>{value || "-"}</Text>,
      },
      {
        title: "Next Visit",
        dataIndex: "next_appointment_date",
        key: "next_appointment_date",
        width: 170,
        render: (value) => {
          if (!value) {
            return <Text type="secondary">Not scheduled</Text>;
          }

          return (
            <Tag
              color="blue"
              icon={<CalendarOutlined />}
              style={statusTagStyle}
            >
              {formatDate(value)}
            </Tag>
          );
        },
      },
    ],
    [],
  );

  /* --------------------------------------------------------
     Payment table columns
  -------------------------------------------------------- */

  const paymentColumns = useMemo(
    () => [
      {
        title: "Payment Date",
        dataIndex: "payment_date",
        key: "payment_date",
        width: 160,
        render: formatDate,
      },
      {
        title: "Payment ID",
        dataIndex: "id",
        key: "id",
        width: 180,
        render: (value) => <Text code>{value || "-"}</Text>,
      },
      {
        title: "Treatment",
        dataIndex: "treatment_id",
        key: "treatment_id",
        width: 190,
        render: (value) => <Text>{value || "-"}</Text>,
      },
      {
        title: "Treatment Charge",
        dataIndex: "treatment_charge",
        key: "treatment_charge",
        align: "right",
        width: 180,
        render: formatCurrency,
      },
      {
        title: "Paid Amount",
        dataIndex: "payment_amount",
        key: "payment_amount",
        align: "right",
        width: 160,
        render: (value) => (
          <Text
            strong
            style={{
              color: "#389e0d",
            }}
          >
            {formatCurrency(value)}
          </Text>
        ),
      },
      {
        title: "Method",
        dataIndex: "payment_method",
        key: "payment_method",
        width: 150,
        render: (value) => <Text>{value || "-"}</Text>,
      },
      {
        title: "Receipt",
        dataIndex: "receipt_number",
        key: "receipt_number",
        width: 160,
        render: (value) => <Text>{value || "-"}</Text>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        fixed: "right",
        width: 130,
        render: (value) => {
          const paymentStatus = value || "Pending";

          return (
            <Tag
              color={getStatusColor(paymentStatus)}
              icon={getStatusIcon(paymentStatus)}
              style={statusTagStyle}
            >
              {paymentStatus}
            </Tag>
          );
        },
      },
    ],
    [],
  );

  /* --------------------------------------------------------
     Prescription table columns
  -------------------------------------------------------- */

  const prescriptionColumns = useMemo(
    () => [
      {
        title: "Treatment Date",
        dataIndex: "treatment_date",
        key: "treatment_date",
        width: 170,
        render: formatDate,
      },
      {
        title: "Treatment ID",
        dataIndex: "treatment_id",
        key: "treatment_id",
        width: 200,
        render: (value) => <Text code>{value || "-"}</Text>,
      },
      {
        title: "Prescription",
        dataIndex: "prescription",
        key: "prescription",
        render: (value) => (
          <div style={multilineContentStyle}>{value || "-"}</div>
        ),
      },
    ],
    [],
  );

  /* --------------------------------------------------------
     Doctor note table columns
  -------------------------------------------------------- */

  const doctorNoteColumns = useMemo(
    () => [
      {
        title: "Treatment Date",
        dataIndex: "treatment_date",
        key: "treatment_date",
        width: 170,
        render: formatDate,
      },
      {
        title: "Treatment ID",
        dataIndex: "treatment_id",
        key: "treatment_id",
        width: 200,
        render: (value) => <Text code>{value || "-"}</Text>,
      },
      {
        title: "Clinical Notes",
        dataIndex: "doctor_notes",
        key: "doctor_notes",
        render: (value) => (
          <div style={multilineContentStyle}>{value || "-"}</div>
        ),
      },
    ],
    [],
  );

  /* --------------------------------------------------------
     Shared table pagination
  -------------------------------------------------------- */

  const createPagination = (recordName) => ({
    defaultPageSize: 5,
    showSizeChanger: true,
    pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
    showTotal: (total) => `${total} ${recordName}`,
  });

  /* --------------------------------------------------------
     History tabs
  -------------------------------------------------------- */

  const historyTabs = useMemo(
    () => [
      {
        key: "appointments",
        label: (
          <Space size={6}>
            <CalendarOutlined />

            <span>Appointments</span>

            <Tag>{appointments.length}</Tag>
          </Space>
        ),
        children: (
          <Table
            rowKey={(appointmentRecord, index) =>
              appointmentRecord?.id || `appointment-${index}`
            }
            columns={appointmentColumns}
            dataSource={appointments}
            size="middle"
            pagination={createPagination("appointments")}
            scroll={{
              x: 1150,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No appointment records"
                />
              ),
            }}
          />
        ),
      },
      {
        key: "treatments",
        label: (
          <Space size={6}>
            <MedicineBoxOutlined />

            <span>Treatments</span>

            <Tag>{treatments.length}</Tag>
          </Space>
        ),
        children: (
          <Table
            rowKey={(treatmentRecord, index) =>
              treatmentRecord?.id || `treatment-${index}`
            }
            columns={treatmentColumns}
            dataSource={treatments}
            size="middle"
            pagination={createPagination("treatments")}
            scroll={{
              x: 1250,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No treatment records"
                />
              ),
            }}
          />
        ),
      },
      {
        key: "payments",
        label: (
          <Space size={6}>
            <DollarOutlined />

            <span>Payments</span>

            <Tag>{payments.length}</Tag>
          </Space>
        ),
        children: (
          <Table
            rowKey={(paymentRecord, index) =>
              paymentRecord?.id || `payment-${index}`
            }
            columns={paymentColumns}
            dataSource={payments}
            size="middle"
            pagination={createPagination("payments")}
            scroll={{
              x: 1350,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No payment records"
                />
              ),
            }}
          />
        ),
      },
      {
        key: "prescriptions",
        label: (
          <Space size={6}>
            <FileTextOutlined />

            <span>Prescriptions</span>

            <Tag>{prescriptions.length}</Tag>
          </Space>
        ),
        children: (
          <Table
            rowKey={(prescriptionRecord, index) =>
              `${prescriptionRecord?.treatment_id || "prescription"}-${index}`
            }
            columns={prescriptionColumns}
            dataSource={prescriptions}
            size="middle"
            pagination={createPagination("prescriptions")}
            scroll={{
              x: 800,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No prescription records"
                />
              ),
            }}
          />
        ),
      },
      {
        key: "doctor-notes",
        label: (
          <Space size={6}>
            <FileTextOutlined />

            <span>Doctor Notes</span>

            <Tag>{doctorNotes.length}</Tag>
          </Space>
        ),
        children: (
          <Table
            rowKey={(doctorNoteRecord, index) =>
              `${doctorNoteRecord?.treatment_id || "doctor-note"}-${index}`
            }
            columns={doctorNoteColumns}
            dataSource={doctorNotes}
            size="middle"
            pagination={createPagination("doctor notes")}
            scroll={{
              x: 800,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No doctor notes"
                />
              ),
            }}
          />
        ),
      },
    ],
    [
      appointments,
      treatments,
      payments,
      prescriptions,
      doctorNotes,
      appointmentColumns,
      treatmentColumns,
      paymentColumns,
      prescriptionColumns,
      doctorNoteColumns,
    ],
  );

  /* --------------------------------------------------------
     Render
  -------------------------------------------------------- */

  return (
    <ClinicPage
      title="Patient History"
      subtitle="Search for a patient and review their complete clinical and payment history."
      icon={<HistoryOutlined />}
      actions={
        <Button
          icon={<ReloadOutlined />}
          loading={patientsLoading}
          onClick={loadPatients}
        >
          Refresh Patients
        </Button>
      }
    >
      {/* --------------------------------------------------
          Patient search
      -------------------------------------------------- */}

      <Card
        style={{
          ...sectionCardStyle,
          marginBottom: 16,
        }}
        styles={{
          body: {
            padding: 18,
          },
        }}
      >
        <Row gutter={[16, 12]} align="bottom">
          <Col xs={24} lg={18}>
            <Text
              strong
              style={{
                display: "block",
                marginBottom: 8,
              }}
            >
              Search Patient
            </Text>

            <Select
              showSearch
              allowClear
              size="large"
              value={selectedPatientId || undefined}
              options={patientOptions}
              loading={patientsLoading}
              optionFilterProp="label"
              placeholder="Search by patient name, phone number or patient ID"
              suffixIcon={<SearchOutlined />}
              notFoundContent={
                patientsLoading ? "Loading patients..." : "No patients found"
              }
              onChange={handlePatientChange}
              style={{
                width: "100%",
              }}
            />
          </Col>

          <Col xs={24} lg={6}>
            <Button
              block
              size="large"
              type="primary"
              icon={<ReloadOutlined />}
              disabled={!selectedPatientId}
              loading={historyLoading}
              onClick={handleReloadHistory}
            >
              Reload History
            </Button>
          </Col>
        </Row>
      </Card>

      {/* --------------------------------------------------
          No patient selected
      -------------------------------------------------- */}

      {!selectedPatientId && (
        <Card
          style={sectionCardStyle}
          styles={{
            body: {
              minHeight: 360,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            },
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size={2}>
                <Text strong>Select a patient</Text>

                <Text type="secondary">
                  Search using the patient&apos;s name, phone number or patient
                  ID.
                </Text>
              </Space>
            }
          />
        </Card>
      )}

      {/* --------------------------------------------------
          Initial history loading
      -------------------------------------------------- */}

      {selectedPatientId && historyLoading && !history && (
        <Card
          style={sectionCardStyle}
          styles={{
            body: {
              minHeight: 360,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            },
          }}
        >
          <Spin size="large" tip="Loading patient history...">
            <div
              style={{
                width: 260,
                height: 160,
              }}
            />
          </Spin>
        </Card>
      )}

      {/* --------------------------------------------------
          Patient history content
      -------------------------------------------------- */}

      {history && (
        <Spin spinning={historyLoading} tip="Refreshing patient history...">
          <Space
            direction="vertical"
            size={16}
            style={{
              width: "100%",
            }}
          >
            {/* Patient information */}

            {patient && (
              <Card
                style={{
                  ...sectionCardStyle,
                  borderLeft: hasAllergies
                    ? "5px solid #ff4d4f"
                    : "5px solid #1677ff",
                }}
                styles={{
                  body: {
                    padding: 20,
                  },
                }}
              >
                <Row gutter={[24, 20]} align="middle">
                  <Col xs={24} md={8} xl={7}>
                    <Space size={14} align="center">
                      <Avatar
                        size={64}
                        icon={<UserOutlined />}
                        style={{
                          backgroundColor: hasAllergies ? "#ff4d4f" : "#1677ff",
                          flexShrink: 0,
                        }}
                      />

                      <div>
                        <Title
                          level={4}
                          style={{
                            marginBottom: 4,
                          }}
                        >
                          {patient?.name || "Unnamed Patient"}
                        </Title>

                        <Space size={[6, 6]} wrap>
                          <Tag color="blue">
                            {patient?.id || selectedPatientId}
                          </Tag>

                          {hasAllergies ? (
                            <Tag color="red" icon={<WarningOutlined />}>
                              Allergy Patient
                            </Tag>
                          ) : (
                            <Tag color="green" icon={<CheckCircleOutlined />}>
                              No Allergies
                            </Tag>
                          )}
                        </Space>
                      </div>
                    </Space>
                  </Col>

                  <Col xs={24} md={16} xl={17}>
                    <Descriptions
                      size="small"
                      column={{
                        xs: 1,
                        sm: 2,
                        lg: 4,
                      }}
                    >
                      <Descriptions.Item label="Phone">
                        <Space size={6}>
                          <PhoneOutlined />

                          <span>{patient?.phone || "-"}</span>
                        </Space>
                      </Descriptions.Item>

                      <Descriptions.Item label="Gender">
                        {patient?.gender || "-"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Age">
                        {patient?.age ? `${patient.age} years` : "-"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Address">
                        {patient?.address || "-"}
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                </Row>
              </Card>
            )}

            {/* Allergy warning */}

            {patient && hasAllergies && (
              <Alert
                type="error"
                showIcon
                icon={<WarningOutlined />}
                message="Important Allergy Warning"
                description={allergyDetails}
                style={{
                  borderRadius: 10,
                }}
              />
            )}

            {/* Summary cards */}

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} xl={6}>
                <Card style={summaryCardStyle}>
                  <Statistic
                    title="Total Appointments"
                    value={appointments.length}
                    prefix={<CalendarOutlined />}
                  />

                  <Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                    }}
                  >
                    {upcomingAppointments.length} upcoming appointment
                    {upcomingAppointments.length === 1 ? "" : "s"}
                  </Text>
                </Card>
              </Col>

              <Col xs={24} sm={12} xl={6}>
                <Card style={summaryCardStyle}>
                  <Statistic
                    title="Treatments"
                    value={treatments.length}
                    prefix={<MedicineBoxOutlined />}
                  />

                  <Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                    }}
                  >
                    Last treatment:{" "}
                    {lastTreatment
                      ? formatDate(lastTreatment.treatment_date)
                      : "No records"}
                  </Text>
                </Card>
              </Col>

              <Col xs={24} sm={12} xl={6}>
                <Card style={summaryCardStyle}>
                  <Statistic
                    title="Total Paid"
                    value={totalPaid}
                    prefix="Rs."
                    formatter={formatStatisticCurrency}
                    valueStyle={{
                      color: "#389e0d",
                    }}
                  />

                  <Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                    }}
                  >
                    {payments.length} payment record
                    {payments.length === 1 ? "" : "s"}
                  </Text>
                </Card>
              </Col>

              <Col xs={24} sm={12} xl={6}>
                <Card style={summaryCardStyle}>
                  <Statistic
                    title="Outstanding"
                    value={outstandingBalance}
                    prefix="Rs."
                    formatter={formatStatisticCurrency}
                    valueStyle={{
                      color: outstandingBalance > 0 ? "#d46b08" : "#389e0d",
                    }}
                  />

                  <Tag
                    color={outstandingBalance > 0 ? "orange" : "green"}
                    icon={
                      outstandingBalance > 0 ? (
                        <WalletOutlined />
                      ) : (
                        <CheckCircleOutlined />
                      )
                    }
                    style={{
                      ...statusTagStyle,
                      marginTop: 4,
                    }}
                  >
                    {outstandingBalance > 0 ? "Payment Pending" : "Fully Paid"}
                  </Tag>
                </Card>
              </Col>
            </Row>

            {/* Patient records */}

            <Card
              title={
                <Space>
                  <HistoryOutlined />

                  <span>Patient Records</span>
                </Space>
              }
              style={sectionCardStyle}
              styles={{
                body: {
                  padding: "0 16px 16px",
                },
              }}
            >
              <Tabs defaultActiveKey="appointments" items={historyTabs} />
            </Card>
          </Space>
        </Spin>
      )}
    </ClinicPage>
  );
};

export default PatientHistory;
