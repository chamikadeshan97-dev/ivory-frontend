import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  AppstoreOutlined,
  BarsOutlined,
  CalendarFilled,
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import ClinicPage from "../components/ClinicPage";

import {
  endAppointmentWaiting,
  getAllWaitingRecords,
  getAppointmentsByDate,
  getPatients,
  startAppointmentWaiting,
  updateAppointmentStatus,
} from "../api/endPoints";

import "./css/SimpleAppointmentMaintenance.css";

dayjs.extend(customParseFormat);

const { Text, Title } = Typography;

/* ========================================================
   Constants
======================================================== */

const getTodayDate = () => dayjs().format("YYYY-MM-DD");

const READY_PATIENT_STORAGE_PREFIX = "queue-display-ready-patient";

const getReadyPatientStorageKey = (date) =>
  `${READY_PATIENT_STORAGE_PREFIX}:${date}`;

const VIEW_OPTIONS = [
  {
    label: (
      <Space>
        <AppstoreOutlined />
        Full Details
      </Space>
    ),
    value: "full",
  },
  {
    label: (
      <Space>
        <AppstoreOutlined />
        Name, Status & Number
      </Space>
    ),
    value: "summary",
  },
  {
    label: (
      <Space>
        <BarsOutlined />
        Number & Name
      </Space>
    ),
    value: "minimal",
  },
];

const DISTANCE_SORT_OPTIONS = [
  {
    label: "Default Order",
    value: "default",
  },
  {
    label: "Nearest First",
    value: "nearest",
  },
  {
    label: "Farthest First",
    value: "farthest",
  },
];

const FILTER_OPTIONS = [
  {
    label: "All",
    value: "All",
  },
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
    label: "Waiting",
    value: "Waiting",
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

const STATUS_COLORS = {
  Pending: "default",
  Confirmed: "blue",
  "Checked In": "cyan",
  Waiting: "gold",
  "In Treatment": "processing",
  "Treatment Done": "purple",
  "Payment Pending": "orange",
  Paid: "green",
  Completed: "success",
  Cancelled: "error",
};

/* ========================================================
   Helpers
======================================================== */

const extractWaitingRecords = (response) => {
  const responseData = response?.data ?? response;

  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.records)) {
    return responseData.records;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  return [];
};

const extractArray = (response, possibleKeys = []) => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  for (const key of possibleKeys) {
    if (Array.isArray(response?.data?.[key])) {
      return response.data[key];
    }
  }

  return [];
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

const getDateTimeValue = (value, appointmentDate) => {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const textValue = String(value).trim();

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
  }

  return Number.MAX_SAFE_INTEGER;
};

const getAppointmentNumber = (appointment) => {
  const number =
    appointment?.appointment_number ??
    appointment?.queue_number ??
    appointment?.number;

  if (number === undefined || number === null || number === "") {
    return "--";
  }

  return String(number).padStart(2, "0");
};

const getDistanceValue = (appointment) => {
  const rawDistance =
    appointment?.patient_distance_km ??
    appointment?.distance_km ??
    appointment?.distance;

  const parsedDistance = Number.parseFloat(rawDistance);

  return Number.isFinite(parsedDistance) ? parsedDistance : null;
};

const getStatusClassName = (status) => {
  return String(status || "Pending")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
};

const normalizeSearchValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const getWaitingAppointmentId = (record) =>
  String(record?.id ?? record?.appointment_id ?? "").trim();

const isWaitingRecordActive = (record) => {
  const appointmentId = getWaitingAppointmentId(record);

  const endTime = String(record?.end_time ?? "").trim();

  return Boolean(appointmentId && !endTime);
};

/* ========================================================
   Component
======================================================== */

