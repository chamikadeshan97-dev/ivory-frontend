import React, { useCallback, useEffect, useMemo, useState } from "react";

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
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  TimePicker,
  InputNumber,
} from "antd";

import {
  CalendarOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  LoginOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  SearchOutlined,
  UserAddOutlined,
  UserOutlined,
  WarningOutlined,
  MessageOutlined,
  SendOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { createCommonTreatment } from "../api/endPoints";
import {
  checkInAppointmentToQueue,
  createAppointment,
  createPatient,
  getAppointments,
  getLocations,
  getCommonTreatments,
  getDentists,
  getPatients,
  updateAppointment,
  updateAppointmentStatus,
  sendTemplateSMS,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";

import "./css/Appointments.css";

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;

/* ========================================================
   Configuration
======================================================== */

const DEFAULT_APPOINTMENT_TIME = "16:00";

const SKIPPED_PATIENT_ID = "SYSTEM_SKIP";
const SKIPPED_STATUS = "Skipped";
const SKIPPED_RECORD_TYPE = "appointment_number_skip";

/* ========================================================
   Status options
======================================================== */

const bookingStatusOptions = [
  {
    label: "Pending",
    value: "Pending",
  },
  {
    label: "Confirmed",
    value: "Confirmed",
  },
  {
    label: "Cancelled",
    value: "Cancelled",
  },
];

const allStatusOptions = [
  {
    label: "Pending",
    value: "Pending",
  },
  {
    label: "Confirmed",
    value: "Confirmed",
  },
  {
    label: "Checked In",
    value: "Checked In",
  },
  {
    label: "In Treatment",
    value: "In Treatment",
  },
  {
    label: "Treatment Done",
    value: "Treatment Done",
  },
  {
    label: "Payment Pending",
    value: "Payment Pending",
  },
  {
    label: "Paid",
    value: "Paid",
  },
  {
    label: "Completed",
    value: "Completed",
  },
  {
    label: "Cancelled",
    value: "Cancelled",
  },
];

const lockedStatuses = [
  "Checked In",
  "In Treatment",
  "Treatment Done",
  "Payment Pending",
  "Paid",
  "Completed",
];

const activeStatuses = [
  "Pending",
  "Confirmed",
  "Checked In",
  "In Treatment",
  "Treatment Done",
  "Payment Pending",
];

const completedStatuses = ["Paid", "Completed"];

/* ========================================================
   Patient helpers
======================================================== */

const getPatientLocation = (patient) => {
  return (
    patient?.location ||
    patient?.city ||
    patient?.patient_location ||
    "Location not available"
  );
};

const getPatientDistance = (patient) => {
  const distance = Number(
    patient?.distance ?? patient?.distance_km ?? patient?.location_distance,
  );

  return Number.isFinite(distance) ? distance : null;
};

const formatPatientDistance = (distance) => {
  const numericDistance = Number(distance);

  if (!Number.isFinite(numericDistance)) {
    return "Distance not available";
  }

  return `${numericDistance.toLocaleString("en-LK", {
    maximumFractionDigits: 2,
  })} km from clinic`;
};

/* ========================================================
   Form options
======================================================== */

const genderOptions = [
  {
    label: "Male",
    value: "Male",
  },
  {
    label: "Female",
    value: "Female",
  },
  {
    label: "Other",
    value: "Other",
  },
];

/* ========================================================
   Time slots
======================================================== */

const makeTimeOption = (time) => ({
  value: time,
  label: dayjs(time, "HH:mm").format("h:mm A"),
});

const generateTimeSlots = (startTime, endTime, gapMinutes) => {
  const slots = [];

  const [startHours, startMinutes] = startTime.split(":").map(Number);

  const [endHours, endMinutes] = endTime.split(":").map(Number);

  let currentMinutes = startHours * 60 + startMinutes;

  const finalMinutes = endHours * 60 + endMinutes;

  while (currentMinutes <= finalMinutes) {
    const slotHours = Math.floor(currentMinutes / 60);

    const slotMinutes = currentMinutes % 60;

    slots.push(
      `${String(slotHours).padStart(2, "0")}:${String(slotMinutes).padStart(
        2,
        "0",
      )}`,
    );

    currentMinutes += gapMinutes;
  }

  return slots;
};

const appointmentTimeOptions = [
  {
    label: "Morning",
    options: [
      "08:00",
      "08:30",
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
    ].map(makeTimeOption),
  },
  {
    label: "Afternoon",
    options: [
      "12:00",
      "12:30",
      "13:00",
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
    ].map(makeTimeOption),
  },
  {
    label: "Evening",
    options: generateTimeSlots("16:00", "19:30", 15).map(makeTimeOption),
  },
  {
    label: "Night",
    options: generateTimeSlots("20:00", "23:30", 5).map(makeTimeOption),
  },
];

const appointmentTimeSlots = appointmentTimeOptions.flatMap((group) =>
  group.options.map((option) => option.value),
);

/* ========================================================
   Helpers
======================================================== */

const extractArray = (response) => {
  const data = response?.data?.data || response?.data || [];

  return Array.isArray(data) ? data : [];
};

const normalizeStatus = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const normalizeText = (value) => {
  return String(value ?? "").trim();
};

const checkBooleanFlag = (value) => {
  if (value === true || value === 1) {
    return true;
  }

  return ["true", "1", "yes"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
};

const isSkippedAppointment = (appointment) => {
  if (!appointment) {
    return false;
  }

  const recordType = normalizeText(appointment?.record_type).toLowerCase();

  const status = normalizeStatus(appointment?.status);

  const patientId = normalizeText(appointment?.patient_id).toUpperCase();

  return (
    recordType === SKIPPED_RECORD_TYPE ||
    status === normalizeStatus(SKIPPED_STATUS) ||
    checkBooleanFlag(appointment?.is_skipped) ||
    patientId === SKIPPED_PATIENT_ID
  );
};

const getAppointmentId = (record) => {
  return record?.id || record?.appointment_id || "";
};

const getPatientId = (patient) => {
  return patient?.patient_id || patient?.id || "";
};

const getPatientName = (patient) => {
  return (
    patient?.name ||
    [patient?.first_name, patient?.last_name].filter(Boolean).join(" ") ||
    "Unnamed Patient"
  );
};

const getPatientPhone = (patient) => {
  return patient?.phone || patient?.phone_number || patient?.mobile || "-";
};

const getDentistId = (dentist) => {
  return dentist?.dentist_id || dentist?.id || "";
};

const getDentistName = (dentist) => {
  return dentist?.name || dentist?.dentist_name || "Unnamed Dentist";
};

const getCommonTreatmentId = (treatment) => {
  return treatment?.id || treatment?.common_treatment_id || "";
};

const getCommonTreatmentName = (treatment) => {
  return treatment?.treatment_name || treatment?.name || "";
};

const getCommonTreatmentFee = (treatment) => {
  const fee = Number(treatment?.fee ?? treatment?.default_fee);

  return Number.isFinite(fee) ? fee : null;
};

const checkHasAllergy = (value) => {
  if (value === true || value === 1) {
    return true;
  }

  return ["yes", "true", "1"].includes(
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
    time,
    ["HH:mm", "HH:mm:ss", "h:mm A", "hh:mm A"],
    true,
  );

  return parsedTime.isValid() ? parsedTime.format("h:mm A") : time;
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = dayjs(value);

  return date.isValid() ? date.format("DD MMM YYYY") : value;
};

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Fee not available";
  }

  return `Rs. ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getStatusColor = (status) => {
  const colors = {
    Pending: "blue",
    Confirmed: "purple",
    "Checked In": "cyan",
    "In Treatment": "orange",
    "Treatment Done": "gold",
    "Payment Pending": "volcano",
    Paid: "green",
    Completed: "success",
    Cancelled: "red",
  };

  return colors[status] || "default";
};

/* ========================================================
   Summary card
======================================================== */

const AppointmentSummaryCard = ({ title, value, helper, icon, tone }) => {
  return (
    <Card
      bordered={false}
      className={`booking-summary-card booking-summary-card--${tone}`}
    >
      <div className="booking-summary-card__content">
        <div>
          <Text className="booking-summary-card__title">{title}</Text>

          <div className="booking-summary-card__value">{value}</div>

          <Text className="booking-summary-card__helper">{helper}</Text>
        </div>

        <div className="booking-summary-card__icon">{icon}</div>
      </div>
    </Card>
  );
};

/* ========================================================
   Component
======================================================== */

const Appointments = () => {
  const [form] = Form.useForm();
  const [patientForm] = Form.useForm();

  /* ======================================================
     General states
  ====================================================== */

  const [loading, setLoading] = useState(false);

  const [editTime, setEditTime] = useState(false);
  const [editDate, setEditDate] = useState(false);

  const [saving, setSaving] = useState(false);

  const [checkingInId, setCheckingInId] = useState(null);

  /* ======================================================
     SKIP APPOINTMENT NUMBER
  ====================================================== */

  const [skipAppointmentNumber, setSkipAppointmentNumber] = useState(false);

  /* ======================================================
     Locations
  ====================================================== */

  const [patientLocations, setPatientLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [newTreatmentModalOpen, setNewTreatmentModalOpen] = useState(false);

  const [savingTreatment, setSavingTreatment] = useState(false);

  const [newTreatmentForm] = Form.useForm();
  const loadPatientLocations = useCallback(async () => {
    try {
      setLocationsLoading(true);

      const response = await getLocations();

      const locationData =
        response?.data?.data ||
        response?.data?.locations ||
        response?.data ||
        [];

      const normalizedLocations = Array.isArray(locationData)
        ? locationData
            .map((location) => ({
              id: location.id,

              city: location.location || location.city || location.name || "",

              distance: Number(location.distance_km ?? location.distance ?? 0),
            }))
            .filter((location) => location.city)
            .sort(
              (firstLocation, secondLocation) =>
                firstLocation.distance - secondLocation.distance,
            )
        : [];

      setPatientLocations(normalizedLocations);
    } catch (error) {
      console.error("Failed to load patient locations:", error);

      message.error("Failed to load locations.");

      setPatientLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatientLocations();
  }, [loadPatientLocations]);

  /* ======================================================
     Main data
  ====================================================== */

  const [patientSaving, setPatientSaving] = useState(false);

  const [appointments, setAppointments] = useState([]);

  const [patients, setPatients] = useState([]);

  const [dentists, setDentists] = useState([]);

  const [commonTreatments, setCommonTreatments] = useState([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [dateFilter, setDateFilter] = useState(dayjs());
  const [sendingAppointmentSMS, setSendingAppointmentSMS] = useState(false);

  const [sendingDoctorArrivalSMS, setSendingDoctorArrivalSMS] = useState(false);
  /* ======================================================
     Appointment modal
  ====================================================== */

  const [modalOpen, setModalOpen] = useState(false);

  const [editingAppointment, setEditingAppointment] = useState(null);

  /* ======================================================
     Patient modal
  ====================================================== */

  const [patientModalOpen, setPatientModalOpen] = useState(false);

  const [showPatientMoreOptions, setShowPatientMoreOptions] = useState(false);

  /* ======================================================
     Form watches
  ====================================================== */

  const selectedAppointmentTime = Form.useWatch("appointment_time", form);

  const selectedAppointmentDate =
    Form.useWatch("appointment_date", form) || dayjs();

  const patientHasAllergies = Form.useWatch("has_allergies", patientForm);

  const watchedAppointmentDate = Form.useWatch("appointment_date", form);

  const watchedAppointmentTime = Form.useWatch("appointment_time", form);

  const watchedReasonForVisit = Form.useWatch("reason_for_visit", form);

  const selectedDentistId = Form.useWatch("dentist_id", form);

  const selectedPatientId = Form.useWatch("patient_id", form);

  /* ======================================================
     Patient location options
  ====================================================== */

  const patientLocationOptions = useMemo(() => {
    return patientLocations.map((location) => ({
      label: `${location.city} • ${location.distance} km`,
      value: location.city,
    }));
  }, [patientLocations]);

  /* ======================================================
     Appointment date/time actions
  ====================================================== */

  const setAppointmentDate = (date) => {
    const normalizedDate = date ? dayjs(date) : null;

    form.setFieldValue("appointment_date", normalizedDate);

    /*
     * If date changes, the skipped number automatically
     * recalculates for the newly selected date.
     */

    form.validateFields(["appointment_date"]).catch(() => {});
  };

  const addDaysToAppointmentDate = (days) => {
    const currentDate = form.getFieldValue("appointment_date") || dayjs();

    const nextDate = dayjs(currentDate).add(days, "day");

    setAppointmentDate(nextDate);
  };

  const subtractDaysFromAppointmentDate = (days) => {
    const currentDate = form.getFieldValue("appointment_date") || dayjs();

    const nextDate = dayjs(currentDate).subtract(days, "day");

    if (nextDate.isBefore(dayjs().startOf("day"))) {
      message.warning("Appointment date cannot be in the past");

      return;
    }

    setAppointmentDate(nextDate);
  };

  /* ======================================================
     Load data
  ====================================================== */

  const loadInitialData = useCallback(async () => {
    setLoading(true);

    try {
      const [
        appointmentsResponse,
        patientsResponse,
        dentistsResponse,
        commonTreatmentsResponse,
      ] = await Promise.all([
        getAppointments(),
        getPatients(),
        getDentists(),
        getCommonTreatments(),
      ]);

      const appointmentData = extractArray(appointmentsResponse);

      const patientData = extractArray(patientsResponse);

      const dentistData = extractArray(dentistsResponse);

      const commonTreatmentData = extractArray(commonTreatmentsResponse);

      const patientMap = new Map(
        patientData.map((patient) => [String(getPatientId(patient)), patient]),
      );

      const dentistMap = new Map(
        dentistData.map((dentist) => [String(getDentistId(dentist)), dentist]),
      );

      const enrichedAppointments = appointmentData.map((appointment) => {
        /*
         * Special skipped-number records intentionally
         * do not have a real patient.
         */
        if (isSkippedAppointment(appointment)) {
          const dentist = dentistMap.get(String(appointment?.dentist_id));

          return {
            ...appointment,

            patient_name: "Reserved Number",

            phone: "-",

            patient_has_allergies: false,

            patient_allergy_details: "",

            dentist_name:
              appointment?.dentist_name ||
              getDentistName(dentist) ||
              appointment?.dentist_id ||
              "-",
          };
        }

        const patient = patientMap.get(String(appointment?.patient_id));

        const dentist = dentistMap.get(String(appointment?.dentist_id));

        const allergyValue =
          patient?.has_allergies ??
          patient?.is_allergies ??
          patient?.hasAllergies ??
          false;

        return {
          ...appointment,

          patient_name:
            appointment?.patient_name ||
            getPatientName(patient) ||
            appointment?.patient_id ||
            "-",

          phone: appointment?.phone || getPatientPhone(patient),

          patient_has_allergies: checkHasAllergy(allergyValue),

          patient_allergy_details:
            patient?.allergy_details ||
            patient?.allergies ||
            patient?.allergy ||
            "",

          dentist_name:
            appointment?.dentist_name ||
            getDentistName(dentist) ||
            appointment?.dentist_id ||
            "-",
        };
      });

      setAppointments(enrichedAppointments);

      setPatients(patientData);

      setDentists(dentistData);

      setCommonTreatments(commonTreatmentData);
    } catch (error) {
      console.error("Failed to load appointment data:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load appointment data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!modalOpen || editingAppointment) {
      return;
    }

    const currentTime = form.getFieldValue("appointment_time");

    if (!currentTime) {
      form.setFieldValue("appointment_time", DEFAULT_APPOINTMENT_TIME);
    }
  }, [modalOpen, editingAppointment, form]);

  /* ======================================================
     Patient options
  ====================================================== */

  const patientOptions = useMemo(() => {
    return patients.map((patient) => {
      const patientId = getPatientId(patient);

      const patientName = getPatientName(patient);

      const allergyValue =
        patient?.has_allergies ??
        patient?.is_allergies ??
        patient?.hasAllergies ??
        false;

      const hasAllergy = checkHasAllergy(allergyValue);

      const location = getPatientLocation(patient);

      const distance = getPatientDistance(patient);

      return {
        value: patientId,

        label: patientName + getPatientPhone(patient),

        patientName,

        phone: getPatientPhone(patient),

        location,

        distance,

        hasAllergy,

        allergyDetails:
          patient?.allergy_details ||
          patient?.allergies ||
          patient?.allergy ||
          "No allergy details were provided",
      };
    });
  }, [patients]);

  const selectedPatient = useMemo(() => {
    return patientOptions.find(
      (patient) => String(patient.value) === String(selectedPatientId),
    );
  }, [patientOptions, selectedPatientId]);

  /* ======================================================
     Dentist options
  ====================================================== */

  const dentistOptions = useMemo(() => {
    return dentists.map((dentist) => ({
      label: getDentistName(dentist),

      value: getDentistId(dentist),

      specialization: dentist?.specialization || "General Dentistry",

      status: dentist?.status || "Active",
    }));
  }, [dentists]);

  useEffect(() => {
    if (dentistOptions.length > 0 && !form.getFieldValue("dentist_id")) {
      form.setFieldValue("dentist_id", dentistOptions[0].value);
    }
  }, [dentistOptions, form]);

  /* ======================================================
     Common treatment options
  ====================================================== */

  const commonTreatmentOptions = useMemo(() => {
    const treatmentMap = new Map();

    commonTreatments.forEach((treatment) => {
      const treatmentName = normalizeText(getCommonTreatmentName(treatment));

      if (!treatmentName) {
        return;
      }

      const normalizedName = treatmentName.toLowerCase();

      if (treatmentMap.has(normalizedName)) {
        return;
      }

      treatmentMap.set(normalizedName, {
        value: treatmentName,

        label: treatmentName,

        treatmentId: getCommonTreatmentId(treatment),

        fee: getCommonTreatmentFee(treatment),
      });
    });

    const existingReason = normalizeText(editingAppointment?.reason_for_visit);

    if (existingReason && !treatmentMap.has(existingReason.toLowerCase())) {
      treatmentMap.set(existingReason.toLowerCase(), {
        value: existingReason,

        label: existingReason,

        treatmentId: "",

        fee: null,

        isLegacy: true,
      });
    }

    if (!treatmentMap.has("other")) {
      treatmentMap.set("other", {
        value: "Other",

        label: "Other",

        treatmentId: "",

        fee: null,

        isOther: true,
      });
    }

    return Array.from(treatmentMap.values()).sort((first, second) => {
      if (first.isOther) {
        return 1;
      }

      if (second.isOther) {
        return -1;
      }

      return first.label.localeCompare(second.label, undefined, {
        sensitivity: "base",
      });
    });
  }, [commonTreatments, editingAppointment]);

  const selectedCommonTreatment = useMemo(() => {
    const selectedReason = normalizeText(watchedReasonForVisit).toLowerCase();

    if (!selectedReason) {
      return null;
    }

    return (
      commonTreatmentOptions.find(
        (treatment) =>
          normalizeText(treatment.value).toLowerCase() === selectedReason,
      ) || null
    );
  }, [commonTreatmentOptions, watchedReasonForVisit]);
  const handleSaveNewTreatment = async () => {
    try {
      const values = await newTreatmentForm.validateFields();

      const payload = {
        treatment_name: String(values.treatment_name || "").trim(),
        fee: Number(values.fee),
      };

      setSavingTreatment(true);

      await createCommonTreatment(payload);

      message.success("Common treatment created successfully");

      /*
       * Reload dropdown options first
       */
      await getCommonTreatments();

      /*
       * Set the newly created treatment
       * into the appointment form
       */
      form.setFieldValue("reason_for_visit", payload.treatment_name);

      setNewTreatmentModalOpen(false);

      newTreatmentForm.resetFields();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error("Failed to create common treatment:", error);

      messageApi.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create common treatment",
      );
    } finally {
      setSavingTreatment(false);
    }
  };
  /* ======================================================
     Next appointment time

     IMPORTANT:
     Skipped records are ignored here.
  ====================================================== */

  const getNextAppointmentTime = useCallback(
    (selectedDate) => {
      if (!selectedDate) {
        return DEFAULT_APPOINTMENT_TIME;
      }

      const selectedDateText = selectedDate.format("YYYY-MM-DD");

      const sameDateAppointments = appointments
        .filter((appointment) => {
          const appointmentDate =
            appointment?.appointment_date || appointment?.date;

          const status = normalizeStatus(appointment?.status);

          if (appointmentDate !== selectedDateText) {
            return false;
          }

          if (status === "cancelled") {
            return false;
          }

          if (isSkippedAppointment(appointment)) {
            return false;
          }

          return true;
        })
        .sort((first, second) => {
          const firstTime = first?.appointment_time || first?.time || "";

          const secondTime = second?.appointment_time || second?.time || "";

          return firstTime.localeCompare(secondTime);
        });

      if (sameDateAppointments.length === 0) {
        return DEFAULT_APPOINTMENT_TIME;
      }

      const lastAppointment =
        sameDateAppointments[sameDateAppointments.length - 1];

      const lastTime =
        lastAppointment?.appointment_time ||
        lastAppointment?.time ||
        DEFAULT_APPOINTMENT_TIME;

      const parsedLastTime = dayjs(lastTime, "HH:mm", true);

      if (!parsedLastTime.isValid()) {
        return DEFAULT_APPOINTMENT_TIME;
      }

      return parsedLastTime.add(15, "minute").format("HH:mm");
    },
    [appointments],
  );

  useEffect(() => {
    if (!modalOpen || editingAppointment || !watchedAppointmentDate) {
      return;
    }

    form.setFieldsValue({
      appointment_time: getNextAppointmentTime(watchedAppointmentDate),
    });
  }, [
    modalOpen,
    editingAppointment,
    watchedAppointmentDate,
    appointments,
    form,
    getNextAppointmentTime,
  ]);
  const [skippingNumber, setSkippingNumber] = useState(false);
  /* ======================================================
     Appointment number logic

     Example:

     Existing:
     #1
     #2
     #3
     #4

     Normal:
     current = #5

     Skip enabled:
     special record = #5
     patient appointment = #6
  ====================================================== */

  const {
    nextAppointmentNo,
    currentModalAppointmentNo,
    skippedAppointmentNo,
    lastAppointment_reason_for_visit,
    lastAppointmentTime,
  } = useMemo(() => {
    if (!watchedAppointmentDate) {
      return {
        nextAppointmentNo: 1,

        currentModalAppointmentNo: 1,

        skippedAppointmentNo: null,

        lastAppointment_reason_for_visit: null,

        lastAppointmentTime: null,
      };
    }

    const selectedDate = watchedAppointmentDate.format("YYYY-MM-DD");

    /*
     * IMPORTANT:
     * We include skipped records here because
     * their appointment number is already consumed.
     */

    const sameDateAppointments = appointments.filter((appointment) => {
      const appointmentDate =
        appointment?.appointment_date || appointment?.date;

      if (appointmentDate !== selectedDate) {
        return false;
      }

      if (
        editingAppointment &&
        getAppointmentId(appointment) === getAppointmentId(editingAppointment)
      ) {
        return false;
      }

      return true;
    });

    const savedNumbers = sameDateAppointments
      .map((appointment) => Number(appointment?.appointment_number))
      .filter((number) => Number.isFinite(number) && number > 0);

    /*
     * Supports older records that may not have
     * appointment_number saved.
     */

    const highestSavedNumber =
      savedNumbers.length > 0 ? Math.max(...savedNumbers) : 0;

    const fallbackHighestNumber = sameDateAppointments.length;

    const highestAppointmentNumber = Math.max(
      highestSavedNumber,
      fallbackHighestNumber,
    );

    const calculatedNextNumber = highestAppointmentNumber + 1;

    /*
     * Editing should keep the original number.
     */

    if (editingAppointment) {
      const existingAppointmentNumber = Number(
        editingAppointment?.appointment_number,
      );

      return {
        nextAppointmentNo: existingAppointmentNumber || calculatedNextNumber,

        currentModalAppointmentNo:
          existingAppointmentNumber || calculatedNextNumber,

        skippedAppointmentNo: null,

        lastAppointment_reason_for_visit: null,

        lastAppointmentTime: null,
      };
    }

    /*
     * Find the last REAL appointment.
     * Skipped/system records do not count.
     */

    const realAppointments = sameDateAppointments
      .filter((appointment) => {
        if (isSkippedAppointment(appointment)) {
          return false;
        }

        return normalizeStatus(appointment?.status) !== "cancelled";
      })
      .sort((first, second) => {
        const firstTime = first?.appointment_time || first?.time || "";

        const secondTime = second?.appointment_time || second?.time || "";

        return firstTime.localeCompare(secondTime);
      });

    const lastAppointment =
      realAppointments.length > 0
        ? realAppointments[realAppointments.length - 1]
        : null;

    return {
      nextAppointmentNo: calculatedNextNumber,

      skippedAppointmentNo: skipAppointmentNumber ? calculatedNextNumber : null,

      currentModalAppointmentNo: skipAppointmentNumber
        ? calculatedNextNumber + 1
        : calculatedNextNumber,

      lastAppointment_reason_for_visit:
        lastAppointment?.reason_for_visit || null,

      lastAppointmentTime:
        lastAppointment?.appointment_time || lastAppointment?.time || null,
    };
  }, [
    appointments,
    watchedAppointmentDate,
    editingAppointment,
    skipAppointmentNumber,
  ]);

  /* ======================================================
     Appointment time actions
  ====================================================== */

  const setAppointmentTime = (time) => {
    if (!time) {
      form.setFieldValue("appointment_time", undefined);

      return;
    }

    /*
     * Only enforce "after last appointment"
     * when creating a new appointment.
     */

    if (!editingAppointment && lastAppointmentTime) {
      const selectedTime = dayjs(time, "HH:mm", true);

      const previousLastTime = dayjs(lastAppointmentTime, "HH:mm", true);

      if (
        selectedTime.isValid() &&
        previousLastTime.isValid() &&
        !selectedTime.isAfter(previousLastTime)
      ) {
        message.warning(
          `Appointment time must be after ${formatAppointmentTime(
            lastAppointmentTime,
          )}`,
        );

        return;
      }
    }

    form.setFieldValue("appointment_time", time);

    form.validateFields(["appointment_time"]).catch(() => {});
  };

  const addMinutesToAppointmentTime = (minutes) => {
    const currentTime =
      form.getFieldValue("appointment_time") || DEFAULT_APPOINTMENT_TIME;

    const parsedTime = dayjs(currentTime, "HH:mm", true);

    const baseTime = parsedTime.isValid()
      ? parsedTime
      : dayjs(DEFAULT_APPOINTMENT_TIME, "HH:mm");

    const updatedTime = baseTime.add(minutes, "minute").format("HH:mm");

    setAppointmentTime(updatedTime);
  };

  const subtractMinutesFromAppointmentTime = (minutes) => {
    const currentTime =
      form.getFieldValue("appointment_time") || DEFAULT_APPOINTMENT_TIME;

    const parsedTime = dayjs(currentTime, "HH:mm", true);

    const baseTime = parsedTime.isValid()
      ? parsedTime
      : dayjs(DEFAULT_APPOINTMENT_TIME, "HH:mm");

    const updatedTime = baseTime.subtract(minutes, "minute").format("HH:mm");

    setAppointmentTime(updatedTime);
  };

  /* ======================================================
     Appointment numbering for table

     Prefer the number saved in the database.
  ====================================================== */

  const appointmentsWithNumber = useMemo(() => {
    const sortedAppointments = [...appointments].sort((first, second) => {
      const firstDate = first?.appointment_date || first?.date || "";

      const secondDate = second?.appointment_date || second?.date || "";

      if (firstDate !== secondDate) {
        return firstDate.localeCompare(secondDate);
      }

      const firstNumber = Number(first?.appointment_number);

      const secondNumber = Number(second?.appointment_number);

      if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
        return firstNumber - secondNumber;
      }

      const firstTime = first?.appointment_time || first?.time || "";

      const secondTime = second?.appointment_time || second?.time || "";

      return firstTime.localeCompare(secondTime);
    });

    const numberMap = {};

    return sortedAppointments.map((appointment) => {
      const date = appointment?.appointment_date || appointment?.date || "";

      const status = appointment?.status || "Pending";

      if (!numberMap[date]) {
        numberMap[date] = 1;
      }

      const storedNumber = Number(appointment?.appointment_number);

      let appointmentNumber;

      if (Number.isFinite(storedNumber) && storedNumber > 0) {
        appointmentNumber = storedNumber;

        numberMap[date] = Math.max(numberMap[date], storedNumber + 1);
      } else {
        appointmentNumber = numberMap[date];

        numberMap[date] += 1;
      }

      /*
       * Keep the old UI behavior for
       * cancelled appointments.
       */

      const displayNumber = status === "Cancelled" ? "-" : appointmentNumber;

      return {
        ...appointment,

        appointment_number: displayNumber,

        stored_appointment_number: appointmentNumber,
      };
    });
  }, [appointments]);

  const dateAppointments = useMemo(() => {
    let selectedAppointments = appointmentsWithNumber;

    if (dateFilter) {
      const selectedDate = dateFilter.format("YYYY-MM-DD");

      selectedAppointments = appointmentsWithNumber.filter((appointment) => {
        const appointmentDate =
          appointment?.appointment_date || appointment?.date;

        return appointmentDate === selectedDate;
      });
    }

    /*
     * Do not show special skipped-number
     * records as patient appointments.
     */

    return selectedAppointments;
  }, [appointmentsWithNumber, dateFilter]);

  /* ======================================================
     Summary
  ====================================================== */

  const appointmentSummary = useMemo(() => {
    const realAppointments = dateAppointments;
    console.log(dateAppointments.length);

    const skippedAppointments = dateAppointments.filter((appointment) =>
      isSkippedAppointment(appointment),
    );

    const pending = realAppointments.filter((appointment) =>
      ["Pending", "Confirmed"].includes(appointment?.status || "Pending"),
    ).length;

    const checkedIn = realAppointments.filter(
      (appointment) => appointment?.status === "Checked In",
    ).length;

    const completed = realAppointments.filter((appointment) =>
      completedStatuses.includes(appointment?.status),
    ).length;

    const cancelled = realAppointments.filter(
      (appointment) => appointment?.status === "Cancelled",
    ).length;

    return {
      total: realAppointments.length,
      pending,
      checkedIn,
      completed,
      cancelled,

      skipped: skippedAppointments.length,
    };
  }, [dateAppointments]);

  /* ======================================================
     Search/filter
  ====================================================== */

  const filteredAppointments = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return dateAppointments.filter((appointment) => {
      const status = appointment?.status || "Pending";

      const skipped = isSkippedAppointment(appointment);
      let matchesFilter = false;

      if (statusFilter === "skipped") {
        matchesFilter = skipped;
      } else {
        matchesFilter =
          statusFilter === "all" ||
          (statusFilter === "active" && activeStatuses.includes(status)) ||
          (statusFilter === "completed" &&
            completedStatuses.includes(status)) ||
          (statusFilter === "cancelled" && status === "Cancelled");
      }

      const searchableValues = [
        getAppointmentId(appointment),

        appointment?.appointment_number,

        appointment?.patient_name,

        appointment?.dentist_name,

        appointment?.phone,

        appointment?.reason_for_visit,

        appointment?.skip_note,

        status,
      ];

      const matchesSearch =
        !keyword ||
        searchableValues.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(keyword),
        );

      return matchesSearch && matchesFilter;
    });
  }, [dateAppointments, search, statusFilter]);

  /* ======================================================
     Patient modal
  ====================================================== */

  const openPatientModal = () => {
    setShowPatientMoreOptions(false);

    patientForm.resetFields();

    patientForm.setFieldsValue({
      name: "",

      phone: "",

      age: "",

      gender: "Male",

      address: "",

      status: "Active",

      location: undefined,

      distance: undefined,

      has_allergies: false,

      allergy_details: "",
    });

    setPatientModalOpen(true);
  };

  const closePatientModal = () => {
    setPatientModalOpen(false);

    setShowPatientMoreOptions(false);

    patientForm.resetFields();
  };

  /* ======================================================
     Appointment modal
  ====================================================== */

  const openAddModal = () => {
    setEditingAppointment(null);

    setSkipAppointmentNumber(false);

    setEditDate(false);

    setEditTime(false);

    form.resetFields();

    form.setFieldsValue({
      patient_id: undefined,

      dentist_id: dentistOptions?.[0]?.value,

      appointment_date: dayjs(),

      appointment_time: DEFAULT_APPOINTMENT_TIME,

      reason_for_visit: commonTreatmentOptions?.[0]?.value,

      status: "Pending",
    });

    setModalOpen(true);
  };
  /* ======================================================
   TODAY'S SMS APPOINTMENTS

   SMS can only be sent to appointments for TODAY.

   Excludes:
   - Reserved / skipped appointment numbers
   - Cancelled appointments
   - Patients without a valid phone number
====================================================== */
  /* ======================================================
   SEND TODAY'S APPOINTMENT SMS
====================================================== */
  /* ======================================================
   SEND TODAY'S DOCTOR ARRIVAL SMS
====================================================== */

  const handleSendTodayDoctorArrivalSMS = async () => {
    if (todaysSmsAppointments.length === 0) {
      message.warning(
        "There are no valid appointments for today that can receive SMS.",
      );

      return;
    }

    try {
      setSendingDoctorArrivalSMS(true);

      let successCount = 0;
      let failedCount = 0;

      for (const appointment of todaysSmsAppointments) {
        try {
          const phone = String(appointment?.phone || "")
            .replace(/\s+/g, "")
            .trim();

          await sendTemplateSMS({
            mobile: phone,

            template: "doctorArrival",

            data: {
              patientName:
                appointment?.patient_name ||
                appointment?.patient_id ||
                "Patient",

              appointmentNumber:
                appointment?.stored_appointment_number ||
                appointment?.appointment_number,
            },
          });

          successCount += 1;
        } catch (error) {
          failedCount += 1;

          console.error(
            `Failed to send doctor arrival SMS to ${appointment?.phone}:`,
            error,
          );
        }
      }

      if (successCount > 0) {
        message.success(
          `Doctor arrival SMS sent to ${successCount} patient${
            successCount !== 1 ? "s" : ""
          }.`,
        );
      }

      if (failedCount > 0) {
        message.warning(
          `${failedCount} SMS message${
            failedCount !== 1 ? "s" : ""
          } could not be sent.`,
        );
      }
    } catch (error) {
      console.error("Failed to send doctor arrival SMS:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to send doctor arrival SMS",
      );
    } finally {
      setSendingDoctorArrivalSMS(false);
    }
  };
  const handleSendTodayAppointmentSMS = async () => {
    if (todaysSmsAppointments.length === 0) {
      message.warning(
        "There are no valid appointments for today that can receive SMS.",
      );

      return;
    }

    try {
      setSendingAppointmentSMS(true);

      let successCount = 0;
      let failedCount = 0;

      for (const appointment of todaysSmsAppointments) {
        try {
          const phone = String(appointment?.phone || "")
            .replace(/\s+/g, "")
            .trim();

          await sendTemplateSMS({
            mobile: phone,

            template: "appointmentDetails",

            data: {
              patientName:
                appointment?.patient_name ||
                appointment?.patient_id ||
                "Patient",

              date: formatDate(
                appointment?.appointment_date || appointment?.date,
              ),

              time: formatAppointmentTime(
                appointment?.appointment_time || appointment?.time,
              ),

              appointmentNumber:
                appointment?.stored_appointment_number ||
                appointment?.appointment_number,

              reason: appointment?.reason_for_visit || "-",
            },
          });

          successCount += 1;
        } catch (error) {
          failedCount += 1;

          console.error(
            `Failed to send appointment SMS to ${appointment?.phone}:`,
            error,
          );
        }
      }

      if (successCount > 0) {
        message.success(
          `Appointment SMS sent to ${successCount} patient${
            successCount !== 1 ? "s" : ""
          }.`,
        );
      }

      if (failedCount > 0) {
        message.warning(
          `${failedCount} SMS message${
            failedCount !== 1 ? "s" : ""
          } could not be sent.`,
        );
      }
    } catch (error) {
      console.error("Failed to send today's appointment SMS:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to send appointment SMS",
      );
    } finally {
      setSendingAppointmentSMS(false);
    }
  };
  const todaysSmsAppointments = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");

    return appointmentsWithNumber.filter((appointment) => {
      const appointmentDate =
        appointment?.appointment_date || appointment?.date || "";

      const status = normalizeStatus(appointment?.status);

      const phone = String(appointment?.phone || "")
        .replace(/\s+/g, "")
        .trim();

      if (appointmentDate !== today) {
        return false;
      }

      if (isSkippedAppointment(appointment)) {
        return false;
      }

      if (status === "cancelled") {
        return false;
      }

      /*
       * Sri Lankan mobile number:
       * Example: 0771234567
       */
      if (!/^0\d{9}$/.test(phone)) {
        return false;
      }

      return true;
    });
  }, [appointmentsWithNumber]);
  const openEditModal = (appointment) => {
    const appointmentDate = appointment?.appointment_date || appointment?.date;

    const appointmentTime =
      appointment?.appointment_time ||
      appointment?.time ||
      DEFAULT_APPOINTMENT_TIME;

    const dateValue = appointmentDate
      ? dayjs(appointmentDate, "YYYY-MM-DD")
      : null;

    setEditingAppointment(appointment);

    setSkipAppointmentNumber(false);

    setEditDate(false);

    setEditTime(false);

    form.resetFields();

    form.setFieldsValue({
      patient_id: appointment?.patient_id || undefined,

      dentist_id: appointment?.dentist_id || undefined,

      appointment_date: dateValue,

      appointment_time: appointmentTime,

      reason_for_visit: appointment?.reason_for_visit || "",

      status: appointment?.status || "Pending",
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);

    setEditingAppointment(null);

    setSkipAppointmentNumber(false);

    setEditDate(false);

    setEditTime(false);

    form.resetFields();
  };

  /* ======================================================
     Create patient
  ====================================================== */

  const handleCreatePatient = async () => {
    try {
      const values = await patientForm.validateFields();

      setPatientSaving(true);

      const selectedLocation = patientLocations.find(
        (location) => location.city === values.location,
      );

      if (!selectedLocation) {
        patientForm.setFields([
          {
            name: "location",

            errors: ["Please select a valid patient location"],
          },
        ]);

        return;
      }

      const hasPatientAllergy = values.has_allergies === true;

      const payload = {
        name: values.name?.trim() || "",

        phone: values.phone?.trim() || "",

        age: values.age ? Number(values.age) : "",

        gender: values.gender || "",

        address: values.address?.trim() || "",

        status: values.status || "Active",

        location: selectedLocation.city,

        distance: selectedLocation.distance,

        has_allergies: hasPatientAllergy,

        allergy_details: hasPatientAllergy
          ? values.allergy_details?.trim() || ""
          : "",
      };

      const response = await createPatient(payload);

      message.success("Patient added successfully");

      const createdPatient =
        response?.data?.data || response?.data?.patient || response?.data;

      const createdPatientId = createdPatient?.id || createdPatient?.patient_id;

      closePatientModal();

      setPatients((previousPatients) => [
        createdPatient,

        ...previousPatients.filter(
          (patient) => getPatientId(patient) !== createdPatientId,
        ),
      ]);

      form.setFieldValue("patient_id", createdPatientId);

      await loadInitialData();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error("Failed to create patient:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to add patient",
      );
    } finally {
      setPatientSaving(false);
    }
  };

  /* ======================================================
     Save appointment

     IMPORTANT:

     If Skip is enabled:

     1. Create SYSTEM record for skipped number.
     2. Create patient's appointment with next number.
  ====================================================== */
  const handleSaveSkippedAppointment = async () => {
    try {
      const values = await form.validateFields([
        "dentist_id",
        "appointment_date",
        "appointment_time",
      ]);

      if (editingAppointment) {
        message.warning(
          "Appointment numbers can only be reserved while creating a new appointment.",
        );
        return;
      }

      if (!nextAppointmentNo) {
        message.error("Unable to determine the next appointment number.");
        return;
      }

      setSkippingNumber(true);

      const skippedPayload = {
        patient_id: SKIPPED_PATIENT_ID,

        dentist_id: values.dentist_id,

        appointment_date: values.appointment_date
          ? dayjs(values.appointment_date).format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD"),

        appointment_number: nextAppointmentNo,

        appointment_time: values.appointment_time || DEFAULT_APPOINTMENT_TIME,

        reason_for_visit: "Appointment Number Reserved",

        status: "Pending",

        record_type: SKIPPED_RECORD_TYPE,

        is_skipped: true,

        skip_note:
          "Appointment number intentionally reserved from appointment booking screen",
      };

      await createAppointment(skippedPayload);

      message.success(
        `Appointment #${nextAppointmentNo} reserved successfully.`,
      );

      /*
       * Refresh appointments.
       *
       * Example:
       * Before: nextAppointmentNo = 5
       *
       * Save #5 as reserved
       *
       * After refresh:
       * nextAppointmentNo = 6
       * currentModalAppointmentNo = 6
       */
      await loadInitialData();

      setSkipAppointmentNumber(false);
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error("Failed to reserve appointment number:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to reserve appointment number",
      );
    } finally {
      setSkippingNumber(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      setSaving(true);

      const appointmentDate = values.appointment_date
        ? dayjs(values.appointment_date).format("YYYY-MM-DD")
        : undefined;

      const payload = {
        patient_id: values.patient_id,

        dentist_id: values.dentist_id,

        appointment_date: appointmentDate,

        appointment_number: currentModalAppointmentNo,

        appointment_time: values.appointment_time,

        reason_for_visit: values.reason_for_visit || "",

        status: values.status || "Pending",

        record_type: "appointment",

        is_skipped: false,
      };

      if (editingAppointment) {
        await updateAppointment(getAppointmentId(editingAppointment), payload);

        message.success("Appointment updated successfully");
      } else {
        await createAppointment(payload);

        message.success(
          `Appointment #${currentModalAppointmentNo} added successfully`,
        );
      }

      closeModal();

      await loadInitialData();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error("Failed to save appointment:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save appointment",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ======================================================
     Status changes
  ====================================================== */

  const handleStatusChange = async (appointment, status) => {
    try {
      await updateAppointmentStatus(getAppointmentId(appointment), status);

      message.success(`Appointment marked as ${status}`);

      setAppointments((previous) =>
        previous.map((item) =>
          getAppointmentId(item) === getAppointmentId(appointment)
            ? {
                ...item,
                status,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("Failed to update appointment status:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update appointment status",
      );
    }
  };

  const handleCheckIn = async (appointment) => {
    const appointmentId = getAppointmentId(appointment);

    try {
      setCheckingInId(appointmentId);

      await checkInAppointmentToQueue({
        appointment_id: appointmentId,

        queue_date:
          appointment?.appointment_date ||
          appointment?.date ||
          dayjs().format("YYYY-MM-DD"),
      });

      message.success("Patient checked in and added to today's queue");

      setAppointments((previous) =>
        previous.map((item) =>
          getAppointmentId(item) === appointmentId
            ? {
                ...item,

                status: "Checked In",
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("Failed to check in patient:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to check in patient",
      );
    } finally {
      setCheckingInId(null);
    }
  };

  const handleCancelAppointment = async (appointment) => {
    await handleStatusChange(appointment, "Cancelled");
  };

  /* ======================================================
     Table
  ====================================================== */

  const columns = [
    {
      title: "Appointment",

      key: "appointment",

      width: 145,

      fixed: "left",

      render: (_, record) => (
        <div className="booking-number-cell">
          <div className="booking-number-badge">
            {record?.appointment_number === "-"
              ? "-"
              : `#${record?.appointment_number}`}
          </div>

          <Text type="secondary">{getAppointmentId(record)}</Text>
        </div>
      ),
    },

    {
      title: "Date and Time",

      key: "date_time",

      width: 180,

      render: (_, record) => (
        <Space size={9} align="start">
          <div className="booking-date-icon">
            <CalendarOutlined />
          </div>

          <div className="booking-date-cell">
            <Text strong>
              {formatDate(record?.appointment_date || record?.date)}
            </Text>

            <Text type="secondary">
              <ClockCircleOutlined />{" "}
              {formatAppointmentTime(record?.appointment_time || record?.time)}
            </Text>
          </div>
        </Space>
      ),
    },

    {
      title: "Patient",

      key: "patient",

      width: 240,

      render: (_, record) => {
        const hasAllergy = record?.patient_has_allergies === true;

        return (
          <Space size={10} align="start">
            <Avatar
              size={40}
              icon={<UserOutlined />}
              className={
                hasAllergy
                  ? "booking-patient-avatar booking-patient-avatar--allergy"
                  : "booking-patient-avatar"
              }
            />

            <div className="booking-person-cell">
              <Space wrap size={5}>
                <Text strong>
                  {record?.patient_name || record?.patient_id || "-"}
                </Text>

                {hasAllergy && (
                  <Tag
                    color="red"
                    icon={<WarningOutlined />}
                    className="booking-allergy-tag"
                  >
                    Allergy
                  </Tag>
                )}
              </Space>

              <Text type="secondary">{record?.patient_id || "Patient"}</Text>
            </div>
          </Space>
        );
      },
    },

    {
      title: "Phone",

      key: "phone",

      width: 155,

      render: (_, record) => (
        <Space size={7}>
          <PhoneOutlined className="booking-phone-icon" />

          <Text>{record?.phone || "-"}</Text>
        </Space>
      ),
    },

    {
      title: "Reason",

      dataIndex: "reason_for_visit",

      key: "reason_for_visit",

      width: 225,

      ellipsis: true,

      render: (value) => (
        <Tooltip title={value || ""}>
          <Text type="secondary">{value || "-"}</Text>
        </Tooltip>
      ),
    },

    {
      title: "Status",

      dataIndex: "status",

      key: "status",

      width: 165,

      filters: allStatusOptions.map((option) => ({
        text: option.label,

        value: option.value,
      })),

      onFilter: (value, record) => (record?.status || "Pending") === value,

      render: (value, record) => {
        const status = value || "Pending";

        const isLocked = lockedStatuses.includes(status);

        return (
          <Select
            value={status}
            size="small"
            className="booking-status-select"
            disabled={isLocked}
            options={isLocked ? allStatusOptions : bookingStatusOptions}
            onChange={(newStatus) => handleStatusChange(record, newStatus)}
            labelRender={(selected) => (
              <Tag
                color={getStatusColor(selected.value)}
                className="booking-status-label"
              >
                {selected.label}
              </Tag>
            )}
          />
        );
      },
    },

    {
      title: "Actions",

      key: "actions",

      width: 255,

      fixed: "right",

      render: (_, record) => {
        const status = record?.status || "Pending";

        const appointmentId = getAppointmentId(record);

        const isCancelled = status === "Cancelled";

        const isConfirmed = status === "Confirmed";

        const isCheckedInOrAfter = lockedStatuses.includes(status);

        return (
          <Space size={7}>
            <Tooltip
              title={
                isConfirmed
                  ? "Check in patient"
                  : "Appointment must be confirmed first"
              }
            >
              <Button
                type="primary"
                size="small"
                icon={<LoginOutlined />}
                loading={checkingInId === appointmentId}
                disabled={!isConfirmed}
                onClick={() => handleCheckIn(record)}
              >
                Check In
              </Button>
            </Tooltip>

            <Tooltip title="Edit appointment">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
                disabled={isCancelled || isCheckedInOrAfter}
              />
            </Tooltip>

            <Popconfirm
              title="Cancel Appointment"
              description="Are you sure you want to cancel this appointment?"
              okText="Cancel Appointment"
              cancelText="Keep Appointment"
              okButtonProps={{
                danger: true,
              }}
              onConfirm={() => handleCancelAppointment(record)}
              disabled={isCancelled || isCheckedInOrAfter}
            >
              <Tooltip title="Cancel appointment">
                <Button
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                  disabled={isCancelled || isCheckedInOrAfter}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  /* ======================================================
     Render
  ====================================================== */

  return (
    <ClinicPage
      title="Appointments"
      subtitle="Create bookings, confirm appointments and check in patients when they arrive."
      icon={<ScheduleOutlined />}
      actions={[
        <div key="date-filter" className="booking-date-filter">
          <div className="booking-date-filter__icon">
            <CalendarOutlined />
          </div>

          <div className="booking-date-filter__content">
            <Text type="secondary">Appointment date</Text>

            <DatePicker
              allowClear
              value={dateFilter}
              format="YYYY-MM-DD"
              onChange={setDateFilter}
              className="booking-date-filter__picker"
            />
          </div>
        </div>,

        <Popconfirm
          key="appointment-sms"
          title="Send Appointment SMS?"
          description={
            <div>
              Send appointment details to{" "}
              <strong>{todaysSmsAppointments.length}</strong> patient
              {todaysSmsAppointments.length !== 1 ? "s" : ""} with appointments
              today?
            </div>
          }
          okText="Send SMS"
          cancelText="Cancel"
          onConfirm={handleSendTodayAppointmentSMS}
          disabled={
            todaysSmsAppointments.length === 0 ||
            sendingAppointmentSMS ||
            sendingDoctorArrivalSMS
          }
        >
          <Tooltip
            title={`Send appointment SMS to today's ${todaysSmsAppointments.length} patient${
              todaysSmsAppointments.length !== 1 ? "s" : ""
            }`}
          >
            <Button
              icon={<MessageOutlined />}
              loading={sendingAppointmentSMS}
              disabled={
                todaysSmsAppointments.length === 0 || sendingDoctorArrivalSMS
              }
            >
              Appointment SMS
            </Button>
          </Tooltip>
        </Popconfirm>,

        <Popconfirm
          key="doctor-arrival-sms"
          title="Send Doctor Arrival SMS?"
          description={
            <div>
              Notify <strong>{todaysSmsAppointments.length}</strong> patient
              {todaysSmsAppointments.length !== 1 ? "s" : ""} with appointments
              today that the doctor has arrived?
            </div>
          }
          okText="Send SMS"
          cancelText="Cancel"
          onConfirm={handleSendTodayDoctorArrivalSMS}
          disabled={
            todaysSmsAppointments.length === 0 ||
            sendingAppointmentSMS ||
            sendingDoctorArrivalSMS
          }
        >
          <Tooltip
            title={`Send doctor arrival SMS to today's ${todaysSmsAppointments.length} patient${
              todaysSmsAppointments.length !== 1 ? "s" : ""
            }`}
          >
            <Button
              type="primary"
              ghost
              icon={<SendOutlined />}
              loading={sendingDoctorArrivalSMS}
              disabled={
                todaysSmsAppointments.length === 0 || sendingAppointmentSMS
              }
            >
              Doctor Arrival SMS
            </Button>
          </Tooltip>
        </Popconfirm>,

        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={loadInitialData}
        >
          Refresh
        </Button>,

        <Button
          key="add"
          type="primary"
          icon={<PlusOutlined />}
          onClick={openAddModal}
        >
          Add Appointment
        </Button>,
      ]}
    >
      {/* ==================================================
          SUMMARY
      ================================================== */}

      <Row gutter={[16, 16]} className="booking-summary-row">
        <Col xs={24} sm={12} xl={6}>
          <AppointmentSummaryCard
            title="Total Appointments"
            value={appointmentSummary.total}
            helper={
              dateFilter ? formatDate(dateFilter) : "All appointment dates"
            }
            tone="blue"
            icon={<ScheduleOutlined />}
          />
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <AppointmentSummaryCard
            title="Pending / Confirmed"
            value={appointmentSummary.pending}
            helper="Upcoming bookings"
            tone="purple"
            icon={<ClockCircleOutlined />}
          />
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <AppointmentSummaryCard
            title="Checked In"
            value={appointmentSummary.checkedIn}
            helper="Patients in queue"
            tone="cyan"
            icon={<LoginOutlined />}
          />
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <AppointmentSummaryCard
            title="Completed"
            value={appointmentSummary.completed}
            helper="Paid or completed visits"
            tone="green"
            icon={<CheckCircleOutlined />}
          />
        </Col>
      </Row>

      {/* ==================================================
          APPOINTMENT DIRECTORY
      ================================================== */}

      <Card bordered={false} className="booking-directory-card">
        <div className="booking-directory-header">
          <div>
            <Title level={4}>Appointment Schedule</Title>

            <Text type="secondary">
              Review bookings, update statuses and check in arrived patients.
            </Text>
          </div>

          <Tag color="blue" className="booking-result-count">
            {filteredAppointments.length} result
            {filteredAppointments.length !== 1 ? "s" : ""}
          </Tag>
        </div>

        <div className="booking-table-toolbar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search appointment, patient, phone, dentist, reason or status"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="booking-search-input"
          />
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            className="booking-status-filter"
            options={[
              {
                label: `All (${appointmentSummary.total})`,
                value: "all",
              },
              {
                label: "Active",
                value: "active",
              },
              {
                label: `Completed (${appointmentSummary.completed})`,
                value: "completed",
              },
              {
                label: `Cancelled (${appointmentSummary.cancelled})`,
                value: "cancelled",
              },
              {
                label: `Skipped (${appointmentSummary.skipped})`,
                value: "skipped",
              },
            ]}
          />
        </div>

        <Table
          rowKey={(record, index) => getAppointmentId(record) || index}
          loading={loading}
          columns={columns}
          dataSource={filteredAppointments}
          pagination={{
            pageSize: 8,

            showSizeChanger: false,

            showTotal: (total) =>
              `${total} appointment${total !== 1 ? "s" : ""}`,
          }}
          scroll={{
            x: 1500,
          }}
          rowClassName={(record) => {
            const status = normalizeStatus(record?.status);

            if (record?.patient_has_allergies) {
              return "booking-row booking-row--allergy";
            }

            if (status === "checked in") {
              return "booking-row booking-row--checked-in";
            }

            if (status === "cancelled") {
              return "booking-row booking-row--cancelled";
            }

            if (completedStatuses.map(normalizeStatus).includes(status)) {
              return "booking-row booking-row--completed";
            }

            return "booking-row";
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  search || statusFilter !== "all"
                    ? "No matching appointments found"
                    : "No appointments found for this date"
                }
              >
                {!search && statusFilter === "all" && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAddModal}
                  >
                    Add Appointment
                  </Button>
                )}
              </Empty>
            ),
          }}
        />
      </Card>

      {/* ==================================================
          ADD PATIENT MODAL
      ================================================== */}

      <Modal
        title={
          <div className="booking-modal-title">
            <div className="booking-modal-title__icon">
              <UserAddOutlined />
            </div>

            <div>
              <Text strong>Add New Patient</Text>

              <Text type="secondary">
                Register a patient without leaving the appointment form.
              </Text>
            </div>
          </div>
        }
        open={patientModalOpen}
        onCancel={closePatientModal}
        onOk={handleCreatePatient}
        confirmLoading={patientSaving}
        okText="Add Patient"
        cancelText="Cancel"
        width={showPatientMoreOptions ? 900 : 560}
        centered
        destroyOnHidden
        className="booking-form-modal"
      >
        <Form
          form={patientForm}
          layout="vertical"
          initialValues={{
            gender: "Male",

            status: "Active",

            has_allergies: false,

            allergy_details: "",

            location: undefined,

            distance: undefined,
          }}
        >
          <Row gutter={[22, 0]}>
            <Col xs={24} md={showPatientMoreOptions ? 12 : 24}>
              <div className="booking-form-section">
                <div className="booking-form-section__heading">
                  <div className="booking-form-section__icon">
                    <UserOutlined />
                  </div>

                  <div>
                    <Text strong>Basic Information</Text>

                    <Text type="secondary">Required patient details</Text>
                  </div>
                </div>

                <Form.Item
                  label="Patient Name"
                  name="name"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Please enter patient name",
                    },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Example: Nimal Perera"
                  />
                </Form.Item>

                <Form.Item
                  label="Phone Number"
                  name="phone"
                  rules={[
                    {
                      required: true,
                      message: "Please enter phone number",
                    },
                    {
                      pattern: /^[0-9]{10}$/,
                      message: "Please enter a valid 10-digit phone number",
                    },
                  ]}
                >
                  <Input
                    prefix={<PhoneOutlined />}
                    placeholder="Example: 0771234567"
                    maxLength={10}
                  />
                </Form.Item>

                <Form.Item
                  label="Patient Location"
                  name="location"
                  required
                  rules={[
                    {
                      required: true,
                      message: "Please select the patient's location",
                    },
                  ]}
                >
                  <Select
                    showSearch
                    allowClear
                    loading={locationsLoading}
                    placeholder="Search and select city"
                    options={patientLocationOptions}
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      String(option?.label || "")
                        .toLowerCase()
                        .includes(input.trim().toLowerCase())
                    }
                    onChange={(city) => {
                      const selectedLocation = patientLocations.find(
                        (location) => location.city === city,
                      );

                      patientForm.setFieldValue(
                        "distance",
                        selectedLocation?.distance,
                      );
                    }}
                    onClear={() => {
                      patientForm.setFieldsValue({
                        location: undefined,

                        distance: undefined,
                      });
                    }}
                  />
                </Form.Item>

                <Form.Item
                  label="Distance from Clinic"
                  name="distance"
                  rules={[
                    {
                      required: true,
                      message:
                        "Distance could not be found for the selected location",
                    },
                  ]}
                >
                  <Input
                    readOnly
                    suffix="km"
                    placeholder="Automatically calculated"
                  />
                </Form.Item>
              </div>

              <div className="booking-form-section booking-allergy-form-section">
                <div className="booking-form-section__heading">
                  <div className="booking-form-section__icon booking-form-section__icon--allergy">
                    <ExclamationCircleFilled />
                  </div>

                  <div>
                    <Text strong>Allergy Information</Text>

                    <Text type="secondary">
                      Important patient safety information
                    </Text>
                  </div>
                </div>

                <Form.Item
                  label="Does the patient have any allergies?"
                  required
                >
                  <div className="booking-allergy-choice">
                    <Button
                      htmlType="button"
                      className={
                        patientHasAllergies === false
                          ? "booking-allergy-choice__button booking-allergy-choice__button--no"
                          : "booking-allergy-choice__button"
                      }
                      onClick={() => {
                        patientForm.setFieldsValue({
                          has_allergies: false,

                          allergy_details: "",
                        });
                      }}
                    >
                      No Allergies
                    </Button>

                    <Button
                      htmlType="button"
                      danger
                      className={
                        patientHasAllergies === true
                          ? "booking-allergy-choice__button booking-allergy-choice__button--yes"
                          : "booking-allergy-choice__button"
                      }
                      onClick={() =>
                        patientForm.setFieldValue("has_allergies", true)
                      }
                    >
                      Has Allergies
                    </Button>
                  </div>
                </Form.Item>

                <Form.Item name="has_allergies" hidden>
                  <Input type="hidden" />
                </Form.Item>

                {patientHasAllergies === true && (
                  <Alert
                    type="error"
                    showIcon
                    message="Important Allergy Information"
                    className="booking-allergy-form-alert"
                    description={
                      <Form.Item
                        label="Allergy Details"
                        name="allergy_details"
                        className="booking-allergy-details-item"
                        rules={[
                          {
                            required: true,

                            whitespace: true,

                            message:
                              "Please enter the patient's allergy details",
                          },
                        ]}
                      >
                        <Input.TextArea
                          rows={3}
                          maxLength={500}
                          showCount
                          placeholder="Example: Penicillin, latex, peanuts or local anaesthetic"
                        />
                      </Form.Item>
                    }
                  />
                )}
              </div>

              <div className="booking-more-options">
                <Button
                  htmlType="button"
                  type="link"
                  onClick={() =>
                    setShowPatientMoreOptions((previous) => !previous)
                  }
                >
                  {showPatientMoreOptions
                    ? "Hide additional information"
                    : "+ Add more"}
                </Button>
              </div>
            </Col>

            {showPatientMoreOptions && (
              <Col xs={24} md={12}>
                <div className="booking-form-section booking-form-section--additional">
                  <div className="booking-form-section__heading">
                    <div className="booking-form-section__icon booking-form-section__icon--additional">
                      <PlusOutlined />
                    </div>

                    <div>
                      <Text strong>Additional Information</Text>

                      <Text type="secondary">Optional patient details</Text>
                    </div>
                  </div>

                  <Form.Item
                    label="Age"
                    name="age"
                    rules={[
                      {
                        pattern: /^[0-9]{1,3}$/,
                        message: "Please enter a valid age",
                      },
                    ]}
                  >
                    <Input placeholder="Example: 35" maxLength={3} />
                  </Form.Item>

                  <Form.Item label="Gender" name="gender">
                    <Select
                      allowClear
                      placeholder="Select gender"
                      options={genderOptions}
                    />
                  </Form.Item>

                  <Form.Item label="Address" name="address">
                    <Input.TextArea
                      rows={4}
                      maxLength={500}
                      showCount
                      placeholder="Enter patient address"
                    />
                  </Form.Item>

                  <Form.Item label="Status" name="status">
                    <Select
                      options={[
                        {
                          label: "Active",
                          value: "Active",
                        },
                        {
                          label: "Inactive",
                          value: "Inactive",
                        },
                      ]}
                    />
                  </Form.Item>
                </div>
              </Col>
            )}
          </Row>
        </Form>
      </Modal>

      {/* ==================================================
          ADD / EDIT APPOINTMENT
      ================================================== */}

      <Modal
        title={
          <div className="booking-modal-title">
            <div className="booking-modal-title__icon">
              {editingAppointment ? <EditOutlined /> : <CalendarOutlined />}
            </div>

            <div>
              <Text strong>
                {editingAppointment
                  ? "Edit Appointment"
                  : "Add New Appointment"}
              </Text>

              <Text type="secondary">
                {editingAppointment
                  ? "Update booking information before patient check-in."
                  : "Select the patient, dentist, date and appointment time."}
              </Text>
            </div>
          </div>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={editingAppointment ? "Update Appointment" : "Add Appointment"}
        cancelText="Cancel"
        destroyOnHidden
        centered
        width={1024}
        className="booking-form-modal"
      >
        <Form form={form} layout="vertical">
          <Row>
            {/* =============================================
                LEFT
            ============================================= */}

            <Col xs={24} lg={10}>
              {/* ===========================================
                  APPOINTMENT NUMBER + SKIP
              =========================================== */}

              <div className="booking-appointment-number">
                <Text>Appointment Number</Text>

                <div className="booking-appointment-number__value">
                  #{currentModalAppointmentNo}
                </div>

                {!editingAppointment && (
                  <div
                    style={{
                      width: "100%",
                      marginTop: 12,
                    }}
                  >
                    {!skipAppointmentNumber ? (
                      <Popconfirm
                        title={`Reserve appointment #${nextAppointmentNo}?`}
                        description={`Appointment #${nextAppointmentNo} will be saved as a reserved number.`}
                        okText="Reserve Number"
                        cancelText="Cancel"
                        okButtonProps={{
                          danger: true,
                          loading: skippingNumber,
                        }}
                        onConfirm={handleSaveSkippedAppointment}
                      >
                       <Button
  htmlType="button"
  block
  danger
  ghost
  loading={skippingNumber}
  disabled={saving}
  className="reserve-number-btn"
>
  Reserve #{nextAppointmentNo}
</Button>
                      </Popconfirm>
                    ) : (
                      <Alert
                        type="warning"
                        showIcon
                        message={`Appointment #${skippedAppointmentNo} will be skipped`}
                        description={
                          <div>
                            <div>
                              A special skipped-number record will be saved as{" "}
                              <strong>#{skippedAppointmentNo}</strong>.
                            </div>

                            <div
                              style={{
                                marginTop: 5,
                              }}
                            >
                              This patient will receive{" "}
                              <strong>#{currentModalAppointmentNo}</strong>.
                            </div>

                            <Button
                              htmlType="button"
                              size="small"
                              style={{
                                marginTop: 10,
                              }}
                              onClick={() => setSkipAppointmentNumber(false)}
                            >
                              Undo Skip
                            </Button>
                          </div>
                        }
                      />
                    )}
                  </div>
                )}

                {lastAppointmentTime && (
                  <div className="booking-last-appointment">
                    <ClockCircleOutlined />

                    <span>
                      Last appointment:{" "}
                      <strong>
                        {formatAppointmentTime(lastAppointmentTime)}
                      </strong>
                    </span>

                    <span>
                      - <strong>{lastAppointment_reason_for_visit}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* ===========================================
                  PATIENT / DENTIST
              =========================================== */}

              <div className="booking-form-section">
                <div className="booking-form-section__heading">
                  <div className="booking-form-section__icon">
                    <UserOutlined />
                  </div>

                  <div>
                    <Text strong>Patient and Dentist</Text>

                    <Text type="secondary">
                      Select the patient and assigned dentist
                    </Text>
                  </div>
                </div>

                <Form.Item
                  label="Patient"
                  name="patient_id"
                  rules={[
                    {
                      required: true,
                      message: "Please select patient",
                    },
                  ]}
                >
                  <Select
                    showSearch
                    size="large"
                    placeholder="Select patient"
                    options={patientOptions}
                    optionFilterProp="label"
                    optionRender={(option) => {
                      const patient = option.data;

                      return (
                        <div
                          className={
                            patient.hasAllergy
                              ? "booking-patient-option booking-patient-option--allergy"
                              : "booking-patient-option"
                          }
                        >
                          <div className="booking-patient-option__content">
                            <Text strong={patient.hasAllergy}>
                              {patient.patientName}
                            </Text>

                            <Text type="secondary">
                              <PhoneOutlined /> {patient.phone}
                            </Text>

                            <Text type="secondary">
                              <EnvironmentOutlined /> {patient.location}
                              {patient.distance !== null
                                ? ` • ${patient.distance} km`
                                : ""}
                            </Text>
                          </div>

                          {patient.hasAllergy && (
                            <Tag color="red" icon={<WarningOutlined />}>
                              Allergy
                            </Tag>
                          )}
                        </div>
                      );
                    }}
                    labelRender={({ value, label }) => {
                      const patient = patientOptions.find(
                        (item) => String(item.value) === String(value),
                      );

                      if (!patient?.hasAllergy) {
                        return label;
                      }

                      return (
                        <Space size={6}>
                          <WarningOutlined className="booking-selected-allergy-icon" />

                          <Text type="danger">{patient.patientName}</Text>

                          <Tag color="red">Allergy</Tag>
                        </Space>
                      );
                    }}
                  />
                </Form.Item>

                {selectedPatient && (
                  <div className="booking-selected-patient-location">
                    <div className="booking-selected-patient-location__icon">
                      <EnvironmentOutlined />
                    </div>

                    <div className="booking-selected-patient-location__content">
                      <Text type="secondary">Patient Location</Text>

                      <Text strong>{selectedPatient.location}</Text>

                      <Text type="secondary">
                        {formatPatientDistance(selectedPatient.distance)}
                      </Text>
                    </div>

                    {selectedPatient.distance !== null && (
                      <Tag
                        color="blue"
                        className="booking-selected-patient-location__tag"
                      >
                        {selectedPatient.distance} km
                      </Tag>
                    )}
                  </div>
                )}

                {selectedPatient?.hasAllergy && (
                  <Alert
                    type="error"
                    showIcon
                    icon={<WarningOutlined />}
                    message="Patient Allergy Warning"
                    description={
                      <>
                        <Text strong>{selectedPatient.patientName}</Text> has a
                        recorded allergy.
                        <div className="booking-selected-allergy-details">
                          <strong>Allergy details:</strong>{" "}
                          {selectedPatient.allergyDetails}
                        </div>
                      </>
                    }
                    className="booking-selected-allergy-alert"
                  />
                )}

                <div className="booking-new-patient-action">
                  <Text type="secondary">Cannot find the patient?</Text>

                  <Button
                    type="primary"
                    ghost
                    icon={<PlusOutlined />}
                    onClick={openPatientModal}
                  >
                    New Patient
                  </Button>
                </div>

                <Form.Item
                  name="dentist_id"
                  hidden
                  rules={[
                    {
                      required: true,
                      message: "Please select dentist",
                    },
                  ]}
                >
                  <Input type="hidden" />
                </Form.Item>

                <div className="booking-dentist-selection">
                  <Text className="booking-field-label">Dentist</Text>

                  <div className="booking-dentist-buttons">
                    {dentistOptions.map((dentist) => (
                      <Button
                        key={dentist.value}
                        type={
                          String(selectedDentistId) === String(dentist.value)
                            ? "primary"
                            : "default"
                        }
                        onClick={() =>
                          form.setFieldValue("dentist_id", dentist.value)
                        }
                      >
                        <MedicineBoxOutlined />

                        {dentist.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Col>

            {/* =============================================
                RIGHT
            ============================================= */}

            <Col xs={24} lg={14}>
              <div className="booking-form-section booking-form-section--schedule">
                <div className="booking-form-section__heading">
                  <div className="booking-form-section__icon booking-form-section__icon--schedule">
                    <CalendarOutlined />
                  </div>

                  <div>
                    <Text strong>Appointment Schedule</Text>

                    <Text type="secondary">
                      Choose the booking date, time and treatment
                    </Text>
                  </div>
                </div>

                <Row
                  gutter={[16, 16]}
                  align="bottom"
                  className="booking-date-time-row"
                >
                  {/* Date */}

                  <Col xs={24} md={12}>
                    <div className="booking-time-selection">
                      <Form.Item
                        name="appointment_date"
                        hidden
                        rules={[
                          {
                            required: true,
                            message: "Please select appointment date",
                          },
                        ]}
                      >
                        <Input />
                      </Form.Item>

                      <div className="booking-selected-time-card">
                        <div className="booking-selected-time-card__icon">
                          <CalendarOutlined />
                        </div>

                        <div className="booking-selected-time-card__content">
                          <Text className="booking-field-label booking-time-label">
                            Appointment Date
                          </Text>

                          <div className="booking-selected-time-card__value">
                            {selectedAppointmentDate.format("YYYY-MM-DD")}
                          </div>
                        </div>

                        <Button
                          htmlType="button"
                          type="text"
                          icon={<EditOutlined />}
                          className="booking-selected-time-card__edit"
                          onClick={() => {
                            setEditTime(false);

                            setEditDate((previous) => !previous);
                          }}
                        />
                      </div>
                    </div>
                  </Col>

                  {/* Time */}

                  <Col xs={24} md={12}>
                    <div className="booking-time-selection">
                      <Form.Item
                        name="appointment_time"
                        hidden
                        rules={[
                          {
                            required: true,
                            message: "Please select appointment time",
                          },
                        ]}
                      >
                        <Input />
                      </Form.Item>

                      {selectedAppointmentTime ? (
                        <div className="booking-selected-time-card">
                          <div className="booking-selected-time-card__icon">
                            <ClockCircleOutlined />
                          </div>

                          <div className="booking-selected-time-card__content">
                            <Text className="booking-field-label booking-time-label">
                              Appointment Time
                            </Text>

                            <div className="booking-selected-time-card__value">
                              {dayjs(selectedAppointmentTime, "HH:mm").format(
                                "h:mm A",
                              )}
                            </div>
                          </div>

                          <Button
                            htmlType="button"
                            type="text"
                            icon={<EditOutlined />}
                            className="booking-selected-time-card__edit"
                            onClick={() => {
                              setEditDate(false);

                              setEditTime((previous) => !previous);
                            }}
                          />
                        </div>
                      ) : (
                        <Button
                          block
                          size="large"
                          htmlType="button"
                          icon={<ClockCircleOutlined />}
                          onClick={() => setEditTime(true)}
                          className="booking-select-time-button"
                        >
                          Select Appointment Time
                        </Button>
                      )}
                    </div>
                  </Col>
                </Row>

                {/* =========================================
                    DATE ADJUSTMENT
                ========================================= */}

                {editDate && (
                  <div className="booking-date-adjustment">
                    <div className="booking-date-adjustment__heading">
                      <Text strong className="booking-date-adjustment__title">
                        Adjust Appointment Date
                      </Text>
                    </div>

                    <div className="booking-date-adjustment__picker">
                      <DatePicker
                        size="large"
                        format="YYYY-MM-DD"
                        allowClear={false}
                        value={selectedAppointmentDate || null}
                        disabledDate={(date) =>
                          date &&
                          date.startOf("day").isBefore(dayjs().startOf("day"))
                        }
                        onChange={setAppointmentDate}
                        placeholder="Select appointment date"
                        className="booking-date-adjustment__date-picker"
                      />
                    </div>

                    <div className="booking-date-adjustment__divider" />

                    <div className="booking-date-adjustment__groups">
                      <div className="booking-date-adjustment__group">
                        <div className="booking-date-adjustment__group-heading">
                          <Text strong>Earlier</Text>

                          <Text type="secondary">
                            Move the appointment to an earlier date
                          </Text>
                        </div>

                        <div className="booking-date-adjustment__buttons">
                          <Button
                            htmlType="button"
                            onClick={() => subtractDaysFromAppointmentDate(1)}
                          >
                            − 1 Day
                          </Button>

                          <Button
                            htmlType="button"
                            onClick={() => subtractDaysFromAppointmentDate(3)}
                          >
                            − 3 Days
                          </Button>

                          <Button
                            htmlType="button"
                            onClick={() => subtractDaysFromAppointmentDate(7)}
                          >
                            − 1 Week
                          </Button>
                        </div>
                      </div>

                      <div className="booking-date-adjustment__group booking-date-adjustment__group--later">
                        <div className="booking-date-adjustment__group-heading">
                          <Text strong>Later</Text>

                          <Text type="secondary">
                            Move the appointment to a later date
                          </Text>
                        </div>

                        <div className="booking-date-adjustment__buttons">
                          <Button
                            htmlType="button"
                            type="primary"
                            ghost
                            onClick={() => addDaysToAppointmentDate(1)}
                          >
                            + 1 Day
                          </Button>

                          <Button
                            htmlType="button"
                            type="primary"
                            ghost
                            onClick={() => addDaysToAppointmentDate(3)}
                          >
                            + 3 Days
                          </Button>

                          <Button
                            htmlType="button"
                            type="primary"
                            ghost
                            onClick={() => addDaysToAppointmentDate(7)}
                          >
                            + 1 Week
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* =========================================
                    TIME ADJUSTMENT
                ========================================= */}

                {editTime && (
                  <div className="booking-date-adjustment">
                    <div className="booking-time-adjustment__heading">
                      <Text strong className="booking-time-adjustment__title">
                        Adjust Appointment Time
                      </Text>
                    </div>

                    <div className="booking-time-adjustment__picker">
                      <TimePicker
                        size="large"
                        use12Hours
                        format="h:mm A"
                        minuteStep={5}
                        allowClear={false}
                        inputReadOnly={false}
                        value={
                          selectedAppointmentTime
                            ? dayjs(selectedAppointmentTime, "HH:mm")
                            : null
                        }
                        onChange={(time) => {
                          setAppointmentTime(
                            time ? time.format("HH:mm") : undefined,
                          );
                        }}
                        placeholder="Select appointment time"
                        className="booking-time-adjustment__time-picker"
                      />
                    </div>

                    <div className="booking-time-adjustment__divider" />

                    <div className="booking-time-adjustment__groups">
                      <div className="booking-time-adjustment__group">
                        <div className="booking-time-adjustment__group-heading">
                          <Text strong>Earlier</Text>

                          <Text type="secondary">
                            Move the appointment back
                          </Text>
                        </div>

                        <div className="booking-time-adjustment__buttons">
                          <Button
                            htmlType="button"
                            onClick={() =>
                              subtractMinutesFromAppointmentTime(5)
                            }
                          >
                            − 5 min
                          </Button>

                          <Button
                            htmlType="button"
                            onClick={() =>
                              subtractMinutesFromAppointmentTime(15)
                            }
                          >
                            − 15 min
                          </Button>

                          <Button
                            htmlType="button"
                            onClick={() =>
                              subtractMinutesFromAppointmentTime(60)
                            }
                          >
                            − 1 h
                          </Button>
                        </div>
                      </div>

                      <div className="booking-time-adjustment__group booking-time-adjustment__group--later">
                        <div className="booking-time-adjustment__group-heading">
                          <Text strong>Later</Text>

                          <Text type="secondary">
                            Move the appointment forward
                          </Text>
                        </div>

                        <div className="booking-time-adjustment__buttons">
                          <Button
                            htmlType="button"
                            type="primary"
                            ghost
                            onClick={() => addMinutesToAppointmentTime(5)}
                          >
                            + 5 min
                          </Button>

                          <Button
                            htmlType="button"
                            type="primary"
                            ghost
                            onClick={() => addMinutesToAppointmentTime(15)}
                          >
                            + 15 min
                          </Button>

                          <Button
                            htmlType="button"
                            type="primary"
                            ghost
                            onClick={() => addMinutesToAppointmentTime(60)}
                          >
                            + 1 h
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* =========================================
                    TREATMENT
                ========================================= */}
                {/* =========================================
    TREATMENT
========================================= */}

                <Form.Item
                  label="Reason For Visit / Treatment"
                  name="reason_for_visit"
                  extra="Treatments are loaded from the Common Treatments management page."
                  rules={[
                    {
                      required: true,
                      message: "Please select a treatment",
                    },
                  ]}
                >
                  <Select
                    showSearch
                    allowClear
                    size="large"
                    loading={loading}
                    placeholder="Select common treatment"
                    options={commonTreatmentOptions}
                    optionFilterProp="label"
                    notFoundContent={
                      loading
                        ? "Loading treatments..."
                        : "No common treatments found"
                    }
                    optionRender={(option) => {
                      const treatment = option.data;

                      return (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            width: "100%",
                          }}
                        >
                          <div
                            style={{
                              minWidth: 0,
                            }}
                          >
                            <Text strong ellipsis>
                              {treatment.label}
                            </Text>

                            {treatment.treatmentId && (
                              <Text
                                type="secondary"
                                style={{
                                  display: "block",
                                  fontSize: 12,
                                }}
                              >
                                {treatment.treatmentId}
                              </Text>
                            )}
                          </div>

                          {Number.isFinite(Number(treatment.fee)) && (
                            <Tag
                              color="green"
                              style={{
                                marginInlineEnd: 0,
                                flexShrink: 0,
                              }}
                            >
                              {formatCurrency(treatment.fee)}
                            </Tag>
                          )}
                        </div>
                      );
                    }}
                  />
                </Form.Item>

                {/* =========================================
    ADD NEW COMMON TREATMENT
========================================= */}

                <div className="booking-new-treatment-action">
                  <div className="booking-new-treatment-action__content">
                    <div className="booking-new-treatment-action__icon">
                      <MedicineBoxOutlined />
                    </div>

                    <div className="booking-new-treatment-action__text">
                      <Text strong>Cannot find the treatment?</Text>

                      <Text type="secondary">
                        Create a new common treatment and add it to the list.
                      </Text>
                    </div>
                  </div>

                  <Button
                    htmlType="button"
                    type="primary"
                    ghost
                    icon={<PlusOutlined />}
                    onClick={() => {
                      newTreatmentForm.resetFields();

                      setNewTreatmentModalOpen(true);
                    }}
                  >
                    New Treatment
                  </Button>
                </div>

                {/* =========================================
    SELECTED TREATMENT FEE
========================================= */}

                {selectedCommonTreatment &&
                  selectedCommonTreatment.fee !== null &&
                  selectedCommonTreatment.fee !== undefined &&
                  Number.isFinite(Number(selectedCommonTreatment.fee)) && (
                    <Alert
                      type="success"
                      showIcon
                      message={
                        <Text strong>
                          Standard Fee:{" "}
                          {formatCurrency(selectedCommonTreatment.fee)}
                        </Text>
                      }
                      style={{
                        marginTop: 16,
                        marginBottom: 18,
                      }}
                    />
                  )}

                <Form.Item label="Booking Status" name="status" hidden>
                  <Select size="large" options={bookingStatusOptions} />
                </Form.Item>
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>
      <Modal
        title={
          <div className="booking-modal-title">
            <div className="booking-modal-title__icon">
              <MedicineBoxOutlined />
            </div>

            <div>
              <Text strong>Add Common Treatment</Text>

              <Text type="secondary">
                Create a treatment that can be used for future appointments.
              </Text>
            </div>
          </div>
        }
        open={newTreatmentModalOpen}
        onCancel={() => {
          if (savingTreatment) {
            return;
          }

          setNewTreatmentModalOpen(false);

          newTreatmentForm.resetFields();
        }}
        onOk={handleSaveNewTreatment}
        confirmLoading={savingTreatment}
        okText="Add Treatment"
        cancelText="Cancel"
        centered
        width={520}
        destroyOnHidden
        className="booking-treatment-modal"
      >
        <Form form={newTreatmentForm} layout="vertical" requiredMark={false}>
          {/* =====================================
        Treatment Name
    ====================================== */}

          <Form.Item
            label="Treatment Name"
            name="treatment_name"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Please enter treatment name",
              },
              {
                min: 2,
                message: "Treatment name must contain at least 2 characters",
              },
            ]}
          >
            <Input
              size="large"
              prefix={<MedicineBoxOutlined />}
              placeholder="Example: Tooth Extraction"
              maxLength={150}
              showCount
              autoFocus
            />
          </Form.Item>

          {/* =====================================
        Standard Fee
    ====================================== */}

          <Form.Item
            label="Standard Fee"
            name="fee"
            rules={[
              {
                required: true,
                message: "Please enter treatment fee",
              },
              {
                validator: (_, value) => {
                  if (value === undefined || value === null || value === "") {
                    return Promise.resolve();
                  }

                  if (Number(value) < 0) {
                    return Promise.reject(
                      new Error("Treatment fee cannot be negative"),
                    );
                  }

                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              size="large"
              min={0}
              step={500}
              precision={2}
              placeholder="Enter treatment fee"
              style={{
                width: "100%",
              }}
              addonBefore="Rs."
              formatter={(value) =>
                value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
              }
              parser={(value) => (value ? value.replace(/,/g, "") : "")}
            />
          </Form.Item>

          <Alert
            type="info"
            showIcon
            message="Common Treatment"
            description="Once created, this treatment will be available in the Reason For Visit / Treatment dropdown for future appointments."
          />
        </Form>
      </Modal>
    </ClinicPage>
  );
};

export default Appointments;
