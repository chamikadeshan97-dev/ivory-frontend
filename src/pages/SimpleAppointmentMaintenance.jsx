import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Modal,
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
  getDoctorArrivalStatus,
  getPatients,
  markDoctorArrived,
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

const LOCKED_PATIENT_COUNT = 2;

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

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeSearchValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const getAppointmentId = (appointment) =>
  String(appointment?.appointment_id || appointment?.id || "").trim();

const isCancelledStatus = (status) => {
  const normalized = normalizeStatus(status);

  return normalized === "cancelled" || normalized === "canceled";
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

const extractDoctorArrivalRecord = (response) => {
  const responseData = response?.data ?? response;

  if (!responseData) {
    return null;
  }

  if (responseData?.data && !Array.isArray(responseData.data)) {
    return responseData.data;
  }

  if (responseData?.record) {
    return responseData.record;
  }

  return responseData;
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

const getRawAppointmentNumber = (appointment) => {
  const value =
    appointment?.appointment_number ??
    appointment?.queue_number ??
    appointment?.number;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const getDistanceValue = (appointment) => {
  const rawDistance =
    appointment?.patient_distance_km ??
    appointment?.distance_km ??
    appointment?.distance;

  const parsedDistance = Number.parseFloat(rawDistance);

  return Number.isFinite(parsedDistance) ? parsedDistance : null;
};

const getStatusClassName = (status) =>
  String(status || "Pending")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const getWaitingAppointmentId = (record) =>
  String(record?.appointment_id ?? record?.id ?? "").trim();

const isWaitingRecordActive = (record) => {
  const appointmentId = getWaitingAppointmentId(record);

  const endTime = String(record?.end_time ?? "").trim();

  return Boolean(appointmentId && !endTime);
};

/* ========================================================
   Component
======================================================== */

const AppointmentMaintenance = () => {
  /* ========================================================
     Main state
  ======================================================== */

  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const [appointments, setAppointments] = useState([]);

  const [waitingRecords, setWaitingRecords] = useState([]);

  const [loading, setLoading] = useState(false);

  const [updatingId, setUpdatingId] = useState(null);

  /* ========================================================
     Doctor arrival
  ======================================================== */

  const [doctorArrivalRecord, setDoctorArrivalRecord] = useState(null);

  const [doctorArrived, setDoctorArrived] = useState(false);

  const [doctorArrivalLoading, setDoctorArrivalLoading] = useState(false);

  const [markingDoctorArrival, setMarkingDoctorArrival] = useState(false);

  /* ========================================================
     UI
  ======================================================== */

  const [viewMode, setViewMode] = useState("minimal");

  const [distanceSort, setDistanceSort] = useState("default");

  const [statusFilter, setStatusFilter] = useState("All");

  const [searchValue, setSearchValue] = useState("");

  const [lockedNextPatientIds, setLockedNextPatientIds] = useState([]);

  /* ========================================================
     Drawer
  ======================================================== */

  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState(null);

  /* ========================================================
     Reassign modal
  ======================================================== */

  const [reassignModalOpen, setReassignModalOpen] = useState(false);

  const [reassignSourceAppointment, setReassignSourceAppointment] =
    useState(null);

  const [reassignTargetAppointmentId, setReassignTargetAppointmentId] =
    useState(null);

  const [reassigningNumber, setReassigningNumber] = useState(false);

  /* ========================================================
     Date picker
  ======================================================== */

  const selectedDatePickerValue = useMemo(() => {
    const parsedDate = dayjs(selectedDate, "YYYY-MM-DD", true);

    return parsedDate.isValid() ? parsedDate : dayjs();
  }, [selectedDate]);

  /* ========================================================
     Doctor arrival loading
  ======================================================== */

  const fetchDoctorArrival = useCallback(async () => {
    const dateToLoad = selectedDate || getTodayDate();

    try {
      setDoctorArrivalLoading(true);

      const response = await getDoctorArrivalStatus(dateToLoad);

      const record = extractDoctorArrivalRecord(response);

      setDoctorArrivalRecord(record);

      setDoctorArrived(convertToBoolean(record?.arrived));
    } catch (error) {
      console.error("Failed to get doctor arrival status:", error);

      /*
       * If there is no arrival row for the date, keep it as not arrived.
       * We don't want the whole page to fail just because this endpoint
       * returns 404/no record.
       */
      setDoctorArrivalRecord(null);
      setDoctorArrived(false);
    } finally {
      setDoctorArrivalLoading(false);
    }
  }, [selectedDate]);

  /* ========================================================
     Load appointments
  ======================================================== */

  const fetchAppointments = useCallback(async () => {
    const dateToLoad = selectedDate || getTodayDate();

    try {
      setLoading(true);

      const [appointmentsResponse, patientsResponse, waitingResponse] =
        await Promise.all([
          getAppointmentsByDate(dateToLoad),
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

          patient_gender:
            appointment.patient_gender || patient?.gender || "",

          patient_address:
            appointment.patient_address || patient?.address || "",

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

      /*
       * Keep drawer appointment synchronized after reload.
       */
      setSelectedAppointment((currentAppointment) => {
        if (!currentAppointment) {
          return null;
        }

        const currentId = getAppointmentId(currentAppointment);

        return (
          mergedAppointments.find(
            (appointment) => getAppointmentId(appointment) === currentId,
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

  /* ========================================================
     Full refresh
  ======================================================== */

  const refreshPage = useCallback(async () => {
    await Promise.all([fetchAppointments(), fetchDoctorArrival()]);
  }, [fetchAppointments, fetchDoctorArrival]);

  useEffect(() => {
    refreshPage();
  }, [refreshPage]);

  /* ========================================================
     Mark doctor arrived
  ======================================================== */

  const handleMarkDoctorArrived = async () => {
    const dateToSend = selectedDate || getTodayDate();

    try {
      setMarkingDoctorArrival(true);

      await markDoctorArrived(dateToSend);

      message.success("Doctor arrival marked successfully");

      await fetchDoctorArrival();
    } catch (error) {
      console.error("Failed to mark doctor arrival:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to mark doctor arrival",
      );
    } finally {
      setMarkingDoctorArrival(false);
    }
  };

  /* ========================================================
     Waiting data
  ======================================================== */

  const activeWaitingRecords = useMemo(
    () => waitingRecords.filter(isWaitingRecordActive),
    [waitingRecords],
  );

  const activeWaitingAppointmentIds = useMemo(() => {
    return new Set(
      activeWaitingRecords.map((record) =>
        getWaitingAppointmentId(record),
      ),
    );
  }, [activeWaitingRecords]);

  const waitingRecordMap = useMemo(() => {
    return new Map(
      activeWaitingRecords.map((record) => [
        getWaitingAppointmentId(record),
        record,
      ]),
    );
  }, [activeWaitingRecords]);

  const isAppointmentWaiting = useCallback(
    (appointment) => {
      const appointmentId = getAppointmentId(appointment);

      return Boolean(
        appointmentId && activeWaitingAppointmentIds.has(appointmentId),
      );
    },
    [activeWaitingAppointmentIds],
  );

  const getAppointmentWaitingRecord = useCallback(
    (appointment) => {
      const appointmentId = getAppointmentId(appointment);

      return waitingRecordMap.get(appointmentId) || null;
    },
    [waitingRecordMap],
  );

  /* ========================================================
     Current treatment
  ======================================================== */

  const currentTreatmentPatient = useMemo(() => {
    return (
      appointments.find(
        (appointment) =>
          normalizeStatus(appointment.status) === "in treatment",
      ) || null
    );
  }, [appointments]);

  /* ========================================================
     Checked-in queue
  ======================================================== */

  const checkedInAppointments = useMemo(() => {
    return appointments
      .filter(
        (appointment) =>
          normalizeStatus(appointment.status) === "checked in" &&
          !isAppointmentWaiting(appointment),
      )
      .sort((first, second) => {
        const firstCheckedIn = getDateTimeValue(
          first.checked_in_time,
          first.appointment_date || selectedDate,
        );

        const secondCheckedIn = getDateTimeValue(
          second.checked_in_time,
          second.appointment_date || selectedDate,
        );

        const checkedInDifference = firstCheckedIn - secondCheckedIn;

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
  }, [appointments, isAppointmentWaiting, selectedDate]);

  /* ========================================================
     Locked NEXT 1 / NEXT 2
  ======================================================== */

  const lockedCheckedInAppointmentIds = useMemo(() => {
    const availableIds = new Set(
      checkedInAppointments.map((appointment) =>
        getAppointmentId(appointment),
      ),
    );

    const validLockedIds = lockedNextPatientIds.filter((appointmentId) =>
      availableIds.has(String(appointmentId)),
    );

    const remainingIds = checkedInAppointments
      .map((appointment) => getAppointmentId(appointment))
      .filter(
        (appointmentId) =>
          appointmentId && !validLockedIds.includes(appointmentId),
      );

    return [...validLockedIds, ...remainingIds].slice(
      0,
      LOCKED_PATIENT_COUNT,
    );
  }, [checkedInAppointments, lockedNextPatientIds]);

  const firstLockedAppointmentId =
    lockedCheckedInAppointmentIds[0] || null;

  /* ========================================================
     Restore locked patients
  ======================================================== */

  useEffect(() => {
    const storageKey = getReadyPatientStorageKey(selectedDate);

    const availableIds = checkedInAppointments
      .map((appointment) => getAppointmentId(appointment))
      .filter(Boolean);

    if (availableIds.length === 0) {
      setLockedNextPatientIds([]);

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }

      return;
    }

    let storedIds = [];

    if (typeof window !== "undefined") {
      try {
        const storedValue = window.localStorage.getItem(storageKey);

        const parsedValue = storedValue
          ? JSON.parse(storedValue)
          : [];

        storedIds = Array.isArray(parsedValue)
          ? parsedValue.map(String)
          : [];
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
        validCurrentIds.length > 0
          ? validCurrentIds
          : validStoredIds;

      const additionalIds = availableIds.filter(
        (appointmentId) =>
          !preservedIds.includes(appointmentId),
      );

      return [...preservedIds, ...additionalIds].slice(
        0,
        LOCKED_PATIENT_COUNT,
      );
    });
  }, [selectedDate, checkedInAppointments]);

  /* ========================================================
     Save locked patients
  ======================================================== */

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

  /* ========================================================
     Sync QueueDisplay tab
  ======================================================== */

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
            getAppointmentId(appointment),
          ),
        );

        const validIds = storedIds
          .filter((appointmentId) =>
            availableIds.has(appointmentId),
          )
          .slice(0, LOCKED_PATIENT_COUNT);

        setLockedNextPatientIds(validIds);
      } catch (error) {
        console.error(
          "Failed to sync locked queue patients:",
          error,
        );
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [selectedDate, checkedInAppointments]);

  /* ========================================================
     Reassign appointment number
  ======================================================== */

  const handleOpenReassignNumber = (appointment) => {
    setReassignSourceAppointment(appointment);

    setReassignTargetAppointmentId(null);

    setReassignModalOpen(true);
  };

  const reassignableAppointments = useMemo(() => {
    if (!reassignSourceAppointment) {
      return [];
    }

    const sourceId = getAppointmentId(reassignSourceAppointment);

    return appointments.filter((appointment) => {
      const appointmentId = getAppointmentId(appointment);

      if (!appointmentId || appointmentId === sourceId) {
        return false;
      }

      const status = normalizeStatus(appointment.status);

      return [
        "pending",
        "confirmed",
        "checked in",
      ].includes(status);
    });
  }, [appointments, reassignSourceAppointment]);

  const availableReassignAppointments = useMemo(() => {
    if (!reassignSourceAppointment) {
      return [];
    }

    const sourceNumber = getRawAppointmentNumber(
      reassignSourceAppointment,
    );

    const sourceDate =
      reassignSourceAppointment?.appointment_date ||
      reassignSourceAppointment?.date ||
      selectedDate;

    if (sourceNumber === null) {
      return [];
    }

    return reassignableAppointments
      .filter((appointment) => {
        const appointmentNumber =
          getRawAppointmentNumber(appointment);

        const appointmentDate =
          appointment?.appointment_date ||
          appointment?.date ||
          selectedDate;

        if (appointmentNumber === null) {
          return false;
        }

        return (
          appointmentDate === sourceDate &&
          appointmentNumber > sourceNumber &&
          !isCancelledStatus(appointment.status)
        );
      })
      .sort((first, second) => {
        return (
          getRawAppointmentNumber(first) -
          getRawAppointmentNumber(second)
        );
      });
  }, [
    reassignableAppointments,
    reassignSourceAppointment,
    selectedDate,
  ]);

  const handleReassignAppointmentNumber = async () => {
    if (!reassignSourceAppointment) {
      message.error("Cancelled appointment is missing");

      return;
    }

    if (!reassignTargetAppointmentId) {
      message.warning("Please select another appointment");

      return;
    }

    const sourceId = getAppointmentId(
      reassignSourceAppointment,
    );

    try {
      setReassigningNumber(true);

      await reassignAppointmentNumber(
        sourceId,
        reassignTargetAppointmentId,
      );

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
      console.error(
        "Failed to reassign appointment number:",
        error,
      );

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to reassign appointment number",
      );
    } finally {
      setReassigningNumber(false);
    }
  };

  /* ========================================================
     Waiting actions
  ======================================================== */

  const handleStartWaiting = async (appointment) => {
    const appointmentId = getAppointmentId(appointment);

    if (!appointmentId) {
      message.error("Appointment ID is missing");

      return;
    }

    if (isAppointmentWaiting(appointment)) {
      message.info("This patient is already waiting.");

      return;
    }

    try {
      setUpdatingId(appointmentId);

      await startAppointmentWaiting(appointmentId);

      message.success(
        `${
          appointment.patient_name || "Patient"
        } moved to waiting.`,
      );

      await fetchAppointments();
    } catch (error) {
      console.error(
        "Failed to keep patient waiting:",
        error,
      );

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
    const appointmentId = getAppointmentId(appointment);

    if (!appointmentId) {
      message.error("Appointment ID is missing");

      return;
    }

    if (!isAppointmentWaiting(appointment)) {
      message.info(
        "This patient is not currently waiting.",
      );

      return;
    }

    try {
      setUpdatingId(appointmentId);

      await endAppointmentWaiting(appointmentId);

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
     Appointment sorting
  ======================================================== */

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((first, second) => {
      const firstId = getAppointmentId(first);

      const secondId = getAppointmentId(second);

      const firstIsCurrent =
        normalizeStatus(first.status) === "in treatment";

      const secondIsCurrent =
        normalizeStatus(second.status) === "in treatment";

      if (firstIsCurrent && !secondIsCurrent) {
        return -1;
      }

      if (!firstIsCurrent && secondIsCurrent) {
        return 1;
      }

      const firstLockedIndex =
        lockedCheckedInAppointmentIds.indexOf(firstId);

      const secondLockedIndex =
        lockedCheckedInAppointmentIds.indexOf(secondId);

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

      const firstIsWaiting =
        isAppointmentWaiting(first);

      const secondIsWaiting =
        isAppointmentWaiting(second);

      if (firstIsWaiting && !secondIsWaiting) {
        return 1;
      }

      if (!firstIsWaiting && secondIsWaiting) {
        return -1;
      }

      if (distanceSort !== "default") {
        const firstDistance = getDistanceValue(first);

        const secondDistance = getDistanceValue(second);

        const firstHasDistance =
          firstDistance !== null;

        const secondHasDistance =
          secondDistance !== null;

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
     Search + status filtering
  ======================================================== */

  const filteredAppointments = useMemo(() => {
    const normalizedSearch =
      normalizeSearchValue(searchValue);

    return sortedAppointments.filter((appointment) => {
      const isWaitingPatient =
        isAppointmentWaiting(appointment);

      const effectiveStatus = isWaitingPatient
        ? "Waiting"
        : appointment.status;

      const matchesStatus =
        statusFilter === "All" ||
        effectiveStatus === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableValues = [
        getAppointmentNumber(appointment),
        getAppointmentId(appointment),
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
        normalizeSearchValue(value).includes(
          normalizedSearch,
        ),
      );
    });
  }, [
    sortedAppointments,
    statusFilter,
    searchValue,
    isAppointmentWaiting,
  ]);

  /* ========================================================
     Waiting section

     IMPORTANT:
     This is intentionally independent from the main
     status/search controls, so waiting patients stay visible.
  ======================================================== */

  const waitingAppointments = useMemo(() => {
    return sortedAppointments.filter((appointment) =>
      isAppointmentWaiting(appointment),
    );
  }, [sortedAppointments, isAppointmentWaiting]);

  /* ========================================================
     Main cards

     IMPORTANT:
     Waiting patients are removed here so they do not
     appear twice.
  ======================================================== */

  const mainFilteredAppointments = useMemo(() => {
    return filteredAppointments.filter(
      (appointment) =>
        !isAppointmentWaiting(appointment),
    );
  }, [filteredAppointments, isAppointmentWaiting]);

  /* ========================================================
     Filter counts
  ======================================================== */

  const filterCounts = useMemo(() => {
    const counts = {
      All: appointments.length,
      Waiting: activeWaitingAppointmentIds.size,
    };

    FILTER_OPTIONS.forEach((option) => {
      if (
        option.value === "All" ||
        option.value === "Waiting"
      ) {
        return;
      }

      counts[option.value] = appointments.filter(
        (appointment) =>
          appointment.status === option.value &&
          !isAppointmentWaiting(appointment),
      ).length;
    });

    return counts;
  }, [
    appointments,
    activeWaitingAppointmentIds,
    isAppointmentWaiting,
  ]);

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
     Check in
  ======================================================== */

  const handleCheckIn = async (appointment) => {
    const appointmentId = getAppointmentId(appointment);

    if (!appointmentId) {
      message.error("Appointment ID is missing");

      return;
    }

    try {
      setUpdatingId(appointmentId);

      await updateAppointmentStatus(
        appointmentId,
        "Checked In",
      );

      message.success(
        `${
          appointment.patient_name || "Patient"
        } checked in successfully`,
      );

      await fetchAppointments();
    } catch (error) {
      console.error(
        "Failed to check in patient:",
        error,
      );

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to check in patient",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* ========================================================
     Cancel appointment
  ======================================================== */

  const handleCancelAppointment = async (
    appointment,
  ) => {
    const appointmentId = getAppointmentId(appointment);

    if (!appointmentId) {
      message.error("Appointment ID is missing");

      return;
    }

    try {
      setUpdatingId(appointmentId);

      /*
       * If the patient is currently in Waiting,
       * close waiting before cancelling.
       */
      if (isAppointmentWaiting(appointment)) {
        await endAppointmentWaiting(appointmentId);
      }

      await updateAppointmentStatus(
        appointmentId,
        "Cancelled",
      );

      message.success(
        `${
          appointment.patient_name || "Patient"
        } appointment cancelled`,
      );

      await fetchAppointments();
    } catch (error) {
      console.error(
        "Failed to cancel appointment:",
        error,
      );

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to cancel appointment",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* ========================================================
     Check in cancelled appointment again
  ======================================================== */

  const handleCheckInCancelledAppointment = async (
    appointment,
  ) => {
    const appointmentId = getAppointmentId(appointment);

    if (!appointmentId) {
      message.error("Appointment ID is missing");

      return;
    }

    try {
      setUpdatingId(appointmentId);

      await updateAppointmentStatus(
        appointmentId,
        "Checked In",
      );

      message.success(
        `${
          appointment.patient_name || "Patient"
        } checked in again as No. ${getAppointmentNumber(
          appointment,
        )}`,
      );

      await fetchAppointments();
    } catch (error) {
      console.error(
        "Failed to check in cancelled appointment:",
        error,
      );

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to check in appointment",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* ========================================================
     Start treatment
  ======================================================== */

  const handleStartTreatment = async (
    appointment,
  ) => {
    const appointmentId = getAppointmentId(appointment);

    if (!appointmentId) {
      message.error("Appointment ID is missing");

      return;
    }

    const isWaitingPatient =
      isAppointmentWaiting(appointment);

    /*
     * Only one patient can be in treatment.
     */
    if (
      currentTreatmentPatient &&
      getAppointmentId(currentTreatmentPatient) !==
        appointmentId
    ) {
      message.warning(
        `${
          currentTreatmentPatient.patient_name ||
          "Another patient"
        } is currently in treatment`,
      );

      return;
    }

    /*
     * Normal checked-in patients must be NEXT 1.
     *
     * Waiting patients are an exception and can be
     * brought directly into treatment.
     */
    if (
      !isWaitingPatient &&
      appointmentId !== firstLockedAppointmentId
    ) {
      message.warning(
        "Only the first locked patient can start treatment",
      );

      return;
    }

    try {
      setUpdatingId(appointmentId);

      /*
       * Close waiting record before entering treatment.
       */
      if (isWaitingPatient) {
        await endAppointmentWaiting(appointmentId);
      }

      await updateAppointmentStatus(
        appointmentId,
        "In Treatment",
      );

      message.success(
        `Treatment started for ${
          appointment.patient_name || "the patient"
        }`,
      );

      await fetchAppointments();

      if (typeof window !== "undefined") {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    } catch (error) {
      console.error(
        "Failed to start treatment:",
        error,
      );

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
    let ribbonText =
      appointment.status || "Pending";

    let ribbonClass = `status-ribbon-${getStatusClassName(
      appointment.status,
    )}`;

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
      <div
        className={[
          "left-corner-ribbon",
          ribbonClass,
        ].join(" ")}
      >
        <span>{ribbonText}</span>
      </div>
    );
  };

  /* ========================================================
     Main card action
  ======================================================== */

  const renderCardAction = (
    appointment,
    isCurrentPatient,
    isFirstLockedPatient,
  ) => {
    const appointmentId =
      getAppointmentId(appointment);

    const isUpdating =
      String(updatingId || "") ===
      String(appointmentId || "");

    const isWaitingPatient =
      isAppointmentWaiting(appointment);

    if (isCurrentPatient) {
      return null;
    }

    /* ======================================================
       CANCELLED
    ====================================================== */

    if (isCancelledStatus(appointment.status)) {
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

              handleCheckInCancelledAppointment(
                appointment,
              );
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
            Assign No.{" "}
            {getAppointmentNumber(appointment)}
          </Button>
        </div>
      );
    }

    /* ======================================================
       PENDING
    ====================================================== */

    if (
      normalizeStatus(appointment.status) ===
        "pending" &&
      !isWaitingPatient
    ) {
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

    /* ======================================================
       CONFIRMED
    ====================================================== */

    if (
      normalizeStatus(appointment.status) ===
        "confirmed" &&
      !isWaitingPatient
    ) {
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

    /* ======================================================
       START TREATMENT
    ====================================================== */

    const canStartTreatment =
      normalizeStatus(appointment.status) ===
        "checked in" &&
      (isWaitingPatient || isFirstLockedPatient);

    if (
      canStartTreatment &&
      !currentTreatmentPatient
    ) {
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
          {isWaitingPatient
            ? "START TREATMENT NOW"
            : "START TREATMENT"}
        </Button>
      );
    }

    return null;
  };

  /* ========================================================
     Waiting action
  ======================================================== */

  const renderWaitingActionButton = (
    appointment,
  ) => {
    const appointmentId =
      getAppointmentId(appointment);

    const isUpdating =
      String(updatingId || "") ===
      String(appointmentId || "");

    const isWaitingPatient =
      isAppointmentWaiting(appointment);

    const canUseWaiting =
      normalizeStatus(appointment.status) ===
      "checked in";

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
          isMinimal
            ? "completed-card-content-minimal"
            : "",
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

        <Text className="completed-card-title">
          Completed
        </Text>

        {!isMinimal && (
          <Text className="completed-card-message">
            Patient visit completed successfully
          </Text>
        )}

        <div className="completed-divider" />

        <Text className="completed-patient-name">
          {appointment.patient_name ||
            "Unknown Patient"}
        </Text>
      </div>
    );
  };

  /* ========================================================
     Waiting notice
  ======================================================== */

  const renderWaitingNotice = (
    appointment,
    compact = false,
  ) => {
    const waitingRecord =
      getAppointmentWaitingRecord(appointment);

    if (!waitingRecord) {
      return null;
    }

    return (
      <div
        className={[
          "waiting-patient-notice",
          compact
            ? "waiting-patient-notice-compact"
            : "",
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
            Since{" "}
            {formatTime(waitingRecord.start_time)}
          </Text>
        </div>
      </div>
    );
  };

  /* ========================================================
     Render appointment card
  ======================================================== */

  const renderAppointmentCard = (
    appointment,
  ) => {
    const appointmentId =
      getAppointmentId(appointment);

    const appointmentNumber =
      getAppointmentNumber(appointment);

    const isCurrentPatient =
      normalizeStatus(appointment.status) ===
      "in treatment";

    const isWaitingPatient =
      isAppointmentWaiting(appointment);

    const lockedPosition =
      lockedCheckedInAppointmentIds.indexOf(
        appointmentId,
      );

    const isLockedPatient =
      !isWaitingPatient && lockedPosition !== -1;

    const isFirstLockedPatient =
      isLockedPatient && lockedPosition === 0;

    const isCompleted =
      normalizeStatus(appointment.status) ===
      "completed";

    const isCancelled =
      isCancelledStatus(appointment.status);

    const actionContent = renderCardAction(
      appointment,
      isCurrentPatient,
      isFirstLockedPatient,
    );

    const waitingAction =
      renderWaitingActionButton(appointment);

    const hasActions =
      Boolean(actionContent) ||
      Boolean(waitingAction);

    const cardClasses = [
      "appointment-number-card",

      isCurrentPatient
        ? "current-treatment-card"
        : "",

      isLockedPatient
        ? "next-patient-card"
        : "",

      isWaitingPatient
        ? "waiting-patient-card"
        : "",

      appointment.is_allergies
        ? "allergy-card"
        : "",

      isCompleted ? "completed-card" : "",

      isCancelled ? "cancelled-card" : "",
    ]
      .filter(Boolean)
      .join(" ");

    /* ======================================================
       MINIMAL
    ====================================================== */

    if (viewMode === "minimal") {
      return (
        <article
          key={appointmentId}
          role="button"
          tabIndex={0}
          className={`${cardClasses} minimal-appointment-card`}
          onClick={() =>
            openAppointmentDetails(appointment)
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === " "
            ) {
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
                {appointment.patient_name ||
                  "Unknown Patient"}
              </Text>

              {appointment.patient_location && (
                <Text className="appointment-location">
                  <EnvironmentOutlined />

                  {appointment.patient_location}

                  {appointment.patient_distance_km !==
                    "" &&
                    appointment.patient_distance_km !==
                      null &&
                    appointment.patient_distance_km !==
                      undefined && (
                      <span>
                        {" "}
                        ·{" "}
                        {
                          appointment.patient_distance_km
                        }{" "}
                        km
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

    /* ======================================================
       SUMMARY
    ====================================================== */

    if (viewMode === "summary") {
      return (
        <article
          key={appointmentId}
          role="button"
          tabIndex={0}
          className={`${cardClasses} summary-appointment-card`}
          onClick={() =>
            openAppointmentDetails(appointment)
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === " "
            ) {
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
                renderWaitingNotice(
                  appointment,
                  true,
                )}

              <div className="summary-patient-section">
                <div className="summary-patient-avatar">
                  <UserOutlined />
                </div>

                <div className="summary-patient-information">
                  <Tooltip
                    title={
                      appointment.patient_name ||
                      "Unknown Patient"
                    }
                  >
                    <Text className="summary-patient-name">
                      {appointment.patient_name ||
                        "Unknown Patient"}
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

                      {
                        appointment.patient_location
                      }

                      {appointment.patient_distance_km !==
                        "" &&
                        appointment.patient_distance_km !==
                          null &&
                        appointment.patient_distance_km !==
                          undefined && (
                          <span>
                            {" "}
                            ·{" "}
                            {
                              appointment.patient_distance_km
                            }{" "}
                            km
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

    /* ======================================================
       ROW
    ====================================================== */

    if (viewMode === "row") {
      return (
        <article
          key={appointmentId}
          role="button"
          tabIndex={0}
          className={`${cardClasses} row-appointment-card`}
          onClick={() =>
            openAppointmentDetails(appointment)
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === " "
            ) {
              event.preventDefault();

              openAppointmentDetails(appointment);
            }
          }}
        >
          <div className="row-appointment-number">
            {appointmentNumber}
          </div>

          <div className="row-appointment-patient">
            <div className="row-patient-avatar">
              <UserOutlined />
            </div>

            <div className="row-patient-info">
              <Text className="row-patient-name">
                {appointment.patient_name ||
                  "Unknown Patient"}
              </Text>

              {appointment.reason_for_visit && (
                <Text className="row-patient-reason">
                  {
                    appointment.reason_for_visit
                  }
                </Text>
              )}
            </div>
          </div>

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

          <div className="row-appointment-info row-location">
            {appointment.patient_location ? (
              <>
                <EnvironmentOutlined />

                <div>
                  <Text>
                    {
                      appointment.patient_location
                    }
                  </Text>

                  {appointment.patient_distance_km !==
                    "" &&
                    appointment.patient_distance_km !==
                      null &&
                    appointment.patient_distance_km !==
                      undefined && (
                      <Text
                        type="secondary"
                        className="row-distance"
                      >
                        {
                          appointment.patient_distance_km
                        }{" "}
                        km
                      </Text>
                    )}
                </div>
              </>
            ) : (
              <Text type="secondary">-</Text>
            )}
          </div>

          <div className="row-appointment-info">
            <ClockCircleOutlined />

            <Text strong>
              {formatTime(
                appointment.appointment_time,
              )}
            </Text>
          </div>

          <div className="row-status-section">
            {isCurrentPatient && (
              <span className="row-status-badge treatment">
                In Treatment
              </span>
            )}

            {isWaitingPatient && (
              <span className="row-status-badge waiting">
                <ClockCircleOutlined />
                Waiting
              </span>
            )}

            {isLockedPatient &&
              !isWaitingPatient && (
                <span className="row-status-badge next">
                  {lockedPosition === 0
                    ? "Next 1"
                    : `Next ${
                        lockedPosition + 1
                      }`}
                </span>
              )}

            {!isCurrentPatient &&
              !isWaitingPatient &&
              !isLockedPatient && (
                <span
                  className={`row-status-badge ${getStatusClassName(
                    appointment.status,
                  )}`}
                >
                  {appointment.status ||
                    "Pending"}
                </span>
              )}
          </div>

          <div
            className="row-action-section"
            onClick={(event) =>
              event.stopPropagation()
            }
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

    /* ======================================================
       FULL
    ====================================================== */

    return (
      <article
        key={appointmentId}
        role="button"
        tabIndex={0}
        className={`${cardClasses} full-appointment-card`}
        onClick={() =>
          openAppointmentDetails(appointment)
        }
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
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
                  {appointment.patient_name ||
                    "Unknown Patient"}
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

                    {appointment.patient_distance_km !==
                      "" &&
                      appointment.patient_distance_km !==
                        null &&
                      appointment.patient_distance_km !==
                        undefined && (
                        <span>
                          {" "}
                          ·{" "}
                          {
                            appointment.patient_distance_km
                          }{" "}
                          km
                        </span>
                      )}
                  </Text>
                )}
              </div>
            </div>

            {isWaitingPatient &&
              renderWaitingNotice(appointment)}

            <div className="appointment-details-box">
              <div className="appointment-detail-row">
                <ClockCircleOutlined />

                <div>
                  <Text className="detail-label">
                    Appointment Time
                  </Text>

                  <Text className="detail-value">
                    {formatTime(
                      appointment.appointment_time,
                    )}
                  </Text>
                </div>
              </div>

              <div className="appointment-detail-row">
                <MedicineBoxOutlined />

                <div>
                  <Text className="detail-label">
                    Reason
                  </Text>

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
     Selected appointment drawer calculations
  ======================================================== */

  const selectedAppointmentNumber =
    selectedAppointment
      ? getAppointmentNumber(
          selectedAppointment,
        )
      : "--";

  const selectedIsCurrent =
    normalizeStatus(
      selectedAppointment?.status,
    ) === "in treatment";

  const selectedIsWaiting = selectedAppointment
    ? isAppointmentWaiting(
        selectedAppointment,
      )
    : false;

  const selectedLockedPosition =
    selectedAppointment
      ? lockedCheckedInAppointmentIds.indexOf(
          getAppointmentId(
            selectedAppointment,
          ),
        )
      : -1;

  const selectedIsFirstLocked =
    !selectedIsWaiting &&
    selectedLockedPosition === 0;

  const selectedAction = selectedAppointment
    ? renderCardAction(
        selectedAppointment,
        selectedIsCurrent,
        selectedIsFirstLocked,
      )
    : null;

  const selectedWaitingAction =
    selectedAppointment
      ? renderWaitingActionButton(
          selectedAppointment,
        )
      : null;

  const selectedWaitingRecord =
    selectedAppointment
      ? getAppointmentWaitingRecord(
          selectedAppointment,
        )
      : null;

  const selectedEffectiveStatus =
    selectedIsWaiting
      ? "Waiting"
      : selectedAppointment?.status;

  /* ========================================================
     Render
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

              const nextDate =
                date.format("YYYY-MM-DD");

              setSelectedDate(nextDate);
            }}
          />

          <Tooltip title="Refresh appointments">
            <Button
              icon={<ReloadOutlined />}
              loading={
                loading ||
                doctorArrivalLoading
              }
              onClick={refreshPage}
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
        {/* =====================================================
            DOCTOR ARRIVAL STATUS
        ===================================================== */}

        <section
          className={[
            "doctor-arrival-card",
            doctorArrived
              ? "doctor-arrival-card-arrived"
              : "doctor-arrival-card-not-arrived",
          ].join(" ")}
        >
          <Spin spinning={doctorArrivalLoading}>
            <div className="doctor-arrival-content">
              <div className="doctor-arrival-icon">
                {doctorArrived ? (
                  <CheckCircleFilled />
                ) : (
                  <MedicineBoxOutlined />
                )}
              </div>

              <div className="doctor-arrival-information">
                <Text className="doctor-arrival-label">
                  Doctor Status
                </Text>

                <Title
                  level={4}
                  className="doctor-arrival-title"
                >
                  {doctorArrived
                    ? "Doctor Has Arrived"
                    : "Doctor Has Not Arrived"}
                </Title>

                <Text className="doctor-arrival-description">
                  {doctorArrived
                    ? doctorArrivalRecord?.arrived_at
                      ? `Arrived at ${formatTime(
                          doctorArrivalRecord.arrived_at,
                        )}`
                      : "Doctor arrival has been confirmed."
                    : `Arrival has not been marked for ${dayjs(
                        selectedDate,
                      ).format("DD MMMM YYYY")}.`}
                </Text>
              </div>

              <div className="doctor-arrival-action">
                {doctorArrived ? (
                  <Tag
                    color="success"
                    icon={
                      <CheckCircleOutlined />
                    }
                    className="doctor-arrival-status-tag"
                  >
                    ARRIVED
                  </Tag>
                ) : (
                  <Button
                    type="primary"
                    icon={
                      <CheckCircleOutlined />
                    }
                    loading={
                      markingDoctorArrival
                    }
                    disabled={
                      markingDoctorArrival
                    }
                    onClick={
                      handleMarkDoctorArrived
                    }
                    className="doctor-arrived-button"
                  >
                    MARK DOCTOR ARRIVED
                  </Button>
                )}
              </div>
            </div>
          </Spin>
        </section>

        <section className="appointment-cards-section">
          {/* =====================================================
              WAITING PATIENTS

              This stays separate from normal filters.
          ===================================================== */}

          {waitingAppointments.length > 0 && (
            <div className="waiting-patients-section">
              <div className="waiting-patients-header">
                <div className="waiting-patients-title-wrapper">
                  <div className="waiting-patients-icon">
                    <ClockCircleOutlined />
                  </div>

                  <div>
                    <Title
                      level={4}
                      className="waiting-patients-title"
                    >
                      Waiting Patients
                    </Title>

                    <Text className="waiting-patients-subtitle">
                      Patients currently kept in
                      the waiting queue
                    </Text>
                  </div>
                </div>

                <Tag color="gold">
                  {waitingAppointments.length}{" "}
                  Waiting
                </Tag>
              </div>

              <div
                className={`appointment-card-layout waiting-patients-layout view-${viewMode}`}
              >
                {waitingAppointments.map(
                  renderAppointmentCard,
                )}
              </div>
            </div>
          )}

          {/* =====================================================
              TOOLBAR
          ===================================================== */}

          <div className="appointment-toolbar">
            <div className="appointment-search-wrapper">
              <Input
                allowClear
                value={searchValue}
                prefix={<SearchOutlined />}
                placeholder="Search number, patient, phone or reason"
                className="appointment-search-input"
                onChange={(event) =>
                  setSearchValue(
                    event.target.value,
                  )
                }
              />
            </div>

            <Select
              value={distanceSort}
              options={DISTANCE_SORT_OPTIONS}
              onChange={setDistanceSort}
              popupMatchSelectWidth={false}
              suffixIcon={
                <EnvironmentOutlined />
              }
              className="appointment-distance-sort"
              style={{
                minWidth: 180,
              }}
            />

            <div className="appointment-filter-scroll">
              <Segmented
                value={statusFilter}
                options={
                  filterOptionsWithCounts
                }
                className="appointment-status-filter"
                onChange={setStatusFilter}
              />
            </div>
          </div>

          {/* =====================================================
              MAIN APPOINTMENTS
          ===================================================== */}

          <Spin spinning={loading}>
            {mainFilteredAppointments.length ===
            0 ? (
              <div className="appointments-empty">
                <Empty
                  image={
                    Empty.PRESENTED_IMAGE_SIMPLE
                  }
                  description={
                    statusFilter === "Waiting" &&
                    waitingAppointments.length >
                      0
                      ? "Waiting patients are shown in the Waiting Patients section above"
                      : searchValue ||
                          statusFilter !==
                            "All"
                        ? "No appointments match the selected filters"
                        : "No appointments found for the selected date"
                  }
                />

                {(searchValue ||
                  statusFilter !== "All") && (
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
                {mainFilteredAppointments.map(
                  renderAppointmentCard,
                )}
              </div>
            )}
          </Spin>
        </section>

        {/* =====================================================
            DETAILS DRAWER
        ===================================================== */}

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

                <Title
                  level={5}
                  className="drawer-title"
                >
                  Number{" "}
                  {selectedAppointmentNumber}
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

                  normalizeStatus(
                    selectedAppointment.status,
                  ) === "completed"
                    ? "drawer-completed-hero"
                    : "",

                  selectedIsWaiting
                    ? "drawer-waiting-hero"
                    : "",

                  isCancelledStatus(
                    selectedAppointment.status,
                  )
                    ? "drawer-cancelled-hero"
                    : "",
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
                      STATUS_COLORS[
                        selectedEffectiveStatus
                      ] || "default"
                    }
                    className="drawer-status-tag"
                  >
                    {selectedEffectiveStatus ||
                      "Pending"}
                  </Tag>
                </div>
              </div>

              {selectedIsWaiting && (
                <div className="drawer-waiting-message">
                  <ClockCircleOutlined />

                  <div>
                    <Text className="drawer-waiting-title">
                      Patient is currently
                      waiting
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
                  {getAppointmentId(
                    selectedAppointment,
                  ) || "-"}
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <UserOutlined />

                      Patient ID
                    </Space>
                  }
                >
                  {selectedAppointment.patient_id ||
                    "-"}
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <PhoneOutlined />

                      Phone
                    </Space>
                  }
                >
                  {selectedAppointment.phone ||
                    "-"}
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <EnvironmentOutlined />

                      Location
                    </Space>
                  }
                >
                  {selectedAppointment.patient_location ||
                    "-"}
                </Descriptions.Item>

                <Descriptions.Item label="Distance">
                  {selectedAppointment.patient_distance_km !==
                    "" &&
                  selectedAppointment.patient_distance_km !==
                    null &&
                  selectedAppointment.patient_distance_km !==
                    undefined
                    ? `${selectedAppointment.patient_distance_km} km`
                    : "-"}
                </Descriptions.Item>

                <Descriptions.Item label="Age">
                  {selectedAppointment.patient_age ||
                    "-"}
                </Descriptions.Item>

                <Descriptions.Item label="Gender">
                  {selectedAppointment.patient_gender ||
                    "-"}
                </Descriptions.Item>

                <Descriptions.Item label="Address">
                  {selectedAppointment.patient_address ||
                    "-"}
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
                      ).format(
                        "DD MMMM YYYY",
                      )
                    : dayjs(
                        selectedDate,
                      ).format(
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

              {normalizeStatus(
                selectedAppointment.status,
              ) === "completed" && (
                <div className="drawer-completed-message">
                  <CheckCircleFilled />

                  <div>
                    <Text className="drawer-completed-title">
                      Visit Completed
                    </Text>

                    <Text className="drawer-completed-description">
                      This appointment has been
                      successfully completed.
                    </Text>
                  </div>
                </div>
              )}

              {isCancelledStatus(
                selectedAppointment.status,
              ) && (
                <Alert
                  type="error"
                  showIcon
                  style={{
                    marginTop: 16,
                  }}
                  message="Appointment Cancelled"
                  description={`Appointment No. ${selectedAppointmentNumber} can either be checked in again or assigned to another later appointment.`}
                />
              )}

              {(selectedAction ||
                selectedWaitingAction) && (
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

        {/* =====================================================
            REASSIGN NUMBER MODAL
        ===================================================== */}

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
            disabled:
              !reassignTargetAppointmentId,
          }}
          onOk={
            handleReassignAppointmentNumber
          }
          onCancel={() => {
            if (reassigningNumber) {
              return;
            }

            setReassignModalOpen(false);

            setReassignSourceAppointment(
              null,
            );

            setReassignTargetAppointmentId(
              null,
            );
          }}
        >
          <div className="reassign-number-modal-content">
            {reassignSourceAppointment && (
              <div className="reassign-source-number">
                <Text type="secondary">
                  Available appointment number
                </Text>

                <div className="reassign-big-number">
                  {getAppointmentNumber(
                    reassignSourceAppointment,
                  )}
                </div>

                <Text type="secondary">
                  This number became available
                  because{" "}
                  <strong>
                    {reassignSourceAppointment.patient_name ||
                      reassignSourceAppointment.patient_id ||
                      "Unknown Patient"}
                  </strong>{" "}
                  cancelled the appointment.
                </Text>
              </div>
            )}

            <div className="reassign-target-section">
              <Text strong>
                Select an appointment after No.{" "}
                {reassignSourceAppointment
                  ? getAppointmentNumber(
                      reassignSourceAppointment,
                    )
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
                Only appointments after the
                cancelled position are available.
              </Text>

              <Select
                showSearch
                allowClear
                value={
                  reassignTargetAppointmentId
                }
                placeholder={
                  availableReassignAppointments.length >
                  0
                    ? "Select appointment"
                    : "No later appointments available"
                }
                className="reassign-appointment-select"
                optionFilterProp="label"
                disabled={
                  availableReassignAppointments.length ===
                  0
                }
                onChange={
                  setReassignTargetAppointmentId
                }
                options={availableReassignAppointments.map(
                  (appointment) => ({
                    value:
                      getAppointmentId(
                        appointment,
                      ),

                    label: `No. ${getAppointmentNumber(
                      appointment,
                    )} - ${
                      appointment.patient_name ||
                      appointment.patient_id ||
                      "Unknown Patient"
                    } - ${
                      appointment.status ||
                      "Pending"
                    }`,
                  }),
                )}
              />

              {availableReassignAppointments.length ===
                0 &&
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

            {reassignTargetAppointmentId && (
              <div className="reassign-number-warning">
                {(() => {
                  const targetAppointment =
                    availableReassignAppointments.find(
                      (appointment) =>
                        String(
                          getAppointmentId(
                            appointment,
                          ),
                        ) ===
                        String(
                          reassignTargetAppointmentId,
                        ),
                    );

                  if (!targetAppointment) {
                    return null;
                  }

                  return (
                    <>
                      <strong>
                        {targetAppointment.patient_name ||
                          targetAppointment.patient_id ||
                          "Selected Patient"}
                      </strong>{" "}
                      currently has appointment
                      No.{" "}
                      <strong>
                        {getAppointmentNumber(
                          targetAppointment,
                        )}
                      </strong>
                      .
                      <br />
                      <br />
                      This patient will receive
                      appointment No.{" "}
                      <strong>
                        {reassignSourceAppointment
                          ? getAppointmentNumber(
                              reassignSourceAppointment,
                            )
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
      </div>
    </ClinicPage>
  );
};

export default AppointmentMaintenance;