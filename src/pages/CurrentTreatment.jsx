import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  Table,
  Tabs,
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
  CreditCardOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  EyeOutlined,
  IdcardOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  PlusOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SaveOutlined,
  UserOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import { useReactToPrint } from "react-to-print";

import {
  createPayment,
  createTreatment,
  getAppointmentsByDate,
  getCommonTreatments,
  getDrugs,
  getPatients,
  updateAppointmentStatus,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";

import "./css/CurrentTreatment.css";

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;
const { TextArea } = Input;

/* ========================================================
   CONSTANTS
======================================================== */

const CLINIC_INFORMATION = {
  name: "IVORY DENTAL",
  subtitle: "Aesthetic & Cosmetic Dental Surgery",

  dentistName: "Dr. U.H.P.K.J. Bandu Ukwatta",
  qualificationOne: "Diploma in Orthodontics (POS)",
  qualificationTwo: "BDS, DHDP - Colombo",
  designation: "Dental Surgeon",
  registrationNumber: "S.L.M.C.Ref.No.2142",

  addressLineOne: "No.50 D,",
  addressLineTwo: "Rahula Junction,",
  addressLineThree: "Matara.",
  hotline: "071 144 99 99",

  stampPhone: "071 24 50 779",

  footerText: "Happy Smile For a Happy Life",
};

const STEP_ITEMS = [
  {
    title: "Treatment",
    description: "Clinical information",
    icon: <MedicineBoxOutlined />,
  },
  {
    title: "Finish",
    description: "Fee, payment and follow-up",
    icon: <CheckCircleOutlined />,
  },
];

const DOSE_OPTIONS = [
  { value: "bd", label: "bd" },
  { value: "qds", label: "qds" },
  { value: "tds", label: "tds" },
  { value: "sos", label: "sos" },
  { value: "eod", label: "eod" },
];

const COMMON_TREATMENT_AMOUNTS = [500, 1000, 2000, 5000, 10000];

const QUICK_PAYMENT_AMOUNTS = [500, 1000, 2000, 5000, 10000];

const PAYMENT_METHOD_OPTIONS = [
  {
    value: "Cash",
    label: "Cash",
  },
  {
    value: "Card",
    label: "Card",
  },
  {
    value: "Bank Transfer",
    label: "Bank Transfer",
  },
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

/* ========================================================
   HELPERS
======================================================== */

const extractArray = (response) => {
  const data = response?.data?.data || response?.data || [];

  return Array.isArray(data) ? data : [];
};

const normalizeText = (value) => {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
};

const normalizeForComparison = (value) => {
  return normalizeText(value).toLowerCase();
};

const getAppointmentId = (appointment) => {
  return appointment?.appointment_id || appointment?.id || "";
};

const getPatientId = (patient) => {
  return patient?.patient_id || patient?.id || "";
};

const getPatientName = (patient) => {
  if (!patient) {
    return "Unknown Patient";
  }

  return (
    patient?.name ||
    [patient?.first_name, patient?.last_name].filter(Boolean).join(" ") ||
    "Unknown Patient"
  );
};

const getCommonTreatmentName = (treatment) => {
  return treatment?.treatment_name || treatment?.name || "";
};

const getCommonTreatmentFee = (treatment) => {
  const fee = Number(treatment?.fee ?? treatment?.default_fee);

  return Number.isFinite(fee) ? fee : null;
};

const findCommonTreatmentByName = (commonTreatments, treatmentName) => {
  const normalizedTreatmentName = normalizeForComparison(treatmentName);

  if (!normalizedTreatmentName) {
    return null;
  }

  return (
    commonTreatments.find(
      (treatment) =>
        normalizeForComparison(getCommonTreatmentName(treatment)) ===
        normalizedTreatmentName,
    ) || null
  );
};

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

const formatAppointmentTime = (time) => {
  if (!time) {
    return "-";
  }

  const parsedTime = dayjs(
    String(time),
    ["HH:mm", "HH:mm:ss", "h:mm A", "hh:mm A"],
    true,
  );

  return parsedTime.isValid() ? parsedTime.format("h:mm A") : time;
};

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return `Rs. ${
    Number.isNaN(number)
      ? "0.00"
      : number.toLocaleString("en-LK", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
  }`;
};

const getDrugId = (drug) => {
  return drug?.drug_id || drug?.id || "";
};

const getDrugName = (drug) => {
  return normalizeText(drug?.drug_name || drug?.name || "");
};

const createPrescriptionRow = () => {
  const rowKey =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    key: rowKey,
    drug_name: "",
    dose: "",
    days: 1,
  };
};

/* ========================================================
   COMPONENT
======================================================== */

