// src/pages/OrthoPatients.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
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
  EyeOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
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

const {
  Title,
  Text,
} = Typography;

/* ========================================================
   HELPERS
======================================================== */

const clean = (value) =>
  String(value ?? "").trim();

const normalize = (value) =>
  clean(value).toLowerCase();

const numberValue = (value) => {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const formatMoney = (value) =>
  `Rs. ${numberValue(
    value,
  ).toLocaleString("en-LK")}`;

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsed =
    dayjs(value);

  if (!parsed.isValid()) {
    return value;
  }

  return parsed.format(
    "DD/MM/YYYY",
  );
};

const getStatusColor = (
  status,
) => {
  switch (
    normalize(status)
  ) {
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

const getNextVisitState = (
  date,
) => {
  if (!date) {
    return {
      text: "-",
      color: null,
      overdue: false,
    };
  }

  const nextVisit =
    dayjs(date).startOf(
      "day",
    );

  const today =
    dayjs().startOf("day");

  if (
    !nextVisit.isValid()
  ) {
    return {
      text: date,
      color: null,
      overdue: false,
    };
  }

  if (
    nextVisit.isBefore(
      today,
    )
  ) {
    return {
      text:
        formatDate(date),

      color:
        "red",

      overdue:
        true,
    };
  }

  if (
    nextVisit.isSame(
      today,
    )
  ) {
    return {
      text:
        "Today",

      color:
        "orange",

      overdue:
        false,
    };
  }

  return {
    text:
      formatDate(date),

    color:
      "green",

    overdue:
      false,
  };
};

/* ========================================================
   PATIENT HELPERS
======================================================== */

const getPatientId = (
  patient,
) =>
  clean(
    patient?.patient_id ||
      patient?.id,
  );

const getPatientName = (
  patient,
) =>
  clean(
    patient?.name ||
      patient?.patient_name,
  );

const getPatientPhone = (
  patient,
) =>
  clean(
    patient?.phone ||
      patient?.mobile ||
      patient?.mobile_number,
  );

/* ========================================================
   COMPONENT
======================================================== */

const OrthoPatients = () => {
  const navigate =
    useNavigate();

  /* ======================================================
     MAIN STATE
  ====================================================== */

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    cases,
    setCases,
  ] = useState([]);

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState(
    "all",
  );

  /* ======================================================
     PATIENT STATE
  ====================================================== */

  const [
    patients,
    setPatients,
  ] = useState([]);

  const [
    patientsLoading,
    setPatientsLoading,
  ] = useState(false);

  /* ======================================================
     CREATE ORTHO CASE MODAL
  ====================================================== */

  const [
    caseModalOpen,
    setCaseModalOpen,
  ] = useState(false);

  const [
    savingCase,
    setSavingCase,
  ] = useState(false);

  const [caseForm] =
    Form.useForm();

  const selectedPatientId =
    Form.useWatch(
      "patient_id",
      caseForm,
    );

  /* ======================================================
     CREATE PATIENT MODAL
  ====================================================== */

  const [
    patientModalOpen,
    setPatientModalOpen,
  ] = useState(false);

  const [
    savingPatient,
    setSavingPatient,
  ] = useState(false);

  const [patientForm] =
    Form.useForm();

  const patientHasAllergies =
    Form.useWatch(
      "has_allergies",
      patientForm,
    );

  /* ======================================================
     LOAD PATIENTS
  ====================================================== */

  const loadPatients =
    useCallback(async () => {
      try {
        setPatientsLoading(
          true,
        );

        const response =
          await getPatients();

        const patientRows =
          response?.data?.data ||
          response?.data
            ?.patients ||
          [];

        const safeRows =
          Array.isArray(
            patientRows,
          )
            ? patientRows
            : [];

        setPatients(
          safeRows,
        );

        return safeRows;
      } catch (err) {
        console.error(
          "Failed to load patients:",
          err,
        );

        message.error(
          err?.response?.data
            ?.message ||
            "Failed to load patients.",
        );

        return [];
      } finally {
        setPatientsLoading(
          false,
        );
      }
    }, []);

  /* ======================================================
     LOAD ORTHO CASES
  ====================================================== */

  const loadOrthoCases =
    useCallback(async () => {
      try {
        setLoading(true);

        setError("");

        const response =
          await getAllOrthoCases();

        const caseRows =
          response?.data?.data ||
          [];

        /*
         * Payments are stored separately.
         * Load financial totals per Ortho case.
         */

        const rowsWithFinancials =
          await Promise.all(
            caseRows.map(
              async (
                item,
              ) => {
                try {
                  const paymentResponse =
                    await getOrthoPaymentsByCase(
                      item.ortho_case_id,
                    );

                  const totalPaid =
                    numberValue(
                      paymentResponse
                        ?.data
                        ?.total_paid,
                    );

                  const totalFee =
                    numberValue(
                      item.total_treatment_fee,
                    );

                  return {
                    ...item,

                    total_paid:
                      totalPaid,

                    balance:
                      Math.max(
                        totalFee -
                          totalPaid,
                        0,
                      ),
                  };
                } catch (
                  paymentError
                ) {
                  console.error(
                    `Failed to load payments for ${item.ortho_case_id}:`,
                    paymentError,
                  );

                  return {
                    ...item,

                    total_paid:
                      0,

                    balance:
                      numberValue(
                        item.total_treatment_fee,
                      ),
                  };
                }
              },
            ),
          );

        setCases(
          rowsWithFinancials,
        );
      } catch (err) {
        console.error(
          "Failed to load Ortho cases:",
          err,
        );

        const errorMessage =
          err?.response?.data
            ?.message ||
          "Failed to load Ortho patients.";

        setError(
          errorMessage,
        );

        message.error(
          errorMessage,
        );
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
  }, [
    loadOrthoCases,
    loadPatients,
  ]);

  /* ======================================================
     PATIENT OPTIONS
  ====================================================== */

  const patientOptions =
    useMemo(() => {
      return patients
        .map(
          (patient) => {
            const patientId =
              getPatientId(
                patient,
              );

            if (!patientId) {
              return null;
            }

            const name =
              getPatientName(
                patient,
              );

            const phone =
              getPatientPhone(
                patient,
              );

            const parts = [
              name ||
                "Unnamed Patient",

              patientId,

              phone,
            ].filter(Boolean);

            return {
              value:
                patientId,

              label:
                parts.join(
                  " • ",
                ),
            };
          },
        )
        .filter(Boolean);
    }, [patients]);

  const selectedPatient =
    useMemo(() => {
      if (
        !selectedPatientId
      ) {
        return null;
      }

      return (
        patients.find(
          (patient) =>
            getPatientId(
              patient,
            ) ===
            clean(
              selectedPatientId,
            ),
        ) || null
      );
    }, [
      patients,
      selectedPatientId,
    ]);

  /* ======================================================
     FILTERED CASES
  ====================================================== */

  const filteredCases =
    useMemo(() => {
      let result = [
        ...cases,
      ];

      if (
        statusFilter &&
        statusFilter !==
          "all"
      ) {
        result =
          result.filter(
            (item) =>
              normalize(
                item.status,
              ) ===
              normalize(
                statusFilter,
              ),
          );
      }

      const keyword =
        normalize(
          searchText,
        );

      if (keyword) {
        result =
          result.filter(
            (item) => {
              const searchable =
                [
                  item.ortho_case_id,
                  item.patient_id,
                  item.patient_name,
                  item.dentist_id,
                  item.treatment_type,
                  item.treatment_area,
                  item.diagnosis,
                  item.status,
                ];

              return searchable.some(
                (
                  value,
                ) =>
                  normalize(
                    value,
                  ).includes(
                    keyword,
                  ),
              );
            },
          );
      }

      return result;
    }, [
      cases,
      searchText,
      statusFilter,
    ]);

  /* ======================================================
     SUMMARY
  ====================================================== */

  const summary =
    useMemo(() => {
      const active =
        cases.filter(
          (item) =>
            normalize(
              item.status,
            ) ===
            "active",
        ).length;

      const completed =
        cases.filter(
          (item) =>
            normalize(
              item.status,
            ) ===
            "completed",
        ).length;

      const totalPaid =
        cases.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            numberValue(
              item.total_paid,
            ),
          0,
        );

      const totalBalance =
        cases.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            numberValue(
              item.balance,
            ),
          0,
        );

      const overdue =
        cases.filter(
          (item) => {
            if (
              normalize(
                item.status,
              ) !==
              "active"
            ) {
              return false;
            }

            if (
              !item.next_visit_date
            ) {
              return false;
            }

            const date =
              dayjs(
                item.next_visit_date,
              ).startOf(
                "day",
              );

            return (
              date.isValid() &&
              date.isBefore(
                dayjs().startOf(
                  "day",
                ),
              )
            );
          },
        ).length;

      return {
        total:
          cases.length,

        active,

        completed,

        totalPaid,

        totalBalance,

        overdue,
      };
    }, [cases]);

  /* ======================================================
     NEW ORTHO CASE
  ====================================================== */

  const handleNewCase =
    () => {
      caseForm.resetFields();

      caseForm.setFieldsValue(
        {
          start_date:
            dayjs(),
        },
      );

      setCaseModalOpen(
        true,
      );
    };

  const handleCloseCaseModal =
    () => {
      if (savingCase) {
        return;
      }

      setCaseModalOpen(
        false,
      );

      caseForm.resetFields();
    };

  const handleCreateCase =
    async () => {
      try {
        const values =
          await caseForm.validateFields();

        setSavingCase(
          true,
        );

        const payload = {
          patient_id:
            clean(
              values.patient_id,
            ),

          dentist_id:
            clean(
              values.dentist_id,
            ),

          start_date:
            values.start_date
              ? values.start_date.format(
                  "YYYY-MM-DD",
                )
              : "",

          treatment_type:
            clean(
              values.treatment_type,
            ),

          treatment_area:
            clean(
              values.treatment_area,
            ),

          diagnosis:
            clean(
              values.diagnosis,
            ),

          estimated_duration:
            clean(
              values.estimated_duration,
            ),

          total_treatment_fee:
            numberValue(
              values.total_treatment_fee,
            ),

          payment_plan:
            clean(
              values.payment_plan,
            ),

          monthly_payment:
            numberValue(
              values.monthly_payment,
            ),

          next_visit_date:
            values.next_visit_date
              ? values.next_visit_date.format(
                  "YYYY-MM-DD",
                )
              : "",

          notes:
            clean(
              values.notes,
            ),
        };

        await createOrthoCase(
          payload,
        );

        message.success(
          "Ortho case created successfully.",
        );

        setCaseModalOpen(
          false,
        );

        caseForm.resetFields();

        await loadOrthoCases();
      } catch (err) {
        if (
          err?.errorFields
        ) {
          return;
        }

        console.error(
          "Failed to create Ortho case:",
          err,
        );

        message.error(
          err?.response?.data
            ?.message ||
            "Failed to create Ortho case.",
        );
      } finally {
        setSavingCase(
          false,
        );
      }
    };

  /* ======================================================
     NEW PATIENT ACTIONS
  ====================================================== */

  const handleOpenNewPatient =
    () => {
      patientForm.resetFields();

      patientForm.setFieldsValue(
        {
          gender:
            undefined,

          status:
            "Active",

          has_allergies:
            "No",
        },
      );

      setPatientModalOpen(
        true,
      );
    };

  const handleClosePatientModal =
    () => {
      if (
        savingPatient
      ) {
        return;
      }

      setPatientModalOpen(
        false,
      );

      patientForm.resetFields();
    };

  const handleCreatePatient =
    async () => {
      try {
        const values =
          await patientForm.validateFields();

        setSavingPatient(
          true,
        );

        const payload = {
          name:
            clean(
              values.name,
            ),

          phone:
            clean(
              values.phone,
            ),

          age:
            values.age
              ? numberValue(
                  values.age,
                )
              : "",

          gender:
            clean(
              values.gender,
            ),

          address:
            clean(
              values.address,
            ),

          location:
            clean(
              values.location,
            ),

          distance:
            clean(
              values.distance,
            ),

          status:
            clean(
              values.status,
            ) ||
            "Active",

          has_allergies:
            normalize(
              values.has_allergies,
            ) ===
            "yes"
              ? "Yes"
              : "No",

          allergy_details:
            normalize(
              values.has_allergies,
            ) ===
            "yes"
              ? clean(
                  values.allergy_details,
                )
              : "",
        };

        const response =
          await createPatient(
            payload,
          );

        const createdPatient =
          response?.data?.data ||
          response?.data?.patient ||
          {};

        let newPatientId =
          getPatientId(
            createdPatient,
          );

        /*
         * Refresh patient list after creation.
         */
        const updatedPatients =
          await loadPatients();

        /*
         * If createPatient did not return the patient ID,
         * find the newly created patient from the refreshed list.
         */
        if (
          !newPatientId
        ) {
          const createdMatch =
            updatedPatients.find(
              (patient) => {
                const samePhone =
                  getPatientPhone(
                    patient,
                  ) ===
                  clean(
                    values.phone,
                  );

                const sameName =
                  normalize(
                    getPatientName(
                      patient,
                    ),
                  ) ===
                  normalize(
                    values.name,
                  );

                return (
                  samePhone &&
                  sameName
                );
              },
            );

          newPatientId =
            getPatientId(
              createdMatch,
            );
        }

        if (
          newPatientId
        ) {
          caseForm.setFieldValue(
            "patient_id",
            newPatientId,
          );
        }

        message.success(
          "Patient created successfully.",
        );

        setPatientModalOpen(
          false,
        );

        patientForm.resetFields();
      } catch (err) {
        if (
          err?.errorFields
        ) {
          return;
        }

        console.error(
          "Failed to create patient:",
          err,
        );

        message.error(
          err?.response?.data
            ?.message ||
            "Failed to create patient.",
        );
      } finally {
        setSavingPatient(
          false,
        );
      }
    };

  /* ======================================================
     OPEN CASE
  ====================================================== */

  const handleOpenCase =
    (record) => {
      navigate(
        `/ortho/${record.ortho_case_id}`,
      );
    };

  /* ======================================================
     TABLE COLUMNS
  ====================================================== */

  const columns = [
    {
      title:
        "Case",

      dataIndex:
        "ortho_case_id",

      key:
        "ortho_case_id",

      width:
        125,

      render: (
        value,
      ) => (
        <Text strong>
          {value}
        </Text>
      ),
    },

    {
      title:
        "Patient",

      key:
        "patient",

      render: (
        _,
        record,
      ) => (
        <Space
          direction="vertical"
          size={0}
        >
          <Space size={6}>
            <UserOutlined />

            <Text strong>
              {record.patient_name ||
                record.patient_id ||
                "-"}
            </Text>
          </Space>

          {record.patient_name &&
            record.patient_id && (
              <Text
                type="secondary"
                style={{
                  fontSize:
                    12,
                }}
              >
                {
                  record.patient_id
                }
              </Text>
            )}
        </Space>
      ),
    },

    {
      title:
        "Started",

      dataIndex:
        "start_date",

      key:
        "start_date",

      width:
        120,

      render: (
        value,
      ) =>
        formatDate(
          value,
        ),
    },

    {
      title:
        "Treatment",

      key:
        "treatment",

      render: (
        _,
        record,
      ) => (
        <Space
          direction="vertical"
          size={0}
        >
          <Text>
            {record.treatment_type ||
              "-"}
          </Text>

          {record.treatment_area && (
            <Text
              type="secondary"
              style={{
                fontSize:
                  12,
              }}
            >
              {
                record.treatment_area
              }
            </Text>
          )}
        </Space>
      ),
    },

    {
      title:
        "Doctor",

      dataIndex:
        "dentist_id",

      key:
        "dentist_id",

      render: (
        value,
      ) =>
        value ||
        "-",
    },

    {
      title:
        "Fee",

      dataIndex:
        "total_treatment_fee",

      key:
        "total_treatment_fee",

      align:
        "right",

      render: (
        value,
      ) => (
        <Text>
          {formatMoney(
            value,
          )}
        </Text>
      ),
    },

    {
      title:
        "Paid",

      dataIndex:
        "total_paid",

      key:
        "total_paid",

      align:
        "right",

      render: (
        value,
      ) => (
        <Text type="success">
          {formatMoney(
            value,
          )}
        </Text>
      ),
    },

    {
      title:
        "Balance",

      dataIndex:
        "balance",

      key:
        "balance",

      align:
        "right",

      render: (
        value,
      ) => (
        <Text
          strong={
            numberValue(
              value,
            ) >
            0
          }
          type={
            numberValue(
              value,
            ) >
            0
              ? "danger"
              : "success"
          }
        >
          {formatMoney(
            value,
          )}
        </Text>
      ),
    },

    {
      title:
        "Next Visit",

      dataIndex:
        "next_visit_date",

      key:
        "next_visit_date",

      width:
        145,

      render: (
        value,
      ) => {
        const state =
          getNextVisitState(
            value,
          );

        if (
          state.overdue
        ) {
          return (
            <Tooltip title="Next visit date has passed">
              <Tag
                color="red"
                icon={
                  <WarningOutlined />
                }
              >
                {
                  state.text
                }
              </Tag>
            </Tooltip>
          );
        }

        if (
          state.color
        ) {
          return (
            <Tag
              color={
                state.color
              }
              icon={
                <CalendarOutlined />
              }
            >
              {
                state.text
              }
            </Tag>
          );
        }

        return state.text;
      },
    },

    {
      title:
        "Status",

      dataIndex:
        "status",

      key:
        "status",

      width:
        110,

      render: (
        value,
      ) => (
        <Tag
          color={getStatusColor(
            value,
          )}
        >
          {value ||
            "Unknown"}
        </Tag>
      ),
    },

    {
      title: "",

      key:
        "action",

      fixed:
        "right",

      width:
        70,

      render: (
        _,
        record,
      ) => (
        <Tooltip title="Open Ortho Case">
          <Button
            type="primary"
            icon={
              <EyeOutlined />
            }
            onClick={() =>
              handleOpenCase(
                record,
              )
            }
          />
        </Tooltip>
      ),
    },
  ];

  /* ======================================================
     UI
  ====================================================== */

  return (
    <div
      style={{
        padding:
          24,
      }}
    >
      {/* ==================================================
          HEADER
      ================================================== */}

      <Row
        gutter={[
          16,
          16,
        ]}
        align="middle"
        justify="space-between"
        style={{
          marginBottom:
            20,
        }}
      >
        <Col>
          <Space
            direction="vertical"
            size={2}
          >
            <Title
              level={2}
              style={{
                margin:
                  0,
              }}
            >
              <MedicineBoxOutlined />{" "}
              Orthodontic Patients
            </Title>

            <Text type="secondary">
              Manage orthodontic
              treatments, visits,
              payments and
              progress.
            </Text>
          </Space>
        </Col>

        <Col>
          <Space wrap>
            <Button
              icon={
                <ReloadOutlined />
              }
              onClick={
                loadOrthoCases
              }
              loading={
                loading
              }
            >
              Refresh
            </Button>

            <Button
              type="primary"
              icon={
                <PlusOutlined />
              }
              onClick={
                handleNewCase
              }
            >
              New Ortho Case
            </Button>
          </Space>
        </Col>
      </Row>

      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <Alert
          type="error"
          showIcon
          closable
          message={
            error
          }
          style={{
            marginBottom:
              16,
          }}
          onClose={() =>
            setError("")
          }
        />
      )}

      {/* ==================================================
          SUMMARY
      ================================================== */}

      <Row
        gutter={[
          16,
          16,
        ]}
        style={{
          marginBottom:
            20,
        }}
      >
        <Col
          xs={24}
          sm={12}
          md={8}
          xl={4}
        >
          <Card>
            <Statistic
              title="Total Cases"
              value={
                summary.total
              }
              prefix={
                <TeamOutlined />
              }
            />
          </Card>
        </Col>

        <Col
          xs={24}
          sm={12}
          md={8}
          xl={4}
        >
          <Card>
            <Statistic
              title="Active"
              value={
                summary.active
              }
              prefix={
                <MedicineBoxOutlined />
              }
            />
          </Card>
        </Col>

        <Col
          xs={24}
          sm={12}
          md={8}
          xl={4}
        >
          <Card>
            <Statistic
              title="Completed"
              value={
                summary.completed
              }
            />
          </Card>
        </Col>

        <Col
          xs={24}
          sm={12}
          md={8}
          xl={4}
        >
          <Card>
            <Statistic
              title="Collected"
              value={
                summary.totalPaid
              }
              prefix="Rs."
              precision={0}
            />
          </Card>
        </Col>

        <Col
          xs={24}
          sm={12}
          md={8}
          xl={4}
        >
          <Card>
            <Statistic
              title="Outstanding"
              value={
                summary.totalBalance
              }
              prefix="Rs."
              precision={0}
            />
          </Card>
        </Col>

        <Col
          xs={24}
          sm={12}
          md={8}
          xl={4}
        >
          <Card>
            <Statistic
              title="Overdue Visits"
              value={
                summary.overdue
              }
              prefix={
                <WarningOutlined />
              }
            />
          </Card>
        </Col>
      </Row>

      {/* ==================================================
          FILTERS
      ================================================== */}

      <Card
        style={{
          marginBottom:
            16,
        }}
      >
        <Row
          gutter={[
            12,
            12,
          ]}
          align="middle"
        >
          <Col
            xs={24}
            md={14}
            lg={10}
          >
            <Input
              allowClear
              prefix={
                <SearchOutlined />
              }
              placeholder="Search case, patient, treatment, doctor..."
              value={
                searchText
              }
              onChange={(
                e,
              ) =>
                setSearchText(
                  e.target
                    .value,
                )
              }
            />
          </Col>

          <Col
            xs={24}
            sm={12}
            md={6}
          >
            <Select
              style={{
                width:
                  "100%",
              }}
              value={
                statusFilter
              }
              onChange={
                setStatusFilter
              }
              options={[
                {
                  value:
                    "all",
                  label:
                    "All Statuses",
                },
                {
                  value:
                    "Active",
                  label:
                    "Active",
                },
                {
                  value:
                    "On Hold",
                  label:
                    "On Hold",
                },
                {
                  value:
                    "Completed",
                  label:
                    "Completed",
                },
                {
                  value:
                    "Cancelled",
                  label:
                    "Cancelled",
                },
              ]}
            />
          </Col>

          <Col>
            <Text type="secondary">
              {
                filteredCases.length
              }{" "}
              record
              {filteredCases.length ===
              1
                ? ""
                : "s"}
            </Text>
          </Col>
        </Row>
      </Card>

      {/* ==================================================
          TABLE
      ================================================== */}

      <Card
        styles={{
          body: {
            padding:
              0,
          },
        }}
      >
        <Spin
          spinning={
            loading
          }
        >
          <Table
            rowKey="ortho_case_id"
            columns={
              columns
            }
            dataSource={
              filteredCases
            }
            scroll={{
              x: 1450,
            }}
            pagination={{
              pageSize:
                10,

              showSizeChanger:
                true,

              pageSizeOptions: [
                10,
                20,
                50,
                100,
              ],

              showTotal: (
                total,
              ) =>
                `${total} Ortho case${
                  total ===
                  1
                    ? ""
                    : "s"
                }`,
            }}
          />
        </Spin>
      </Card>

      {/* ==================================================
          CREATE ORTHO CASE MODAL
      ================================================== */}

      <Modal
        title={
          <Space>
            <MedicineBoxOutlined />

            Create New Ortho Case
          </Space>
        }
        open={
          caseModalOpen
        }
        onCancel={
          handleCloseCaseModal
        }
        onOk={
          handleCreateCase
        }
        okText="Create Ortho Case"
        confirmLoading={
          savingCase
        }
        width={820}
        destroyOnHidden
        maskClosable={
          !savingCase
        }
        closable={
          !savingCase
        }
      >
        <Form
          form={
            caseForm
          }
          layout="vertical"
          style={{
            marginTop:
              20,
          }}
        >
          <Row
            gutter={[
              16,
              0,
            ]}
          >
            {/* ============================================
                PATIENT SELECTION
            ============================================ */}

            <Col span={24}>
              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  alignItems:
                    "center",

                  marginBottom:
                    8,

                  gap:
                    12,
                }}
              >
                <Text strong>
                  Patient{" "}
                  <Text type="danger">
                    *
                  </Text>
                </Text>

                <Button
                  type="link"
                  size="small"
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

              <Form.Item
                name="patient_id"
                rules={[
                  {
                    required:
                      true,

                    message:
                      "Please select a patient.",
                  },
                ]}
              >
                <Select
                  showSearch
                  allowClear
                  loading={
                    patientsLoading
                  }
                  placeholder="Search and select existing patient"
                  optionFilterProp="label"
                  options={
                    patientOptions
                  }
                  notFoundContent={
                    patientsLoading
                      ? (
                          <Spin size="small" />
                        )
                      : (
                          <div
                            style={{
                              padding:
                                12,

                              textAlign:
                                "center",
                            }}
                          >
                            <Text type="secondary">
                              No patient found
                            </Text>

                            <div
                              style={{
                                marginTop:
                                  8,
                              }}
                            >
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
                          </div>
                        )
                  }
                />
              </Form.Item>
            </Col>

            {/* ============================================
                SELECTED PATIENT INFO
            ============================================ */}

            {selectedPatient && (
              <Col span={24}>
                <Alert
                  type="info"
                  showIcon
                  icon={
                    <UserOutlined />
                  }
                  style={{
                    marginBottom:
                      20,
                  }}
                  message={
                    getPatientName(
                      selectedPatient,
                    ) ||
                    getPatientId(
                      selectedPatient,
                    )
                  }
                  description={
                    <Space
                      wrap
                      size={16}
                    >
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
                            {
                              selectedPatient.age
                            }
                          </strong>
                        </span>
                      )}
                    </Space>
                  }
                />
              </Col>
            )}

            {/* ============================================
                DENTIST
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
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

            {/* ============================================
                START DATE
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="start_date"
                label="Treatment Start Date"
                rules={[
                  {
                    required:
                      true,

                    message:
                      "Please select the treatment start date.",
                  },
                ]}
              >
                <DatePicker
                  style={{
                    width:
                      "100%",
                  }}
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Col>

            {/* ============================================
                TREATMENT TYPE
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="treatment_type"
                label="Treatment Type"
                rules={[
                  {
                    required:
                      true,

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
                      value:
                        "Other",

                      label:
                        "Other",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            {/* ============================================
                TREATMENT AREA
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
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

            {/* ============================================
                ESTIMATED DURATION
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
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

            {/* ============================================
                DIAGNOSIS
            ============================================ */}

            <Col span={24}>
              <Form.Item
                name="diagnosis"
                label="Diagnosis / Main Problem"
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Example: Crowding, spacing, malocclusion..."
                  maxLength={
                    1000
                  }
                  showCount
                />
              </Form.Item>
            </Col>

            {/* ============================================
                TOTAL FEE
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="total_treatment_fee"
                label="Total Treatment Fee"
                rules={[
                  {
                    required:
                      true,

                    message:
                      "Please enter the total treatment fee.",
                  },
                ]}
              >
                <InputNumber
                  style={{
                    width:
                      "100%",
                  }}
                  min={0}
                  step={1000}
                  placeholder="180000"
                  formatter={(
                    value,
                  ) => {
                    if (
                      value ===
                        undefined ||
                      value ===
                        null ||
                      value ===
                        ""
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
                  parser={(
                    value,
                  ) =>
                    String(
                      value ??
                        "",
                    ).replace(
                      /Rs.\s?|,/g,
                      "",
                    )
                  }
                />
              </Form.Item>
            </Col>

            {/* ============================================
                PAYMENT PLAN
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="payment_plan"
                label="Payment Plan"
              >
                <Select
                  allowClear
                  placeholder="Select payment plan"
                  options={[
                    {
                      value:
                        "Monthly",

                      label:
                        "Monthly",
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
                      value:
                        "Custom",

                      label:
                        "Custom",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            {/* ============================================
                MONTHLY PAYMENT
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="monthly_payment"
                label="Expected Monthly Payment"
              >
                <InputNumber
                  style={{
                    width:
                      "100%",
                  }}
                  min={0}
                  step={1000}
                  placeholder="10000"
                  formatter={(
                    value,
                  ) => {
                    if (
                      value ===
                        undefined ||
                      value ===
                        null ||
                      value ===
                        ""
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
                  parser={(
                    value,
                  ) =>
                    String(
                      value ??
                        "",
                    ).replace(
                      /Rs.\s?|,/g,
                      "",
                    )
                  }
                />
              </Form.Item>
            </Col>

            {/* ============================================
                NEXT VISIT
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="next_visit_date"
                label="Next Visit Date"
              >
                <DatePicker
                  style={{
                    width:
                      "100%",
                  }}
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Col>

            {/* ============================================
                NOTES
            ============================================ */}

            <Col span={24}>
              <Form.Item
                name="notes"
                label="Initial Notes"
              >
                <Input.TextArea
                  rows={4}
                  placeholder="Any additional notes about the Ortho treatment..."
                  maxLength={
                    1500
                  }
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ==================================================
          ADD NEW PATIENT MODAL
      ================================================== */}

      <Modal
        title={
          <Space>
            <UserAddOutlined />

            Add New Patient
          </Space>
        }
        open={
          patientModalOpen
        }
        onCancel={
          handleClosePatientModal
        }
        onOk={
          handleCreatePatient
        }
        okText="Create Patient"
        confirmLoading={
          savingPatient
        }
        width={720}
        destroyOnHidden
        maskClosable={
          !savingPatient
        }
        closable={
          !savingPatient
        }
      >
        <Alert
          type="info"
          showIcon
          message="New Patient"
          description="Create the patient first. After saving, the patient will automatically be selected for the new Ortho case."
          style={{
            marginBottom:
              20,
          }}
        />

        <Form
          form={
            patientForm
          }
          layout="vertical"
        >
          <Row
            gutter={[
              16,
              0,
            ]}
          >
            {/* ============================================
                NAME
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="name"
                label="Patient Name"
                rules={[
                  {
                    required:
                      true,

                    message:
                      "Please enter the patient name.",
                  },
                ]}
              >
                <Input
                  prefix={
                    <UserOutlined />
                  }
                  placeholder="Patient name"
                  autoComplete="off"
                />
              </Form.Item>
            </Col>

            {/* ============================================
                PHONE
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[
                  {
                    required:
                      true,

                    message:
                      "Please enter the phone number.",
                  },
                ]}
              >
                <Input
                  placeholder="0771234567"
                  autoComplete="off"
                />
              </Form.Item>
            </Col>

            {/* ============================================
                AGE
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="age"
                label="Age"
              >
                <InputNumber
                  min={0}
                  max={120}
                  placeholder="Age"
                  style={{
                    width:
                      "100%",
                  }}
                />
              </Form.Item>
            </Col>

            {/* ============================================
                GENDER
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="gender"
                label="Gender"
              >
                <Select
                  allowClear
                  placeholder="Select gender"
                  options={[
                    {
                      value:
                        "Male",

                      label:
                        "Male",
                    },
                    {
                      value:
                        "Female",

                      label:
                        "Female",
                    },
                    {
                      value:
                        "Other",

                      label:
                        "Other",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            {/* ============================================
                LOCATION
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
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

            {/* ============================================
                DISTANCE
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
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

            {/* ============================================
                ADDRESS
            ============================================ */}

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

            {/* ============================================
                ALLERGIES
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="has_allergies"
                label="Has Allergies?"
              >
                <Select
                  options={[
                    {
                      value:
                        "No",

                      label:
                        "No",
                    },
                    {
                      value:
                        "Yes",

                      label:
                        "Yes",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            {/* ============================================
                STATUS
            ============================================ */}

            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="status"
                label="Patient Status"
              >
                <Select
                  options={[
                    {
                      value:
                        "Active",

                      label:
                        "Active",
                    },
                    {
                      value:
                        "Inactive",

                      label:
                        "Inactive",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            {/* ============================================
                ALLERGY DETAILS
            ============================================ */}

            {normalize(
              patientHasAllergies,
            ) ===
              "yes" && (
              <Col span={24}>
                <Form.Item
                  name="allergy_details"
                  label="Allergy Details"
                  rules={[
                    {
                      required:
                        true,

                      message:
                        "Please enter allergy details.",
                    },
                  ]}
                >
                  <Input.TextArea
                    rows={3}
                    maxLength={
                      1000
                    }
                    showCount
                    placeholder="Enter allergy details..."
                  />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default OrthoPatients;