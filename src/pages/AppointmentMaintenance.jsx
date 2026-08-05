import React, { useEffect, useMemo, useState } from "react";

import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  CalendarFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ExclamationCircleFilled,
  MedicineBoxOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import ClinicPage from "../components/ClinicPage";
import PaymentModal from "../components/PaymentModal";
import TreatmentModal from "../components/TreatmentModal";

import {
  createPayment,
  createTreatment,
  getAppointmentsByDate,
  getPatients,
  updateAppointmentStatus,
} from "../api/endPoints";

dayjs.extend(customParseFormat);

const { Text, Title } = Typography;

/* --------------------------------------------------------
   Constants
-------------------------------------------------------- */

const getTodayDate = () => dayjs().format("YYYY-MM-DD");

/*
 * This is the same key used by QueueDisplay.
 * Therefore, both screens can share the same locked next patient.
 */
const READY_PATIENT_STORAGE_PREFIX = "queue-display-ready-patient";

const getReadyPatientStorageKey = (date) =>
  `${READY_PATIENT_STORAGE_PREFIX}:${date}`;

const statusColors = {
  Pending: "default",
  Confirmed: "blue",
  "Checked In": "cyan",
  "In Treatment": "processing",
  "Treatment Done": "purple",
  "Payment Pending": "orange",
  Paid: "green",
  Completed: "success",
  Cancelled: "error",
};

/* --------------------------------------------------------
   Helpers
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

const formatTime = (value) => {
  if (!value) {
    return "-";
  }

  const parsedTime = dayjs(
    String(value).trim(),
    ["HH:mm", "HH:mm:ss", "h:mm A", "hh:mm A"],
    true,
  );

  if (parsedTime.isValid()) {
    return parsedTime.format("hh:mm A");
  }

  const parsedDateTime = dayjs(value);

  return parsedDateTime.isValid()
    ? parsedDateTime.format("hh:mm A")
    : String(value);
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const parsedDateTime = dayjs(value);

  if (parsedDateTime.isValid()) {
    return parsedDateTime.format("hh:mm A");
  }

  return formatTime(value);
};

const getQueueDateTimeValue = (value, appointmentDate) => {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const textValue = String(value).trim();

  /*
   * First try a complete date-time value.
   */
  if (
    textValue.includes("-") ||
    textValue.includes("/") ||
    textValue.includes("T")
  ) {
    const completeDateTime = dayjs(textValue);

    if (completeDateTime.isValid()) {
      return completeDateTime.valueOf();
    }
  }

  /*
   * Then try a time-only value.
   */
  const timeOnly = dayjs(
    textValue,
    ["HH:mm", "HH:mm:ss", "h:mm A", "hh:mm A"],
    true,
  );

  if (timeOnly.isValid()) {
    const baseDate = dayjs(
      appointmentDate || getTodayDate(),
      "YYYY-MM-DD",
      true,
    );

    if (baseDate.isValid()) {
      return baseDate
        .hour(timeOnly.hour())
        .minute(timeOnly.minute())
        .second(timeOnly.second())
        .millisecond(0)
        .valueOf();
    }

    return (
      timeOnly.hour() * 60 * 60 * 1000 +
      timeOnly.minute() * 60 * 1000 +
      timeOnly.second() * 1000
    );
  }

  return Number.MAX_SAFE_INTEGER;
};

/* --------------------------------------------------------
   Component
-------------------------------------------------------- */