const CurrentTreatment = () => {
  const [form] = Form.useForm();

  const prescriptionPrintRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(0);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [commonTreatments, setCommonTreatments] = useState([]);
  const [drugs, setDrugs] = useState([]);

  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

  const [selectedFollowUp, setSelectedFollowUp] = useState("none");

  const [patientDetailsOpen, setPatientDetailsOpen] = useState(false);

  const [treatmentEditable, setTreatmentEditable] = useState(false);

  const [prescriptionRows, setPrescriptionRows] = useState([
    createPrescriptionRow(),
  ]);

  const [prescriptionPreviewOpen, setPrescriptionPreviewOpen] = useState(false);

  const [printPrescriptionData, setPrintPrescriptionData] = useState(null);

  /* ========================================================
     FORM WATCHERS
  ======================================================== */

  const treatmentCharge = Number(Form.useWatch("treatment_charge", form) || 0);

  const paymentAmount = Number(Form.useWatch("payment_amount", form) || 0);

  const selectedTreatment = Form.useWatch("treatment_name", form);

  const nextAppointmentDate = Form.useWatch("next_appointment_date", form);

  const today = dayjs().format("YYYY-MM-DD");

  const remainingAmount = Math.max(treatmentCharge - paymentAmount, 0);

  const hasPayment = paymentAmount > 0;

  const isFullyPaid = treatmentCharge > 0 && paymentAmount >= treatmentCharge;

  /* ========================================================
     SELECTED COMMON TREATMENT
  ======================================================== */

  const selectedCommonTreatment = useMemo(() => {
    return findCommonTreatmentByName(commonTreatments, selectedTreatment);
  }, [commonTreatments, selectedTreatment]);

  const selectedCommonTreatmentFee = useMemo(() => {
    const fee = getCommonTreatmentFee(selectedCommonTreatment);

    return Number.isFinite(fee) ? fee : 0;
  }, [selectedCommonTreatment]);

  const quickTreatmentAmounts = useMemo(() => {
    const amounts = [];

    if (selectedCommonTreatmentFee > 0) {
      amounts.push(selectedCommonTreatmentFee);
    }

    COMMON_TREATMENT_AMOUNTS.forEach((amount) => {
      if (!amounts.includes(amount)) {
        amounts.push(amount);
      }
    });

    return amounts;
  }, [selectedCommonTreatmentFee]);

  useEffect(() => {
    if (!selectedTreatment || selectedCommonTreatmentFee <= 0) {
      return;
    }

    form.setFieldValue("treatment_charge", selectedCommonTreatmentFee);
  }, [selectedTreatment, selectedCommonTreatmentFee, form]);

  /* ========================================================
     LOAD CURRENT TREATMENTS
  ======================================================== */

  const loadCurrentTreatments = useCallback(async () => {
    setLoading(true);

    try {
      const [
        appointmentsResponse,
        patientsResponse,
        commonTreatmentsResponse,
        drugsResponse,
      ] = await Promise.all([
        getAppointmentsByDate(today),
        getPatients(),
        getCommonTreatments(),
        getDrugs(),
      ]);

      const appointmentList = extractArray(appointmentsResponse);
      const patientList = extractArray(patientsResponse);
      const commonTreatmentList = extractArray(commonTreatmentsResponse);

      const drugList = extractArray(drugsResponse)
        .filter((drug) => getDrugId(drug) && getDrugName(drug))
        .sort((firstDrug, secondDrug) =>
          getDrugName(firstDrug).localeCompare(getDrugName(secondDrug)),
        );

      const currentTreatments = appointmentList
        .filter((appointment) => appointment?.status === "In Treatment")
        .sort((first, second) => {
          const firstTime = first?.appointment_time || first?.time || "";
          const secondTime = second?.appointment_time || second?.time || "";

          return firstTime.localeCompare(secondTime);
        });

      setAppointments(currentTreatments);
      setPatients(patientList);
      setCommonTreatments(commonTreatmentList);
      setDrugs(drugList);

      setSelectedAppointmentId((previousId) => {
        const previousStillExists = currentTreatments.some(
          (appointment) =>
            String(getAppointmentId(appointment)) === String(previousId),
        );

        if (previousStillExists) {
          return previousId;
        }

        return currentTreatments.length > 0
          ? getAppointmentId(currentTreatments[0])
          : null;
      });
    } catch (error) {
      console.error("Could not load current treatment:", error);

      message.error(
        error?.response?.data?.message ||
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

  /* ========================================================
     SELECTED APPOINTMENT / PATIENT
  ======================================================== */

  const selectedAppointment = useMemo(() => {
    return appointments.find(
      (appointment) =>
        String(getAppointmentId(appointment)) === String(selectedAppointmentId),
    );
  }, [appointments, selectedAppointmentId]);

  const selectedPatient = useMemo(() => {
    if (!selectedAppointment) {
      return null;
    }

    return patients.find(
      (patient) =>
        String(getPatientId(patient)) ===
        String(selectedAppointment?.patient_id),
    );
  }, [patients, selectedAppointment]);

  /* ========================================================
     PATIENT INFORMATION
  ======================================================== */

  const patientInformation = useMemo(() => {
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
      selectedAppointment?.is_allergies ??
      selectedAppointment?.has_allergies ??
      selectedPatient?.is_allergies ??
      selectedPatient?.has_allergies ??
      selectedPatient?.hasAllergies ??
      false;

    const allergyDetails =
      selectedAppointment?.allergies ||
      selectedAppointment?.allergy_details ||
      selectedPatient?.allergies ||
      selectedPatient?.allergy_details ||
      selectedPatient?.allergy ||
      "Allergy details were not provided";

    return {
      id:
        getPatientId(selectedPatient) || selectedAppointment?.patient_id || "-",

      name:
        selectedAppointment?.patient_name || getPatientName(selectedPatient),

      phone:
        selectedPatient?.phone ||
        selectedPatient?.phone_number ||
        selectedPatient?.mobile ||
        selectedPatient?.mobile_number ||
        selectedAppointment?.phone ||
        "-",

      age: selectedPatient?.age || selectedAppointment?.age || "-",

      gender: selectedPatient?.gender || selectedAppointment?.gender || "-",

      address: selectedPatient?.address || selectedAppointment?.address || "-",

      status:
        selectedPatient?.status ||
        selectedAppointment?.patient_status ||
        "Active",

      hasAllergies: convertToBoolean(allergyValue),

      allergyDetails,
    };
  }, [selectedAppointment, selectedPatient]);

  /* ========================================================
     PATIENT SELECTOR
  ======================================================== */

  const currentPatientOptions = useMemo(() => {
    return appointments.map((appointment) => {
      const patient = patients.find(
        (item) =>
          String(getPatientId(item)) === String(appointment?.patient_id),
      );

      const patientName = appointment?.patient_name || getPatientName(patient);

      return {
        value: getAppointmentId(appointment),

        label: `${patientName} — ${formatAppointmentTime(
          appointment?.appointment_time || appointment?.time,
        )}`,
      };
    });
  }, [appointments, patients]);

  /* ========================================================
     RESET FORM
  ======================================================== */

  useEffect(() => {
    if (!selectedAppointment) {
      form.resetFields();

      setPrescriptionRows([createPrescriptionRow()]);
      setCurrentStep(0);
      setSelectedFollowUp("none");
      setTreatmentEditable(false);
      setPatientDetailsOpen(false);

      return;
    }

    const treatmentFromAppointment =
      selectedAppointment?.reason_for_visit ||
      selectedAppointment?.treatment_name ||
      "General Dental Treatment";

    const matchedTreatment = findCommonTreatmentByName(
      commonTreatments,
      treatmentFromAppointment,
    );

    const standardFee = getCommonTreatmentFee(matchedTreatment);

    form.resetFields();

    form.setFieldsValue({
      treatment_name: treatmentFromAppointment,

      tooth_number: "",

      treatment_details: "",

      diagnosis: "",

      doctor_notes: "",

      treatment_charge:
        Number.isFinite(standardFee) && standardFee > 0 ? standardFee : null,

      next_appointment_date: null,

      payment_amount: 0,

      payment_method: "Cash",
    });

    setPrescriptionRows([createPrescriptionRow()]);

    setCurrentStep(0);
    setSelectedFollowUp("none");
    setTreatmentEditable(false);
    setPatientDetailsOpen(false);
  }, [selectedAppointment, commonTreatments, form]);

  /* ========================================================
     STEP NAVIGATION
  ======================================================== */

  const handleContinue = async () => {
    try {
      await form.validateFields(["treatment_name", "treatment_details"]);

      setCurrentStep(1);
    } catch (error) {
      if (!error?.errorFields) {
        console.error(error);
      }
    }
  };

  /* ========================================================
     TREATMENT FEE
  ======================================================== */

  const setTreatmentFee = (amount) => {
    form.setFieldValue("treatment_charge", amount);

    const currentPayment = Number(form.getFieldValue("payment_amount") || 0);

    if (currentPayment > amount) {
      form.setFieldValue("payment_amount", amount);
    }

    form.validateFields(["treatment_charge"]).catch(() => {});
  };

  /* ========================================================
     PAYMENT
  ======================================================== */

  const setPaymentAmount = (amount) => {
    const charge = Number(form.getFieldValue("treatment_charge") || 0);

    const safeAmount = Math.min(Number(amount || 0), charge);

    form.setFieldValue("payment_amount", safeAmount);

    form.validateFields(["payment_amount"]).catch(() => {});
  };

  const setFullPayment = () => {
    const charge = Number(form.getFieldValue("treatment_charge") || 0);

    if (charge <= 0) {
      message.warning("Please enter the treatment fee first");

      return;
    }

    form.setFieldValue("payment_amount", charge);
  };

  const clearPayment = () => {
    form.setFieldsValue({
      payment_amount: 0,
      payment_method: "Cash",
    });
  };

  /* ========================================================
     FOLLOW-UP
  ======================================================== */

  const setFollowUpOption = (option) => {
    setSelectedFollowUp(option.key);

    form.setFieldValue(
      "next_appointment_date",
      dayjs().add(option.days, "day"),
    );
  };

  const selectCustomFollowUp = () => {
    setSelectedFollowUp("custom");

    form.setFieldValue("next_appointment_date", null);
  };

  const removeFollowUp = () => {
    setSelectedFollowUp("none");

    form.setFieldValue("next_appointment_date", null);
  };

  /* ========================================================
     PRESCRIPTION
  ======================================================== */

  const selectedPrescriptionDrugNames = useMemo(() => {
    return prescriptionRows
      .map((row) => normalizeText(row.drug_name))
      .filter(Boolean);
  }, [prescriptionRows]);

  const drugOptions = useMemo(() => {
    return drugs.map((drug) => ({
      value: getDrugName(drug),
      label: getDrugName(drug),
    }));
  }, [drugs]);

  const addPrescriptionRow = () => {
    setPrescriptionRows((currentRows) => [
      ...currentRows,
      createPrescriptionRow(),
    ]);
  };

  const addDrugToPrescription = (drug) => {
    const drugName = getDrugName(drug);

    if (!drugName) {
      return;
    }

    const alreadySelected = prescriptionRows.some(
      (row) =>
        normalizeForComparison(row.drug_name) ===
        normalizeForComparison(drugName),
    );

    if (alreadySelected) {
      message.info(`${drugName} is already in the prescription`);

      return;
    }

    setPrescriptionRows((currentRows) => {
      const emptyRowIndex = currentRows.findIndex(
        (row) => !normalizeText(row.drug_name),
      );

      if (emptyRowIndex >= 0) {
        return currentRows.map((row, index) =>
          index === emptyRowIndex
            ? {
                ...row,
                drug_name: drugName,
              }
            : row,
        );
      }

      return [
        ...currentRows,
        {
          ...createPrescriptionRow(),
          drug_name: drugName,
        },
      ];
    });
  };

  const updatePrescriptionRow = (rowKey, field, value) => {
    setPrescriptionRows((currentRows) =>
      currentRows.map((row) =>
        row.key === rowKey
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const removePrescriptionRow = (rowKey) => {
    setPrescriptionRows((currentRows) => {
      const remainingRows = currentRows.filter((row) => row.key !== rowKey);

      return remainingRows.length > 0
        ? remainingRows
        : [createPrescriptionRow()];
    });
  };

  const toggleDrugInPrescription = (drug) => {
    const drugName = getDrugName(drug);

    const matchingRow = prescriptionRows.find(
      (row) =>
        normalizeForComparison(row.drug_name) ===
        normalizeForComparison(drugName),
    );

    if (matchingRow) {
      removePrescriptionRow(matchingRow.key);

      return;
    }

    addDrugToPrescription(drug);
  };

  const clearPrescription = () => {
    setPrescriptionRows([createPrescriptionRow()]);
  };

  const buildPrescriptionText = () => {
    return prescriptionRows
      .filter((row) => normalizeText(row.drug_name))
      .map((row, index) => {
        const drugName = normalizeText(row.drug_name);
        const dose = normalizeText(row.dose);
        const days = Number(row.days);

        const parts = [`${index + 1}. ${drugName}`];

        if (dose) {
          parts.push(`Dose: ${dose}`);
        }

        if (Number.isFinite(days) && days > 0) {
          parts.push(`${days} ${days === 1 ? "day" : "days"}`);
        }

        return parts.join(" | ");
      })
      .join("\n");
  };

  /* ========================================================
     PRESCRIPTION PRINT DATA
  ======================================================== */

  const buildPrintPrescriptionData = ({
    treatment,
    prescriptionText,
    treatmentValues,
  }) => {
    return {
      clinic: CLINIC_INFORMATION,

      patient: {
        id: patientInformation.id,
        name: patientInformation.name,
        phone: patientInformation.phone,
        age: patientInformation.age,
        gender: patientInformation.gender,
        address: patientInformation.address,
        has_allergies: patientInformation.hasAllergies,
        allergy_details: patientInformation.allergyDetails,
      },

      dentist: {
        id: selectedAppointment?.dentist_id || "",

        name:
          selectedAppointment?.dentist_name ||
          selectedAppointment?.doctor_name ||
          selectedAppointment?.dentist?.name ||
          "Dental Surgeon",

        specialization:
          selectedAppointment?.dentist_specialization ||
          selectedAppointment?.specialization ||
          selectedAppointment?.dentist?.specialization ||
          "Dental Surgeon",
      },

      appointment: {
        id: getAppointmentId(selectedAppointment),

        date:
          selectedAppointment?.appointment_date ||
          selectedAppointment?.date ||
          today,

        time:
          selectedAppointment?.appointment_time ||
          selectedAppointment?.time ||
          "",
      },

      treatment: {
        id: treatment?.treatment_id || treatment?.id || "",

        treatment_date: treatment?.treatment_date || today,

        treatment_name:
          treatment?.treatment_name || treatmentValues?.treatment_name || "",

        tooth_number:
          treatment?.tooth_number || treatmentValues?.tooth_number || "",

        diagnosis: treatment?.diagnosis || treatmentValues?.diagnosis || "",

        treatment_details:
          treatment?.treatment_details ||
          treatmentValues?.treatment_details ||
          "",

        prescription: treatment?.prescription || prescriptionText || "",

        doctor_notes:
          treatment?.doctor_notes || treatmentValues?.doctor_notes || "",

        next_appointment_date:
          treatment?.next_appointment_date ||
          (treatmentValues?.next_appointment_date
            ? dayjs(treatmentValues.next_appointment_date).format("YYYY-MM-DD")
            : ""),
      },
    };
  };

  const handlePrintPrescription = useReactToPrint({
    contentRef: prescriptionPrintRef,

    documentTitle: `Prescription-${
      printPrescriptionData?.patient?.name || "Patient"
    }-${printPrescriptionData?.treatment?.treatment_date || today}`,

    onAfterPrint: () => {
      message.success("Prescription printing completed");
    },

    onPrintError: (_, error) => {
      console.error("Could not print prescription:", error);

      message.error("Could not print the prescription");
    },
  });

  /* ========================================================
     PRESCRIPTION TABLE
  ======================================================== */

  const prescriptionColumns = [
    {
      title: "Drug Name",
      dataIndex: "drug_name",
      key: "drug_name",
      width: "42%",

      render: (_, record) => (
        <Select
          showSearch
          allowClear
          value={record.drug_name || undefined}
          placeholder="Select drug"
          optionFilterProp="label"
          options={drugOptions}
          onChange={(value) => {
            const normalizedValue = normalizeText(value);

            const duplicateDrug = prescriptionRows.some(
              (row) =>
                row.key !== record.key &&
                normalizeForComparison(row.drug_name) ===
                  normalizeForComparison(normalizedValue),
            );

            if (normalizedValue && duplicateDrug) {
              message.info(`${normalizedValue} is already in the prescription`);

              return;
            }

            updatePrescriptionRow(record.key, "drug_name", normalizedValue);
          }}
          style={{ width: "100%" }}
        />
      ),
    },

    {
      title: "Dose",
      dataIndex: "dose",
      key: "dose",
      width: "28%",

      render: (_, record) => (
        <Select
          allowClear
          value={record.dose || undefined}
          placeholder="Select dose"
          options={DOSE_OPTIONS}
          onChange={(value) =>
            updatePrescriptionRow(record.key, "dose", value || "")
          }
          style={{ width: "100%" }}
        />
      ),
    },

    {
      title: "Days",
      dataIndex: "days",
      key: "days",
      width: 120,

      render: (_, record) => (
        <InputNumber
          min={1}
          max={365}
          precision={0}
          value={record.days}
          placeholder="Days"
          onChange={(value) => updatePrescriptionRow(record.key, "days", value)}
          style={{ width: "100%" }}
        />
      ),
    },

    {
      title: "",
      key: "actions",
      align: "center",
      width: 60,

      render: (_, record) => (
        <Button
          htmlType="button"
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removePrescriptionRow(record.key)}
          aria-label="Remove prescription drug"
        />
      ),
    },
  ];

  /* ========================================================
     SAVE TREATMENT + PAYMENT
  ======================================================== */

  const handleSaveTreatment = async () => {
    if (!selectedAppointment) {
      message.warning("No patient is currently in treatment");

      return;
    }

    try {
      const fieldsToValidate = [
        "treatment_name",
        "treatment_details",
        "treatment_charge",
        "payment_amount",
      ];

      const currentPaymentAmount = Number(
        form.getFieldValue("payment_amount") || 0,
      );

      if (currentPaymentAmount > 0) {
        fieldsToValidate.push("payment_method");
      }

      if (selectedFollowUp === "custom") {
        fieldsToValidate.push("next_appointment_date");
      }

      await form.validateFields(fieldsToValidate);

      /* ----------------------------------------------------
         Prescription validation
      ---------------------------------------------------- */

      const invalidPrescriptionRow = prescriptionRows.find(
        (row) =>
          normalizeText(row.drug_name) &&
          (!normalizeText(row.dose) || !Number(row.days)),
      );

      if (invalidPrescriptionRow) {
        message.warning(
          "Please select the dose and enter the number of days for every selected drug",
        );

        setCurrentStep(0);

        return;
      }

      const values = form.getFieldsValue(true);

      const appointmentId = getAppointmentId(selectedAppointment);

      const charge = Number(values?.treatment_charge || 0);

      const amountPaid = Number(values?.payment_amount || 0);

      /* ----------------------------------------------------
         Payment validation
      ---------------------------------------------------- */

      if (amountPaid < 0) {
        message.warning("Payment amount cannot be negative");

        return;
      }

      if (amountPaid > charge) {
        message.warning("Payment amount cannot exceed the treatment fee");

        return;
      }

      if (amountPaid > 0 && !values?.payment_method) {
        message.warning("Please select a payment method");

        return;
      }

      setSaving(true);

      const prescriptionText = buildPrescriptionText();

      /* ----------------------------------------------------
         Create treatment
      ---------------------------------------------------- */

      const treatmentData = {
        appointment_id: appointmentId,

        patient_id: selectedAppointment?.patient_id || "",

        dentist_id: selectedAppointment?.dentist_id || "",

        treatment_date: today,

        treatment_name: values?.treatment_name?.trim() || "",

        tooth_number: values?.tooth_number?.trim() || "",

        treatment_details: values?.treatment_details?.trim() || "",

        diagnosis: values?.diagnosis?.trim() || "",

        prescription: prescriptionText,

        doctor_notes: values?.doctor_notes?.trim() || "",

        next_appointment_date: values?.next_appointment_date
          ? dayjs(values.next_appointment_date).format("YYYY-MM-DD")
          : "",

        treatment_charge: charge,

        treatment_fee: charge,
      };

      const treatmentResponse = await createTreatment(treatmentData);

      const savedTreatment =
        treatmentResponse?.data?.data ||
        treatmentResponse?.data?.treatment ||
        treatmentResponse?.data ||
        treatmentData;

      const treatmentId =
        savedTreatment?.treatment_id || savedTreatment?.id || "";

      /* ----------------------------------------------------
         Prescription print data
      ---------------------------------------------------- */

      const prescriptionData = buildPrintPrescriptionData({
        treatment: savedTreatment,
        prescriptionText,
        treatmentValues: values,
      });

      /* ----------------------------------------------------
         Create payment
      ---------------------------------------------------- */

      if (amountPaid > 0) {
        if (!treatmentId) {
          throw new Error(
            "Treatment was saved but the treatment ID was not returned. Payment could not be recorded.",
          );
        }

        const paymentData = {
          patient_id: selectedAppointment?.patient_id || "",

          treatment_id: treatmentId,

          treatment_charge: charge,

          payment_amount: amountPaid,

          total_paid: amountPaid,

          remaining_amount: Math.max(charge - amountPaid, 0),

          payment_method: values?.payment_method || "Cash",

          payment_date: today,
        };

        console.log("Creating treatment payment:", paymentData);

        await createPayment(paymentData);
      }

      /* ----------------------------------------------------
         Update appointment status
      ---------------------------------------------------- */

      let nextStatus = "Payment Pending";

      if (amountPaid > 0 && amountPaid >= charge) {
        nextStatus = "Paid";
      }

      await updateAppointmentStatus(appointmentId, nextStatus);

      setPrintPrescriptionData(prescriptionData);

      // setPrescriptionPreviewOpen(true);

      /* ----------------------------------------------------
         Success message
      ---------------------------------------------------- */

      if (isFullyPaid || (amountPaid > 0 && amountPaid >= charge)) {
        message.success("Treatment and full payment saved successfully");
      } else if (amountPaid > 0) {
        message.success(
          `Treatment saved. ${formatCurrency(
            charge - amountPaid,
          )} remains to be paid.`,
        );
      } else {
        message.success("Treatment saved. Payment is pending.");
      }

      /* ----------------------------------------------------
         Reset
      ---------------------------------------------------- */

      form.resetFields();

      setPrescriptionRows([createPrescriptionRow()]);

      setCurrentStep(0);

      setSelectedFollowUp("none");

      setTreatmentEditable(false);

      await loadCurrentTreatments();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error("Could not save treatment/payment:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Could not save the treatment",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ========================================================
     PATIENT SUMMARY
  ======================================================== */

  const renderPatientSummary = () => {
    return (
      <>
        <div
          className={
            patientInformation.hasAllergies
              ? "current-treatment-patient current-treatment-patient--allergy"
              : "current-treatment-patient"
          }
        >
          <div className="current-treatment-patient__identity">
            <Avatar
              size={62}
              icon={<UserOutlined />}
              className={
                patientInformation.hasAllergies
                  ? "current-treatment-patient__avatar current-treatment-patient__avatar--allergy"
                  : "current-treatment-patient__avatar"
              }
            />

            <div className="current-treatment-patient__details">
              <Text className="current-treatment-patient__eyebrow">
                Current Patient
              </Text>

              <Space wrap size={7}>
                <Title level={3}>{patientInformation.name}</Title>

                <Tag
                  color="processing"
                  className="current-treatment-status-tag"
                >
                  In Treatment
                </Tag>

                {patientInformation.hasAllergies && (
                  <Tag
                    color="red"
                    icon={<WarningOutlined />}
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
                    selectedAppointment?.appointment_time ||
                      selectedAppointment?.time,
                  )}
                </span>

                <span>
                  <MedicineBoxOutlined />
                  {selectedAppointment?.reason_for_visit || "Dental Treatment"}
                </span>
              </div>
            </div>
          </div>

          <Button
            size="large"
            icon={<EyeOutlined />}
            onClick={() => setPatientDetailsOpen(true)}
          >
            Patient Details
          </Button>
        </div>

        {patientInformation.hasAllergies && (
          <Alert
            type="error"
            showIcon
            icon={<WarningOutlined />}
            message="Important Allergy Warning"
            description={patientInformation.allergyDetails}
            className="current-treatment-allergy-alert"
          />
        )}
      </>
    );
  };

  /* ========================================================
     TREATMENT STEP
  ======================================================== */

  const renderTreatmentStep = () => {
    const extraClinicalItems = [
      {
        key: "extra-details",

        label: (
          <Space size={8}>
            <MedicineBoxOutlined />
            <Text strong>Add diagnosis or extra notes</Text>
          </Space>
        ),

        children: (
          <Row gutter={[18, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="Diagnosis" name="diagnosis">
                <TextArea
                  rows={4}
                  maxLength={1000}
                  showCount
                  placeholder="Optional diagnosis"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Additional Notes"
                name="doctor_notes"
                style={{ marginBottom: 0 }}
              >
                <TextArea
                  rows={4}
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
        <Card bordered={false} className="current-treatment-information-card">
          <div className="current-treatment-section-heading">
            <div>
              <Title level={4}>Treatment Information</Title>

              <Text type="secondary">
                Record the treatment details and prescription for the patient.
              </Text>
            </div>

            <div className="current-treatment-section-icon">
              <MedicineBoxOutlined />
            </div>
          </div>

          <Tabs
            defaultActiveKey="treatment-details"
            className="current-treatment-information-tabs"
            items={[
              {
                key: "treatment-details",

                label: (
                  <Space size={8}>
                    <MedicineBoxOutlined />
                    <span>Treatment Details</span>
                  </Space>
                ),

                children: (
                  <div className="current-treatment-tab-content">
                    <Row gutter={[18, 0]}>
                      <Col xs={24} md={16}>
                        <Form.Item
                          label={
                            <Space wrap>
                              <Text strong>Treatment</Text>

                              {!treatmentEditable && (
                                <Tag color="blue">Filled automatically</Tag>
                              )}

                              {selectedCommonTreatmentFee > 0 && (
                                <Tag color="green" icon={<DollarOutlined />}>
                                  Standard Fee:{" "}
                                  {formatCurrency(selectedCommonTreatmentFee)}
                                </Tag>
                              )}
                            </Space>
                          }
                          name="treatment_name"
                          rules={[
                            {
                              required: true,
                              whitespace: true,
                              message: "Please enter the treatment",
                            },
                          ]}
                        >
                          <Input
                            size="large"
                            readOnly={!treatmentEditable}
                            prefix={<MedicineBoxOutlined />}
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
                                icon={<EditOutlined />}
                                onClick={() =>
                                  setTreatmentEditable((previous) => !previous)
                                }
                              >
                                {treatmentEditable ? "Lock" : "Change"}
                              </Button>
                            }
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item
                          label={<Text strong>Tooth Number</Text>}
                          name="tooth_number"
                          extra="Leave empty when not required."
                        >
                          <Input size="large" placeholder="Example: 16" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      label={<Text strong>What treatment was performed?</Text>}
                      name="treatment_details"
                      extra="Enter a clear clinical note describing what was completed."
                    >
                      <TextArea
                        rows={3}
                        maxLength={1500}
                        showCount
                        placeholder="Example: Removed decay and completed composite filling"
                        className="current-treatment-details-input"
                      />
                    </Form.Item>

                    <Collapse
                      items={extraClinicalItems}
                      className="current-treatment-extra-details"
                    />
                  </div>
                ),
              },

              {
                key: "prescription",

                label: (
                  <Space size={8}>
                    <MedicineBoxOutlined />

                    <span>Prescription</span>

                    {selectedPrescriptionDrugNames.length > 0 && (
                      <Tag
                        color="blue"
                        style={{
                          marginInlineStart: 2,
                          marginInlineEnd: 0,
                        }}
                      >
                        {selectedPrescriptionDrugNames.length}
                      </Tag>
                    )}
                  </Space>
                ),

                children: (
                  <div className="current-treatment-tab-content">
                    <div className="current-treatment-prescription-heading">
                      <div>
                        <Space size={10}>
                          <div className="current-treatment-prescription-icon">
                            <MedicineBoxOutlined />
                          </div>

                          <div>
                            <Title level={5}>Prescription Medicines</Title>

                            <Text type="secondary">
                              Select medicines, dose and number of days.
                            </Text>
                          </div>
                        </Space>
                      </div>

                      {selectedPrescriptionDrugNames.length > 0 && (
                        <Button
                          htmlType="button"
                          size="small"
                          danger
                          onClick={clearPrescription}
                        >
                          Clear Prescription
                        </Button>
                      )}
                    </div>

                    {drugs.length > 0 ? (
                      <div className="current-treatment-drug-list">
                        {drugs.map((drug) => {
                          const drugId = getDrugId(drug);
                          const drugName = getDrugName(drug);

                          const isSelected = selectedPrescriptionDrugNames.some(
                            (selectedDrugName) =>
                              normalizeForComparison(selectedDrugName) ===
                              normalizeForComparison(drugName),
                          );

                          return (
                            <Button
                              key={drugId}
                              htmlType="button"
                              type={isSelected ? "primary" : "default"}
                              icon={
                                isSelected ? (
                                  <CheckCircleOutlined />
                                ) : (
                                  <PlusOutlined />
                                )
                              }
                              className={
                                isSelected
                                  ? "current-treatment-drug-button current-treatment-drug-button--selected"
                                  : "current-treatment-drug-button"
                              }
                              onClick={() => toggleDrugInPrescription(drug)}
                            >
                              {drugName}
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <Alert
                        type="info"
                        showIcon
                        message="No medicines available"
                        description="Add medicines from the Drugs management page to show them here."
                        style={{ marginBottom: 18 }}
                      />
                    )}

                    <div className="current-treatment-prescription-table-header">
                      <div>
                        <Text strong>Selected Medicines</Text>

                        <div>
                          <Text
                            type="secondary"
                            className="current-treatment-prescription-table-description"
                          >
                            Configure the dose and treatment duration for each
                            medicine.
                          </Text>
                        </div>
                      </div>

                      {selectedPrescriptionDrugNames.length > 0 && (
                        <Tag color="blue">
                          {selectedPrescriptionDrugNames.length} selected
                        </Tag>
                      )}
                    </div>

                    <Table
                      rowKey="key"
                      columns={prescriptionColumns}
                      dataSource={prescriptionRows}
                      pagination={false}
                      bordered
                      size="small"
                      scroll={{ x: 700 }}
                      className="current-treatment-prescription-table"
                    />

                    <Button
                      htmlType="button"
                      type="dashed"
                      block
                      icon={<PlusOutlined />}
                      onClick={addPrescriptionRow}
                      className="current-treatment-add-drug-row-button"
                    >
                      Add Another Drug
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>
    );
  };

  /* ========================================================
     FINISH STEP
  ======================================================== */

  const renderFinishStep = () => {
    return (
      <div className="current-treatment-step">
        <div className="current-treatment-section-heading">
          <div>
            <Title level={4}>Finish Treatment</Title>

            <Text type="secondary">
              Enter the fee, collect payment and schedule a follow-up when
              required.
            </Text>
          </div>

          <div className="current-treatment-section-icon current-treatment-section-icon--green">
            <CheckCircleOutlined />
          </div>
        </div>

        <Tabs
          defaultActiveKey="payment"
          className="current-treatment-finish-tabs"
          items={[
            {
              key: "payment",
              label: (
                <Space size={8}>
                  <WalletOutlined />
                  <span>Payment</span>

                  {isFullyPaid && (
                    <Tag color="green" style={{ marginInlineEnd: 0 }}>
                      Paid
                    </Tag>
                  )}

                  {hasPayment && !isFullyPaid && (
                    <Tag color="orange" style={{ marginInlineEnd: 0 }}>
                      Partial
                    </Tag>
                  )}
                </Space>
              ),

              children: (
                <div className="current-treatment-finish-tab-content">
                  <Card
                    bordered={false}
                    className="current-treatment-finish-card current-treatment-payment-card"
                  >
                    <div className="current-treatment-finish-heading">
                      <div className="current-treatment-finish-icon current-treatment-finish-icon--payment">
                        <WalletOutlined />
                      </div>

                      <div>
                        <Title level={4}>Payment</Title>

                        <Text type="secondary">
                          Confirm the treatment fee and collect payment.
                        </Text>
                      </div>
                    </div>

                    <Row gutter={[24, 24]} align="stretch">
                      {/* =====================================================
          LEFT SIDE — PAYMENT DETAILS
      ====================================================== */}

                      <Col xs={24} lg={12}>
                        <div className="current-treatment-payment-panel">
                          <div className="current-treatment-payment-panel-title">
                            <Text strong>Payment Details</Text>

                            {isFullyPaid ? (
                              <Tag color="green" icon={<CheckCircleOutlined />}>
                                Paid
                              </Tag>
                            ) : hasPayment ? (
                              <Tag color="orange">Partial</Tag>
                            ) : (
                              <Tag>Not Paid</Tag>
                            )}
                          </div>

                          {/* Treatment */}

                          <div className="current-treatment-payment-treatment">
                            <Text type="secondary">Treatment</Text>

                            <Text strong>
                              {selectedTreatment || "Dental Treatment"}
                            </Text>
                          </div>

                          {/* Standard Fee */}

                          {selectedCommonTreatmentFee > 0 && (
                            <div className="current-treatment-payment-standard">
                              <div>
                                <Text type="secondary">Standard Fee</Text>

                                <Text strong>
                                  {formatCurrency(selectedCommonTreatmentFee)}
                                </Text>
                              </div>

                              {treatmentCharge !==
                                selectedCommonTreatmentFee && (
                                <Button
                                  htmlType="button"
                                  type="link"
                                  size="small"
                                  onClick={() =>
                                    setTreatmentFee(selectedCommonTreatmentFee)
                                  }
                                >
                                  Use Standard
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Treatment Fee */}

                          <Form.Item
                            label={<Text strong>Treatment Fee</Text>}
                            name="treatment_charge"
                            className="current-treatment-simple-form-item"
                          >
                            <InputNumber
                              min={1}
                              precision={2}
                              prefix="Rs."
                              size="large"
                              placeholder="Treatment fee"
                              formatter={(value) =>
                                value
                                  ? `${value}`.replace(
                                      /\B(?=(\d{3})+(?!\d))/g,
                                      ",",
                                    )
                                  : ""
                              }
                              parser={(value) =>
                                value ? value.replace(/,/g, "") : ""
                              }
                              className="current-treatment-fee-input"
                            />
                          </Form.Item>

                          {/* Summary */}

                          <div className="current-treatment-simple-summary">
                            <div>
                              <Text type="secondary">Fee</Text>

                              <Text strong>
                                {formatCurrency(treatmentCharge)}
                              </Text>
                            </div>

                            <div>
                              <Text type="secondary">Paid</Text>

                              <Text
                                strong
                                className={
                                  hasPayment
                                    ? "current-treatment-payment-paid"
                                    : undefined
                                }
                              >
                                {formatCurrency(paymentAmount)}
                              </Text>
                            </div>

                            <div>
                              <Text type="secondary">Balance</Text>

                              <Text
                                strong
                                type={
                                  remainingAmount > 0 ? "danger" : undefined
                                }
                              >
                                {formatCurrency(remainingAmount)}
                              </Text>
                            </div>
                          </div>

                          {/* Status */}

                          {isFullyPaid ? (
                            <Alert
                              type="success"
                              showIcon
                              message="Full payment received"
                              className="current-treatment-simple-status"
                            />
                          ) : hasPayment ? (
                            <Alert
                              type="warning"
                              showIcon
                              message={`Balance: ${formatCurrency(
                                remainingAmount,
                              )}`}
                              className="current-treatment-simple-status"
                            />
                          ) : (
                            <Alert
                              type="info"
                              showIcon
                              message="Payment not collected"
                              className="current-treatment-simple-status"
                            />
                          )}
                        </div>
                      </Col>

                      {/* =====================================================
          RIGHT SIDE — PAYMENT ACTIONS
      ====================================================== */}

                      <Col xs={24} lg={12}>
                        <div className="current-treatment-payment-panel current-treatment-payment-actions-panel">
                          <div className="current-treatment-payment-panel-title">
                            <Text strong>Collect Payment</Text>

                            <DollarOutlined />
                          </div>

                          {/* Payment Amount */}

                          <Form.Item
                            label={<Text strong>Amount Paying Now</Text>}
                            name="payment_amount"
                            rules={[
                              {
                                validator: (_, value) => {
                                  const amount = Number(value || 0);

                                  const charge = Number(
                                    form.getFieldValue("treatment_charge") || 0,
                                  );

                                  if (amount < 0) {
                                    return Promise.reject(
                                      new Error("Payment cannot be negative"),
                                    );
                                  }

                                  if (amount > charge) {
                                    return Promise.reject(
                                      new Error(
                                        "Payment cannot exceed the treatment fee",
                                      ),
                                    );
                                  }

                                  return Promise.resolve();
                                },
                              },
                            ]}
                            className="current-treatment-simple-form-item"
                          >
                            <InputNumber
                              min={0}
                              max={
                                treatmentCharge > 0
                                  ? treatmentCharge
                                  : undefined
                              }
                              precision={2}
                              prefix="Rs."
                              size="large"
                              placeholder="Enter amount"
                              formatter={(value) =>
                                value
                                  ? `${value}`.replace(
                                      /\B(?=(\d{3})+(?!\d))/g,
                                      ",",
                                    )
                                  : ""
                              }
                              parser={(value) =>
                                value ? value.replace(/,/g, "") : ""
                              }
                              className="current-treatment-fee-input"
                            />
                          </Form.Item>

                          {/* Full Payment */}

                          {treatmentCharge > 0 && (
                            <Button
                              htmlType="button"
                              block
                              size="large"
                              type="primary"
                              icon={<CheckCircleOutlined />}
                              onClick={setFullPayment}
                              className="current-treatment-simple-full-payment"
                            >
                              Pay Full Amount —{" "}
                              {formatCurrency(treatmentCharge)}
                            </Button>
                          )}

                          {/* Quick Amounts */}

                          <div className="current-treatment-simple-quick">
                            <Text type="secondary">Quick amount</Text>

                            <div className="current-treatment-simple-quick-buttons">
                              {QUICK_PAYMENT_AMOUNTS.filter(
                                (amount) =>
                                  treatmentCharge <= 0 ||
                                  amount < treatmentCharge,
                              ).map((amount) => (
                                <Button
                                  key={amount}
                                  htmlType="button"
                                  type={
                                    paymentAmount === amount
                                      ? "primary"
                                      : "default"
                                  }
                                  onClick={() => setPaymentAmount(amount)}
                                >
                                  Rs. {amount.toLocaleString()}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Payment Method */}

                          {hasPayment && (
                            <Form.Item
                              label={<Text strong>Payment Method</Text>}
                              name="payment_method"
                              rules={[
                                {
                                  required: true,
                                  message: "Please select the payment method",
                                },
                              ]}
                              className="current-treatment-simple-payment-method"
                            >
                              <Select
                                size="large"
                                options={PAYMENT_METHOD_OPTIONS}
                                placeholder="Select payment method"
                                suffixIcon={<CreditCardOutlined />}
                              />
                            </Form.Item>
                          )}

                          {/* Clear */}

                          {hasPayment && (
                            <Button
                              htmlType="button"
                              danger
                              block
                              onClick={clearPayment}
                              className="current-treatment-simple-clear"
                            >
                              Clear Payment
                            </Button>
                          )}
                        </div>
                      </Col>
                    </Row>
                  </Card>
                </div>
              ),
            },

            /* =======================================================
       FOLLOW-UP TAB
    ======================================================== */

            {
              key: "follow-up",

              label: (
                <Space size={8}>
                  <CalendarOutlined />

                  <span>Follow-up Visit</span>

                  {nextAppointmentDate && (
                    <Tag color="green" style={{ marginInlineEnd: 0 }}>
                      Scheduled
                    </Tag>
                  )}
                </Space>
              ),

              children: (
                <div className="current-treatment-finish-tab-content">
                  <Card
                    bordered={false}
                    className="current-treatment-finish-card current-treatment-finish-card--follow-up"
                  >
                    {/* =====================================================
                FOLLOW-UP HEADER
            ====================================================== */}

                    <div className="current-treatment-finish-heading">
                      <div className="current-treatment-finish-icon current-treatment-finish-icon--follow-up">
                        <CalendarOutlined />
                      </div>

                      <div>
                        <Title level={4}>Follow-up Visit</Title>

                        <Text type="secondary">
                          Schedule another visit only when the patient needs to
                          return.
                        </Text>
                      </div>
                    </div>

                    {/* =====================================================
                NO FOLLOW-UP
            ====================================================== */}

                    <div className="current-treatment-follow-up-grid">
                      <Button
                        block
                        htmlType="button"
                        size="large"
                        type={
                          selectedFollowUp === "none" ? "primary" : "default"
                        }
                        className={
                          selectedFollowUp === "none"
                            ? "current-treatment-follow-up-button current-treatment-follow-up-button--none-selected"
                            : "current-treatment-follow-up-button"
                        }
                        onClick={removeFollowUp}
                      >
                        No Follow-up Needed
                      </Button>

                      {/* =================================================
                  FOLLOW-UP OPTIONS
              ================================================== */}

                      <Row gutter={[9, 9]}>
                        {FOLLOW_UP_OPTIONS.map((option) => (
                          <Col xs={12} key={option.key}>
                            <Button
                              block
                              htmlType="button"
                              size="large"
                              type={
                                selectedFollowUp === option.key
                                  ? "primary"
                                  : "default"
                              }
                              className="current-treatment-follow-up-button"
                              onClick={() => setFollowUpOption(option)}
                            >
                              {option.label}
                            </Button>
                          </Col>
                        ))}

                        <Col xs={12}>
                          <Button
                            block
                            htmlType="button"
                            size="large"
                            type={
                              selectedFollowUp === "custom"
                                ? "primary"
                                : "default"
                            }
                            className="current-treatment-follow-up-button"
                            onClick={selectCustomFollowUp}
                          >
                            Choose Date
                          </Button>
                        </Col>
                      </Row>
                    </div>

                    {/* =====================================================
                CUSTOM DATE
            ====================================================== */}

                    {selectedFollowUp === "custom" && (
                      <Form.Item
                        label={<Text strong>Follow-up Date</Text>}
                        name="next_appointment_date"
                        className="current-treatment-custom-date"
                        rules={[
                          {
                            required: true,
                            message: "Please choose a follow-up date",
                          },
                        ]}
                      >
                        <DatePicker
                          size="large"
                          format="YYYY-MM-DD"
                          placeholder="Choose follow-up date"
                          style={{ width: "100%" }}
                          disabledDate={(date) =>
                            date &&
                            date.startOf("day").valueOf() <=
                              dayjs().startOf("day").valueOf()
                          }
                        />
                      </Form.Item>
                    )}

                    {selectedFollowUp !== "custom" && (
                      <Form.Item name="next_appointment_date" hidden>
                        <DatePicker />
                      </Form.Item>
                    )}

                    {/* =====================================================
                SELECTED FOLLOW-UP
            ====================================================== */}

                    {nextAppointmentDate && (
                      <Alert
                        type="success"
                        showIcon
                        icon={<CalendarOutlined />}
                        message="Follow-up Scheduled"
                        description={
                          <Space direction="vertical" size={2}>
                            <Text strong>
                              {dayjs(nextAppointmentDate).format(
                                "dddd, DD MMMM YYYY",
                              )}
                            </Text>

                            <Text type="secondary">
                              This date will be saved with the treatment.
                            </Text>
                          </Space>
                        }
                        className="current-treatment-follow-up-alert"
                      />
                    )}

                    {/* =====================================================
                NO FOLLOW-UP INFO
            ====================================================== */}

                    {!nextAppointmentDate && selectedFollowUp === "none" && (
                      <Alert
                        type="info"
                        showIcon
                        message="No Follow-up Required"
                        description="The treatment can be completed without scheduling another visit."
                        className="current-treatment-follow-up-alert"
                      />
                    )}
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  };

  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <ClinicPage
      title="Doctor Treatment"
      subtitle="Record the current patient's treatment, fee, payment and follow-up instructions."
      icon={<MedicineBoxOutlined />}
      actions={[
        ...(appointments.length > 1
          ? [
              <Select
                key="patient-selector"
                size="large"
                value={selectedAppointmentId}
                options={currentPatientOptions}
                onChange={setSelectedAppointmentId}
                placeholder="Select current patient"
                className="current-treatment-patient-selector"
              />,
            ]
          : []),

        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={loadCurrentTreatments}
        >
          Refresh
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        {!selectedAppointment ? (
          <Card bordered={false} className="current-treatment-empty-card">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="current-treatment-empty-content">
                  <Title level={4}>No patient is currently in treatment</Title>

                  <Text type="secondary">
                    A patient will appear here after their appointment status is
                    changed to In Treatment.
                  </Text>
                </div>
              }
            />
          </Card>
        ) : (
          <div className="current-treatment-page">
            {renderPatientSummary()}

            <Card bordered={false} className="current-treatment-workspace">
              <div className="current-treatment-progress">
                <Steps current={currentStep} items={STEP_ITEMS} responsive />
              </div>

              <Form
                form={form}
                layout="vertical"
                requiredMark={false}
                preserve
                scrollToFirstError
              >
                {currentStep === 0 && renderTreatmentStep()}

                {currentStep === 1 && renderFinishStep()}
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
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setCurrentStep(0)}
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
                    onClick={handleContinue}
                    className="current-treatment-continue-button"
                  >
                    Continue to Fee
                    <ArrowRightOutlined />
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    size="large"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={handleSaveTreatment}
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

      {/* =====================================================
          PATIENT DETAILS MODAL
      ====================================================== */}

      <Modal
        title={null}
        open={patientDetailsOpen}
        onCancel={() => setPatientDetailsOpen(false)}
        centered
        width={620}
        destroyOnHidden
        className={
          patientInformation.hasAllergies
            ? "current-patient-details-modal current-patient-details-modal--allergy"
            : "current-patient-details-modal"
        }
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setPatientDetailsOpen(false)}
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
            <Text>Patient Information</Text>

            <Title level={3}>{patientInformation.name}</Title>

            <Space wrap size={7}>
              <Tag icon={<IdcardOutlined />}>{patientInformation.id}</Tag>

              <Tag
                color={
                  patientInformation.status === "Active" ? "green" : "default"
                }
              >
                {patientInformation.status}
              </Tag>

              {patientInformation.hasAllergies && (
                <Tag color="red" icon={<WarningOutlined />}>
                  Allergy
                </Tag>
              )}
            </Space>
          </div>
        </div>

        <div className="current-patient-details-content">
          {patientInformation.hasAllergies && (
            <Alert
              type="error"
              showIcon
              icon={<WarningOutlined />}
              message="Allergy Warning"
              description={patientInformation.allergyDetails}
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
              <Text copyable>{patientInformation.id}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="Name">
              <Text strong>{patientInformation.name}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="Phone">
              <Space size={7}>
                <PhoneOutlined />
                {patientInformation.phone}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Age">
              {patientInformation.age}
            </Descriptions.Item>

            <Descriptions.Item label="Gender">
              {patientInformation.gender}
            </Descriptions.Item>

            <Descriptions.Item label="Status">
              <Tag
                color={
                  patientInformation.status === "Active" ? "green" : "default"
                }
              >
                {patientInformation.status}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Address" span={2}>
              {patientInformation.address}
            </Descriptions.Item>

            <Descriptions.Item label="Appointment" span={2}>
              <Space wrap>
                <Tag color="blue">{getAppointmentId(selectedAppointment)}</Tag>

                <Text>
                  <ClockCircleOutlined />{" "}
                  {formatAppointmentTime(
                    selectedAppointment?.appointment_time ||
                      selectedAppointment?.time,
                  )}
                </Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </div>
      </Modal>

      {/* =====================================================
          PRESCRIPTION PREVIEW
      ====================================================== */}

      <Modal
        title={
          <Space size={10}>
            <PrinterOutlined />
            <span>Prescription Preview</span>
          </Space>
        }
        open={prescriptionPreviewOpen}
        onCancel={() => setPrescriptionPreviewOpen(false)}
        width={560}
        centered
        destroyOnHidden={false}
        className="ivory-prescription-preview-modal"
        footer={[
          <Button key="close" onClick={() => setPrescriptionPreviewOpen(false)}>
            Close
          </Button>,

          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            disabled={!printPrescriptionData}
            onClick={handlePrintPrescription}
          >
            Print Prescription
          </Button>,
        ]}
      >
        {printPrescriptionData && (
          <div ref={prescriptionPrintRef} className="ivory-prescription-sheet">
            <header className="ivory-prescription-header">
              <div className="ivory-prescription-brand">
                <div className="ivory-prescription-logo">
                  <div className="ivory-prescription-logo-circle">
                    <MedicineBoxOutlined />
                  </div>
                </div>

                <div className="ivory-prescription-brand-text">
                  <h1>{CLINIC_INFORMATION.name}</h1>

                  <div className="ivory-prescription-subtitle">
                    {CLINIC_INFORMATION.subtitle}
                  </div>
                </div>
              </div>

              <div className="ivory-prescription-contact-grid">
                <div className="ivory-prescription-doctor-details" />

                <div className="ivory-prescription-clinic-address">
                  <span>{CLINIC_INFORMATION.addressLineOne}</span>
                  <span>{CLINIC_INFORMATION.addressLineTwo}</span>
                  <span>{CLINIC_INFORMATION.addressLineThree}</span>

                  <strong>Hot Line : {CLINIC_INFORMATION.hotline}</strong>
                </div>
              </div>
            </header>

            <div className="ivory-prescription-header-line" />

            <section className="ivory-prescription-meta">
              <div className="ivory-prescription-patient-line">
                <span className="ivory-prescription-label">Patient:</span>

                <strong>{printPrescriptionData.patient.name}</strong>

                <span className="ivory-prescription-patient-id">
                  ID: {printPrescriptionData.patient.id}
                </span>
              </div>

              <div className="ivory-prescription-date">
                <span>Date :</span>

                <strong>
                  {dayjs(printPrescriptionData.treatment.treatment_date).format(
                    "DD / MM / YYYY",
                  )}
                </strong>
              </div>
            </section>

            {printPrescriptionData.patient.has_allergies && (
              <div className="ivory-prescription-allergy">
                <WarningOutlined />

                <div>
                  <strong>ALLERGY WARNING</strong>

                  <span>{printPrescriptionData.patient.allergy_details}</span>
                </div>
              </div>
            )}

            <main className="ivory-prescription-body">
              <div className="ivory-prescription-medicines">
                {printPrescriptionData.treatment.prescription ? (
                  printPrescriptionData.treatment.prescription
                    .split("\n")
                    .filter(Boolean)
                    .map((line, index) => (
                      <div
                        key={`${line}-${index}`}
                        className="ivory-prescription-medicine-row"
                      >
                        {line}
                      </div>
                    ))
                ) : (
                  <div className="ivory-prescription-empty">
                    No medicines prescribed.
                  </div>
                )}
              </div>
            </main>

            {printPrescriptionData.treatment.doctor_notes && (
              <section className="ivory-prescription-instructions">
                <strong>Instructions:</strong>

                <span>{printPrescriptionData.treatment.doctor_notes}</span>
              </section>
            )}

            {printPrescriptionData.treatment.next_appointment_date && (
              <section className="ivory-prescription-follow-up">
                <CalendarOutlined />

                <span>
                  Follow-up:{" "}
                  <strong>
                    {dayjs(
                      printPrescriptionData.treatment.next_appointment_date,
                    ).format("DD / MM / YYYY")}
                  </strong>
                </span>
              </section>
            )}

            <footer className="ivory-prescription-footer">
              <div className="ivory-prescription-stamp">
                <strong>{CLINIC_INFORMATION.dentistName}</strong>

                <span>
                  {CLINIC_INFORMATION.designation},{" "}
                  {CLINIC_INFORMATION.qualificationTwo}
                </span>

                <span>{CLINIC_INFORMATION.qualificationOne}</span>

                <span>{CLINIC_INFORMATION.registrationNumber}</span>

                <span>Tel: {CLINIC_INFORMATION.stampPhone}</span>
              </div>

              <div className="ivory-prescription-signature">
                <div className="ivory-prescription-signature-line" />

                <span>Signature</span>
              </div>
            </footer>

            <div className="ivory-prescription-footer-text">
              {CLINIC_INFORMATION.footerText}
            </div>
          </div>
        )}
      </Modal>
    </ClinicPage>
  );
};

export default CurrentTreatment;
