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
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  EyeOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import { useNavigate } from "react-router-dom";

import dayjs from "dayjs";

import {
  createOrthoCase,
  createPatient,
  getAllOrthoCases,
  getOrthoPaymentsByCase,
  getPatients,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";

import "./css/OrthoPatients.css";

const { Title, Text } = Typography;

/* ========================================================
   HELPERS
======================================================== */

const clean = (value) => String(value ?? "").trim();

const normalize = (value) => clean(value).toLowerCase();

const numberValue = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const formatMoney = (value) =>
  `Rs. ${numberValue(value).toLocaleString("en-LK")}`;

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = dayjs(value);

  if (!parsed.isValid()) {
    return value;
  }

  return parsed.format("DD/MM/YYYY");
};

const getStatusColor = (status) => {
  switch (normalize(status)) {
    case "active":
      return "green";

    case "completed":
      return "blue";

    case "on hold":
      return "orange";

    case "cancelled":
      return "red";

    default:
      return "default";
  }
};

const getNextVisitState = (date) => {
  if (!date) {
    return {
      text: "-",
      color: null,
      overdue: false,
    };
  }

  const nextVisit = dayjs(date).startOf("day");
  const today = dayjs().startOf("day");

  if (!nextVisit.isValid()) {
    return {
      text: date,
      color: null,
      overdue: false,
    };
  }

  if (nextVisit.isBefore(today)) {
    return {
      text: formatDate(date),
      color: "red",
      overdue: true,
    };
  }

  if (nextVisit.isSame(today)) {
    return {
      text: "Today",
      color: "orange",
      overdue: false,
    };
  }

  return {
    text: formatDate(date),
    color: "green",
    overdue: false,
  };
};

/* ========================================================
   PATIENT HELPERS
======================================================== */

const getPatientId = (patient) =>
  clean(patient?.patient_id || patient?.id);

const getPatientName = (patient) =>
  clean(patient?.name || patient?.patient_name);

const getPatientPhone = (patient) =>
  clean(
    patient?.phone ||
      patient?.mobile ||
      patient?.mobile_number,
  );

/* ========================================================
   SUMMARY CARD
======================================================== */

const OrthoSummaryCard = ({
  title,
  value,
  helper,
  icon,
  tone,
  prefix = "",
  onClick,
}) => {
  return (
    <Card
      bordered={false}
      className={`ortho-summary-card ortho-summary-card--${tone}`}
      onClick={onClick}
    >
      <div className="ortho-summary-card__content">
        <div>
          <Text className="ortho-summary-card__title">
            {title}
          </Text>

          <div className="ortho-summary-card__value">
            {prefix}
            {value}
          </div>

          <Text className="ortho-summary-card__helper">
            {helper}
          </Text>
        </div>

        <div className="ortho-summary-card__icon">
          {icon}
        </div>
      </div>
    </Card>
  );
};

/* ========================================================
   COMPONENT
======================================================== */