const AppointmentMaintenance = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [lockedNextPatientId, setLockedNextPatientId] = useState(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAppointment, setPaymentAppointment] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [treatmentAppointment, setTreatmentAppointment] = useState(null);
  const [treatmentLoading, setTreatmentLoading] = useState(false);

  /* --------------------------------------------------------
     API
  -------------------------------------------------------- */

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      const [appointmentsRes, patientsRes] = await Promise.all([
        getAppointmentsByDate(selectedDate),
        getPatients(),
      ]);

      const appointmentList = Array.isArray(appointmentsRes?.data)
        ? appointmentsRes.data
        : Array.isArray(appointmentsRes?.data?.data)
          ? appointmentsRes.data.data
          : Array.isArray(appointmentsRes?.data?.appointments)
            ? appointmentsRes.data.appointments
            : [];

      const patientList = Array.isArray(patientsRes?.data)
        ? patientsRes.data
        : Array.isArray(patientsRes?.data?.data)
          ? patientsRes.data.data
          : [];

      const patientMap = new Map(
        patientList.map((patient) => [patient.id, patient]),
      );

      const mergedAppointments = appointmentList.map((appointment) => {
        const patient = patientMap.get(appointment.patient_id);

        return {
          ...appointment,

          patient_name:
            appointment.patient_name || patient?.name || "Unknown Patient",

          phone: appointment.phone || patient?.phone || "",

          is_allergies: convertToBoolean(
            appointment.is_allergies ??
              appointment.has_allergies ??
              patient?.is_allergies ??
              patient?.has_allergies,
          ),

          allergies:
            appointment.allergies ||
            appointment.allergy_details ||
            patient?.allergies ||
            patient?.allergy_details ||
            "",
        };
      });

      setAppointments(mergedAppointments);
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load appointments",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  /* --------------------------------------------------------
     Derived data
  -------------------------------------------------------- */

  const currentTreatmentPatient = useMemo(() => {
    return appointments.find(
      (appointment) => appointment.status === "In Treatment",
    );
  }, [appointments]);

  /*
   * Checked-in patients are ordered by:
   *
   * 1. Checked-in time
   * 2. Appointment time
   * 3. Updated time
   * 4. Appointment number
   */
  const checkedInAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => appointment.status === "Checked In")
      .sort((a, b) => {
        const checkedInDifference =
          getQueueDateTimeValue(
            a.checked_in_time,
            a.appointment_date || selectedDate,
          ) -
          getQueueDateTimeValue(
            b.checked_in_time,
            b.appointment_date || selectedDate,
          );

        if (checkedInDifference !== 0) {
          return checkedInDifference;
        }

        const appointmentTimeDifference =
          getQueueDateTimeValue(
            a.appointment_time,
            a.appointment_date || selectedDate,
          ) -
          getQueueDateTimeValue(
            b.appointment_time,
            b.appointment_date || selectedDate,
          );

        if (appointmentTimeDifference !== 0) {
          return appointmentTimeDifference;
        }

        const updatedTimeDifference =
          getQueueDateTimeValue(
            a.updated_at,
            a.appointment_date || selectedDate,
          ) -
          getQueueDateTimeValue(
            b.updated_at,
            b.appointment_date || selectedDate,
          );

        if (updatedTimeDifference !== 0) {
          return updatedTimeDifference;
        }

        return (
          Number(a.appointment_number || 0) - Number(b.appointment_number || 0)
        );
      });
  }, [appointments, selectedDate]);

  /*
   * Select the effective next patient immediately.
   *
   * When the stored patient still has Checked In status,
   * that patient stays locked as NEXT.
   */
  const nextCheckedInAppointmentId = useMemo(() => {
    if (checkedInAppointments.length === 0) {
      return null;
    }

    const lockedPatientStillWaiting = checkedInAppointments.some(
      (appointment) => appointment.appointment_id === lockedNextPatientId,
    );

    if (lockedPatientStillWaiting) {
      return lockedNextPatientId;
    }

    return checkedInAppointments[0]?.appointment_id || null;
  }, [checkedInAppointments, lockedNextPatientId]);

  const nextCheckedInPatient = useMemo(() => {
    if (!nextCheckedInAppointmentId) {
      return null;
    }

    return checkedInAppointments.find(
      (appointment) =>
        appointment.appointment_id === nextCheckedInAppointmentId,
    );
  }, [checkedInAppointments, nextCheckedInAppointmentId]);

  const remainingCheckedInQueue = useMemo(() => {
    return checkedInAppointments
      .filter(
        (appointment) =>
          appointment.appointment_id !== nextCheckedInAppointmentId,
      )
      .map((appointment, index) => ({
        ...appointment,
        live_queue_no: index + 2,
      }));
  }, [checkedInAppointments, nextCheckedInAppointmentId]);

  const checkedInQueuePositionMap = useMemo(() => {
    const positionMap = new Map();

    if (nextCheckedInAppointmentId) {
      positionMap.set(nextCheckedInAppointmentId, 1);
    }

    remainingCheckedInQueue.forEach((appointment, index) => {
      positionMap.set(appointment.appointment_id, index + 2);
    });

    return positionMap;
  }, [nextCheckedInAppointmentId, remainingCheckedInQueue]);

  /*
   * Keep the next patient locked in localStorage.
   *
   * The lock is changed only when:
   * - The locked patient starts treatment
   * - The appointment is cancelled
   * - The patient is no longer Checked In
   * - There are no checked-in patients
   */
  useEffect(() => {
    const storageKey = getReadyPatientStorageKey(selectedDate);

    if (checkedInAppointments.length === 0) {
      setLockedNextPatientId(null);

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }

      return;
    }

    const currentLockedPatientIsValid = checkedInAppointments.some(
      (appointment) => appointment.appointment_id === lockedNextPatientId,
    );

    let storedPatientId = null;

    if (typeof window !== "undefined") {
      storedPatientId = window.localStorage.getItem(storageKey);
    }

    const storedPatientIsValid = checkedInAppointments.some(
      (appointment) => appointment.appointment_id === storedPatientId,
    );

    let nextPatientId = null;

    if (currentLockedPatientIsValid) {
      nextPatientId = lockedNextPatientId;
    } else if (storedPatientIsValid) {
      nextPatientId = storedPatientId;
    } else {
      nextPatientId = checkedInAppointments[0]?.appointment_id || null;
    }

    if (nextPatientId !== lockedNextPatientId) {
      setLockedNextPatientId(nextPatientId);
    }

    if (typeof window !== "undefined" && nextPatientId) {
      window.localStorage.setItem(storageKey, nextPatientId);
    }
  }, [selectedDate, checkedInAppointments, lockedNextPatientId]);

  /*
   * Synchronize the locked patient when QueueDisplay is
   * open in another browser tab.
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const storageKey = getReadyPatientStorageKey(selectedDate);

    const handleStorageChange = (event) => {
      if (event.key !== storageKey) {
        return;
      }

      const newPatientId = event.newValue;

      if (!newPatientId) {
        setLockedNextPatientId(null);
        return;
      }

      const patientStillWaiting = checkedInAppointments.some(
        (appointment) => appointment.appointment_id === newPatientId,
      );

      if (patientStillWaiting) {
        setLockedNextPatientId(newPatientId);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [selectedDate, checkedInAppointments]);

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const aIsInTreatment = a.status === "In Treatment";
      const bIsInTreatment = b.status === "In Treatment";

      if (aIsInTreatment && !bIsInTreatment) {
        return -1;
      }

      if (!aIsInTreatment && bIsInTreatment) {
        return 1;
      }

      const aIsNext = a.appointment_id === nextCheckedInAppointmentId;

      const bIsNext = b.appointment_id === nextCheckedInAppointmentId;

      if (aIsNext && !bIsNext) {
        return -1;
      }

      if (!aIsNext && bIsNext) {
        return 1;
      }

      const aQueuePosition = checkedInQueuePositionMap.get(a.appointment_id);

      const bQueuePosition = checkedInQueuePositionMap.get(b.appointment_id);

      if (aQueuePosition !== undefined && bQueuePosition !== undefined) {
        return aQueuePosition - bQueuePosition;
      }

      if (aQueuePosition !== undefined) {
        return -1;
      }

      if (bQueuePosition !== undefined) {
        return 1;
      }

      return String(a.appointment_time || "").localeCompare(
        String(b.appointment_time || ""),
      );
    });
  }, [appointments, nextCheckedInAppointmentId, checkedInQueuePositionMap]);

  const appointmentSummary = useMemo(() => {
    const total = appointments.length;

    const waiting = appointments.filter(
      (appointment) => appointment.status === "Checked In",
    ).length;

    const inTreatment = appointments.filter(
      (appointment) => appointment.status === "In Treatment",
    ).length;

    const completed = appointments.filter(
      (appointment) => appointment.status === "Completed",
    ).length;

    return {
      total,
      waiting,
      inTreatment,
      completed,
    };
  }, [appointments]);

  /* --------------------------------------------------------
     Modal handlers
  -------------------------------------------------------- */

  const openPaymentModal = (appointment) => {
    setPaymentAppointment(appointment);
    setPaymentModalOpen(true);
  };

  const openTreatmentModal = (appointment) => {
    setTreatmentAppointment(appointment);
    setTreatmentModalOpen(true);
  };

  const handleTreatmentSubmit = async (treatmentData) => {
    try {
      setTreatmentLoading(true);

      await createTreatment(treatmentData);

      await updateAppointmentStatus(
        treatmentData.appointment_id,
        "Treatment Done",
      );

      message.success("Treatment details saved successfully");

      setTreatmentModalOpen(false);
      setTreatmentAppointment(null);

      await fetchAppointments();
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message || "Failed to save treatment details",
      );
    } finally {
      setTreatmentLoading(false);
    }
  };

  const handlePaymentSubmit = async (paymentData) => {
    try {
      setPaymentLoading(true);

      await createPayment(paymentData);

      await updateAppointmentStatus(paymentAppointment.appointment_id, "Paid");

      message.success("Payment completed successfully");

      setPaymentModalOpen(false);
      setPaymentAppointment(null);

      await fetchAppointments();
    } catch (error) {
      console.error(error);

      message.error(error?.response?.data?.message || "Failed to save payment");
    } finally {
      setPaymentLoading(false);
    }
  };

  /* --------------------------------------------------------
     Appointment actions
  -------------------------------------------------------- */

  const handleStatusUpdate = async (appointmentId, status) => {
    const selectedAppointment = appointments.find(
      (appointment) => appointment.appointment_id === appointmentId,
    );

    if (!selectedAppointment) {
      message.error("Appointment not found");
      return false;
    }

    if (
      status === "In Treatment" &&
      currentTreatmentPatient &&
      currentTreatmentPatient.appointment_id !== appointmentId
    ) {
      message.warning(
        `${
          currentTreatmentPatient.patient_name || "Another patient"
        } is currently in treatment`,
      );

      return false;
    }

    /*
     * Prevent another waiting patient from moving ahead
     * of the locked next patient.
     */
    if (
      status === "In Treatment" &&
      selectedAppointment.status === "Checked In" &&
      nextCheckedInAppointmentId &&
      appointmentId !== nextCheckedInAppointmentId
    ) {
      const nextPatientName =
        nextCheckedInPatient?.patient_name || "The next patient";

      message.warning(
        `${nextPatientName} is currently locked as the next patient`,
      );

      return false;
    }

    try {
      setUpdatingId(appointmentId);

      await updateAppointmentStatus(appointmentId, status);

      message.success(`Appointment updated to ${status}`);

      await fetchAppointments();

      return true;
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update appointment status",
      );

      return false;
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartTreatment = async (record) => {
    const updated = await handleStatusUpdate(
      record.appointment_id,
      "In Treatment",
    );

    if (updated) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const getActionRules = (record) => {
    const status = record.status;

    const isCompleted = status === "Completed";
    const isCancelled = status === "Cancelled";

    const canCheckIn = ["Pending", "Confirmed"].includes(status);

    const isLockedNextPatient =
      record.appointment_id === nextCheckedInAppointmentId;

    const anotherPatientInTreatment =
      currentTreatmentPatient &&
      currentTreatmentPatient.appointment_id !== record.appointment_id;

    const canStartTreatment =
      status === "Checked In" &&
      isLockedNextPatient &&
      !anotherPatientInTreatment;

    const isWaitingInQueue = status === "Checked In" && !isLockedNextPatient;

    const canFinishTreatment = status === "In Treatment";

    const canAddPayment = status === "Treatment Done";

    const canComplete = ["Payment Pending", "Paid"].includes(status);

    return {
      isCompleted,
      isCancelled,
      canCheckIn,
      canStartTreatment,
      canFinishTreatment,
      canAddPayment,
      canComplete,
      isLockedNextPatient,
      isWaitingInQueue,
      anotherPatientInTreatment,
    };
  };

  /* --------------------------------------------------------
     Queue actions
  -------------------------------------------------------- */

  const renderQueueNextStep = (record, isNextPatient, queuePosition) => {
    const isUpdating = updatingId === record.appointment_id;

    if (!isNextPatient) {
      return (
        <Tooltip title="This patient will stay in the waiting queue until their turn">
          <Button
            block
            disabled
            className="side-queue-action-button waiting-queue-button"
            icon={<ClockCircleOutlined />}
          >
            Waiting in Queue #{queuePosition}
          </Button>
        </Tooltip>
      );
    }

    if (currentTreatmentPatient) {
      return (
        <Tooltip
          title={`${
            currentTreatmentPatient.patient_name || "Another patient"
          } is currently in treatment`}
        >
          <Button
            block
            disabled
            className="side-queue-action-button"
            icon={<ClockCircleOutlined />}
          >
            Treatment
          </Button>
        </Tooltip>
      );
    }

    return (
      <Button
        block
        type="primary"
        className="side-queue-action-button"
        icon={<PlayCircleOutlined />}
        loading={isUpdating}
        disabled={isUpdating}
        onClick={() => handleStartTreatment(record)}
      >
        Start Next Treatment
      </Button>
    );
  };

const renderCheckedInPatientCard = (
  record,
  { isNextPatient = false, queuePosition = 1 } = {},
) => {
  const appointmentNumber =
    record.appointment_number !== null &&
    record.appointment_number !== undefined
      ? String(record.appointment_number).padStart(2, "0")
      : "--";

  return (
    <div
      className={[
        "simple-checked-in-card",
        isNextPatient ? "simple-next-patient-card" : "",
        record.is_allergies ? "simple-allergy-patient-card" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="simple-queue-number-section">
        <Text className="simple-queue-position">
          {isNextPatient ? "NEXT PATIENT" : `QUEUE #${queuePosition}`}
        </Text>

        <div className="simple-appointment-number">
          {appointmentNumber}
        </div>

        {record.is_allergies && (
          <Tooltip
            title={
              record.allergies
                ? `Allergies: ${record.allergies}`
                : "This patient has allergies"
            }
          >
            <Tag
              icon={<ExclamationCircleFilled />}
              color="error"
              className="simple-allergy-tag"
            >
              Allergy Alert
            </Tag>
          </Tooltip>
        )}
      </div>

      <div className="simple-treatment-action">
        {renderQueueNextStep(
          record,
          isNextPatient,
          queuePosition,
        )}
      </div>
    </div>
  );
};

  /* --------------------------------------------------------
     Table columns
  -------------------------------------------------------- */

  const columns = [
    {
      title: "Number",
      dataIndex: "appointment_number",
      key: "appointment_number",
      width: 110,
      align: "center",

      render: (value, record) => {
        const appointmentNumber =
          value !== null && value !== undefined
            ? String(value).padStart(2, "0")
            : "--";

        return (
          <div
            className={[
              "appointment-number-cell",
              record.status === "In Treatment"
                ? "appointment-number-cell-active"
                : "",
              record.is_allergies ? "appointment-number-cell-allergy" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="appointment-number-badge">{appointmentNumber}</div>
          </div>
        );
      },
    },
    {
      title: "Patient",
      dataIndex: "patient_name",
      width: 240,

      render: (value, record) => (
        <div className="patient-cell">
          <div
            className={[
              "patient-avatar",
              record.is_allergies ? "patient-avatar-allergy" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <UserOutlined />
          </div>

          <div className="patient-details">
            <Space size={6} wrap>
              <Text strong>{value || "Unknown Patient"}</Text>

              {record.is_allergies && (
                <Tooltip
                  title={
                    record.allergies
                      ? `Allergies: ${record.allergies}`
                      : "This patient has allergies"
                  }
                >
                  <ExclamationCircleFilled className="allergy-icon" />
                </Tooltip>
              )}
            </Space>

            {record.phone && (
              <Text type="secondary" className="small-text">
                {record.phone}
              </Text>
            )}

            {record.is_allergies && (
              <Text type="danger" strong className="allergy-alert-text">
                ALLERGY ALERT
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Appointment",
      key: "appointment",

      render: (_, record) => (
        <Space direction="vertical" size={1}>
          <Text strong>{formatTime(record.appointment_time)}</Text>

          <Text type="secondary" className="small-text reason-text">
            {record.reason_for_visit || "General consultation"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 145,

      render: (status) => (
        <Tag color={statusColors[status] || "default"} className="status-tag">
          {status || "Pending"}
        </Tag>
      ),
    },
    {
      title: "Next Step",
      key: "next_step",
      width: 230,

      render: (_, record) => {
        const rules = getActionRules(record);

        const isUpdating = updatingId === record.appointment_id;

        const queuePosition = checkedInQueuePositionMap.get(
          record.appointment_id,
        );

        if (rules.isCompleted) {
          return (
            <Tag
              icon={<CheckCircleOutlined />}
              color="success"
              className="final-status-tag"
            >
              Visit Completed
            </Tag>
          );
        }

        if (rules.isCancelled) {
          return (
            <Tag color="error" className="final-status-tag">
              Appointment Cancelled
            </Tag>
          );
        }

        if (rules.canCheckIn) {
          return (
            <Button
              block
              className="step-button check-in-button"
              icon={<CheckCircleOutlined />}
              loading={isUpdating}
              disabled={isUpdating}
              onClick={() =>
                handleStatusUpdate(record.appointment_id, "Checked In")
              }
            >
              1. Check In Patient
            </Button>
          );
        }

        if (rules.canStartTreatment) {
          return (
            <Button
              block
              type="primary"
              className="step-button treatment-button"
              icon={<PlayCircleOutlined />}
              loading={isUpdating}
              disabled={isUpdating}
              onClick={() => handleStartTreatment(record)}
            >
              2. Start Treatment
            </Button>
          );
        }

        if (record.status === "Checked In" && rules.anotherPatientInTreatment) {
          return (
            <Tooltip
              title={`${
                currentTreatmentPatient?.patient_name || "Another patient"
              } is currently in treatment`}
            >
              <Button
                block
                disabled
                className="step-button"
                icon={<ClockCircleOutlined />}
              >
                Please Wait
              </Button>
            </Tooltip>
          );
        }

        if (rules.isWaitingInQueue) {
          return (
            <Tooltip title="The locked next patient must start treatment first">
              <Button
                block
                disabled
                className="step-button waiting-queue-button"
                icon={<ClockCircleOutlined />}
              >
                Waiting in Queue
                {queuePosition ? ` #${queuePosition}` : ""}
              </Button>
            </Tooltip>
          );
        }

        if (rules.canFinishTreatment) {
          return (
            <Button
              block
              className="step-button treatment-done-button"
              icon={<MedicineBoxOutlined />}
              loading={treatmentLoading}
              disabled
              onClick={() => openTreatmentModal(record)}
            >
              In Treatment Room
            </Button>
          );
        }

        if (rules.canAddPayment) {
          return (
            <Button
              block
              className="step-button payment-button"
              icon={<DollarOutlined />}
              loading={paymentLoading}
              disabled={paymentLoading}
              onClick={() => openPaymentModal(record)}
            >
              4. Add Payment
            </Button>
          );
        }

        if (rules.canComplete) {
          return (
            <Button
              block
              type="primary"
              className="step-button complete-button"
              icon={<CheckCircleOutlined />}
              loading={isUpdating}
              disabled={isUpdating}
              onClick={() =>
                handleStatusUpdate(record.appointment_id, "Completed")
              }
            >
              5. Complete Visit
            </Button>
          );
        }

        return (
          <Button block disabled className="step-button">
            No Action Available
          </Button>
        );
      },
    },
  ];

  /* --------------------------------------------------------
     Render
  -------------------------------------------------------- */

  return (
    <ClinicPage
      title="Patient Appointments"
      subtitle="Manage patient arrivals, treatments, payments, and completed visits."
      icon={<CalendarFilled />}
      actions={
        <div className="header-controls">
          <div className="header-date-icon">
            <CalendarFilled />
          </div>

          <DatePicker
            allowClear={false}
            value={dayjs(selectedDate)}
            format="YYYY-MM-DD"
            onChange={(date) =>
              setSelectedDate(date ? date.format("YYYY-MM-DD") : getTodayDate())
            }
            className="header-date-picker"
          />

          <Tooltip title="Reload appointments">
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAppointments}
              loading={loading}
              className="header-refresh-button"
            >
              Refresh
            </Button>
          </Tooltip>
        </div>
      }
    >
      <div className="appointment-maintenance-page">
        {/* Summary cards */}

        <Row gutter={[16, 16]} className="summary-row">
          <Col xs={12} md={6}>
            <Card className="summary-card total-summary-card">
              <Statistic
                title="Total Appointments"
                value={appointmentSummary.total}
                prefix={<CalendarFilled />}
              />
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card className="summary-card waiting-summary-card">
              <Statistic
                title="Waiting Patients"
                value={appointmentSummary.waiting}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card className="summary-card treatment-summary-card">
              <Statistic
                title="In Treatment"
                value={appointmentSummary.inTreatment}
                prefix={<MedicineBoxOutlined />}
              />
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card className="summary-card completed-summary-card">
              <Statistic
                title="Completed"
                value={appointmentSummary.completed}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Current treatment */}

        {currentTreatmentPatient && (
          <Card className="current-treatment-card">
            <div className="current-treatment-content">
              <div className="current-treatment-left">
                <div className="current-treatment-icon">
                  <MedicineBoxOutlined />
                </div>

                <div className="current-treatment-details">
                  <Text className="current-treatment-label">
                    Patient Currently In Treatment
                  </Text>

                  <Title level={4} className="current-patient-name">
                    {currentTreatmentPatient.patient_name || "Unknown Patient"}
                  </Title>

                  <Space
                    size={10}
                    wrap
                    split={<span className="detail-separator">•</span>}
                  >
                    <Text type="secondary">
                      {currentTreatmentPatient.reason_for_visit ||
                        "General dental treatment"}
                    </Text>

                    {currentTreatmentPatient.phone && (
                      <Text type="secondary">
                        {currentTreatmentPatient.phone}
                      </Text>
                    )}
                  </Space>

                  {currentTreatmentPatient.is_allergies && (
                    <Tag
                      icon={<ExclamationCircleFilled />}
                      color="error"
                      className="current-allergy-tag"
                    >
                      {currentTreatmentPatient.allergies
                        ? `Allergy: ${currentTreatmentPatient.allergies}`
                        : "Allergy Alert"}
                    </Tag>
                  )}
                </div>
              </div>

              <div className="treatment-pulse-wrapper">
                <span className="treatment-pulse" />

                <Tag color="processing" className="current-treatment-tag">
                  Treatment In Progress
                </Tag>
              </div>
            </div>
          </Card>
        )}

        {/* Checked-in queue */}

        <Row gutter={[16, 16]} align="top">
          <Col xs={24}>
            <Card
              className="checked-in-side-card checked-in-top-card"
            
            >
{checkedInAppointments.length === 0 ? (
  <Empty
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    description={
      <Space direction="vertical" size={2}>
        <Text strong>No patients waiting</Text>

        <Text type="secondary" className="small-text">
          Checked-in patients will appear here
        </Text>
      </Space>
    }
  />
) : (
  <div className="checked-in-horizontal-layout">
    {/* Locked next patient */}

    {nextCheckedInPatient && (
      <section className="next-patient-section queue-column-section">
        <div className="queue-section-heading">
          <div>
            <Text className="queue-section-eyebrow">
              Treatment Queue
            </Text>

            <Title level={5} className="queue-section-title">
              Locked Next Patient
            </Title>

            <Text
              type="secondary"
              className="queue-section-description"
            >
              New check-ins will not replace this patient
            </Text>
          </div>

          <Tag
            color="green"
            icon={<CheckCircleOutlined />}
            className="queue-lock-tag"
          >
            Locked
          </Tag>
        </div>

        <div className="next-patient-card-container">
          {renderCheckedInPatientCard(nextCheckedInPatient, {
            isNextPatient: true,
            queuePosition: 1,
          })}
        </div>
      </section>
    )}

    {/* Remaining checked-in patients */}

    <section className="remaining-queue-section queue-column-section">
      <div className="queue-section-heading">
        <div>
          <Text className="queue-section-eyebrow">
            Waiting List
          </Text>

          <Title level={5} className="queue-section-title">
            Remaining Checked-In Patients
          </Title>
        </div>

        <Tag className="remaining-count-tag">
          {remainingCheckedInQueue.length} waiting
        </Tag>
      </div>

      {remainingCheckedInQueue.length === 0 ? (
        <div className="remaining-queue-empty">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No additional patients are waiting"
          />
        </div>
      ) : (
        <div className="remaining-patients-horizontal-list">
          {remainingCheckedInQueue.map((record) => (
            <div
              key={record.appointment_id}
              className="remaining-patient-card-wrapper"
            >
              {renderCheckedInPatientCard(record, {
                isNextPatient: false,
                queuePosition: record.live_queue_no,
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  </div>
)}
            </Card>
          </Col>

          {/* Appointment workflow */}

          <Col xs={24}>
            <Card
              className="appointments-card"
              title={
                <Space>
                  <div className="card-title-icon blue-icon">
                    <CalendarFilled />
                  </div>

                  <div>
                    <Text strong className="card-title-text">
                      Appointment Workflow
                    </Text>

                    <Text type="secondary" className="card-title-description">
                      Follow the next available action for each patient
                    </Text>
                  </div>
                </Space>
              }
              extra={
                <Tag className="appointments-count-tag">
                  {appointments.length} appointments
                </Tag>
              }
            >
              <Table
                rowKey="appointment_id"
                columns={columns}
                dataSource={sortedAppointments}
                loading={loading}
                scroll={{ x: 850 }}
                pagination={{
                  pageSize: 8,
                  showSizeChanger: false,
                  showTotal: (total) => `${total} appointments`,
                }}
                rowClassName={(record) => {
                  const classNames = [];

                  if (record.is_allergies) {
                    classNames.push("allergy-alert-row");
                  }

                  if (record.status === "In Treatment") {
                    classNames.push("in-treatment-row");
                  }

                  if (record.status === "Completed") {
                    classNames.push("completed-row");
                  }

                  if (record.appointment_id === nextCheckedInAppointmentId) {
                    classNames.push("next-patient-row");
                  }

                  return classNames.join(" ");
                }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No appointments found for the selected date"
                    />
                  ),
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Modals */}

        <PaymentModal
          open={paymentModalOpen}
          loading={paymentLoading}
          appointment={paymentAppointment}
          onCancel={() => {
            setPaymentModalOpen(false);
            setPaymentAppointment(null);
          }}
          onSubmit={handlePaymentSubmit}
        />

        <TreatmentModal
          open={treatmentModalOpen}
          loading={treatmentLoading}
          appointment={treatmentAppointment}
          onCancel={() => {
            setTreatmentModalOpen(false);
            setTreatmentAppointment(null);
          }}
          onSubmit={handleTreatmentSubmit}
        />

        <style>{`
          .appointment-maintenance-page {
            width: 100%;
            min-height: 100%;
          }

          /* --------------------------------------------------
             Header controls
          -------------------------------------------------- */

          .header-controls {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 7px;
            border: 1px solid rgba(255, 255, 255, 0.28);
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.16);
            backdrop-filter: blur(12px);
          }

          .header-date-icon {
            display: flex;
            width: 36px;
            height: 36px;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255, 255, 255, 0.22);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.18);
            color: #ffffff;
            font-size: 17px;
          }

          .header-date-picker {
            width: 165px;
            border-radius: 9px;
            font-weight: 600;
          }

          .header-refresh-button {
            border-radius: 9px;
            font-weight: 600;
          }

          /* --------------------------------------------------
             Summary cards
          -------------------------------------------------- */

          .summary-row {
            margin-bottom: 18px;
          }

          .summary-card {
            height: 100%;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            background: #ffffff;
            box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
            transition:
              transform 0.2s ease,
              box-shadow 0.2s ease;
          }

          .summary-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 9px 24px rgba(15, 23, 42, 0.09);
          }

          .summary-card .ant-statistic-title {
            margin-bottom: 7px;
            color: #64748b;
            font-size: 12px;
            font-weight: 600;
          }

          .summary-card .ant-statistic-content {
            color: #0f172a;
            font-size: 25px;
            font-weight: 700;
          }

          .summary-card .ant-statistic-content-prefix {
            margin-right: 9px;
          }

          .total-summary-card {
            border-top: 4px solid #1677ff;
          }

          .total-summary-card .ant-statistic-content-prefix {
            color: #1677ff;
          }

          .waiting-summary-card {
            border-top: 4px solid #13c2c2;
          }

          .waiting-summary-card .ant-statistic-content-prefix {
            color: #08979c;
          }

          .treatment-summary-card {
            border-top: 4px solid #722ed1;
          }

          .treatment-summary-card .ant-statistic-content-prefix {
            color: #722ed1;
          }

          .completed-summary-card {
            border-top: 4px solid #52c41a;
          }

          .completed-summary-card .ant-statistic-content-prefix {
            color: #389e0d;
          }

          /* --------------------------------------------------
             Current treatment
          -------------------------------------------------- */

          .current-treatment-card {
            margin-bottom: 18px;
            overflow: hidden;
            border: 1px solid #91caff;
            border-radius: 16px;
            background:
              radial-gradient(
                circle at top right,
                rgba(22, 119, 255, 0.13),
                transparent 36%
              ),
              linear-gradient(
                135deg,
                #f0f7ff 0%,
                #e6f4ff 100%
              );
            box-shadow: 0 7px 22px rgba(22, 119, 255, 0.1);
          }

          .current-treatment-card .ant-card-body {
            padding: 20px 22px;
          }

          .current-treatment-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
          }

          .current-treatment-left {
            display: flex;
            min-width: 0;
            align-items: center;
            gap: 15px;
          }

          .current-treatment-icon {
            display: flex;
            width: 54px;
            height: 54px;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            border-radius: 15px;
            background: linear-gradient(
              135deg,
              #1677ff 0%,
              #4096ff 100%
            );
            color: #ffffff;
            font-size: 23px;
            box-shadow: 0 7px 16px rgba(22, 119, 255, 0.25);
          }

          .current-treatment-details {
            min-width: 0;
          }

          .current-treatment-label {
            color: #1677ff;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.03em;
            text-transform: uppercase;
          }

          .current-patient-name {
            margin: 3px 0 !important;
            color: #0f172a !important;
          }

          .detail-separator {
            color: #94a3b8;
          }

          .current-allergy-tag {
            margin-top: 8px;
            border-radius: 20px;
            font-weight: 700;
          }

          .treatment-pulse-wrapper {
            display: flex;
            flex-shrink: 0;
            align-items: center;
            gap: 8px;
          }

          .treatment-pulse {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #1677ff;
            animation: treatmentPulse 1.7s infinite;
          }

          @keyframes treatmentPulse {
            0% {
              box-shadow: 0 0 0 0 rgba(22, 119, 255, 0.4);
            }

            70% {
              box-shadow: 0 0 0 8px rgba(22, 119, 255, 0);
            }

            100% {
              box-shadow: 0 0 0 0 rgba(22, 119, 255, 0);
            }
          }

          .current-treatment-tag {
            margin: 0;
            padding: 7px 14px;
            border-radius: 20px;
            font-weight: 700;
          }

          /* --------------------------------------------------
             Main cards
          -------------------------------------------------- */

          .appointments-card,
          .checked-in-side-card {
            overflow: hidden;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            background: #ffffff;
            box-shadow: 0 5px 18px rgba(15, 23, 42, 0.05);
          }

          .appointments-card .ant-card-head,
          .checked-in-side-card .ant-card-head {
            min-height: 72px;
            border-bottom: 1px solid #e2e8f0;
            background: linear-gradient(
              180deg,
              #ffffff 0%,
              #f8fafc 100%
            );
          }

          .appointments-card .ant-card-body {
            padding: 0;
          }

          .checked-in-side-card .ant-card-body {
            padding: 20px;
          }

          .card-title-icon {
            display: flex;
            width: 38px;
            height: 38px;
            align-items: center;
            justify-content: center;
            border-radius: 11px;
            font-size: 17px;
          }

          .blue-icon {
            background: #e6f4ff;
            color: #1677ff;
          }

          .cyan-icon {
            background: #e6fffb;
            color: #08979c;
          }

          .card-title-text,
          .side-queue-title {
            display: block;
            color: #0f172a;
            font-size: 16px;
          }

          .card-title-description,
          .side-queue-description {
            display: block;
            margin-top: 1px;
            font-size: 11px;
          }

          .appointments-count-tag,
          .side-queue-count {
            margin: 0;
            padding: 4px 10px;
            border-radius: 20px;
            font-weight: 700;
          }

          /* --------------------------------------------------
             Separate queue sections
          -------------------------------------------------- */

          .checked-in-queue-layout {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .next-patient-section {
            padding: 20px;
            border: 1px solid #bbf7d0;
            border-radius: 18px;
            background:
              radial-gradient(
                circle at top right,
                rgba(34, 197, 94, 0.12),
                transparent 38%
              ),
              linear-gradient(
                145deg,
                #f0fdf4 0%,
                #ffffff 100%
              );
          }

          .remaining-queue-section {
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
          }

          .queue-section-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
          }

          .queue-section-eyebrow {
            display: block;
            margin-bottom: 2px;
            color: #0284c7;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.07em;
            text-transform: uppercase;
          }

          .next-patient-section .queue-section-eyebrow {
            color: #15803d;
          }

          .queue-section-title {
            margin: 0 !important;
            color: #0f172a !important;
          }

          .queue-section-description {
            display: block;
            margin-top: 3px;
            font-size: 12px;
          }

          .queue-lock-tag,
          .remaining-count-tag {
            flex-shrink: 0;
            margin: 0;
            padding: 5px 11px;
            border-radius: 20px;
            font-weight: 700;
          }

          .next-patient-card-container {
            width: 100%;
            max-width: 520px;
          }

          .remaining-queue-empty {
            display: flex;
            min-height: 150px;
            align-items: center;
            justify-content: center;
            border: 1px dashed #cbd5e1;
            border-radius: 14px;
            background: #f8fafc;
          }

          .checked-in-top-card {
            width: 100%;
          }

          .checked-in-queue-row {
            width: 100%;
          }

          .checked-in-queue-column {
            display: flex;
          }

          /* --------------------------------------------------
             Queue patient cards
          -------------------------------------------------- */

          .side-queue-item {
            display: flex;
            width: 100%;
            min-height: 100%;
            flex-direction: column;
            padding: 18px;
            border: 1px solid #dbeafe;
            border-radius: 18px;
            background: #ffffff;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
            transition:
              transform 0.2s ease,
              box-shadow 0.2s ease,
              border-color 0.2s ease;
          }

          .side-queue-item:hover {
            transform: translateY(-3px);
            border-color: #93c5fd;
            box-shadow: 0 14px 30px rgba(15, 23, 42, 0.1);
          }

          .next-side-queue-item {
            min-height: 320px;
            border: 2px solid #22c55e;
            background: linear-gradient(
              145deg,
              rgba(240, 253, 244, 0.98),
              rgba(255, 255, 255, 1)
            );
            box-shadow: 0 12px 30px rgba(34, 197, 94, 0.15);
          }

          .side-queue-allergy-item {
            border-color: #fca5a5;
            background: linear-gradient(
              145deg,
              rgba(254, 242, 242, 0.95),
              rgba(255, 255, 255, 1)
            );
          }

          .next-side-queue-item.side-queue-allergy-item {
            border-color: #ef4444;
          }

          .side-queue-item-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 16px;
          }

          .side-queue-number-group {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .side-queue-position {
            min-width: 46px;
            padding: 5px 11px;
            border-radius: 999px;
            background: #e0f2fe;
            color: #0369a1;
            font-size: 12px;
            font-weight: 800;
            text-align: center;
          }

          .next-side-queue-position {
            background: linear-gradient(
              135deg,
              #16a34a 0%,
              #22c55e 100%
            );
            color: #ffffff;
            box-shadow: 0 4px 10px rgba(34, 197, 94, 0.24);
          }

          .side-appointment-number-value {
            display: inline-flex;
            min-width: 32px;
            height: 29px;
            align-items: center;
            justify-content: center;
            padding: 0 8px;
            border-radius: 9px;
            background: #dbeafe;
            color: #1d4ed8;
            font-size: 14px;
            font-weight: 800;
            line-height: 1;
          }

          .next-side-queue-item
            .side-appointment-number-value {
            background: #2563eb;
            color: #ffffff;
          }

          .side-queue-allergy-item
            .side-appointment-number-value {
            background: #fee2e2;
            color: #dc2626;
          }

          .side-allergy-tag {
            margin: 0;
            border-radius: 20px;
            font-weight: 700;
          }

          .side-queue-patient {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }

          .side-queue-avatar {
            display: flex;
            width: 46px;
            height: 46px;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            background: linear-gradient(
              135deg,
              #dbeafe,
              #cffafe
            );
            color: #0284c7;
            font-size: 21px;
          }

          .next-side-queue-item .side-queue-avatar {
            background: linear-gradient(
              135deg,
              #16a34a,
              #4ade80
            );
            color: #ffffff;
          }

          .side-queue-patient-details {
            display: flex;
            min-width: 0;
            flex-direction: column;
          }

          .side-queue-patient-name {
            display: block;
            overflow: hidden;
            color: #0f172a;
            font-size: 15px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .next-side-queue-item
            .side-queue-patient-name {
            font-size: 17px;
          }

          .side-queue-phone {
            display: block;
            margin-top: 2px;
            font-size: 12px;
          }

          .side-queue-time-box {
            margin-bottom: 14px;
            padding: 12px 8px;
            border-radius: 12px;
            background: #f8fafc;
          }

          .side-time-label {
            display: block;
            margin-bottom: 4px;
            color: #64748b;
            font-size: 11px;
            font-weight: 650;
            letter-spacing: 0.03em;
            text-transform: uppercase;
          }

          .side-reason-box {
            margin-bottom: 14px;
            padding: 11px 12px;
            border-radius: 12px;
            background: #f8fafc;
          }

          .side-reason-text {
            display: -webkit-box;
            overflow: hidden;
            color: #334155;
            font-size: 13px;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
          }

          .side-queue-action {
            margin-top: auto;
            padding-top: 8px;
          }

          .side-queue-action-button {
            min-height: 41px;
            border-radius: 10px;
            font-weight: 700;
          }

          .waiting-queue-button {
            border-color: #cbd5e1 !important;
            background: #f8fafc !important;
            color: #64748b !important;
          }

          /* --------------------------------------------------
             Table
          -------------------------------------------------- */

          .appointments-card .ant-table-thead > tr > th {
            background: #f8fafc;
            color: #475569;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.02em;
          }

          .appointments-card .ant-table-tbody > tr > td {
            padding-top: 14px;
            padding-bottom: 14px;
            vertical-align: middle;
          }

          .appointments-card .ant-table-tbody > tr {
            transition: background-color 0.2s ease;
          }

          .patient-cell {
            display: flex;
            min-width: 0;
            align-items: center;
            gap: 11px;
          }

          .patient-avatar {
            display: flex;
            width: 39px;
            height: 39px;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            border-radius: 11px;
            background: #e6f4ff;
            color: #1677ff;
            font-size: 16px;
          }

          .patient-avatar-allergy {
            background: #fff1f0;
            color: #cf1322;
          }

          .patient-details {
            display: flex;
            min-width: 0;
            flex-direction: column;
          }

          .allergy-icon {
            color: #ff4d4f;
          }

          .allergy-alert-text {
            margin-top: 1px;
            font-size: 10px;
            letter-spacing: 0.04em;
          }

          .small-text {
            font-size: 12px;
          }

          .reason-text {
            display: inline-block;
            max-width: 220px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .status-tag,
          .final-status-tag {
            margin: 0;
            padding: 5px 11px;
            border-radius: 20px;
            font-weight: 650;
          }

          /* --------------------------------------------------
             Appointment number
          -------------------------------------------------- */

          .appointment-number-cell {
            display: flex;
            min-width: 72px;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5px;
          }

          .appointment-number-badge {
            display: inline-flex;
            width: 48px;
            height: 48px;
            align-items: center;
            justify-content: center;
            border: 1px solid #bfdbfe;
            border-radius: 14px;
            background: linear-gradient(
              135deg,
              #eff6ff 0%,
              #dbeafe 100%
            );
            color: #1d4ed8;
            font-size: 18px;
            font-weight: 800;
            line-height: 1;
            letter-spacing: 0.5px;
            box-shadow:
              0 5px 14px rgba(37, 99, 235, 0.12),
              inset 0 1px 0 rgba(255, 255, 255, 0.9);
            transition:
              transform 0.2s ease,
              box-shadow 0.2s ease,
              border-color 0.2s ease;
          }

          .ant-table-tbody
            > tr:hover
            .appointment-number-badge {
            transform: translateY(-1px);
            border-color: #93c5fd;
            box-shadow:
              0 8px 18px rgba(37, 99, 235, 0.18),
              inset 0 1px 0 rgba(255, 255, 255, 0.9);
          }

          .appointment-number-cell-active
            .appointment-number-badge {
            border-color: #86efac;
            background: linear-gradient(
              135deg,
              #f0fdf4 0%,
              #dcfce7 100%
            );
            color: #15803d;
          }

          .appointment-number-cell-allergy
            .appointment-number-badge {
            border-color: #fecaca;
            background: linear-gradient(
              135deg,
              #fff7f7 0%,
              #fee2e2 100%
            );
            color: #dc2626;
          }

          .appointment-number-cell-active.appointment-number-cell-allergy
            .appointment-number-badge {
            border-color: #fca5a5;
            background: linear-gradient(
              135deg,
              #fff1f2 0%,
              #ffe4e6 100%
            );
            color: #be123c;
          }

          /* --------------------------------------------------
             Step buttons
          -------------------------------------------------- */

          .step-button {
            min-height: 39px;
            border-radius: 9px;
            font-weight: 650;
          }

          .check-in-button:not(:disabled) {
            border-color: #5cdbd3;
            background: #e6fffb;
            color: #006d75;
          }

          .check-in-button:not(:disabled):hover {
            border-color: #36cfc9 !important;
            background: #b5f5ec !important;
            color: #006d75 !important;
          }

          .treatment-button:not(:disabled) {
            border-color: #1677ff;
            background: linear-gradient(
              135deg,
              #1677ff 0%,
              #4096ff 100%
            );
            box-shadow: 0 4px 10px rgba(22, 119, 255, 0.18);
          }

          .treatment-done-button:not(:disabled) {
            border-color: #b37feb;
            background: #f9f0ff;
            color: #722ed1;
          }

          .payment-button:not(:disabled) {
            border-color: #ffc069;
            background: #fff7e6;
            color: #d46b08;
          }

          .complete-button:not(:disabled) {
            border-color: #389e0d;
            background: linear-gradient(
              135deg,
              #389e0d 0%,
              #52c41a 100%
            );
          }

          /* --------------------------------------------------
             Row states
          -------------------------------------------------- */

          .next-patient-row > td {
            background: #f6ffed !important;
          }

          .next-patient-row > td:first-child {
            border-left: 4px solid #52c41a;
          }

          .in-treatment-row > td {
            background: #e6f4ff !important;
          }

          .in-treatment-row > td:first-child {
            border-left: 4px solid #1677ff;
          }

          .completed-row > td {
            background: #f6ffed !important;
            opacity: 0.82;
          }

          .allergy-alert-row > td {
            background: #fff1f0 !important;
            opacity: 1 !important;
          }

          .allergy-alert-row > td:first-child {
            border-left: 5px solid #ff4d4f !important;
          }

          .allergy-alert-row:hover > td,
          .allergy-alert-row
            > td.ant-table-cell-row-hover {
            background: #ffccc7 !important;
          }

          .allergy-alert-row.in-treatment-row > td,
          .allergy-alert-row.completed-row > td,
          .allergy-alert-row.next-patient-row > td {
            background: #fff1f0 !important;
            opacity: 1 !important;
          }
/* --------------------------------------------------
   Simplified checked-in patient card
-------------------------------------------------- */

.simple-checked-in-card {
  display: flex;
  width: 100%;
  min-height: 190px;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px;
  border: 1px solid #dbeafe;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
}

.simple-next-patient-card {
  border: 2px solid #22c55e;
  background:
    radial-gradient(
      circle at top right,
      rgba(34, 197, 94, 0.14),
      transparent 42%
    ),
    linear-gradient(
      145deg,
      #f0fdf4 0%,
      #ffffff 100%
    );
  box-shadow: 0 12px 28px rgba(34, 197, 94, 0.15);
}

.simple-allergy-patient-card {
  border-color: #ef4444;
  background:
    radial-gradient(
      circle at top right,
      rgba(239, 68, 68, 0.12),
      transparent 42%
    ),
    #fffafa;
}

.simple-queue-number-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.simple-queue-position {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.simple-next-patient-card .simple-queue-position {
  color: #15803d;
}

.simple-appointment-number {
  display: flex;
  width: 82px;
  height: 82px;
  align-items: center;
  justify-content: center;
  border: 2px solid #bfdbfe;
  border-radius: 24px;
  background: linear-gradient(
    135deg,
    #eff6ff 0%,
    #dbeafe 100%
  );
  color: #1d4ed8;
  font-size: 34px;
  font-weight: 900;
  line-height: 1;
  box-shadow:
    0 8px 20px rgba(37, 99, 235, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.simple-next-patient-card .simple-appointment-number {
  border-color: #86efac;
  background: linear-gradient(
    135deg,
    #22c55e 0%,
    #16a34a 100%
  );
  color: #ffffff;
  box-shadow: 0 9px 22px rgba(34, 197, 94, 0.24);
}

.simple-allergy-patient-card .simple-appointment-number {
  border-color: #fca5a5;
  background: linear-gradient(
    135deg,
    #fff1f2 0%,
    #fee2e2 100%
  );
  color: #dc2626;
}

.simple-allergy-tag {
  margin: 0;
  border-radius: 20px;
  font-weight: 700;
}

.simple-treatment-action {
  width: 100%;
}

.simple-treatment-action .ant-btn {
  min-height: 44px;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 700;
}

@media (max-width: 575px) {
  .simple-checked-in-card {
    min-height: 175px;
    padding: 18px;
  }

  .simple-appointment-number {
    width: 72px;
    height: 72px;
    border-radius: 20px;
    font-size: 30px;
  }
}
        
/* --------------------------------------------------
   Checked-in queue horizontal layout
-------------------------------------------------- */

.checked-in-horizontal-layout {
  display: flex;
  width: 100%;
  align-items: stretch;
  gap: 16px;
}

.queue-column-section {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  padding: 18px;
  border-radius: 18px;
}

.next-patient-section {
  width: 280px;
  min-width: 280px;
  flex-shrink: 0;
  border: 1px solid #86efac;
  background:
    radial-gradient(
      circle at top right,
      rgba(34, 197, 94, 0.14),
      transparent 42%
    ),
    linear-gradient(
      145deg,
      #f0fdf4 0%,
      #ffffff 100%
    );
}

.remaining-queue-section {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.queue-section-heading {
  display: flex;
  min-height: 74px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.queue-section-eyebrow {
  display: block;
  margin-bottom: 2px;
  color: #0284c7;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.next-patient-section .queue-section-eyebrow {
  color: #15803d;
}

.queue-section-title {
  margin: 0 !important;
  color: #0f172a !important;
}

.queue-section-description {
  display: block;
  margin-top: 3px;
  font-size: 11px;
}

.queue-lock-tag,
.remaining-count-tag {
  flex-shrink: 0;
  margin: 0;
  border-radius: 20px;
  font-weight: 700;
}

.next-patient-card-container {
  display: flex;
  width: 100%;
  flex: 1;
}

.next-patient-card-container > * {
  width: 100%;
}

.remaining-patients-horizontal-list {
  display: flex;
  width: 100%;
  gap: 14px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px 2px 10px;
  scroll-behavior: smooth;
}

.remaining-patient-card-wrapper {
  display: flex;
  width: 210px;
  min-width: 210px;
  flex-shrink: 0;
}

.remaining-patient-card-wrapper > * {
  width: 100%;
}

.remaining-patients-horizontal-list::-webkit-scrollbar {
  height: 7px;
}

.remaining-patients-horizontal-list::-webkit-scrollbar-track {
  border-radius: 20px;
  background: #e2e8f0;
}

.remaining-patients-horizontal-list::-webkit-scrollbar-thumb {
  border-radius: 20px;
  background: #94a3b8;
}

.remaining-queue-empty {
  display: flex;
  min-height: 180px;
  flex: 1;
  align-items: center;
  justify-content: center;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  background: #ffffff;
}

/* Tablet and mobile */

@media (max-width: 991px) {
  .checked-in-horizontal-layout {
    flex-direction: column;
  }

  .next-patient-section {
    width: 100%;
    min-width: 0;
  }

  .remaining-patient-card-wrapper {
    width: 220px;
    min-width: 220px;
  }
}

@media (max-width: 575px) {
  .queue-column-section {
    padding: 14px;
  }

  .queue-section-heading {
    min-height: auto;
    flex-direction: column;
  }

  .queue-lock-tag,
  .remaining-count-tag {
    align-self: flex-start;
  }

  .remaining-patient-card-wrapper {
    width: 190px;
    min-width: 190px;
  }
}
          @media (max-width: 768px) {
            .header-controls {
              width: 100%;
              flex-wrap: wrap;
            }

            .header-date-picker {
              flex: 1;
              min-width: 150px;
            }

            .current-treatment-content {
              align-items: flex-start;
              flex-direction: column;
            }

            .current-treatment-left {
              align-items: flex-start;
            }

            .treatment-pulse-wrapper {
              align-self: flex-start;
            }
          }

          @media (max-width: 480px) {
            .header-date-icon {
              display: none;
            }

            .header-refresh-button
              span:not(.anticon) {
              display: none;
            }

            .summary-card .ant-card-body {
              padding: 14px;
            }

            .summary-card .ant-statistic-content {
              font-size: 21px;
            }

            .current-treatment-card .ant-card-body {
              padding: 16px;
            }

            .current-treatment-icon {
              width: 46px;
              height: 46px;
            }
          }
        `}</style>
      </div>
    </ClinicPage>
  );
};

export default AppointmentMaintenance;
