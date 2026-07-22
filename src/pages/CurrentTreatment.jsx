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
  Collapse,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Tag,
  Typography,
  message,
} from "antd";

import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  EditOutlined,
  EyeOutlined,
  IdcardOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SaveOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import {
  createTreatment,
  getAppointmentsByDate,
  getPatients,
  updateAppointmentStatus,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";

import "./css/CurrentTreatment.css";

dayjs.extend(customParseFormat);

const {
  Title,
  Text,
} = Typography;

const {
  TextArea,
} = Input;

/* --------------------------------------------------------
   Constants
-------------------------------------------------------- */

const STEP_ITEMS = [
  {
    title: "Treatment",
    description: "Clinical information",
    icon: <MedicineBoxOutlined />,
  },
  {
    title: "Finish",
    description: "Fee and follow-up",
    icon: <CheckCircleOutlined />,
  },
];

const COMMON_TREATMENT_AMOUNTS = [
  500,
  1000,
  2000,
  5000,
  10000,
];

const FOLLOW_UP_OPTIONS = [
  {
    key: "3-days",
    label: "3 Days",
    days: 3,
  },
  {
    key: "1-week",
    label: "1 Week",
    days: 7,
  },
  {
    key: "2-weeks",
    label: "2 Weeks",
    days: 14,
  },
];

/* --------------------------------------------------------
   Helpers
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

const formatAppointmentTime = (
  time,
) => {
  if (!time) {
    return "-";
  }

  const parsedTime = dayjs(
    String(time),
    [
      "HH:mm",
      "HH:mm:ss",
      "h:mm A",
      "hh:mm A",
    ],
    true,
  );

  return parsedTime.isValid()
    ? parsedTime.format("h:mm A")
    : time;
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

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return `Rs. ${Number.isNaN(number)
    ? "0.00"
    : number.toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
};

/* --------------------------------------------------------
   Component
-------------------------------------------------------- */

const CurrentTreatment = () => {
  const [form] = Form.useForm();

  const [
    currentStep,
    setCurrentStep,
  ] = useState(0);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    appointments,
    setAppointments,
  ] = useState([]);

  const [patients, setPatients] =
    useState([]);

  const [
    selectedAppointmentId,
    setSelectedAppointmentId,
  ] = useState(null);

  const [
    selectedFollowUp,
    setSelectedFollowUp,
  ] = useState("none");

  const [
    patientDetailsOpen,
    setPatientDetailsOpen,
  ] = useState(false);

  const [
    treatmentEditable,
    setTreatmentEditable,
  ] = useState(false);

  const treatmentCharge = Number(
    Form.useWatch(
      "treatment_charge",
      form,
    ) || 0,
  );

  const selectedTreatment =
    Form.useWatch(
      "treatment_name",
      form,
    );

  const nextAppointmentDate =
    Form.useWatch(
      "next_appointment_date",
      form,
    );

  const today =
    dayjs().format("YYYY-MM-DD");

  /* ------------------------------------------------------
     Load current treatments
  ------------------------------------------------------ */

  const loadCurrentTreatments =
    useCallback(async () => {
      setLoading(true);

      try {
        const [
          appointmentsResponse,
          patientsResponse,
        ] = await Promise.all([
          getAppointmentsByDate(
            today,
          ),

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

        const currentTreatments =
          appointmentList
            .filter(
              (appointment) =>
                appointment?.status ===
                "In Treatment",
            )
            .sort(
              (first, second) => {
                const firstTime =
                  first
                    ?.appointment_time ||
                  first?.time ||
                  "";

                const secondTime =
                  second
                    ?.appointment_time ||
                  second?.time ||
                  "";

                return firstTime.localeCompare(
                  secondTime,
                );
              },
            );

        setAppointments(
          currentTreatments,
        );

        setPatients(patientList);

        setSelectedAppointmentId(
          (previousId) => {
            const previousStillExists =
              currentTreatments.some(
                (appointment) =>
                  String(
                    getAppointmentId(
                      appointment,
                    ),
                  ) ===
                  String(previousId),
              );

            if (
              previousStillExists
            ) {
              return previousId;
            }

            return currentTreatments.length >
              0
              ? getAppointmentId(
                  currentTreatments[0],
                )
              : null;
          },
        );
      } catch (error) {
        console.error(
          "Could not load current treatment:",
          error,
        );

        message.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Could not load the current patient",
        );
      } finally {
        setLoading(false);
      }
    }, [today]);

  useEffect(() => {
    loadCurrentTreatments();
  }, [loadCurrentTreatments]);

  /* ------------------------------------------------------
     Selected appointment and patient
  ------------------------------------------------------ */

  const selectedAppointment =
    useMemo(() => {
      return appointments.find(
        (appointment) =>
          String(
            getAppointmentId(
              appointment,
            ),
          ) ===
          String(
            selectedAppointmentId,
          ),
      );
    }, [
      appointments,
      selectedAppointmentId,
    ]);

  const selectedPatient =
    useMemo(() => {
      if (!selectedAppointment) {
        return null;
      }

      return patients.find(
        (patient) =>
          String(
            getPatientId(patient),
          ) ===
          String(
            selectedAppointment
              ?.patient_id,
          ),
      );
    }, [
      patients,
      selectedAppointment,
    ]);

  /* ------------------------------------------------------
     Patient information
  ------------------------------------------------------ */

  const patientInformation =
    useMemo(() => {
      if (!selectedAppointment) {
        return {
          id: "-",
          name: "Unknown Patient",
          phone: "-",
          age: "-",
          gender: "-",
          address: "-",
          status: "-",
          hasAllergies: false,
          allergyDetails: "",
        };
      }

      const allergyValue =
        selectedAppointment
          ?.is_allergies ??
        selectedAppointment
          ?.has_allergies ??
        selectedPatient
          ?.is_allergies ??
        selectedPatient
          ?.has_allergies ??
        selectedPatient
          ?.hasAllergies ??
        false;

      const allergyDetails =
        selectedAppointment
          ?.allergies ||
        selectedAppointment
          ?.allergy_details ||
        selectedPatient
          ?.allergies ||
        selectedPatient
          ?.allergy_details ||
        selectedPatient?.allergy ||
        "Allergy details were not provided";

      return {
        id:
          getPatientId(
            selectedPatient,
          ) ||
          selectedAppointment
            ?.patient_id ||
          "-",

        name:
          selectedAppointment
            ?.patient_name ||
          getPatientName(
            selectedPatient,
          ),

        phone:
          selectedPatient?.phone ||
          selectedPatient
            ?.phone_number ||
          selectedPatient?.mobile ||
          selectedPatient
            ?.mobile_number ||
          selectedAppointment
            ?.phone ||
          "-",

        age:
          selectedPatient?.age ||
          selectedAppointment?.age ||
          "-",

        gender:
          selectedPatient?.gender ||
          selectedAppointment
            ?.gender ||
          "-",

        address:
          selectedPatient?.address ||
          selectedAppointment
            ?.address ||
          "-",

        status:
          selectedPatient?.status ||
          selectedAppointment
            ?.patient_status ||
          "Active",

        hasAllergies:
          convertToBoolean(
            allergyValue,
          ),

        allergyDetails,
      };
    }, [
      selectedAppointment,
      selectedPatient,
    ]);

  /* ------------------------------------------------------
     Current patient options
  ------------------------------------------------------ */

  const currentPatientOptions =
    useMemo(() => {
      return appointments.map(
        (appointment) => {
          const patient =
            patients.find(
              (item) =>
                String(
                  getPatientId(item),
                ) ===
                String(
                  appointment
                    ?.patient_id,
                ),
            );

          const patientName =
            appointment
              ?.patient_name ||
            getPatientName(patient);

          return {
            value:
              getAppointmentId(
                appointment,
              ),

            label: `${patientName} — ${formatAppointmentTime(
              appointment
                ?.appointment_time ||
                appointment?.time,
            )}`,
          };
        },
      );
    }, [
      appointments,
      patients,
    ]);

  /* ------------------------------------------------------
     Reset form when patient changes
  ------------------------------------------------------ */

  useEffect(() => {
    if (!selectedAppointment) {
      form.resetFields();

      setCurrentStep(0);
      setSelectedFollowUp(
        "none",
      );
      setTreatmentEditable(
        false,
      );
      setPatientDetailsOpen(
        false,
      );

      return;
    }

    const treatmentFromAppointment =
      selectedAppointment
        ?.reason_for_visit ||
      selectedAppointment
        ?.treatment_name ||
      "General Dental Treatment";

    form.resetFields();

    form.setFieldsValue({
      treatment_name:
        treatmentFromAppointment,

      tooth_number: "",

      treatment_details: "",

      diagnosis: "",

      prescription: "",

      doctor_notes: "",

      treatment_charge: null,

      next_appointment_date:
        null,
    });

    setCurrentStep(0);
    setSelectedFollowUp("none");
    setTreatmentEditable(false);
    setPatientDetailsOpen(false);
  }, [
    selectedAppointment,
    form,
  ]);

  /* ------------------------------------------------------
     Step navigation
  ------------------------------------------------------ */

  const handleContinue =
    async () => {
      try {
        await form.validateFields([
          "treatment_name",
          "treatment_details",
        ]);

        setCurrentStep(1);
      } catch (error) {
        if (!error?.errorFields) {
          console.error(error);
        }
      }
    };

  /* ------------------------------------------------------
     Treatment fee
  ------------------------------------------------------ */

  const setTreatmentFee = (
    amount,
  ) => {
    form.setFieldValue(
      "treatment_charge",
      amount,
    );

    form.validateFields([
      "treatment_charge",
    ]);
  };

  /* ------------------------------------------------------
     Follow-up options
  ------------------------------------------------------ */

  const setFollowUpOption = (
    option,
  ) => {
    setSelectedFollowUp(
      option.key,
    );

    form.setFieldValue(
      "next_appointment_date",
      dayjs().add(
        option.days,
        "day",
      ),
    );
  };

  const selectCustomFollowUp =
    () => {
      setSelectedFollowUp(
        "custom",
      );

      form.setFieldValue(
        "next_appointment_date",
        null,
      );
    };

  const removeFollowUp = () => {
    setSelectedFollowUp("none");

    form.setFieldValue(
      "next_appointment_date",
      null,
    );
  };

  /* ------------------------------------------------------
     Save treatment
  ------------------------------------------------------ */

  const handleSaveTreatment =
    async () => {
      if (!selectedAppointment) {
        message.warning(
          "No patient is currently in treatment",
        );

        return;
      }

      try {
        const fieldsToValidate = [
          "treatment_name",
          "treatment_details",
          "treatment_charge",
        ];

        if (
          selectedFollowUp ===
          "custom"
        ) {
          fieldsToValidate.push(
            "next_appointment_date",
          );
        }

        await form.validateFields(
          fieldsToValidate,
        );

        const values =
          form.getFieldsValue(true);

        setSaving(true);

        const appointmentId =
          getAppointmentId(
            selectedAppointment,
          );

        const charge = Number(
          values
            ?.treatment_charge || 0,
        );

        const treatmentData = {
          appointment_id:
            appointmentId,

          patient_id:
            selectedAppointment
              ?.patient_id || "",

          dentist_id:
            selectedAppointment
              ?.dentist_id || "",

          treatment_date: today,

          treatment_name:
            values
              ?.treatment_name?.trim() ||
            "",

          tooth_number:
            values
              ?.tooth_number?.trim() ||
            "",

          treatment_details:
            values
              ?.treatment_details?.trim() ||
            "",

          diagnosis:
            values
              ?.diagnosis?.trim() ||
            "",

          prescription:
            values
              ?.prescription?.trim() ||
            "",

          doctor_notes:
            values
              ?.doctor_notes?.trim() ||
            "",

          next_appointment_date:
            values
              ?.next_appointment_date
              ? dayjs(
                  values.next_appointment_date,
                ).format(
                  "YYYY-MM-DD",
                )
              : "",

          treatment_charge:
            charge,

          // Existing backend spelling.
          treatment_fee: charge,
        };

        await createTreatment(
          treatmentData,
        );

        await updateAppointmentStatus(
          appointmentId,
          "Treatment Done",
        );

        message.success(
          "Treatment saved successfully",
        );

        form.resetFields();

        setCurrentStep(0);
        setSelectedFollowUp(
          "none",
        );
        setTreatmentEditable(
          false,
        );

        await loadCurrentTreatments();
      } catch (error) {
        if (error?.errorFields) {
          return;
        }

        console.error(
          "Could not save treatment:",
          error,
        );

        message.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Could not save the treatment",
        );
      } finally {
        setSaving(false);
      }
    };

  /* ------------------------------------------------------
     Patient summary
  ------------------------------------------------------ */

  const renderPatientSummary =
    () => {
      return (
        <>
          <div
            className={
              patientInformation
                .hasAllergies
                ? "current-treatment-patient current-treatment-patient--allergy"
                : "current-treatment-patient"
            }
          >
            <div className="current-treatment-patient__identity">
              <Avatar
                size={62}
                icon={
                  <UserOutlined />
                }
                className={
                  patientInformation
                    .hasAllergies
                    ? "current-treatment-patient__avatar current-treatment-patient__avatar--allergy"
                    : "current-treatment-patient__avatar"
                }
              />

              <div className="current-treatment-patient__details">
                <Text className="current-treatment-patient__eyebrow">
                  Current Patient
                </Text>

                <Space
                  wrap
                  size={7}
                >
                  <Title level={3}>
                    {
                      patientInformation.name
                    }
                  </Title>

                  <Tag
                    color="processing"
                    className="current-treatment-status-tag"
                  >
                    In Treatment
                  </Tag>

                  {patientInformation
                    .hasAllergies && (
                    <Tag
                      color="red"
                      icon={
                        <WarningOutlined />
                      }
                      className="current-treatment-allergy-tag"
                    >
                      Allergy
                    </Tag>
                  )}
                </Space>

                <div className="current-treatment-patient__meta">
                  <span>
                    <IdcardOutlined />

                    {patientInformation.id}
                  </span>

                  <span>
                    <ClockCircleOutlined />

                    {formatAppointmentTime(
                      selectedAppointment
                        ?.appointment_time ||
                        selectedAppointment
                          ?.time,
                    )}
                  </span>

                  <span>
                    <MedicineBoxOutlined />

                    {selectedAppointment
                      ?.reason_for_visit ||
                      "Dental Treatment"}
                  </span>
                </div>
              </div>
            </div>

            <Button
              size="large"
              icon={<EyeOutlined />}
              onClick={() =>
                setPatientDetailsOpen(
                  true,
                )
              }
            >
              Patient Details
            </Button>
          </div>

          {patientInformation
            .hasAllergies && (
            <Alert
              type="error"
              showIcon
              icon={
                <WarningOutlined />
              }
              message="Important Allergy Warning"
              description={
                patientInformation
                  .allergyDetails
              }
              className="current-treatment-allergy-alert"
            />
          )}
        </>
      );
    };

  /* ------------------------------------------------------
     Treatment step
  ------------------------------------------------------ */

  const renderTreatmentStep =
    () => {
      const extraClinicalItems = [
        {
          key: "extra-details",

          label: (
            <Space size={8}>
              <MedicineBoxOutlined />

              <Text strong>
                Add diagnosis,
                prescription or extra
                notes
              </Text>
            </Space>
          ),

          children: (
            <Row gutter={[18, 0]}>
              <Col
                xs={24}
                md={12}
              >
                <Form.Item
                  label="Diagnosis"
                  name="diagnosis"
                >
                  <TextArea
                    rows={4}
                    maxLength={1000}
                    showCount
                    placeholder="Optional diagnosis"
                  />
                </Form.Item>
              </Col>

              <Col
                xs={24}
                md={12}
              >
                <Form.Item
                  label="Prescription"
                  name="prescription"
                >
                  <TextArea
                    rows={4}
                    maxLength={1000}
                    showCount
                    placeholder="Optional medicines and instructions"
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  label="Additional Notes"
                  name="doctor_notes"
                  style={{
                    marginBottom: 0,
                  }}
                >
                  <TextArea
                    rows={3}
                    maxLength={1000}
                    showCount
                    placeholder="Optional additional notes"
                  />
                </Form.Item>
              </Col>
            </Row>
          ),
        },
      ];

      return (
        <div className="current-treatment-step">
          <div className="current-treatment-section-heading">
            <div>
              <Title level={4}>
                Treatment Information
              </Title>

              <Text type="secondary">
                Record the dental
                procedure performed for
                the patient.
              </Text>
            </div>

            <div className="current-treatment-section-icon">
              <MedicineBoxOutlined />
            </div>
          </div>

          <Row gutter={[18, 0]}>
            <Col
              xs={24}
              md={16}
            >
              <Form.Item
                label={
                  <Space wrap>
                    <Text strong>
                      Treatment
                    </Text>

                    {!treatmentEditable && (
                      <Tag color="blue">
                        Filled automatically
                      </Tag>
                    )}
                  </Space>
                }
                name="treatment_name"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message:
                      "Please enter the treatment",
                  },
                ]}
              >
                <Input
                  size="large"
                  readOnly={
                    !treatmentEditable
                  }
                  prefix={
                    <MedicineBoxOutlined />
                  }
                  placeholder="Enter treatment"
                  className={
                    treatmentEditable
                      ? "current-treatment-name-input"
                      : "current-treatment-name-input current-treatment-name-input--locked"
                  }
                  addonAfter={
                    <Button
                      type="text"
                      size="small"
                      icon={
                        <EditOutlined />
                      }
                      onClick={() =>
                        setTreatmentEditable(
                          (previous) =>
                            !previous,
                        )
                      }
                    >
                      {treatmentEditable
                        ? "Lock"
                        : "Change"}
                    </Button>
                  }
                />
              </Form.Item>
            </Col>

            <Col
              xs={24}
              md={8}
            >
              <Form.Item
                label="Tooth Number"
                name="tooth_number"
                extra="Leave empty when not required."
              >
                <Input
                  size="large"
                  placeholder="Example: 16"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={
              <Text strong>
                What treatment was
                performed?
              </Text>
            }
            name="treatment_details"
            extra="Enter a clear clinical note describing what was completed."
            rules={[
              {
                required: true,
                whitespace: true,
                message:
                  "Please enter a short treatment note",
              },
            ]}
          >
            <TextArea
              rows={6}
              maxLength={1500}
              showCount
              placeholder="Example: Removed decay and completed composite filling"
              className="current-treatment-details-input"
            />
          </Form.Item>

          <Collapse
            items={
              extraClinicalItems
            }
            className="current-treatment-extra-details"
          />
        </div>
      );
    };

  /* ------------------------------------------------------
     Finish step
  ------------------------------------------------------ */

  const renderFinishStep = () => {
    return (
      <div className="current-treatment-step">
        <div className="current-treatment-section-heading">
          <div>
            <Title level={4}>
              Finish Treatment
            </Title>

            <Text type="secondary">
              Enter the treatment fee
              and schedule a follow-up
              when required.
            </Text>
          </div>

          <div className="current-treatment-section-icon current-treatment-section-icon--green">
            <CheckCircleOutlined />
          </div>
        </div>

        <Row gutter={[18, 18]}>
          {/* Treatment fee */}

          <Col
            xs={24}
            lg={12}
          >
            <Card
              bordered={false}
              className="current-treatment-finish-card current-treatment-finish-card--fee"
            >
              <div className="current-treatment-finish-heading">
                <div className="current-treatment-finish-icon current-treatment-finish-icon--fee">
                  <DollarOutlined />
                </div>

                <div>
                  <Title level={4}>
                    Treatment Fee
                  </Title>

                  <Text type="secondary">
                    Enter or select the
                    final charge.
                  </Text>
                </div>
              </div>

              <Form.Item
                name="treatment_charge"
                rules={[
                  {
                    required: true,
                    message:
                      "Please enter the treatment fee",
                  },
                  {
                    type: "number",
                    min: 1,
                    message:
                      "The fee must be greater than 0",
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  precision={2}
                  prefix="Rs."
                  size="large"
                  placeholder="Enter treatment fee"
                  formatter={(value) =>
                    value
                      ? `${value}`.replace(
                          /\B(?=(\d{3})+(?!\d))/g,
                          ",",
                        )
                      : ""
                  }
                  parser={(value) =>
                    value
                      ? value.replace(
                          /,/g,
                          "",
                        )
                      : ""
                  }
                  className="current-treatment-fee-input"
                />
              </Form.Item>

              <Text
                strong
                className="current-treatment-quick-label"
              >
                Quick amounts
              </Text>

              <Row
                gutter={[9, 9]}
                className="current-treatment-amount-grid"
              >
                {COMMON_TREATMENT_AMOUNTS.map(
                  (amount) => (
                    <Col
                      xs={12}
                      sm={8}
                      key={amount}
                    >
                      <Button
                        block
                        htmlType="button"
                        size="large"
                        type={
                          treatmentCharge ===
                          amount
                            ? "primary"
                            : "default"
                        }
                        className="current-treatment-amount-button"
                        onClick={() =>
                          setTreatmentFee(
                            amount,
                          )
                        }
                      >
                        Rs.{" "}
                        {amount.toLocaleString()}
                      </Button>
                    </Col>
                  ),
                )}
              </Row>

              {treatmentCharge > 0 && (
                <Alert
                  type="info"
                  showIcon
                  message="Selected treatment fee"
                  description={formatCurrency(
                    treatmentCharge,
                  )}
                  className="current-treatment-selected-fee"
                />
              )}
            </Card>
          </Col>

          {/* Follow-up */}

          <Col
            xs={24}
            lg={12}
          >
            <Card
              bordered={false}
              className="current-treatment-finish-card current-treatment-finish-card--follow-up"
            >
              <div className="current-treatment-finish-heading">
                <div className="current-treatment-finish-icon current-treatment-finish-icon--follow-up">
                  <CalendarOutlined />
                </div>

                <div>
                  <Title level={4}>
                    Follow-up Visit
                  </Title>

                  <Text type="secondary">
                    Select whether the
                    patient needs to
                    return.
                  </Text>
                </div>
              </div>

              <div className="current-treatment-follow-up-grid">
                <Button
                  block
                  htmlType="button"
                  size="large"
                  type={
                    selectedFollowUp ===
                    "none"
                      ? "primary"
                      : "default"
                  }
                  className={
                    selectedFollowUp ===
                    "none"
                      ? "current-treatment-follow-up-button current-treatment-follow-up-button--none-selected"
                      : "current-treatment-follow-up-button"
                  }
                  onClick={
                    removeFollowUp
                  }
                >
                  No Follow-up Needed
                </Button>

                <Row gutter={[9, 9]}>
                  {FOLLOW_UP_OPTIONS.map(
                    (option) => (
                      <Col
                        xs={12}
                        key={option.key}
                      >
                        <Button
                          block
                          htmlType="button"
                          size="large"
                          type={
                            selectedFollowUp ===
                            option.key
                              ? "primary"
                              : "default"
                          }
                          className="current-treatment-follow-up-button"
                          onClick={() =>
                            setFollowUpOption(
                              option,
                            )
                          }
                        >
                          {option.label}
                        </Button>
                      </Col>
                    ),
                  )}

                  <Col xs={12}>
                    <Button
                      block
                      htmlType="button"
                      size="large"
                      type={
                        selectedFollowUp ===
                        "custom"
                          ? "primary"
                          : "default"
                      }
                      className="current-treatment-follow-up-button"
                      onClick={
                        selectCustomFollowUp
                      }
                    >
                      Choose Date
                    </Button>
                  </Col>
                </Row>
              </div>

              {selectedFollowUp ===
                "custom" && (
                <Form.Item
                  name="next_appointment_date"
                  className="current-treatment-custom-date"
                  rules={[
                    {
                      required: true,
                      message:
                        "Please choose a follow-up date",
                    },
                  ]}
                >
                  <DatePicker
                    size="large"
                    format="YYYY-MM-DD"
                    placeholder="Choose follow-up date"
                    style={{
                      width: "100%",
                    }}
                    disabledDate={(
                      date,
                    ) =>
                      date &&
                      date
                        .startOf(
                          "day",
                        )
                        .valueOf() <=
                        dayjs()
                          .startOf(
                            "day",
                          )
                          .valueOf()
                    }
                  />
                </Form.Item>
              )}

              {selectedFollowUp !==
                "custom" && (
                <Form.Item
                  name="next_appointment_date"
                  hidden
                >
                  <DatePicker />
                </Form.Item>
              )}

              {nextAppointmentDate && (
                <Alert
                  type="success"
                  showIcon
                  message="Follow-up scheduled"
                  description={dayjs(
                    nextAppointmentDate,
                  ).format(
                    "dddd, DD MMMM YYYY",
                  )}
                  className="current-treatment-follow-up-alert"
                />
              )}

              {selectedFollowUp ===
                "none" && (
                <Alert
                  type="info"
                  showIcon
                  message="No follow-up required"
                  description="No return date will be recorded for this treatment."
                  className="current-treatment-follow-up-alert"
                />
              )}
            </Card>
          </Col>
        </Row>

        <Alert
          type={
            treatmentCharge > 0
              ? "success"
              : "warning"
          }
          showIcon
          message={`${patientInformation.name} — ${
            selectedTreatment ||
            "Treatment"
          }`}
          description={
            treatmentCharge > 0
              ? `Treatment fee: ${formatCurrency(
                  treatmentCharge,
                )}`
              : "Select the treatment fee before saving."
          }
          className="current-treatment-final-summary"
        />
      </div>
    );
  };

  /* ------------------------------------------------------
     Render
  ------------------------------------------------------ */

  return (
    <ClinicPage
      title="Doctor Treatment"
      subtitle="Record the current patient's treatment, fee and follow-up instructions."
      icon={<MedicineBoxOutlined />}
      actions={[
        ...(appointments.length > 1
          ? [
              <Select
                key="patient-selector"
                size="large"
                value={
                  selectedAppointmentId
                }
                options={
                  currentPatientOptions
                }
                onChange={
                  setSelectedAppointmentId
                }
                placeholder="Select current patient"
                className="current-treatment-patient-selector"
              />,
            ]
          : []),

        <Button
          key="refresh"
          icon={
            <ReloadOutlined />
          }
          loading={loading}
          onClick={
            loadCurrentTreatments
          }
        >
          Refresh
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        {!selectedAppointment ? (
          <Card
            bordered={false}
            className="current-treatment-empty-card"
          >
            <Empty
              image={
                Empty.PRESENTED_IMAGE_SIMPLE
              }
              description={
                <div className="current-treatment-empty-content">
                  <Title level={4}>
                    No patient is
                    currently in treatment
                  </Title>

                  <Text type="secondary">
                    A patient will appear
                    here after their
                    appointment status is
                    changed to In
                    Treatment.
                  </Text>
                </div>
              }
            />
          </Card>
        ) : (
          <div className="current-treatment-page">
            {renderPatientSummary()}

            <Card
              bordered={false}
              className="current-treatment-workspace"
            >
              <div className="current-treatment-progress">
                <Steps
                  current={currentStep}
                  items={STEP_ITEMS}
                  responsive
                />
              </div>

              <Form
                form={form}
                layout="vertical"
                requiredMark={false}
                preserve
                scrollToFirstError
              >
                {currentStep === 0 &&
                  renderTreatmentStep()}

                {currentStep === 1 &&
                  renderFinishStep()}
              </Form>

              <div
                className={
                  currentStep === 0
                    ? "current-treatment-actions current-treatment-actions--first"
                    : "current-treatment-actions"
                }
              >
                {currentStep === 1 && (
                  <Button
                    size="large"
                    icon={
                      <ArrowLeftOutlined />
                    }
                    onClick={() =>
                      setCurrentStep(0)
                    }
                    disabled={saving}
                    className="current-treatment-back-button"
                  >
                    Go Back
                  </Button>
                )}

                {currentStep === 0 ? (
                  <Button
                    type="primary"
                    size="large"
                    onClick={
                      handleContinue
                    }
                    className="current-treatment-continue-button"
                  >
                    Continue to Fee

                    <ArrowRightOutlined />
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    size="large"
                    icon={
                      <SaveOutlined />
                    }
                    loading={saving}
                    onClick={
                      handleSaveTreatment
                    }
                    className="current-treatment-save-button"
                  >
                    Save Treatment
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </Spin>

      {/* Patient details modal */}

      <Modal
        title={null}
        open={patientDetailsOpen}
        onCancel={() =>
          setPatientDetailsOpen(
            false,
          )
        }
        centered
        width={620}
        destroyOnHidden
        className={
          patientInformation
            .hasAllergies
            ? "current-patient-details-modal current-patient-details-modal--allergy"
            : "current-patient-details-modal"
        }
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() =>
              setPatientDetailsOpen(
                false,
              )
            }
          >
            Close
          </Button>,
        ]}
      >
        <div className="current-patient-details-header">
          <Avatar
            size={68}
            icon={<UserOutlined />}
            className="current-patient-details-header__avatar"
          />

          <div>
            <Text>
              Patient Information
            </Text>

            <Title level={3}>
              {patientInformation.name}
            </Title>

            <Space wrap size={7}>
              <Tag
                icon={
                  <IdcardOutlined />
                }
              >
                {patientInformation.id}
              </Tag>

              <Tag
                color={
                  patientInformation
                    .status === "Active"
                    ? "green"
                    : "default"
                }
              >
                {
                  patientInformation.status
                }
              </Tag>

              {patientInformation
                .hasAllergies && (
                <Tag
                  color="red"
                  icon={
                    <WarningOutlined />
                  }
                >
                  Allergy
                </Tag>
              )}
            </Space>
          </div>
        </div>

        <div className="current-patient-details-content">
          {patientInformation
            .hasAllergies && (
            <Alert
              type="error"
              showIcon
              icon={
                <WarningOutlined />
              }
              message="Allergy Warning"
              description={
                patientInformation
                  .allergyDetails
              }
              className="current-patient-details-alert"
            />
          )}

          <Descriptions
            bordered
            column={{
              xs: 1,
              sm: 2,
            }}
            size="middle"
            className="current-patient-descriptions"
          >
            <Descriptions.Item label="Patient ID">
              <Text copyable>
                {patientInformation.id}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Name">
              <Text strong>
                {patientInformation.name}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Phone">
              <Space size={7}>
                <PhoneOutlined />

                {
                  patientInformation.phone
                }
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Age">
              {patientInformation.age}
            </Descriptions.Item>

            <Descriptions.Item label="Gender">
              {
                patientInformation.gender
              }
            </Descriptions.Item>

            <Descriptions.Item label="Status">
              <Tag
                color={
                  patientInformation
                    .status === "Active"
                    ? "green"
                    : "default"
                }
              >
                {
                  patientInformation.status
                }
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item
              label="Address"
              span={2}
            >
              {
                patientInformation.address
              }
            </Descriptions.Item>

            <Descriptions.Item
              label="Appointment"
              span={2}
            >
              <Space wrap>
                <Tag color="blue">
                  {getAppointmentId(
                    selectedAppointment,
                  )}
                </Tag>

                <Text>
                  <ClockCircleOutlined />{" "}
                  {formatAppointmentTime(
                    selectedAppointment
                      ?.appointment_time ||
                      selectedAppointment
                        ?.time,
                  )}
                </Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </div>
      </Modal>
    </ClinicPage>
  );
};

export default CurrentTreatment;