const OrthoPatients = () => {
  const navigate = useNavigate();

  /* ======================================================
     MAIN STATE
  ====================================================== */

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [cases, setCases] = useState([]);

  const [searchText, setSearchText] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  /* ======================================================
     PATIENT STATE
  ====================================================== */

  const [patients, setPatients] = useState([]);

  const [patientsLoading, setPatientsLoading] = useState(false);

  /* ======================================================
     CREATE ORTHO CASE MODAL
  ====================================================== */

  const [caseModalOpen, setCaseModalOpen] = useState(false);

  const [savingCase, setSavingCase] = useState(false);

  const [caseForm] = Form.useForm();

  const selectedPatientId = Form.useWatch(
    "patient_id",
    caseForm,
  );

  /* ======================================================
     CREATE PATIENT MODAL
  ====================================================== */

  const [patientModalOpen, setPatientModalOpen] =
    useState(false);

  const [savingPatient, setSavingPatient] = useState(false);

  const [patientForm] = Form.useForm();

  const patientHasAllergies = Form.useWatch(
    "has_allergies",
    patientForm,
  );

  /* ======================================================
     LOAD PATIENTS
  ====================================================== */

  const loadPatients = useCallback(async () => {
    try {
      setPatientsLoading(true);

      const response = await getPatients();

      const patientRows =
        response?.data?.data ||
        response?.data?.patients ||
        [];

      const safeRows = Array.isArray(patientRows)
        ? patientRows
        : [];

      setPatients(safeRows);

      return safeRows;
    } catch (err) {
      console.error("Failed to load patients:", err);

      message.error(
        err?.response?.data?.message ||
          "Failed to load patients.",
      );

      return [];
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  /* ======================================================
     LOAD ORTHO CASES
  ====================================================== */

  const loadOrthoCases = useCallback(async () => {
    try {
      setLoading(true);

      setError("");

      const response = await getAllOrthoCases();

      const rawCaseRows =
        response?.data?.data ||
        response?.data?.cases ||
        response?.data ||
        [];

      const caseRows = Array.isArray(rawCaseRows)
        ? rawCaseRows
        : [];

      /*
       * Payments are stored separately.
       * Load financial totals per Ortho case.
       */

      const rowsWithFinancials = await Promise.all(
        caseRows.map(async (item) => {
          try {
            const paymentResponse =
              await getOrthoPaymentsByCase(
                item.ortho_case_id,
              );

            const totalPaid = numberValue(
              paymentResponse?.data?.total_paid ??
                paymentResponse?.data?.data?.total_paid,
            );

            const totalFee = numberValue(
              item.total_treatment_fee,
            );

            return {
              ...item,

              total_paid: totalPaid,

              balance: Math.max(
                totalFee - totalPaid,
                0,
              ),
            };
          } catch (paymentError) {
            console.error(
              `Failed to load payments for ${item.ortho_case_id}:`,
              paymentError,
            );

            return {
              ...item,

              total_paid: 0,

              balance: numberValue(
                item.total_treatment_fee,
              ),
            };
          }
        }),
      );

      setCases(rowsWithFinancials);
    } catch (err) {
      console.error(
        "Failed to load Ortho cases:",
        err,
      );

      const errorMessage =
        err?.response?.data?.message ||
        "Failed to load Ortho patients.";

      setError(errorMessage);

      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ======================================================
     INITIAL LOAD
  ====================================================== */

  useEffect(() => {
    loadOrthoCases();
    loadPatients();
  }, [loadOrthoCases, loadPatients]);

  /* ======================================================
     PATIENT OPTIONS
  ====================================================== */

  const patientOptions = useMemo(() => {
    return patients
      .map((patient) => {
        const patientId = getPatientId(patient);

        if (!patientId) {
          return null;
        }

        const name = getPatientName(patient);
        const phone = getPatientPhone(patient);

        const parts = [
          name || "Unnamed Patient",
          patientId,
          phone,
        ].filter(Boolean);

        return {
          value: patientId,
          label: parts.join(" • "),
        };
      })
      .filter(Boolean);
  }, [patients]);

  const selectedPatient = useMemo(() => {
    if (!selectedPatientId) {
      return null;
    }

    return (
      patients.find(
        (patient) =>
          getPatientId(patient) ===
          clean(selectedPatientId),
      ) || null
    );
  }, [patients, selectedPatientId]);

  /* ======================================================
     FILTERED CASES
  ====================================================== */

  const filteredCases = useMemo(() => {
    let result = [...cases];

    if (
      statusFilter &&
      statusFilter !== "all"
    ) {
      result = result.filter(
        (item) =>
          normalize(item.status) ===
          normalize(statusFilter),
      );
    }

    const keyword = normalize(searchText);

    if (keyword) {
      result = result.filter((item) => {
        const searchable = [
          item.ortho_case_id,
          item.patient_id,
          item.patient_name,
          item.dentist_id,
          item.treatment_type,
          item.treatment_area,
          item.diagnosis,
          item.status,
        ];

        return searchable.some((value) =>
          normalize(value).includes(keyword),
        );
      });
    }

    return result;
  }, [cases, searchText, statusFilter]);

  /* ======================================================
     SUMMARY
  ====================================================== */

  const summary = useMemo(() => {
    const active = cases.filter(
      (item) =>
        normalize(item.status) === "active",
    ).length;

    const completed = cases.filter(
      (item) =>
        normalize(item.status) === "completed",
    ).length;

    const totalPaid = cases.reduce(
      (sum, item) =>
        sum + numberValue(item.total_paid),
      0,
    );

    const totalBalance = cases.reduce(
      (sum, item) =>
        sum + numberValue(item.balance),
      0,
    );

    const overdue = cases.filter((item) => {
      if (
        normalize(item.status) !== "active"
      ) {
        return false;
      }

      if (!item.next_visit_date) {
        return false;
      }

      const date = dayjs(
        item.next_visit_date,
      ).startOf("day");

      return (
        date.isValid() &&
        date.isBefore(dayjs().startOf("day"))
      );
    }).length;

    return {
      total: cases.length,
      active,
      completed,
      totalPaid,
      totalBalance,
      overdue,
    };
  }, [cases]);

  /* ======================================================
     SUMMARY FILTER ACTIONS
  ====================================================== */

  const handleSummaryFilter = (status) => {
    setSearchText("");
    setStatusFilter(status);
  };

  /* ======================================================
     NEW ORTHO CASE
  ====================================================== */

  const handleNewCase = () => {
    caseForm.resetFields();

    caseForm.setFieldsValue({
      start_date: dayjs(),
    });

    setCaseModalOpen(true);
  };

  const handleCloseCaseModal = () => {
    if (savingCase) {
      return;
    }

    setCaseModalOpen(false);

    caseForm.resetFields();
  };

  const handleCreateCase = async () => {
    try {
      const values =
        await caseForm.validateFields();

      setSavingCase(true);

      const payload = {
        patient_id: clean(values.patient_id),

        dentist_id: clean(values.dentist_id),

        start_date: values.start_date
          ? values.start_date.format("YYYY-MM-DD")
          : "",

        treatment_type: clean(
          values.treatment_type,
        ),

        treatment_area: clean(
          values.treatment_area,
        ),

        diagnosis: clean(values.diagnosis),

        estimated_duration: clean(
          values.estimated_duration,
        ),

        total_treatment_fee: numberValue(
          values.total_treatment_fee,
        ),

        payment_plan: clean(
          values.payment_plan,
        ),

        monthly_payment: numberValue(
          values.monthly_payment,
        ),

        next_visit_date: values.next_visit_date
          ? values.next_visit_date.format(
              "YYYY-MM-DD",
            )
          : "",

        notes: clean(values.notes),
      };

      await createOrthoCase(payload);

      message.success(
        "Ortho case created successfully.",
      );

      setCaseModalOpen(false);

      caseForm.resetFields();

      await loadOrthoCases();
    } catch (err) {
      if (err?.errorFields) {
        return;
      }

      console.error(
        "Failed to create Ortho case:",
        err,
      );

      message.error(
        err?.response?.data?.message ||
          "Failed to create Ortho case.",
      );
    } finally {
      setSavingCase(false);
    }
  };

  /* ======================================================
     NEW PATIENT ACTIONS
  ====================================================== */

  const handleOpenNewPatient = () => {
    patientForm.resetFields();

    patientForm.setFieldsValue({
      gender: undefined,
      status: "Active",
      has_allergies: "No",
    });

    setPatientModalOpen(true);
  };

  const handleClosePatientModal = () => {
    if (savingPatient) {
      return;
    }

    setPatientModalOpen(false);

    patientForm.resetFields();
  };

  const handleCreatePatient = async () => {
    try {
      const values =
        await patientForm.validateFields();

      setSavingPatient(true);

      const payload = {
        name: clean(values.name),

        phone: clean(values.phone),

        age: values.age
          ? numberValue(values.age)
          : "",

        gender: clean(values.gender),

        address: clean(values.address),

        location: clean(values.location),

        distance: clean(values.distance),

        status:
          clean(values.status) || "Active",

        has_allergies:
          normalize(values.has_allergies) === "yes"
            ? "Yes"
            : "No",

        allergy_details:
          normalize(values.has_allergies) === "yes"
            ? clean(values.allergy_details)
            : "",
      };

      const response =
        await createPatient(payload);

      const createdPatient =
        response?.data?.data ||
        response?.data?.patient ||
        {};

      let newPatientId =
        getPatientId(createdPatient);

      const updatedPatients =
        await loadPatients();

      if (!newPatientId) {
        const createdMatch =
          updatedPatients.find((patient) => {
            const samePhone =
              getPatientPhone(patient) ===
              clean(values.phone);

            const sameName =
              normalize(
                getPatientName(patient),
              ) === normalize(values.name);

            return samePhone && sameName;
          });

        newPatientId =
          getPatientId(createdMatch);
      }

      if (newPatientId) {
        caseForm.setFieldValue(
          "patient_id",
          newPatientId,
        );
      }

      message.success(
        "Patient created successfully.",
      );

      setPatientModalOpen(false);

      patientForm.resetFields();
    } catch (err) {
      if (err?.errorFields) {
        return;
      }

      console.error(
        "Failed to create patient:",
        err,
      );

      message.error(
        err?.response?.data?.message ||
          "Failed to create patient.",
      );
    } finally {
      setSavingPatient(false);
    }
  };

  /* ======================================================
     OPEN CASE
  ====================================================== */

  const handleOpenCase = (record) => {
    navigate(
      `/ortho/${record.ortho_case_id}`,
    );
  };

  /* ======================================================
     TABLE COLUMNS
  ====================================================== */

  const columns = [
    {
      title: "Case",
      dataIndex: "ortho_case_id",
      key: "ortho_case_id",
      width: 135,

      render: (value) => (
        <div className="ortho-case-id">
          {value || "-"}
        </div>
      ),
    },

    {
      title: "Patient",
      key: "patient",
      width: 230,

      render: (_, record) => (
        <div className="ortho-patient-cell">
          <Avatar
            size={38}
            icon={<UserOutlined />}
            className="ortho-patient-avatar"
          />

          <div>
            <Text
              strong
              className="ortho-patient-name"
            >
              {record.patient_name ||
                record.patient_id ||
                "-"}
            </Text>

            {record.patient_name &&
              record.patient_id && (
                <Text
                  type="secondary"
                  className="ortho-patient-id"
                >
                  {record.patient_id}
                </Text>
              )}
          </div>
        </div>
      ),
    },

    {
      title: "Started",
      dataIndex: "start_date",
      key: "start_date",
      width: 120,

      render: (value) => formatDate(value),
    },

    {
      title: "Treatment",
      key: "treatment",
      width: 190,

      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {record.treatment_type || "-"}
          </Text>

          {record.treatment_area && (
            <Text
              type="secondary"
              className="ortho-secondary-text"
            >
              {record.treatment_area}
            </Text>
          )}
        </Space>
      ),
    },

    {
      title: "Doctor",
      dataIndex: "dentist_id",
      key: "dentist_id",
      width: 120,

      render: (value) => value || "-",
    },

    {
      title: "Fee",
      dataIndex: "total_treatment_fee",
      key: "total_treatment_fee",
      align: "right",
      width: 145,

      render: (value) => (
        <Text strong>
          {formatMoney(value)}
        </Text>
      ),
    },

    {
      title: "Paid",
      dataIndex: "total_paid",
      key: "total_paid",
      align: "right",
      width: 145,

      render: (value) => (
        <Text type="success" strong>
          {formatMoney(value)}
        </Text>
      ),
    },

    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      align: "right",
      width: 145,

      render: (value) => {
        const hasBalance =
          numberValue(value) > 0;

        return (
          <Text
            strong
            type={
              hasBalance
                ? "danger"
                : "success"
            }
          >
            {formatMoney(value)}
          </Text>
        );
      },
    },

    {
      title: "Next Visit",
      dataIndex: "next_visit_date",
      key: "next_visit_date",
      width: 150,

      render: (value) => {
        const state =
          getNextVisitState(value);

        if (state.overdue) {
          return (
            <Tooltip title="Next visit date has passed">
              <Tag
                color="red"
                icon={<WarningOutlined />}
              >
                {state.text}
              </Tag>
            </Tooltip>
          );
        }

        if (state.color) {
          return (
            <Tag
              color={state.color}
              icon={<CalendarOutlined />}
            >
              {state.text}
            </Tag>
          );
        }

        return state.text;
      },
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 115,

      render: (value) => (
        <Tag color={getStatusColor(value)}>
          {value || "Unknown"}
        </Tag>
      ),
    },

    {
      title: "Actions",
      key: "action",
      fixed: "right",
      width: 100,

      render: (_, record) => (
        <Tooltip title="Open Ortho Case">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() =>
              handleOpenCase(record)
            }
          >
            View
          </Button>
        </Tooltip>
      ),
    },
  ];

  /* ======================================================
     UI
  ====================================================== */

  return (
    <ClinicPage
      title="Orthodontic Patients"
      subtitle="Manage orthodontic treatments, visits, payments and progress."
      icon={<MedicineBoxOutlined />}
      actions={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={loadOrthoCases}
        >
          Refresh
        </Button>,

        <Button
          key="new-case"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleNewCase}
        >
          New Ortho Case
        </Button>,
      ]}
    >
      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <Alert
          type="error"
          showIcon
          closable
          message={error}
          className="ortho-error-alert"
          onClose={() => setError("")}
        />
      )}

      {/* ==================================================
          SUMMARY
      ================================================== */}

      <Row
        gutter={[16, 16]}
        className="ortho-summary-row"
      >
        <Col xs={24} sm={12} md={8} xl={4}>
          <OrthoSummaryCard
            title="Total Cases"
            value={summary.total}
            helper="Registered cases"
            tone="blue"
            icon={<TeamOutlined />}
            onClick={() =>
              handleSummaryFilter("all")
            }
          />
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          <OrthoSummaryCard
            title="Active"
            value={summary.active}
            helper="In treatment"
            tone="green"
            icon={<MedicineBoxOutlined />}
            onClick={() =>
              handleSummaryFilter("Active")
            }
          />
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          <OrthoSummaryCard
            title="Completed"
            value={summary.completed}
            helper="Finished cases"
            tone="purple"
            icon={<CheckCircleOutlined />}
            onClick={() =>
              handleSummaryFilter("Completed")
            }
          />
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          <OrthoSummaryCard
            title="Collected"
            value={numberValue(
              summary.totalPaid,
            ).toLocaleString("en-LK")}
            prefix="Rs. "
            helper="Total payments"
            tone="cyan"
            icon={<DollarOutlined />}
          />
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          <OrthoSummaryCard
            title="Outstanding"
            value={numberValue(
              summary.totalBalance,
            ).toLocaleString("en-LK")}
            prefix="Rs. "
            helper="Remaining balance"
            tone="orange"
            icon={<WalletOutlined />}
          />
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          <OrthoSummaryCard
            title="Overdue Visits"
            value={summary.overdue}
            helper="Require follow-up"
            tone="red"
            icon={<WarningOutlined />}
          />
        </Col>
      </Row>

      {/* ==================================================
          ORTHO DIRECTORY
      ================================================== */}

      <Card
        bordered={false}
        className="ortho-directory-card"
      >
        <div className="ortho-directory-header">
          <div>
            <Title level={4}>
              Orthodontic Cases
            </Title>

            <Text type="secondary">
              Search, review and manage
              orthodontic patient cases.
            </Text>
          </div>

          <Tag
            color="blue"
            className="ortho-result-count"
          >
            {filteredCases.length} result
            {filteredCases.length !== 1
              ? "s"
              : ""}
          </Tag>
        </div>

        <div className="ortho-table-toolbar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search case, patient, treatment or doctor"
            value={searchText}
            onChange={(event) =>
              setSearchText(
                event.target.value,
              )
            }
            className="ortho-search-input"
          />

          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            className="ortho-status-filter"
            options={[
              {
                value: "all",
                label: "All Statuses",
              },
              {
                value: "Active",
                label: "Active",
              },
              {
                value: "On Hold",
                label: "On Hold",
              },
              {
                value: "Completed",
                label: "Completed",
              },
              {
                value: "Cancelled",
                label: "Cancelled",
              },
            ]}
          />
        </div>

        <Table
          rowKey="ortho_case_id"
          loading={loading}
          columns={columns}
          dataSource={filteredCases}
          className="ortho-directory-table"
          scroll={{
            x: 1500,
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: [
              10,
              20,
              50,
              100,
            ],
            showTotal: (total) =>
              `${total} Ortho case${
                total === 1 ? "" : "s"
              }`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={
                  Empty.PRESENTED_IMAGE_SIMPLE
                }
                description={
                  searchText ||
                  statusFilter !== "all"
                    ? "No matching Ortho cases found"
                    : "No Ortho cases have been created"
                }
              >
                {!searchText &&
                  statusFilter === "all" && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={
                        handleNewCase
                      }
                    >
                      Create First Ortho Case
                    </Button>
                  )}
              </Empty>
            ),
          }}
        />
      </Card>

      {/* ==================================================
          CREATE ORTHO CASE MODAL
      ================================================== */}

      <Modal
        title={
          <div className="ortho-modal-title">
            <div className="ortho-modal-title__icon">
              <MedicineBoxOutlined />
            </div>

            <div>
              <Text strong>
                Create New Ortho Case
              </Text>

              <Text type="secondary">
                Register a new orthodontic
                treatment case.
              </Text>
            </div>
          </div>
        }
        open={caseModalOpen}
        onCancel={handleCloseCaseModal}
        onOk={handleCreateCase}
        okText="Create Ortho Case"
        confirmLoading={savingCase}
        width={850}
        centered
        destroyOnHidden
        maskClosable={!savingCase}
        closable={!savingCase}
        className="ortho-case-modal"
      >
        <Form
          form={caseForm}
          layout="vertical"
          className="ortho-case-form"
        >
          {/* ==============================================
              PATIENT
          ============================================== */}

          <div className="ortho-modal-section">
            <div className="ortho-modal-section__header">
              <div>
                <Text strong>
                  Patient Information
                </Text>

                <Text
                  type="secondary"
                  className="ortho-section-description"
                >
                  Select the patient for
                  this orthodontic case.
                </Text>
              </div>

              <Button
                type="link"
                size="small"
                icon={<UserAddOutlined />}
                onClick={
                  handleOpenNewPatient
                }
              >
                Add New Patient
              </Button>
            </div>

            <Form.Item
              name="patient_id"
              label="Patient"
              rules={[
                {
                  required: true,
                  message:
                    "Please select a patient.",
                },
              ]}
            >
              <Select
                showSearch
                allowClear
                loading={patientsLoading}
                placeholder="Search and select existing patient"
                optionFilterProp="label"
                options={patientOptions}
                notFoundContent={
                  patientsLoading ? (
                    <Spin size="small" />
                  ) : (
                    <div className="ortho-patient-not-found">
                      <Text type="secondary">
                        No patient found
                      </Text>

                      <Button
                        size="small"
                        type="primary"
                        icon={
                          <UserAddOutlined />
                        }
                        onClick={
                          handleOpenNewPatient
                        }
                      >
                        Add New Patient
                      </Button>
                    </div>
                  )
                }
              />
            </Form.Item>

            {selectedPatient && (
              <Alert
                type="info"
                showIcon
                icon={<UserOutlined />}
                className="ortho-selected-patient"
                message={
                  getPatientName(
                    selectedPatient,
                  ) ||
                  getPatientId(
                    selectedPatient,
                  )
                }
                description={
                  <Space wrap size={16}>
                    <span>
                      ID:{" "}
                      <strong>
                        {getPatientId(
                          selectedPatient,
                        )}
                      </strong>
                    </span>

                    {getPatientPhone(
                      selectedPatient,
                    ) && (
                      <span>
                        Phone:{" "}
                        <strong>
                          {getPatientPhone(
                            selectedPatient,
                          )}
                        </strong>
                      </span>
                    )}

                    {selectedPatient.gender && (
                      <span>
                        Gender:{" "}
                        <strong>
                          {
                            selectedPatient.gender
                          }
                        </strong>
                      </span>
                    )}

                    {selectedPatient.age && (
                      <span>
                        Age:{" "}
                        <strong>
                          {selectedPatient.age}
                        </strong>
                      </span>
                    )}
                  </Space>
                }
              />
            )}
          </div>

          {/* ==============================================
              TREATMENT
          ============================================== */}

          <div className="ortho-modal-section">
            <div className="ortho-modal-section__header">
              <div>
                <Text strong>
                  Treatment Information
                </Text>

                <Text
                  type="secondary"
                  className="ortho-section-description"
                >
                  Basic information about
                  the orthodontic treatment.
                </Text>
              </div>
            </div>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="dentist_id"
                  label="Dentist"
                >
                  <Input
                    placeholder="Dentist ID"
                    autoComplete="off"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="start_date"
                  label="Treatment Start Date"
                  rules={[
                    {
                      required: true,
                      message:
                        "Please select the treatment start date.",
                    },
                  ]}
                >
                  <DatePicker
                    className="ortho-full-width"
                    format="DD/MM/YYYY"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="treatment_type"
                  label="Treatment Type"
                  rules={[
                    {
                      required: true,
                      message:
                        "Please select the treatment type.",
                    },
                  ]}
                >
                  <Select
                    placeholder="Select treatment type"
                    options={[
                      {
                        value:
                          "Fixed Braces",
                        label:
                          "Fixed Braces",
                      },
                      {
                        value:
                          "Removable Appliance",
                        label:
                          "Removable Appliance",
                      },
                      {
                        value:
                          "Clear Aligners",
                        label:
                          "Clear Aligners",
                      },
                      {
                        value:
                          "Retainer",
                        label:
                          "Retainer",
                      },
                      {
                        value: "Other",
                        label: "Other",
                      },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="treatment_area"
                  label="Treatment Area"
                >
                  <Select
                    allowClear
                    placeholder="Select treatment area"
                    options={[
                      {
                        value:
                          "Upper & Lower",
                        label:
                          "Upper & Lower",
                      },
                      {
                        value:
                          "Upper Only",
                        label:
                          "Upper Only",
                      },
                      {
                        value:
                          "Lower Only",
                        label:
                          "Lower Only",
                      },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="estimated_duration"
                  label="Estimated Duration"
                >
                  <Input
                    placeholder="Example: 18 Months"
                    autoComplete="off"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="next_visit_date"
                  label="Next Visit Date"
                >
                  <DatePicker
                    className="ortho-full-width"
                    format="DD/MM/YYYY"
                  />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="diagnosis"
                  label="Diagnosis / Main Problem"
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Example: Crowding, spacing, malocclusion..."
                    maxLength={1000}
                    showCount
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* ==============================================
              FINANCIAL
          ============================================== */}

          <div className="ortho-modal-section">
            <div className="ortho-modal-section__header">
              <div>
                <Text strong>
                  Financial Information
                </Text>

                <Text
                  type="secondary"
                  className="ortho-section-description"
                >
                  Treatment fee and payment
                  plan information.
                </Text>
              </div>
            </div>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="total_treatment_fee"
                  label="Total Treatment Fee"
                  rules={[
                    {
                      required: true,
                      message:
                        "Please enter the total treatment fee.",
                    },
                  ]}
                >
                  <InputNumber
                    className="ortho-full-width"
                    min={0}
                    step={1000}
                    placeholder="180000"
                    formatter={(value) => {
                      if (
                        value === undefined ||
                        value === null ||
                        value === ""
                      ) {
                        return "";
                      }

                      return `Rs. ${String(
                        value,
                      ).replace(
                        /\B(?=(\d{3})+(?!\d))/g,
                        ",",
                      )}`;
                    }}
                    parser={(value) =>
                      String(
                        value ?? "",
                      ).replace(
                        /Rs.\s?|,/g,
                        "",
                      )
                    }
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="payment_plan"
                  label="Payment Plan"
                >
                  <Select
                    allowClear
                    placeholder="Select payment plan"
                    options={[
                      {
                        value: "Monthly",
                        label: "Monthly",
                      },
                      {
                        value:
                          "Installments",
                        label:
                          "Installments",
                      },
                      {
                        value:
                          "Full Payment",
                        label:
                          "Full Payment",
                      },
                      {
                        value: "Custom",
                        label: "Custom",
                      },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="monthly_payment"
                  label="Expected Monthly Payment"
                >
                  <InputNumber
                    className="ortho-full-width"
                    min={0}
                    step={1000}
                    placeholder="10000"
                    formatter={(value) => {
                      if (
                        value === undefined ||
                        value === null ||
                        value === ""
                      ) {
                        return "";
                      }

                      return `Rs. ${String(
                        value,
                      ).replace(
                        /\B(?=(\d{3})+(?!\d))/g,
                        ",",
                      )}`;
                    }}
                    parser={(value) =>
                      String(
                        value ?? "",
                      ).replace(
                        /Rs.\s?|,/g,
                        "",
                      )
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* ==============================================
              NOTES
          ============================================== */}

          <div className="ortho-modal-section">
            <div className="ortho-modal-section__header">
              <div>
                <Text strong>
                  Initial Notes
                </Text>

                <Text
                  type="secondary"
                  className="ortho-section-description"
                >
                  Additional clinical or
                  treatment information.
                </Text>
              </div>
            </div>

            <Form.Item
              name="notes"
              label="Notes"
              className="ortho-last-form-item"
            >
              <Input.TextArea
                rows={4}
                placeholder="Any additional notes about the Ortho treatment..."
                maxLength={1500}
                showCount
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* ==================================================
          ADD NEW PATIENT MODAL
      ================================================== */}

      <Modal
        title={
          <div className="ortho-modal-title">
            <div className="ortho-modal-title__icon ortho-modal-title__icon--patient">
              <UserAddOutlined />
            </div>

            <div>
              <Text strong>
                Add New Patient
              </Text>

              <Text type="secondary">
                Register a patient before
                creating the Ortho case.
              </Text>
            </div>
          </div>
        }
        open={patientModalOpen}
        onCancel={handleClosePatientModal}
        onOk={handleCreatePatient}
        okText="Create Patient"
        confirmLoading={savingPatient}
        width={720}
        centered
        destroyOnHidden
        maskClosable={!savingPatient}
        closable={!savingPatient}
        className="ortho-patient-modal"
      >
        <Alert
          type="info"
          showIcon
          message="New Patient"
          description="After saving, this patient will automatically be selected for the new Ortho case."
          className="ortho-new-patient-alert"
        />

        <Form
          form={patientForm}
          layout="vertical"
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Patient Name"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message:
                      "Please enter the patient name.",
                  },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Patient name"
                  autoComplete="off"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[
                  {
                    required: true,
                    message:
                      "Please enter the phone number.",
                  },
                  {
                    pattern: /^[0-9]{10}$/,
                    message:
                      "Please enter a valid 10-digit phone number.",
                  },
                ]}
              >
                <Input
                  placeholder="0771234567"
                  maxLength={10}
                  autoComplete="off"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="age"
                label="Age"
              >
                <InputNumber
                  min={0}
                  max={120}
                  placeholder="Age"
                  className="ortho-full-width"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="gender"
                label="Gender"
              >
                <Select
                  allowClear
                  placeholder="Select gender"
                  options={[
                    {
                      value: "Male",
                      label: "Male",
                    },
                    {
                      value: "Female",
                      label: "Female",
                    },
                    {
                      value: "Other",
                      label: "Other",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="location"
                label="Location"
              >
                <Input
                  placeholder="Example: Colombo"
                  autoComplete="off"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="distance"
                label="Distance"
              >
                <Input
                  placeholder="Example: 5 km"
                  autoComplete="off"
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                name="address"
                label="Address"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Patient address"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="has_allergies"
                label="Has Allergies?"
              >
                <Select
                  options={[
                    {
                      value: "No",
                      label: "No",
                    },
                    {
                      value: "Yes",
                      label: "Yes",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="status"
                label="Patient Status"
              >
                <Select
                  options={[
                    {
                      value: "Active",
                      label: "Active",
                    },
                    {
                      value: "Inactive",
                      label: "Inactive",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            {normalize(
              patientHasAllergies,
            ) === "yes" && (
              <Col span={24}>
                <Alert
                  type="error"
                  showIcon
                  message="Allergy Information"
                  className="ortho-allergy-alert"
                  description={
                    <Form.Item
                      name="allergy_details"
                      label="Allergy Details"
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message:
                            "Please enter allergy details.",
                        },
                      ]}
                      className="ortho-allergy-form-item"
                    >
                      <Input.TextArea
                        rows={3}
                        maxLength={1000}
                        showCount
                        placeholder="Enter allergy details..."
                      />
                    </Form.Item>
                  }
                />
              </Col>
            )}
          </Row>
        </Form>
      </Modal>
    </ClinicPage>
  );
};

export default OrthoPatients;