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
  Modal,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
  Alert,
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
  checkInAppointmentToQueue,
  endAppointmentWaiting,
  getAllWaitingRecords,
  getAppointmentsByDate,
  getPatients,
  reassignAppointmentNumber,
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
const LOCKED_PATIENT_COUNT = 2;

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
  {
    label: "Rows",
    value: "row",
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
const normalizeStatus = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};
/* ========================================================
   Component
======================================================== */
const getAppointmentId = (appointment) => {
  return appointment?.appointment_id || appointment?.id || "";
};
const AppointmentMaintenance = () => {
  const [reassignModalOpen, setReassignModalOpen] = useState(false);

  const [reassignSourceAppointment, setReassignSourceAppointment] =
    useState(null);

  const [reassignTargetAppointmentId, setReassignTargetAppointmentId] =
    useState(null);

  const [reassigningNumber, setReassigningNumber] = useState(false);

  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const [waitingRecords, setWaitingRecords] = useState([]);

  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(false);

  const [updatingId, setUpdatingId] = useState(null);

  const [viewMode, setViewMode] = useState("minimal");

  const [distanceSort, setDistanceSort] = useState("default");

  const [statusFilter, setStatusFilter] = useState("All");

  const [searchValue, setSearchValue] = useState("");

  const [lockedNextPatientIds, setLockedNextPatientIds] = useState([]);

  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const selectedDatePickerValue = useMemo(() => {
    const parsedDate = dayjs(selectedDate, "YYYY-MM-DD", true);

    return parsedDate.isValid() ? parsedDate : dayjs();
  }, [selectedDate]);
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
              appointment.appointment_id === currentAppointment.appointment_id,
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
  const handleCheckInCancelledAppointment = async (appointment) => {
    const appointmentId = getAppointmentId(appointment);

    if (!appointmentId) {
      message.error("Appointment ID is missing");
      return;
    }

    try {
      setUpdatingId(appointmentId);

      await updateAppointmentStatus(appointmentId, "Checked In");

      message.success(
        `${appointment.patient_name || "Patient"} checked in again as No. ${getAppointmentNumber(
          appointment,
        )}`,
      );

      await fetchAppointments();
    } catch (error) {
      console.error("Failed to check in cancelled appointment:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to check in appointment",
      );
    } finally {
      setUpdatingId(null);
    }
  };
  const handleOpenReassignNumber = (appointment) => {
    setReassignSourceAppointment(appointment);
    setReassignTargetAppointmentId(null);
    setReassignModalOpen(true);
  };
  const reassignableAppointments = useMemo(() => {
    if (!reassignSourceAppointment) {
      return [];
    }

    const sourceId = String(getAppointmentId(reassignSourceAppointment));

    return appointments.filter((appointment) => {
      const appointmentId = String(getAppointmentId(appointment));

      if (!appointmentId || appointmentId === sourceId) {
        return false;
      }

      return ["Pending", "Confirmed", "Checked In"].includes(
        appointment.status,
      );
    });
  }, [appointments, reassignSourceAppointment]);
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
  const lockedCheckedInAppointmentIds = useMemo(() => {
    const availableIds = new Set(
      checkedInAppointments.map((appointment) =>
        String(appointment.appointment_id),
      ),
    );

    const validLockedIds = lockedNextPatientIds.filter((appointmentId) =>
      availableIds.has(String(appointmentId)),
    );

    const remainingIds = checkedInAppointments
      .map((appointment) => String(appointment.appointment_id))
      .filter((appointmentId) => !validLockedIds.includes(appointmentId));

    return [...validLockedIds, ...remainingIds].slice(0, LOCKED_PATIENT_COUNT);
  }, [checkedInAppointments, lockedNextPatientIds]);

  const firstLockedAppointmentId = lockedCheckedInAppointmentIds[0] || null;

  const handleReassignAppointmentNumber = async () => {
    if (!reassignSourceAppointment) {
      message.error("Cancelled appointment is missing");
      return;
    }

    if (!reassignTargetAppointmentId) {
      message.warning("Please select another appointment");
      return;
    }

    const sourceId = getAppointmentId(reassignSourceAppointment);

    try {
      setReassigningNumber(true);

      await reassignAppointmentNumber(sourceId, reassignTargetAppointmentId);

      message.success(
        `Appointment No. ${getAppointmentNumber(
          reassignSourceAppointment,
        )} reassigned successfully`,
      );

      setReassignModalOpen(false);
      setReassignSourceAppointment(null);
      setReassignTargetAppointmentId(null);

      await fetchAppointments();
    } catch (error) {
      console.error("Failed to reassign appointment number:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to reassign appointment number",
      );
    } finally {
      setReassigningNumber(false);
    }
  };

  useEffect(() => {
    const storageKey = getReadyPatientStorageKey(selectedDate);

    const availableIds = checkedInAppointments
      .map((appointment) => String(appointment.appointment_id || ""))
      .filter(Boolean);

    if (availableIds.length === 0) {
      setLockedNextPatientIds((currentIds) => {
        if (currentIds.length === 0) {
          return currentIds;
        }

        return [];
      });

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }

      return;
    }

    let storedIds = [];

    if (typeof window !== "undefined") {
      try {
        const storedValue = window.localStorage.getItem(storageKey);

        const parsedValue = storedValue ? JSON.parse(storedValue) : [];

        storedIds = Array.isArray(parsedValue) ? parsedValue.map(String) : [];
      } catch {
        storedIds = [];
      }
    }

    setLockedNextPatientIds((currentIds) => {
      const validCurrentIds = currentIds.filter((appointmentId) =>
        availableIds.includes(String(appointmentId)),
      );

      const validStoredIds = storedIds.filter((appointmentId) =>
        availableIds.includes(String(appointmentId)),
      );

      const preservedIds =
        validCurrentIds.length > 0 ? validCurrentIds : validStoredIds;

      const additionalIds = availableIds.filter(
        (appointmentId) => !preservedIds.includes(appointmentId),
      );

      const nextLockedIds = [...preservedIds, ...additionalIds].slice(
        0,
        LOCKED_PATIENT_COUNT,
      );

      const hasChanged =
        nextLockedIds.length !== currentIds.length ||
        nextLockedIds.some(
          (appointmentId, index) =>
            String(appointmentId) !== String(currentIds[index]),
        );

      if (!hasChanged) {
        return currentIds;
      }

      return nextLockedIds;
    });
  }, [selectedDate, checkedInAppointments]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storageKey = getReadyPatientStorageKey(selectedDate);

    if (lockedNextPatientIds.length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(lockedNextPatientIds),
    );
  }, [selectedDate, lockedNextPatientIds]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const storageKey = getReadyPatientStorageKey(selectedDate);

    const handleStorageChange = (event) => {
      if (event.key !== storageKey) {
        return;
      }

      if (!event.newValue) {
        setLockedNextPatientIds([]);
        return;
      }

      try {
        const parsedValue = JSON.parse(event.newValue);

        const storedIds = Array.isArray(parsedValue)
          ? parsedValue.map(String)
          : [];

        const availableIds = new Set(
          checkedInAppointments.map((appointment) =>
            String(appointment.appointment_id),
          ),
        );

        const validIds = storedIds
          .filter((appointmentId) => availableIds.has(appointmentId))
          .slice(0, LOCKED_PATIENT_COUNT);

        setLockedNextPatientIds(validIds);
      } catch (error) {
        console.error("Failed to sync locked queue patients:", error);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [selectedDate, checkedInAppointments]);
  const availableReassignAppointments = useMemo(() => {
    if (!reassignSourceAppointment) {
      return [];
    }

    const sourceNumber = Number(
      getAppointmentNumber(reassignSourceAppointment),
    );

    const sourceDate =
      reassignSourceAppointment?.appointment_date ||
      reassignSourceAppointment?.date;

    if (!Number.isFinite(sourceNumber)) {
      return [];
    }

    return reassignableAppointments
      .filter((appointment) => {
        const appointmentNumber = Number(getAppointmentNumber(appointment));

        const appointmentDate =
          appointment?.appointment_date || appointment?.date;

        const status = normalizeStatus(appointment?.status);

        return (
          appointmentDate === sourceDate &&
          Number.isFinite(appointmentNumber) &&
          appointmentNumber > sourceNumber &&
          status !== "cancelled" &&
          status !== "canceled"
        );
      })
      .sort(
        (first, second) =>
          Number(getAppointmentNumber(first)) -
          Number(getAppointmentNumber(second)),
      );
  }, [reassignableAppointments, reassignSourceAppointment]);
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

      const firstLockedIndex = lockedCheckedInAppointmentIds.indexOf(
        String(first.appointment_id),
      );

      const secondLockedIndex = lockedCheckedInAppointmentIds.indexOf(
        String(second.appointment_id),
      );

      const firstIsLocked = firstLockedIndex !== -1;
      const secondIsLocked = secondLockedIndex !== -1;

      if (firstIsLocked && !secondIsLocked) {
        return -1;
      }

      if (!firstIsLocked && secondIsLocked) {
        return 1;
      }

      if (firstIsLocked && secondIsLocked) {
        return firstLockedIndex - secondLockedIndex;
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
    lockedCheckedInAppointmentIds,
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

      const effectiveStatus = isWaitingPatient ? "Waiting" : appointment.status;

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
  }, [sortedAppointments, statusFilter, searchValue, isAppointmentWaiting]);

  /* ========================================================
   Separate waiting patients
======================================================== */

  const waitingAppointments = useMemo(() => {
    return sortedAppointments.filter((appointment) =>
      isAppointmentWaiting(appointment),
    );
  }, [sortedAppointments, isAppointmentWaiting]);

  /* ========================================================
   Main appointments without waiting patients
======================================================== */

  const mainFilteredAppointments = useMemo(() => {
    return filteredAppointments.filter(
      (appointment) => !isAppointmentWaiting(appointment),
    );
  }, [filteredAppointments, isAppointmentWaiting]);
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
    const appointmentId = appointment?.appointment_id || appointment?.id || "";

    if (!appointmentId) {
      message.error("Appointment ID is missing");
      return;
    }

    try {
      setUpdatingId(appointmentId);
      await updateAppointmentStatus(appointment.appointment_id, "Checked In");

      message.success(
        `${appointment.patient_name || "Patient"} checked in successfully`,
      );

      setAppointments((previous) =>
        previous.map((item) =>
          String(item?.appointment_id || item?.id) === String(appointmentId)
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
      setUpdatingId(null);
    }
  };
  const handleCancelAppointment = async (appointment) => {
    const appointmentId = getAppointmentId(appointment);

    if (!appointmentId) {
      message.error("Appointment ID is missing");
      return;
    }

    try {
      setUpdatingId(appointmentId);

      await updateAppointmentStatus(appointmentId, "Cancelled");

      message.success(
        `${appointment.patient_name || "Patient"} appointment cancelled`,
      );

      setAppointments((previous) =>
        previous.map((item) =>
          String(getAppointmentId(item)) === String(appointmentId)
            ? {
                ...item,
                status: "Cancelled",
              }
            : item,
        ),
      );

      // Update drawer data too if this appointment is currently open
      setSelectedAppointment((current) => {
        if (
          current &&
          String(getAppointmentId(current)) === String(appointmentId)
        ) {
          return {
            ...current,
            status: "Cancelled",
          };
        }

        return current;
      });
    } catch (error) {
      console.error("Failed to cancel appointment:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to cancel appointment",
      );
    } finally {
      setUpdatingId(null);
    }
  };
  const handleStartTreatment = async (appointment) => {
    const isWaitingPatient = isAppointmentWaiting(appointment);

    if (
      currentTreatmentPatient &&
      currentTreatmentPatient.appointment_id !== appointment.appointment_id
    ) {
      message.warning(
        `${
          currentTreatmentPatient.patient_name || "Another patient"
        } is currently in treatment`,
      );

      return;
    }

    /*
     * Normal checked-in patients must be the locked next patient.
     * Waiting patients can start treatment at any time.
     */
    if (
      !isWaitingPatient &&
      String(appointment.appointment_id) !== String(firstLockedAppointmentId)
    ) {
      message.warning("Only the first locked patient can start treatment");

      return;
    }
    try {
      setUpdatingId(appointment.appointment_id);

      /*
       * Close the active waiting record before starting treatment.
       */
      if (isWaitingPatient) {
        await endAppointmentWaiting(appointment.appointment_id);
      }

      await updateAppointmentStatus(appointment.appointment_id, "In Treatment");

      message.success(
        `Treatment started for ${appointment.patient_name || "the patient"}`,
      );

      await fetchAppointments();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Failed to start treatment:", error);

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
    lockedPosition,
    isWaitingPatient,
  ) => {
    let ribbonText = appointment.status || "Pending";

    let ribbonClass = `status-ribbon-${getStatusClassName(appointment.status)}`;

    if (isWaitingPatient) {
      ribbonText = "WAITING";
      ribbonClass = "waiting-corner-ribbon";
    } else if (isCurrentPatient) {
      ribbonText = "CURRENT";
      ribbonClass = "current-corner-ribbon";
    } else if (lockedPosition === 0) {
      ribbonText = "NEXT 1";
      ribbonClass = "next-corner-ribbon";
    } else if (lockedPosition === 1) {
      ribbonText = "NEXT 2";
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
    isFirstLockedPatient,
  ) => {
    const appointmentId = getAppointmentId(appointment);

    const isUpdating = String(updatingId || "") === String(appointmentId || "");

    const isWaitingPatient = isAppointmentWaiting(appointment);

    if (isCurrentPatient) {
      return null;
    }
    /*
     * ======================================================
     * CANCELLED
     * Restore or reuse appointment number
     * ======================================================
     */
    if (appointment.status === "Cancelled") {
      return (
        <div className="cancelled-appointment-actions">
          <Button
            block
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={isUpdating}
            disabled={isUpdating}
            className="appointment-card-action check-in-action"
            onClick={(event) => {
              event.stopPropagation();

              handleCheckInCancelledAppointment(appointment);
            }}
          >
            Check In Again
          </Button>

          <Button
            block
            icon={<IdcardOutlined />}
            disabled={isUpdating}
            className="appointment-card-action reassign-number-action"
            onClick={(event) => {
              event.stopPropagation();

              handleOpenReassignNumber(appointment);
            }}
          >
            Assign No. {getAppointmentNumber(appointment)}
          </Button>
        </div>
      );
    }
    /*
     * ======================================================
     * PENDING
     * Check In + Cancel Appointment
     * ======================================================
     */
    if (appointment.status === "Pending" && !isWaitingPatient) {
      return (
        <div className="pending-appointment-actions">
          <Button
            block
            type="primary"
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

          <Button
            block
            danger
            icon={<CloseOutlined />}
            loading={isUpdating}
            disabled={isUpdating}
            className="appointment-card-action cancel-appointment-action"
            onClick={(event) => {
              event.stopPropagation();

              handleCancelAppointment(appointment);
            }}
          >
            Cancel Appointment
          </Button>
        </div>
      );
    }

    /*
     * ======================================================
     * CONFIRMED
     * Check In only
     * ======================================================
     */
    if (appointment.status === "Confirmed" && !isWaitingPatient) {
      return (
        <Button
          block
          type="primary"
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

    /*
     * ======================================================
     * START TREATMENT
     * ======================================================
     *
     * Waiting patient:
     * Can start treatment at any time.
     *
     * Normal checked-in patient:
     * Must be the first locked patient.
     */
    const canStartTreatment =
      appointment.status === "Checked In" &&
      (isWaitingPatient || isFirstLockedPatient);

    if (canStartTreatment && !currentTreatmentPatient) {
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
          {isWaitingPatient ? "START TREATMENT NOW" : "START TREATMENT"}
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

  const renderCompletedCard = (appointment, appointmentNumber, view) => {
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
        <div className="completed-number-badge">No. {appointmentNumber}</div>

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

    const lockedPosition = lockedCheckedInAppointmentIds.indexOf(
      String(appointment.appointment_id),
    );

    const isLockedPatient = !isWaitingPatient && lockedPosition !== -1;

    const isFirstLockedPatient = isLockedPatient && lockedPosition === 0;

    const isCompleted = appointment.status === "Completed";

    const actionContent = renderCardAction(
      appointment,
      isCurrentPatient,
      isFirstLockedPatient,
    );

    const waitingAction = renderWaitingActionButton(appointment);

    const hasActions = actionContent || waitingAction;

    const cardClasses = [
      "appointment-number-card",

      isCurrentPatient ? "current-treatment-card" : "",

      isLockedPatient ? "next-patient-card" : "",
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
            lockedPosition,
            isWaitingPatient,
          )}

          {isCompleted ? (
            renderCompletedCard(appointment, appointmentNumber, "minimal")
          ) : (
            <>
              <div className="minimal-number-center">
                <div className="minimal-number-square">{appointmentNumber}</div>
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
                      <span> · {appointment.patient_distance_km} km</span>
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
            lockedPosition,
            isWaitingPatient,
          )}

          {isCompleted ? (
            renderCompletedCard(appointment, appointmentNumber, "summary")
          ) : (
            <>
              <div className="summary-card-header">
                <div className="summary-number-center">
                  <div className="summary-number-square">
                    {appointmentNumber}
                  </div>
                </div>
              </div>

              {isWaitingPatient && renderWaitingNotice(appointment, true)}

              <div className="summary-patient-section">
                <div className="summary-patient-avatar">
                  <UserOutlined />
                </div>

                <div className="summary-patient-information">
                  <Tooltip
                    title={appointment.patient_name || "Unknown Patient"}
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
                          <span> · {appointment.patient_distance_km} km</span>
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
    if (viewMode === "row") {
      return (
        <article
          key={appointment.appointment_id}
          role="button"
          tabIndex={0}
          className={`${cardClasses} row-appointment-card`}
          onClick={() => openAppointmentDetails(appointment)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openAppointmentDetails(appointment);
            }
          }}
        >
          {/* Queue Number */}
          <div className="row-appointment-number">{appointmentNumber}</div>

          {/* Patient */}
          <div className="row-appointment-patient">
            <div className="row-patient-avatar">
              <UserOutlined />
            </div>

            <div className="row-patient-info">
              <Text className="row-patient-name">
                {appointment.patient_name || "Unknown Patient"}
              </Text>

              {appointment.reason_for_visit && (
                <Text className="row-patient-reason">
                  {appointment.reason_for_visit}
                </Text>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="row-appointment-info">
            {appointment.phone ? (
              <>
                <PhoneOutlined />

                <Text>{appointment.phone}</Text>
              </>
            ) : (
              <Text type="secondary">-</Text>
            )}
          </div>

          {/* Location */}
          <div className="row-appointment-info row-location">
            {appointment.patient_location ? (
              <>
                <EnvironmentOutlined />

                <div>
                  <Text>{appointment.patient_location}</Text>

                  {appointment.patient_distance_km !== "" &&
                    appointment.patient_distance_km !== null &&
                    appointment.patient_distance_km !== undefined && (
                      <Text type="secondary" className="row-distance">
                        {appointment.patient_distance_km} km
                      </Text>
                    )}
                </div>
              </>
            ) : (
              <Text type="secondary">-</Text>
            )}
          </div>

          {/* Appointment Time */}
          <div className="row-appointment-info">
            <ClockCircleOutlined />

            <Text strong>{formatTime(appointment.appointment_time)}</Text>
          </div>

          {/* Status */}
          <div className="row-status-section">
            {isCurrentPatient && (
              <span className="row-status-badge treatment">In Treatment</span>
            )}

            {isWaitingPatient && (
              <span className="row-status-badge waiting">
                <ClockCircleOutlined />
                Waiting
              </span>
            )}

            {isLockedPatient && !isWaitingPatient && (
              <span className="row-status-badge next">
                {lockedPosition === 0 ? "Next 1" : `Next ${lockedPosition + 1}`}
              </span>
            )}

            {!isCurrentPatient && !isWaitingPatient && !isLockedPatient && (
              <span
                className={`row-status-badge ${String(appointment.status || "")
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                {appointment.status || "Pending"}
              </span>
            )}
          </div>

          {/* Actions */}
          <div
            className="row-action-section"
            onClick={(event) => event.stopPropagation()}
          >
            {hasActions ? (
              <Space size={6}>
                {actionContent}
                {waitingAction}
              </Space>
            ) : (
              <Text type="secondary">-</Text>
            )}
          </div>
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
          lockedPosition,
          isWaitingPatient,
        )}

        {isCompleted ? (
          renderCompletedCard(appointment, appointmentNumber, "full")
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
                        <span> · {appointment.patient_distance_km} km</span>
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
                  <Text className="detail-label">Appointment Time</Text>

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
                    {appointment.reason_for_visit || "General consultation"}
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

  const selectedIsCurrent = selectedAppointment?.status === "In Treatment";

  const selectedIsWaiting = selectedAppointment
    ? isAppointmentWaiting(selectedAppointment)
    : false;

  const selectedLockedPosition = selectedAppointment
    ? lockedCheckedInAppointmentIds.indexOf(
        String(selectedAppointment.appointment_id),
      )
    : -1;

  const selectedIsFirstLocked =
    !selectedIsWaiting && selectedLockedPosition === 0;

  const selectedAction = selectedAppointment
    ? renderCardAction(
        selectedAppointment,
        selectedIsCurrent,
        selectedIsFirstLocked,
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
            value={selectedDatePickerValue}
            format="YYYY-MM-DD"
            className="appointment-date-picker"
            onChange={(date) => {
              if (!date || !date.isValid()) {
                return;
              }

              const nextDate = date.format("YYYY-MM-DD");

              setSelectedDate((currentDate) =>
                currentDate === nextDate ? currentDate : nextDate,
              );
            }}
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
          {/* =====================================================
      WAITING PATIENTS
  ====================================================== */}

          {waitingAppointments.length > 0 && (
            <div className="waiting-patients-section">
              <div className="waiting-patients-header">
                <div className="waiting-patients-title-wrapper">
                  <div className="waiting-patients-icon">
                    <ClockCircleOutlined />
                  </div>

                  <div>
                    <Title level={4} className="waiting-patients-title">
                      Waiting Patients
                    </Title>

                    <Text className="waiting-patients-subtitle">
                      Patients currently kept in the waiting queue
                    </Text>
                  </div>
                </div>
              </div>

              <div
                className={`appointment-card-layout waiting-patients-layout view-${viewMode}`}
              >
                {waitingAppointments.map(renderAppointmentCard)}
              </div>
            </div>
          )}

          {/* =====================================================
      MAIN TOOLBAR
  ====================================================== */}

          <div className="appointment-toolbar">
            <div className="appointment-search-wrapper">
              <Input
                allowClear
                value={searchValue}
                prefix={<SearchOutlined />}
                placeholder="Search number, patient, phone or reason"
                className="appointment-search-input"
                onChange={(event) => setSearchValue(event.target.value)}
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
              <div className={`appointment-card-layout view-${viewMode}`}>
                {filteredAppointments.map(renderAppointmentCard)}
              </div>
            )}
          </Spin>
        </section>

        <Drawer
          open={detailsDrawerOpen}
          size="large"
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

                  selectedAppointment.is_allergies ? "drawer-allergy-hero" : "",

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
                    {selectedAppointment.patient_name || "Unknown Patient"}
                  </Text>

                  <Tag
                    color={STATUS_COLORS[selectedEffectiveStatus] || "default"}
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
                      {formatTime(selectedWaitingRecord?.start_time)}
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
                  selectedAppointment.patient_distance_km !== undefined
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
                    ? dayjs(selectedAppointment.appointment_date).format(
                        "DD MMMM YYYY",
                      )
                    : dayjs(selectedDate).format("DD MMMM YYYY")}
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <ClockCircleOutlined />
                      Time
                    </Space>
                  }
                >
                  {formatTime(selectedAppointment.appointment_time)}
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
                    {formatTime(selectedAppointment.checked_in_time)}
                  </Descriptions.Item>
                )}

                {selectedWaitingRecord?.start_time && (
                  <Descriptions.Item label="Waiting Started">
                    {formatTime(selectedWaitingRecord.start_time)}
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
                      This appointment has been successfully completed.
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
 <Modal
  open={reassignModalOpen}
  className="reassign-number-modal"
  width={560}
  centered
  title={
    reassignSourceAppointment
      ? `Fill Cancelled Appointment No. ${getAppointmentNumber(
          reassignSourceAppointment,
        )}`
      : "Assign Appointment Number"
  }
  okText="Assign Number"
  cancelText="Cancel"
  confirmLoading={reassigningNumber}
  okButtonProps={{
    disabled: !reassignTargetAppointmentId,
  }}
  onOk={handleReassignAppointmentNumber}
  onCancel={() => {
    if (reassigningNumber) {
      return;
    }

    setReassignModalOpen(false);
    setReassignSourceAppointment(null);
    setReassignTargetAppointmentId(null);
  }}
>
        <div className="reassign-number-modal-content">
          {/* =====================================================
        Cancelled / available number
    ===================================================== */}

          {reassignSourceAppointment && (
            <div className="reassign-source-number">
              <Text type="secondary">Available appointment number</Text>

              <div className="reassign-big-number">
                {getAppointmentNumber(reassignSourceAppointment)}
              </div>

              <Text type="secondary">
                This number became available because{" "}
                <strong>
                  {reassignSourceAppointment.patient_name ||
                    reassignSourceAppointment.patient_id ||
                    "Unknown Patient"}
                </strong>{" "}
                cancelled the appointment.
              </Text>
            </div>
          )}

          {/* =====================================================
        Target appointment
    ===================================================== */}

          <div className="reassign-target-section">
            <Text strong>
              Select an appointment after No.{" "}
              {reassignSourceAppointment
                ? getAppointmentNumber(reassignSourceAppointment)
                : ""}
            </Text>

            <Text
              type="secondary"
              style={{
                display: "block",
                marginTop: 4,
                marginBottom: 10,
              }}
            >
              Only appointments after the cancelled position are available.
            </Text>

            <Select
              showSearch
              allowClear
              value={reassignTargetAppointmentId}
              placeholder={
                availableReassignAppointments.length > 0
                  ? "Select appointment"
                  : "No later appointments available"
              }
              className="reassign-appointment-select"
              optionFilterProp="label"
              disabled={availableReassignAppointments.length === 0}
              onChange={setReassignTargetAppointmentId}
              options={availableReassignAppointments.map((appointment) => ({
                value: getAppointmentId(appointment),

                label: `No. ${getAppointmentNumber(appointment)} - ${
                  appointment.patient_name ||
                  appointment.patient_id ||
                  "Unknown Patient"
                } - ${appointment.status || "Pending"}`,
              }))}
            />

            {availableReassignAppointments.length === 0 &&
              reassignSourceAppointment && (
                <Alert
                  type="info"
                  showIcon
                  style={{
                    marginTop: 12,
                  }}
                  message="No later appointments available"
                  description={`There are no eligible appointments after appointment No. ${getAppointmentNumber(
                    reassignSourceAppointment,
                  )}.`}
                />
              )}
          </div>

          {/* =====================================================
        Selected target preview
    ===================================================== */}

          {reassignTargetAppointmentId && (
            <div className="reassign-number-warning">
              {(() => {
                const selectedAppointment = availableReassignAppointments.find(
                  (appointment) =>
                    String(getAppointmentId(appointment)) ===
                    String(reassignTargetAppointmentId),
                );

                if (!selectedAppointment) {
                  return null;
                }

                return (
                  <>
                    <strong>
                      {selectedAppointment.patient_name ||
                        selectedAppointment.patient_id ||
                        "Selected Patient"}
                    </strong>{" "}
                    currently has appointment No.{" "}
                    <strong>{getAppointmentNumber(selectedAppointment)}</strong>
                    .
                    <br />
                    <br />
                    This patient will receive appointment No.{" "}
                    <strong>
                      {reassignSourceAppointment
                        ? getAppointmentNumber(reassignSourceAppointment)
                        : ""}
                    </strong>
                    .
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </Modal>
    </ClinicPage>
  );
};

export default AppointmentMaintenance;