const AppointmentMaintenance = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const [waitingRecords, setWaitingRecords] = useState([]);

  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(false);

  const [updatingId, setUpdatingId] = useState(null);

  const [viewMode, setViewMode] = useState("summary");

  const [distanceSort, setDistanceSort] = useState("default");

  const [statusFilter, setStatusFilter] = useState("All");

  const [searchValue, setSearchValue] = useState("");

  const [lockedNextPatientId, setLockedNextPatientId] = useState(null);

  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState(null);

  /* ========================================================
     Load data
  ======================================================== */

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);

      const [appointmentsResponse, patientsResponse, waitingResponse] =
        await Promise.all([
          getAppointmentsByDate(selectedDate),
          getPatients(),
          getAllWaitingRecords(),
        ]);

      const appointmentList = extractArray(appointmentsResponse, [
        "appointments",
      ]);

      const patientList = extractArray(patientsResponse, ["patients"]);

      const waitingList = extractWaitingRecords(waitingResponse);

      const patientMap = new Map(
        patientList.map((patient) => [String(patient.id), patient]),
      );

      const mergedAppointments = appointmentList.map((appointment) => {
        const patient = patientMap.get(String(appointment.patient_id));

        return {
          ...appointment,

          patient_name:
            appointment.patient_name || patient?.name || "Unknown Patient",

          phone: appointment.phone || patient?.phone || "",

          patient_age: appointment.patient_age ?? patient?.age ?? "",

          patient_location:
            appointment.patient_location ||
            appointment.location ||
            patient?.location ||
            "",

          patient_distance_km:
            appointment.patient_distance_km ??
            appointment.distance_km ??
            appointment.distance ??
            patient?.distance_km ??
            patient?.distance ??
            "",

          patient_gender: appointment.patient_gender || patient?.gender || "",

          patient_address:
            appointment.patient_address || patient?.address || "",

          is_allergies: convertToBoolean(
            appointment.is_allergies ??
              appointment.has_allergies ??
              patient?.is_allergies ??
              patient?.has_allergies,
          ),
        };
      });

      setAppointments(mergedAppointments);

      setWaitingRecords(waitingList);

      setSelectedAppointment((currentAppointment) => {
        if (!currentAppointment) {
          return null;
        }

        return (
          mergedAppointments.find(
            (appointment) =>
              appointment.appointment_id ===
              currentAppointment.appointment_id,
          ) || currentAppointment
        );
      });
    } catch (error) {
      console.error("Failed to load appointments:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load appointments",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  /* ========================================================
     Waiting data
  ======================================================== */

  const activeWaitingRecords = useMemo(() => {
    return waitingRecords.filter(isWaitingRecordActive);
  }, [waitingRecords]);

  const activeWaitingAppointmentIds = useMemo(() => {
    return new Set(
      activeWaitingRecords.map((waitingRecord) =>
        getWaitingAppointmentId(waitingRecord),
      ),
    );
  }, [activeWaitingRecords]);

  const waitingRecordMap = useMemo(() => {
    return new Map(
      activeWaitingRecords.map((waitingRecord) => [
        getWaitingAppointmentId(waitingRecord),
        waitingRecord,
      ]),
    );
  }, [activeWaitingRecords]);

  const isAppointmentWaiting = useCallback(
    (appointment) => {
      const appointmentId = String(
        appointment?.appointment_id ?? appointment?.id ?? "",
      ).trim();

      return Boolean(
        appointmentId && activeWaitingAppointmentIds.has(appointmentId),
      );
    },
    [activeWaitingAppointmentIds],
  );

  const getAppointmentWaitingRecord = useCallback(
    (appointment) => {
      const appointmentId = String(
        appointment?.appointment_id ?? appointment?.id ?? "",
      ).trim();

      return waitingRecordMap.get(appointmentId) || null;
    },
    [waitingRecordMap],
  );

  /* ========================================================
     Queue data
  ======================================================== */

  const currentTreatmentPatient = useMemo(() => {
    return (
      appointments.find(
        (appointment) => appointment.status === "In Treatment",
      ) || null
    );
  }, [appointments]);

  const checkedInAppointments = useMemo(() => {
    return appointments
      .filter(
        (appointment) =>
          appointment.status === "Checked In" &&
          !isAppointmentWaiting(appointment),
      )
      .sort((first, second) => {
        const checkedInDifference =
          getDateTimeValue(
            first.checked_in_time,
            first.appointment_date || selectedDate,
          ) -
          getDateTimeValue(
            second.checked_in_time,
            second.appointment_date || selectedDate,
          );

        if (checkedInDifference !== 0) {
          return checkedInDifference;
        }

        const appointmentDifference =
          getDateTimeValue(
            first.appointment_time,
            first.appointment_date || selectedDate,
          ) -
          getDateTimeValue(
            second.appointment_time,
            second.appointment_date || selectedDate,
          );

        if (appointmentDifference !== 0) {
          return appointmentDifference;
        }

        return (
          Number(first.appointment_number || 0) -
          Number(second.appointment_number || 0)
        );
      });
  }, [appointments, selectedDate, isAppointmentWaiting]);

  const nextCheckedInAppointmentId = useMemo(() => {
    if (checkedInAppointments.length === 0) {
      return null;
    }

    const lockedPatientStillAvailable = checkedInAppointments.some(
      (appointment) => appointment.appointment_id === lockedNextPatientId,
    );

    if (lockedPatientStillAvailable) {
      return lockedNextPatientId;
    }

    return checkedInAppointments[0]?.appointment_id || null;
  }, [checkedInAppointments, lockedNextPatientId]);

  /* ========================================================
     Lock next patient
  ======================================================== */

  useEffect(() => {
    const storageKey = getReadyPatientStorageKey(selectedDate);

    if (checkedInAppointments.length === 0) {
      setLockedNextPatientId(null);

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }

      return;
    }

    const stateLockIsValid = checkedInAppointments.some(
      (appointment) => appointment.appointment_id === lockedNextPatientId,
    );

    let storedPatientId = null;

    if (typeof window !== "undefined") {
      storedPatientId = window.localStorage.getItem(storageKey);
    }

    const storedLockIsValid = checkedInAppointments.some(
      (appointment) => appointment.appointment_id === storedPatientId,
    );

    let effectivePatientId = null;

    if (stateLockIsValid) {
      effectivePatientId = lockedNextPatientId;
    } else if (storedLockIsValid) {
      effectivePatientId = storedPatientId;
    } else {
      effectivePatientId = checkedInAppointments[0]?.appointment_id || null;
    }

    if (effectivePatientId !== lockedNextPatientId) {
      setLockedNextPatientId(effectivePatientId);
    }

    if (typeof window !== "undefined" && effectivePatientId) {
      window.localStorage.setItem(storageKey, effectivePatientId);
    }
  }, [selectedDate, checkedInAppointments, lockedNextPatientId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const storageKey = getReadyPatientStorageKey(selectedDate);

    const handleStorageChange = (event) => {
      if (event.key !== storageKey) {
        return;
      }

      const patientId = event.newValue;

      if (!patientId) {
        setLockedNextPatientId(null);

        return;
      }

      const patientStillAvailable = checkedInAppointments.some(
        (appointment) => appointment.appointment_id === patientId,
      );

      if (patientStillAvailable) {
        setLockedNextPatientId(patientId);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [selectedDate, checkedInAppointments]);

  /* ========================================================
     Waiting actions
  ======================================================== */

  const handleStartWaiting = async (appointment) => {
    if (isAppointmentWaiting(appointment)) {
      message.info("This patient is already waiting.");

      return;
    }

    try {
      setUpdatingId(appointment.appointment_id);

      await startAppointmentWaiting(appointment.appointment_id);

      message.success(
        `${appointment.patient_name || "Patient"} moved to waiting.`,
      );

      await fetchAppointments();
    } catch (error) {
      console.error("Failed to keep patient waiting:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to keep patient waiting.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEndWaiting = async (appointment) => {
    if (!isAppointmentWaiting(appointment)) {
      message.info("This patient is not currently waiting.");

      return;
    }

    try {
      setUpdatingId(appointment.appointment_id);

      await endAppointmentWaiting(appointment.appointment_id);

      message.success(
        `${
          appointment.patient_name || "Patient"
        } returned to the active queue.`,
      );

      await fetchAppointments();
    } catch (error) {
      console.error("Failed to end waiting:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to end the waiting period.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* ========================================================
     Sort cards
  ======================================================== */

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((first, second) => {
      const firstIsCurrent = first.status === "In Treatment";

      const secondIsCurrent = second.status === "In Treatment";

      if (firstIsCurrent && !secondIsCurrent) {
        return -1;
      }

      if (!firstIsCurrent && secondIsCurrent) {
        return 1;
      }

      const firstIsNext =
        first.appointment_id === nextCheckedInAppointmentId;

      const secondIsNext =
        second.appointment_id === nextCheckedInAppointmentId;

      if (firstIsNext && !secondIsNext) {
        return -1;
      }

      if (!firstIsNext && secondIsNext) {
        return 1;
      }

      const firstIsWaiting = isAppointmentWaiting(first);

      const secondIsWaiting = isAppointmentWaiting(second);

      if (firstIsWaiting && !secondIsWaiting) {
        return 1;
      }

      if (!firstIsWaiting && secondIsWaiting) {
        return -1;
      }

      if (distanceSort !== "default") {
        const firstDistance = getDistanceValue(first);

        const secondDistance = getDistanceValue(second);

        const firstHasDistance = firstDistance !== null;

        const secondHasDistance = secondDistance !== null;

        if (firstHasDistance && !secondHasDistance) {
          return -1;
        }

        if (!firstHasDistance && secondHasDistance) {
          return 1;
        }

        if (
          firstHasDistance &&
          secondHasDistance &&
          firstDistance !== secondDistance
        ) {
          return distanceSort === "nearest"
            ? firstDistance - secondDistance
            : secondDistance - firstDistance;
        }
      }

      const timeDifference =
        getDateTimeValue(
          first.appointment_time,
          first.appointment_date || selectedDate,
        ) -
        getDateTimeValue(
          second.appointment_time,
          second.appointment_date || selectedDate,
        );

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return (
        Number(first.appointment_number || 0) -
        Number(second.appointment_number || 0)
      );
    });
  }, [
    appointments,
    selectedDate,
    nextCheckedInAppointmentId,
    isAppointmentWaiting,
    distanceSort,
  ]);

  /* ========================================================
     Filter and search
  ======================================================== */

  const filteredAppointments = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(searchValue);

    return sortedAppointments.filter((appointment) => {
      const isWaitingPatient = isAppointmentWaiting(appointment);

      const effectiveStatus = isWaitingPatient
        ? "Waiting"
        : appointment.status;

      const matchesStatus =
        statusFilter === "All" || effectiveStatus === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const appointmentNumber = getAppointmentNumber(appointment);

      const searchableValues = [
        appointmentNumber,
        appointment.appointment_id,
        appointment.patient_id,
        appointment.patient_name,
        appointment.phone,
        appointment.patient_location,
        appointment.patient_distance_km,
        appointment.reason_for_visit,
        appointment.status,
        effectiveStatus,
        appointment.appointment_time,
      ];

      return searchableValues.some((value) =>
        normalizeSearchValue(value).includes(normalizedSearch),
      );
    });
  }, [
    sortedAppointments,
    statusFilter,
    searchValue,
    isAppointmentWaiting,
  ]);

  const filterCounts = useMemo(() => {
    const counts = {
      All: appointments.length,
      Waiting: activeWaitingAppointmentIds.size,
    };

    FILTER_OPTIONS.forEach((option) => {
      if (["All", "Waiting"].includes(option.value)) {
        return;
      }

      counts[option.value] = appointments.filter(
        (appointment) =>
          appointment.status === option.value &&
          !isAppointmentWaiting(appointment),
      ).length;
    });

    return counts;
  }, [appointments, activeWaitingAppointmentIds, isAppointmentWaiting]);

  const filterOptionsWithCounts = useMemo(() => {
    return FILTER_OPTIONS.map((option) => ({
      value: option.value,

      label: (
        <span className="appointment-filter-option">
          <span>{option.label}</span>

          <span className="appointment-filter-count">
            {filterCounts[option.value] || 0}
          </span>
        </span>
      ),
    }));
  }, [filterCounts]);

  /* ========================================================
     Appointment actions
  ======================================================== */

  const handleCheckIn = async (appointment) => {
    try {
      setUpdatingId(appointment.appointment_id);

      await updateAppointmentStatus(
        appointment.appointment_id,
        "Checked In",
      );

      message.success(
        `${appointment.patient_name || "Patient"} checked in successfully`,
      );

      await fetchAppointments();
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to check in patient",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartTreatment = async (appointment) => {
    if (isAppointmentWaiting(appointment)) {
      message.warning(
        "End the patient's waiting period before starting treatment.",
      );

      return;
    }

    if (
      currentTreatmentPatient &&
      currentTreatmentPatient.appointment_id !==
        appointment.appointment_id
    ) {
      message.warning(
        `${
          currentTreatmentPatient.patient_name || "Another patient"
        } is currently in treatment`,
      );

      return;
    }

    if (appointment.appointment_id !== nextCheckedInAppointmentId) {
      message.warning("This patient is not the locked next patient");

      return;
    }

    try {
      setUpdatingId(appointment.appointment_id);

      await updateAppointmentStatus(
        appointment.appointment_id,
        "In Treatment",
      );

      message.success(
        `Treatment started for ${
          appointment.patient_name || "the patient"
        }`,
      );

      await fetchAppointments();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to start treatment",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* ========================================================
     Drawer
  ======================================================== */

  const openAppointmentDetails = (appointment) => {
    setSelectedAppointment(appointment);

    setDetailsDrawerOpen(true);
  };

  const closeAppointmentDetails = () => {
    setDetailsDrawerOpen(false);
  };

  /* ========================================================
     Ribbon
  ======================================================== */

  const renderCornerRibbon = (
    appointment,
    isCurrentPatient,
    isNextPatient,
    isWaitingPatient,
  ) => {
    let ribbonText = appointment.status || "Pending";

    let ribbonClass = `status-ribbon-${getStatusClassName(
      appointment.status,
    )}`;

    if (isWaitingPatient) {
      ribbonText = "WAITING";
      ribbonClass = "waiting-corner-ribbon";
    } else if (isCurrentPatient) {
      ribbonText = "CURRENT";
      ribbonClass = "current-corner-ribbon";
    } else if (isNextPatient) {
      ribbonText = "NEXT";
      ribbonClass = "next-corner-ribbon";
    }

    return (
      <div className={["left-corner-ribbon", ribbonClass].join(" ")}>
        <span>{ribbonText}</span>
      </div>
    );
  };

  /* ========================================================
     Card actions
  ======================================================== */

  const renderCardAction = (
    appointment,
    isCurrentPatient,
    isNextPatient,
  ) => {
    const isUpdating = updatingId === appointment.appointment_id;

    const isWaitingPatient = isAppointmentWaiting(appointment);

    if (isCurrentPatient || isWaitingPatient) {
      return null;
    }

    if (["Pending", "Confirmed"].includes(appointment.status)) {
      return (
        <Button
          block
          icon={<CheckCircleOutlined />}
          loading={isUpdating}
          disabled={isUpdating}
          className="appointment-card-action check-in-action"
          onClick={(event) => {
            event.stopPropagation();

            handleCheckIn(appointment);
          }}
        >
          Check In Patient
        </Button>
      );
    }

    if (appointment.status === "Checked In" && isNextPatient) {
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
              icon={<ClockCircleOutlined />}
              className="appointment-card-action occupied-action"
              onClick={(event) => event.stopPropagation()}
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
          icon={<PlayCircleOutlined />}
          loading={isUpdating}
          disabled={isUpdating}
          className="appointment-card-action start-treatment-action"
          onClick={(event) => {
            event.stopPropagation();

            handleStartTreatment(appointment);
          }}
        >
          START TREATMENT
        </Button>
      );
    }

    return null;
  };

  const renderWaitingActionButton = (appointment) => {
    const isUpdating = updatingId === appointment.appointment_id;

    const isWaitingPatient = isAppointmentWaiting(appointment);

    const canUseWaiting = appointment.status === "Checked In";

    if (!canUseWaiting) {
      return null;
    }

    if (isWaitingPatient) {
      return (
        <Button
          block
          size="small"
          type="primary"
          icon={<CheckCircleOutlined />}
          loading={isUpdating}
          disabled={isUpdating}
          className="appointment-card-action end-waiting-button"
          onClick={(event) => {
            event.stopPropagation();

            handleEndWaiting(appointment);
          }}
        >
          END WAITING
        </Button>
      );
    }

    return (
      <Button
        block
        size="small"
        icon={<ClockCircleOutlined />}
        loading={isUpdating}
        disabled={isUpdating}
        className="appointment-card-action keep-waiting-button"
        onClick={(event) => {
          event.stopPropagation();

          handleStartWaiting(appointment);
        }}
      >
        KEEP WAITING
      </Button>
    );
  };

  /* ========================================================
     Completed card
  ======================================================== */

  const renderCompletedCard = (
    appointment,
    appointmentNumber,
    view,
  ) => {
    const isMinimal = view === "minimal";

    return (
      <div
        className={[
          "completed-card-content",
          isMinimal ? "completed-card-content-minimal" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="completed-number-badge">
          No. {appointmentNumber}
        </div>

        <div className="completed-icon-wrapper">
          <CheckCircleFilled />
        </div>

        <Text className="completed-card-title">Completed</Text>

        {!isMinimal && (
          <Text className="completed-card-message">
            Patient visit completed successfully
          </Text>
        )}

        <div className="completed-divider" />

        <Text className="completed-patient-name">
          {appointment.patient_name || "Unknown Patient"}
        </Text>
      </div>
    );
  };

  /* ========================================================
     Waiting notice
  ======================================================== */

  const renderWaitingNotice = (appointment, compact = false) => {
    const waitingRecord = getAppointmentWaitingRecord(appointment);

    if (!waitingRecord) {
      return null;
    }

    return (
      <div
        className={[
          "waiting-patient-notice",
          compact ? "waiting-patient-notice-compact" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <ClockCircleOutlined />

        <div>
          <Text className="waiting-patient-notice-title">
            Patient is waiting
          </Text>

          <Text className="waiting-patient-notice-description">
            Since {formatTime(waitingRecord.start_time)}
          </Text>
        </div>
      </div>
    );
  };

  /* ========================================================
     Render card
  ======================================================== */

  const renderAppointmentCard = (appointment) => {
    const appointmentNumber = getAppointmentNumber(appointment);

    const isCurrentPatient = appointment.status === "In Treatment";

    const isWaitingPatient = isAppointmentWaiting(appointment);

    const isNextPatient =
      !isWaitingPatient &&
      appointment.appointment_id === nextCheckedInAppointmentId;

    const isCompleted = appointment.status === "Completed";

    const actionContent = renderCardAction(
      appointment,
      isCurrentPatient,
      isNextPatient,
    );

    const waitingAction = renderWaitingActionButton(appointment);

    const hasActions = actionContent || waitingAction;

    const cardClasses = [
      "appointment-number-card",

      isCurrentPatient ? "current-treatment-card" : "",

      isNextPatient ? "next-patient-card" : "",

      isWaitingPatient ? "waiting-patient-card" : "",

      appointment.is_allergies ? "allergy-card" : "",

      isCompleted ? "completed-card" : "",

      appointment.status === "Cancelled" ? "cancelled-card" : "",
    ]
      .filter(Boolean)
      .join(" ");

    if (viewMode === "minimal") {
      return (
        <article
          key={appointment.appointment_id}
          role="button"
          tabIndex={0}
          className={`${cardClasses} minimal-appointment-card`}
          onClick={() => openAppointmentDetails(appointment)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();

              openAppointmentDetails(appointment);
            }
          }}
        >
          {renderCornerRibbon(
            appointment,
            isCurrentPatient,
            isNextPatient,
            isWaitingPatient,
          )}

          {isCompleted ? (
            renderCompletedCard(
              appointment,
              appointmentNumber,
              "minimal",
            )
          ) : (
            <>
              <div className="minimal-number-center">
                <div className="minimal-number-square">
                  {appointmentNumber}
                </div>
              </div>

              {isWaitingPatient && (
                <div className="minimal-waiting-label">
                  <ClockCircleOutlined />

                  <span>Waiting</span>
                </div>
              )}

              <Text className="minimal-patient-name">
                {appointment.patient_name || "Unknown Patient"}
              </Text>

              {appointment.patient_location && (
                <Text className="appointment-location">
                  <EnvironmentOutlined />

                  {appointment.patient_location}

                  {appointment.patient_distance_km !== "" &&
                    appointment.patient_distance_km !== null &&
                    appointment.patient_distance_km !== undefined && (
                      <span>
                        {" "}
                        · {appointment.patient_distance_km} km
                      </span>
                    )}
                </Text>
              )}

              {hasActions && (
                <div className="minimal-action-section">
                  <Space
                    direction="vertical"
                    size={6}
                    className="appointment-card-actions"
                  >
                    {actionContent}

                    {waitingAction}
                  </Space>
                </div>
              )}
            </>
          )}
        </article>
      );
    }

    if (viewMode === "summary") {
      return (
        <article
          key={appointment.appointment_id}
          role="button"
          tabIndex={0}
          className={`${cardClasses} summary-appointment-card`}
          onClick={() => openAppointmentDetails(appointment)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();

              openAppointmentDetails(appointment);
            }
          }}
        >
          {renderCornerRibbon(
            appointment,
            isCurrentPatient,
            isNextPatient,
            isWaitingPatient,
          )}

          {isCompleted ? (
            renderCompletedCard(
              appointment,
              appointmentNumber,
              "summary",
            )
          ) : (
            <>
              <div className="summary-card-header">
                <div className="summary-number-center">
                  <div className="summary-number-square">
                    {appointmentNumber}
                  </div>
                </div>
              </div>

              {isWaitingPatient &&
                renderWaitingNotice(appointment, true)}

              <div className="summary-patient-section">
                <div className="summary-patient-avatar">
                  <UserOutlined />
                </div>

                <div className="summary-patient-information">
                  <Tooltip
                    title={
                      appointment.patient_name || "Unknown Patient"
                    }
                  >
                    <Text className="summary-patient-name">
                      {appointment.patient_name || "Unknown Patient"}
                    </Text>
                  </Tooltip>

                  {appointment.phone && (
                    <Text className="summary-patient-phone">
                      <PhoneOutlined />

                      {appointment.phone}
                    </Text>
                  )}

                  {appointment.patient_location && (
                    <Text className="summary-patient-location">
                      <EnvironmentOutlined />

                      {appointment.patient_location}

                      {appointment.patient_distance_km !== "" &&
                        appointment.patient_distance_km !== null &&
                        appointment.patient_distance_km !== undefined && (
                          <span>
                            {" "}
                            · {appointment.patient_distance_km} km
                          </span>
                        )}
                    </Text>
                  )}
                </div>
              </div>

              {hasActions && (
                <div className="summary-action-section">
                  <Space
                    direction="vertical"
                    size={8}
                    className="appointment-card-actions"
                  >
                    {actionContent}

                    {waitingAction}
                  </Space>
                </div>
              )}
            </>
          )}
        </article>
      );
    }

    return (
      <article
        key={appointment.appointment_id}
        role="button"
        tabIndex={0}
        className={`${cardClasses} full-appointment-card`}
        onClick={() => openAppointmentDetails(appointment)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();

            openAppointmentDetails(appointment);
          }
        }}
      >
        {renderCornerRibbon(
          appointment,
          isCurrentPatient,
          isNextPatient,
          isWaitingPatient,
        )}

        {isCompleted ? (
          renderCompletedCard(
            appointment,
            appointmentNumber,
            "full",
          )
        ) : (
          <>
            <div className="appointment-card-top">
              <div className="appointment-number-center">
                <div className="appointment-number-square">
                  {appointmentNumber}
                </div>
              </div>
            </div>

            <div className="appointment-patient">
              <div className="appointment-avatar">
                <UserOutlined />
              </div>

              <div className="appointment-patient-details">
                <Text className="appointment-patient-name">
                  {appointment.patient_name || "Unknown Patient"}
                </Text>

                {appointment.phone && (
                  <Text className="appointment-phone">
                    <PhoneOutlined />

                    {appointment.phone}
                  </Text>
                )}

                {appointment.patient_location && (
                  <Text className="appointment-location">
                    <EnvironmentOutlined />

                    {appointment.patient_location}

                    {appointment.patient_distance_km !== "" &&
                      appointment.patient_distance_km !== null &&
                      appointment.patient_distance_km !== undefined && (
                        <span>
                          {" "}
                          · {appointment.patient_distance_km} km
                        </span>
                      )}
                  </Text>
                )}
              </div>
            </div>

            {isWaitingPatient && renderWaitingNotice(appointment)}

            <div className="appointment-details-box">
              <div className="appointment-detail-row">
                <ClockCircleOutlined />

                <div>
                  <Text className="detail-label">
                    Appointment Time
                  </Text>

                  <Text className="detail-value">
                    {formatTime(appointment.appointment_time)}
                  </Text>
                </div>
              </div>

              <div className="appointment-detail-row">
                <MedicineBoxOutlined />

                <div>
                  <Text className="detail-label">Reason</Text>

                  <Text className="appointment-reason">
                    {appointment.reason_for_visit ||
                      "General consultation"}
                  </Text>
                </div>
              </div>
            </div>

            {hasActions && (
              <div className="appointment-action-section">
                <Space
                  direction="vertical"
                  size={8}
                  className="appointment-card-actions"
                >
                  {actionContent}

                  {waitingAction}
                </Space>
              </div>
            )}
          </>
        )}
      </article>
    );
  };

  /* ========================================================
     Selected appointment
  ======================================================== */

  const selectedAppointmentNumber = selectedAppointment
    ? getAppointmentNumber(selectedAppointment)
    : "--";

  const selectedIsCurrent =
    selectedAppointment?.status === "In Treatment";

  const selectedIsWaiting = selectedAppointment
    ? isAppointmentWaiting(selectedAppointment)
    : false;

  const selectedIsNext = Boolean(
    selectedAppointment &&
      !selectedIsWaiting &&
      selectedAppointment.appointment_id ===
        nextCheckedInAppointmentId,
  );

  const selectedAction = selectedAppointment
    ? renderCardAction(
        selectedAppointment,
        selectedIsCurrent,
        selectedIsNext,
      )
    : null;

  const selectedWaitingAction = selectedAppointment
    ? renderWaitingActionButton(selectedAppointment)
    : null;

  const selectedWaitingRecord = selectedAppointment
    ? getAppointmentWaitingRecord(selectedAppointment)
    : null;

  const selectedEffectiveStatus = selectedIsWaiting
    ? "Waiting"
    : selectedAppointment?.status;

  /* ========================================================
     Page
  ======================================================== */

  return (
    <ClinicPage
      title="Appointment Maintenance"
      subtitle="Manage daily appointments using simple appointment number cards."
      icon={<CalendarFilled />}
      actions={
        <div className="appointment-header-controls">
          <DatePicker
            allowClear={false}
            value={dayjs(selectedDate)}
            format="YYYY-MM-DD"
            className="appointment-date-picker"
            onChange={(date) =>
              setSelectedDate(
                date ? date.format("YYYY-MM-DD") : getTodayDate(),
              )
            }
          />

          <Tooltip title="Refresh appointments">
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={fetchAppointments}
              className="appointment-refresh-button"
            />
          </Tooltip>

          <Select
            value={viewMode}
            options={VIEW_OPTIONS}
            onChange={setViewMode}
            popupMatchSelectWidth={false}
            className="appointment-view-select"
          />
        </div>
      }
    >
      <div className="appointment-maintenance-page">
        <section className="appointment-cards-section">
          <div className="appointment-section-heading">
            <div>
              <Text className="appointment-section-eyebrow">
                Daily Appointments
              </Text>

              <Title
                level={4}
                className="appointment-section-title"
              >
                Appointment Number Cards
              </Title>

              <Text className="appointment-selected-date">
                {dayjs(selectedDate).format("DD MMMM YYYY")}
              </Text>
            </div>

            <Tag className="appointment-count-tag">
              {filteredAppointments.length}
              {" of "}
              {appointments.length}
              {" appointments"}
            </Tag>
          </div>

          <div className="appointment-toolbar">
            <div className="appointment-search-wrapper">
              <Input
                allowClear
                value={searchValue}
                prefix={<SearchOutlined />}
                placeholder="Search number, patient, phone or reason"
                className="appointment-search-input"
                onChange={(event) =>
                  setSearchValue(event.target.value)
                }
              />
            </div>

            <Select
              value={distanceSort}
              options={DISTANCE_SORT_OPTIONS}
              onChange={setDistanceSort}
              popupMatchSelectWidth={false}
              suffixIcon={<EnvironmentOutlined />}
              className="appointment-distance-sort"
              style={{
                minWidth: 180,
              }}
            />

            <div className="appointment-filter-scroll">
              <Segmented
                value={statusFilter}
                options={filterOptionsWithCounts}
                className="appointment-status-filter"
                onChange={setStatusFilter}
              />
            </div>
          </div>

          <Spin spinning={loading}>
            {filteredAppointments.length === 0 ? (
              <div className="appointments-empty">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    searchValue || statusFilter !== "All"
                      ? "No appointments match the selected filters"
                      : "No appointments found for the selected date"
                  }
                />

                {(searchValue || statusFilter !== "All") && (
                  <Button
                    type="link"
                    onClick={() => {
                      setSearchValue("");

                      setStatusFilter("All");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div
                className={`appointment-card-layout view-${viewMode}`}
              >
                {filteredAppointments.map(renderAppointmentCard)}
              </div>
            )}
          </Spin>
        </section>

        <Drawer
          open={detailsDrawerOpen}
          width={470}
          placement="right"
          destroyOnClose
          className="appointment-details-drawer"
          closeIcon={<CloseOutlined />}
          title={
            <div className="drawer-title-content">
              <div className="drawer-title-icon">
                <CalendarFilled />
              </div>

              <div>
                <Text className="drawer-title-eyebrow">
                  Appointment Details
                </Text>

                <Title level={5} className="drawer-title">
                  Number {selectedAppointmentNumber}
                </Title>
              </div>
            </div>
          }
          onClose={closeAppointmentDetails}
        >
          {selectedAppointment && (
            <div className="drawer-appointment-content">
              <div
                className={[
                  "drawer-appointment-hero",

                  selectedAppointment.is_allergies
                    ? "drawer-allergy-hero"
                    : "",

                  selectedAppointment.status === "Completed"
                    ? "drawer-completed-hero"
                    : "",

                  selectedIsWaiting ? "drawer-waiting-hero" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="drawer-number-square">
                  {selectedAppointmentNumber}
                </div>

                <div className="drawer-patient-main">
                  <Text className="drawer-patient-name">
                    {selectedAppointment.patient_name ||
                      "Unknown Patient"}
                  </Text>

                  <Tag
                    color={
                      STATUS_COLORS[selectedEffectiveStatus] ||
                      "default"
                    }
                    className="drawer-status-tag"
                  >
                    {selectedEffectiveStatus || "Pending"}
                  </Tag>
                </div>
              </div>

              {selectedIsWaiting && (
                <div className="drawer-waiting-message">
                  <ClockCircleOutlined />

                  <div>
                    <Text className="drawer-waiting-title">
                      Patient is currently waiting
                    </Text>

                    <Text className="drawer-waiting-description">
                      Waiting started at{" "}
                      {formatTime(
                        selectedWaitingRecord?.start_time,
                      )}
                    </Text>
                  </div>
                </div>
              )}

              <Descriptions
                bordered
                column={1}
                size="small"
                className="appointment-drawer-descriptions"
              >
                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <IdcardOutlined />
                      Appointment ID
                    </Space>
                  }
                >
                  {selectedAppointment.appointment_id || "-"}
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <UserOutlined />
                      Patient ID
                    </Space>
                  }
                >
                  {selectedAppointment.patient_id || "-"}
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <PhoneOutlined />
                      Phone
                    </Space>
                  }
                >
                  {selectedAppointment.phone || "-"}
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <EnvironmentOutlined />
                      Location
                    </Space>
                  }
                >
                  {selectedAppointment.patient_location || "-"}
                </Descriptions.Item>

                <Descriptions.Item label="Distance">
                  {selectedAppointment.patient_distance_km !== "" &&
                  selectedAppointment.patient_distance_km !== null &&
                  selectedAppointment.patient_distance_km !==
                    undefined
                    ? `${selectedAppointment.patient_distance_km} km`
                    : "-"}
                </Descriptions.Item>

                <Descriptions.Item label="Age">
                  {selectedAppointment.patient_age || "-"}
                </Descriptions.Item>

                <Descriptions.Item label="Gender">
                  {selectedAppointment.patient_gender || "-"}
                </Descriptions.Item>

                <Descriptions.Item label="Address">
                  {selectedAppointment.patient_address || "-"}
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <CalendarFilled />
                      Date
                    </Space>
                  }
                >
                  {selectedAppointment.appointment_date
                    ? dayjs(
                        selectedAppointment.appointment_date,
                      ).format("DD MMMM YYYY")
                    : dayjs(selectedDate).format(
                        "DD MMMM YYYY",
                      )}
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <ClockCircleOutlined />
                      Time
                    </Space>
                  }
                >
                  {formatTime(
                    selectedAppointment.appointment_time,
                  )}
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <MedicineBoxOutlined />
                      Reason
                    </Space>
                  }
                >
                  {selectedAppointment.reason_for_visit ||
                    "General consultation"}
                </Descriptions.Item>

                {selectedAppointment.checked_in_time && (
                  <Descriptions.Item label="Checked-In Time">
                    {formatTime(
                      selectedAppointment.checked_in_time,
                    )}
                  </Descriptions.Item>
                )}

                {selectedWaitingRecord?.start_time && (
                  <Descriptions.Item label="Waiting Started">
                    {formatTime(
                      selectedWaitingRecord.start_time,
                    )}
                  </Descriptions.Item>
                )}
              </Descriptions>

              {selectedAppointment.status === "Completed" && (
                <div className="drawer-completed-message">
                  <CheckCircleFilled />

                  <div>
                    <Text className="drawer-completed-title">
                      Visit Completed
                    </Text>

                    <Text className="drawer-completed-description">
                      This appointment has been successfully
                      completed.
                    </Text>
                  </div>
                </div>
              )}

              {(selectedAction || selectedWaitingAction) && (
                <div className="drawer-action-section">
                  <Space
                    direction="vertical"
                    size={8}
                    className="appointment-card-actions"
                  >
                    {selectedAction}

                    {selectedWaitingAction}
                  </Space>
                </div>
              )}
            </div>
          )}
        </Drawer>
      </div>
    </ClinicPage>
  );
};

export default AppointmentMaintenance;