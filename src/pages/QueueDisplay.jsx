import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Spin, Typography } from "antd";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  MedicineBoxOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { getAllWaitingRecords, getAppointmentsByDate } from "../api/endPoints";

import "./css/QueueDisplay.css";

const { Title, Text } = Typography;

/* ========================================================
   Status configuration
======================================================== */

const TREATMENT_COMPLETED_STATUSES = [
  "treatment done",
  "treatment completed",
  "payment pending",
  "paid",
  "completed",
];

const VISIBLE_STATUSES = [
  "pending",
  "confirmed",
  "checked in",
  "in treatment",
  ...TREATMENT_COMPLETED_STATUSES,
  "cancelled",
  "canceled",
];

const LOCKED_PATIENT_COUNT = 2;

const READY_PATIENT_STORAGE_PREFIX = "queue-display-ready-patient";

/* ========================================================
   General helpers
======================================================== */

const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .toLowerCase();
};

const normalizeIdentifier = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value).trim();
};

const getAppointmentId = (appointment) => {
  return normalizeIdentifier(appointment?.appointment_id ?? appointment?.id);
};

const getAppointmentNumber = (appointment) => {
  const appointmentNumber =
    appointment?.appointment_number ??
    appointment?.queue_number ??
    appointment?.number;

  if (
    appointmentNumber === null ||
    appointmentNumber === undefined ||
    appointmentNumber === ""
  ) {
    return "-";
  }

  return appointmentNumber;
};

const getNumericAppointmentNumber = (appointment) => {
  const appointmentNumber = Number(getAppointmentNumber(appointment));

  if (!Number.isFinite(appointmentNumber)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return appointmentNumber;
};

const formatDateForApi = (date) => {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date) => {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatDisplayTime = (date) => {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
};

const formatWaitingDuration = (startTime, currentTime = new Date()) => {
  if (!startTime) {
    return "00:00";
  }

  const normalizedValue = String(startTime).trim();

  let parsedStartTime = null;

  const timeOnlyMatch = normalizedValue.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i,
  );

  if (timeOnlyMatch) {
    let hours = Number(timeOnlyMatch[1]);

    const minutes = Number(timeOnlyMatch[2]);

    const seconds = Number(timeOnlyMatch[3] || 0);

    const meridiem = String(timeOnlyMatch[4] || "").toUpperCase();

    if (meridiem === "AM" && hours === 12) {
      hours = 0;
    }

    if (meridiem === "PM" && hours < 12) {
      hours += 12;
    }

    parsedStartTime = new Date(currentTime);

    parsedStartTime.setHours(hours, minutes, seconds, 0);
  } else {
    const parsedDate = new Date(normalizedValue);

    if (!Number.isNaN(parsedDate.getTime())) {
      parsedStartTime = parsedDate;
    }
  }

  if (!parsedStartTime) {
    return "00:00";
  }

  const elapsedMilliseconds = currentTime.getTime() - parsedStartTime.getTime();

  const elapsedSeconds = Math.max(0, Math.floor(elapsedMilliseconds / 1000));

  const minutes = Math.floor(elapsedSeconds / 60);

  const seconds = elapsedSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
};

const getAppointmentTimeValue = (appointment) => {
  return appointment?.appointment_time || "";
};

const getCheckedInTimeValue = (appointment) => {
  return (
    appointment?.checked_in_time ||
    appointment?.appointment_time ||
    appointment?.updated_at ||
    ""
  );
};

const getComparableTimeValue = (value) => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timeMatch = normalizedValue.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i,
  );

  if (timeMatch) {
    let hours = Number(timeMatch[1]);

    const minutes = Number(timeMatch[2]);

    const seconds = Number(timeMatch[3] || 0);

    const meridiem = String(timeMatch[4] || "").toUpperCase();

    if (meridiem === "AM" && hours === 12) {
      hours = 0;
    }

    if (meridiem === "PM" && hours < 12) {
      hours += 12;
    }

    return hours * 60 * 60 + minutes * 60 + seconds;
  }

  const dateTimeValue = Date.parse(normalizedValue);

  if (Number.isFinite(dateTimeValue)) {
    return dateTimeValue;
  }

  return Number.MAX_SAFE_INTEGER;
};

const arraysAreEqual = (firstArray, secondArray) => {
  if (firstArray.length !== secondArray.length) {
    return false;
  }

  return firstArray.every(
    (value, index) => String(value) === String(secondArray[index]),
  );
};

const parseLockedPatientIds = (storedValue) => {
  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (Array.isArray(parsedValue)) {
      return parsedValue
        .map(normalizeIdentifier)
        .filter(Boolean)
        .slice(0, LOCKED_PATIENT_COUNT);
    }

    const singleValue = normalizeIdentifier(parsedValue);

    return singleValue ? [singleValue] : [];
  } catch {
    /*
     * Backward compatibility for the old storage format,
     * where one appointment ID was stored as plain text.
     */
    const singleValue = normalizeIdentifier(storedValue);

    return singleValue ? [singleValue] : [];
  }
};

/* ========================================================
   Waiting helpers
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

const getWaitingAppointmentId = (waitingRecord) => {
  return normalizeIdentifier(
    waitingRecord?.id ?? waitingRecord?.appointment_id,
  );
};

const isActiveWaitingRecord = (waitingRecord) => {
  const appointmentId = getWaitingAppointmentId(waitingRecord);

  const startTime = String(waitingRecord?.start_time ?? "").trim();

  const endTime = String(waitingRecord?.end_time ?? "").trim();

  return Boolean(appointmentId && startTime && !endTime);
};

/* ========================================================
   Sorting helpers
======================================================== */

const sortCheckedInPatients = (firstAppointment, secondAppointment) => {
  const firstTime = getComparableTimeValue(
    getCheckedInTimeValue(firstAppointment),
  );

  const secondTime = getComparableTimeValue(
    getCheckedInTimeValue(secondAppointment),
  );

  const timeComparison = firstTime - secondTime;

  if (timeComparison !== 0) {
    return timeComparison;
  }

  return (
    getNumericAppointmentNumber(firstAppointment) -
    getNumericAppointmentNumber(secondAppointment)
  );
};

const sortByAppointmentNumber = (firstAppointment, secondAppointment) => {
  const numberComparison =
    getNumericAppointmentNumber(firstAppointment) -
    getNumericAppointmentNumber(secondAppointment);

  if (numberComparison !== 0) {
    return numberComparison;
  }

  return (
    getComparableTimeValue(getAppointmentTimeValue(firstAppointment)) -
    getComparableTimeValue(getAppointmentTimeValue(secondAppointment))
  );
};

const sortByHighestAppointmentNumber = (
  firstAppointment,
  secondAppointment,
) => {
  return (
    getNumericAppointmentNumber(secondAppointment) -
    getNumericAppointmentNumber(firstAppointment)
  );
};

/* ========================================================
   Status display helpers
======================================================== */

const getDisplayStatus = (appointment, waitingRecord) => {
  if (waitingRecord) {
    return {
      key: "waiting",
      label: "Waiting",
      IconComponent: ClockCircleOutlined,
      waitingStartTime: waitingRecord.start_time || "",
    };
  }

  const normalizedStatus = normalizeStatus(appointment?.status);

  if (TREATMENT_COMPLETED_STATUSES.includes(normalizedStatus)) {
    return {
      key: "treatment-done",
      label: "Done",
      IconComponent: CheckCircleOutlined,
      waitingStartTime: "",
    };
  }

  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    return {
      key: "cancelled",
      label: "Cancelled",
      IconComponent: CloseCircleOutlined,
      waitingStartTime: "",
    };
  }

  if (normalizedStatus === "in treatment") {
    return {
      key: "in-treatment",
      label: "In Treatment",
      IconComponent: MedicineBoxOutlined,
      waitingStartTime: "",
    };
  }

  if (normalizedStatus === "checked in") {
    return {
      key: "checked-in",
      label: "Checked In",
      IconComponent: UserOutlined,
      waitingStartTime: "",
    };
  }

  return {
    key: "pending",
    label: "Pending",
    IconComponent: ClockCircleOutlined,
    waitingStartTime: "",
  };
};

const createTickerItems = (appointmentRecords, waitingRecordMap) => {
  const uniqueAppointments = new Map();

  appointmentRecords.forEach((appointment, index) => {
    const appointmentNumber = getNumericAppointmentNumber(appointment);

    if (appointmentNumber === Number.MAX_SAFE_INTEGER) {
      return;
    }

    const appointmentId = getAppointmentId(appointment);

    const uniqueKey = appointmentId || `${appointmentNumber}-${index}`;

    uniqueAppointments.set(uniqueKey, appointment);
  });

  return Array.from(uniqueAppointments.values())
    .map((appointment) => {
      const appointmentId = getAppointmentId(appointment);

      const waitingRecord = appointmentId
        ? waitingRecordMap.get(appointmentId)
        : null;

      const displayStatus = getDisplayStatus(appointment, waitingRecord);

      return {
        appointmentId,

        appointmentNumber: getNumericAppointmentNumber(appointment),

        statusKey: displayStatus.key,

        statusLabel: displayStatus.label,

        waitingStartTime: displayStatus.waitingStartTime,

        IconComponent: displayStatus.IconComponent,
      };
    })
    .sort((firstAppointment, secondAppointment) => {
      return (
        firstAppointment.appointmentNumber - secondAppointment.appointmentNumber
      );
    });
};

/* ========================================================
   API response helper
======================================================== */

const extractAppointments = (response) => {
  const responseData = response?.data ?? response;

  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.appointments)) {
    return responseData.appointments;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  return [];
};

/* ========================================================
   Main patient panel
======================================================== */

const QueuePatientPanel = ({ type, appointment, readyPosition = null }) => {
  const isTreatment = type === "treatment";

  const isSecondReadyPatient = !isTreatment && readyPosition === 1;

  const panelTitle = isTreatment
    ? "TREATMENT ROOM"
    : isSecondReadyPatient
      ? "UPCOMING PATIENT"
      : "PLEASE PREPARE";

  const panelSubtitle = isTreatment
    ? "Now Serving"
    : isSecondReadyPatient
      ? "Next Patient 2"
      : "Next Patient 1";

  const numberStatus = isTreatment
    ? "NOW BEING TREATED"
    : isSecondReadyPatient
      ? "PLEASE REMAIN READY"
      : "PLEASE BE READY";

  const emptyTitle = isTreatment
    ? "No Patient Being Treated"
    : isSecondReadyPatient
      ? "No Second Patient Ready"
      : "No Patient Currently Waiting";

  const emptyDescription = isTreatment
    ? "The next patient will be called shortly."
    : isSecondReadyPatient
      ? "The second ready patient will appear here."
      : "Please wait for the next appointment update.";

  const PanelIcon = isTreatment ? MedicineBoxOutlined : ClockCircleOutlined;

  return (
    <section
      className={[
        "queue-patient-panel",
        isTreatment ? "queue-treatment-panel" : "queue-ready-panel",
        isSecondReadyPatient ? "queue-ready-panel-secondary" : "",
        appointment
          ? "queue-patient-panel-active"
          : "queue-patient-panel-empty",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="queue-patient-panel-header">
        <div className="queue-panel-header-content">
          <div className="queue-panel-icon">
            <PanelIcon />
          </div>

          <div className="queue-panel-heading">
            <Text className="queue-panel-title">{panelTitle}</Text>

            <Title level={2} className="queue-panel-subtitle">
              {panelSubtitle}
            </Title>
          </div>
        </div>
      </div>

      <div className="queue-patient-panel-body">
        {appointment ? (
          <div className="queue-number-content">
            <Text className="queue-number-caption" />

            <div className="queue-number-circle-wrapper" aria-live="polite">
              <div className="queue-number-circle">
                <span>{getAppointmentNumber(appointment)}</span>
              </div>
            </div>

            <div className="queue-number-status">{numberStatus}</div>
          </div>
        ) : (
          <div className="queue-panel-empty-content">
            <div className="queue-panel-empty-icon">
              <UserOutlined />
            </div>

            <Text className="queue-panel-empty-title">{emptyTitle}</Text>

            <Text className="queue-panel-empty-description">
              {emptyDescription}
            </Text>
          </div>
        )}
      </div>
    </section>
  );
};

/* ========================================================
   Highest completed queue panel
======================================================== */

const CompletedQueuePanel = ({ appointment }) => {
  return (
    <section
      className={[
        "queue-patient-panel",
        "queue-completed-panel",
        appointment
          ? "queue-patient-panel-active"
          : "queue-patient-panel-empty",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="queue-patient-panel-header">
        <div className="queue-panel-header-content">
          <div className="queue-panel-icon">
            <CheckCircleOutlined />
          </div>

          <div className="queue-panel-heading">
            <Text className="queue-panel-title">COMPLETED</Text>

            <Title level={2} className="queue-panel-subtitle">
              Last Completed
            </Title>
          </div>
        </div>
      </div>

      <div className="queue-patient-panel-body">
        {appointment ? (
          <div className="queue-number-content">
            <Text className="queue-number-caption" />

            <div className="queue-number-circle-wrapper" aria-live="polite">
              <div className="queue-number-circle">
                <span>{getAppointmentNumber(appointment)}</span>
              </div>
            </div>

            <div className="queue-number-status">TREATMENT COMPLETED</div>
          </div>
        ) : (
          <div className="queue-panel-empty-content">
            <div className="queue-panel-empty-icon">
              <CheckCircleOutlined />
            </div>

            <Text className="queue-panel-empty-title">
              No Completed Treatments
            </Text>
          </div>
        )}
      </div>
    </section>
  );
};

/* ========================================================
   Bottom scrolling queue item
======================================================== */

const QueueScrollerItem = ({
  item,
  currentTreatmentPatient,
  readyPatients,
  currentDateTime,
}) => {
  const ItemIcon = item?.IconComponent || ClockCircleOutlined;

  const itemAppointmentId = normalizeIdentifier(item?.appointmentId);

  const treatmentAppointmentId = getAppointmentId(currentTreatmentPatient);

  const readyPatientPosition = readyPatients.findIndex((appointment) => {
    return getAppointmentId(appointment) === itemAppointmentId;
  });

  const isCurrentTreatment = Boolean(
    currentTreatmentPatient &&
    treatmentAppointmentId &&
    treatmentAppointmentId === itemAppointmentId,
  );

  const isReadyPatient = readyPatientPosition !== -1;

  const isFirstReadyPatient = readyPatientPosition === 0;

  const isSecondReadyPatient = readyPatientPosition === 1;

  const isWaiting = item?.statusKey === "waiting";

  const isHighlighted = isCurrentTreatment || isReadyPatient;

  return (
    <div
      className={[
        "queue-scroller-item",
        `queue-scroller-item-${item.statusKey}`,
        isHighlighted ? "queue-scroller-item-highlighted" : "",
        isCurrentTreatment ? "queue-scroller-item-current-treatment" : "",
        isReadyPatient ? "queue-scroller-item-ready-patient" : "",
        isFirstReadyPatient ? "queue-scroller-item-ready-patient-first" : "",
        isSecondReadyPatient ? "queue-scroller-item-ready-patient-second" : "",
        isWaiting ? "queue-scroller-item-waiting" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isCurrentTreatment && (
        <div className="queue-scroller-highlight-badge queue-scroller-treatment-badge">
          NOW SERVING
        </div>
      )}

      {isFirstReadyPatient && (
        <div className="queue-scroller-highlight-badge queue-scroller-ready-badge">
          NEXT 1
        </div>
      )}

      {isSecondReadyPatient && (
        <div className="queue-scroller-highlight-badge queue-scroller-ready-badge queue-scroller-ready-badge-secondary">
          NEXT 2
        </div>
      )}

      {isWaiting && (
        <div className="queue-scroller-waiting-content">
          <Text className="queue-scroller-status queue-scroller-waiting-status">
            <ItemIcon />

            <span>WAITING</span>
          </Text>

          <Text className="queue-scroller-waiting-time">
            Waiting{" "}
            {formatWaitingDuration(item.waitingStartTime, currentDateTime)}
          </Text>
        </div>
      )}

      {!isWaiting && !isReadyPatient && !isCurrentTreatment && (
        <Text className="queue-scroller-status">
          <ItemIcon />

          <span>{item.statusLabel}</span>
        </Text>
      )}

      <div className="queue-scroller-number">{item.appointmentNumber}</div>
    </div>
  );
};

/* ========================================================
   QueueDisplay component
======================================================== */

const QueueDisplay = ({ embedded = false }) => {
  const [appointments, setAppointments] = useState([]);

  const [waitingRecords, setWaitingRecords] = useState([]);

  const [loading, setLoading] = useState(true);

  const [hasLoadedAppointments, setHasLoadedAppointments] = useState(false);

  const [loadError, setLoadError] = useState("");

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const [lockedReadyPatientIds, setLockedReadyPatientIds] = useState([]);

  const [readyPatientLockDate, setReadyPatientLockDate] = useState(null);

  const selectedDate = useMemo(() => {
    return formatDateForApi(currentDateTime);
  }, [currentDateTime]);

  const readyPatientStorageKey = useMemo(() => {
    return `${READY_PATIENT_STORAGE_PREFIX}:${selectedDate}`;
  }, [selectedDate]);

  /* ------------------------------------------------------
     Live clock
  ------------------------------------------------------ */

  useEffect(() => {
    const clockInterval = window.setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(clockInterval);
    };
  }, []);

  /* ------------------------------------------------------
     Restore the ready-patient locks
  ------------------------------------------------------ */

  useEffect(() => {
    let savedPatientIds = [];

    try {
      const storedValue = window.localStorage.getItem(readyPatientStorageKey);

      savedPatientIds = parseLockedPatientIds(storedValue);
    } catch {
      savedPatientIds = [];
    }

    setReadyPatientLockDate(selectedDate);

    setLockedReadyPatientIds(savedPatientIds);
  }, [readyPatientStorageKey, selectedDate]);

  /* ------------------------------------------------------
     Save the ready-patient locks
  ------------------------------------------------------ */

  useEffect(() => {
    if (readyPatientLockDate !== selectedDate) {
      return;
    }

    try {
      if (lockedReadyPatientIds.length > 0) {
        window.localStorage.setItem(
          readyPatientStorageKey,
          JSON.stringify(lockedReadyPatientIds),
        );
      } else {
        window.localStorage.removeItem(readyPatientStorageKey);
      }
    } catch {
      // Continue when local storage is unavailable.
    }
  }, [
    lockedReadyPatientIds,
    readyPatientLockDate,
    readyPatientStorageKey,
    selectedDate,
  ]);

  /* ------------------------------------------------------
     Listen for lock changes from Appointment Maintenance
  ------------------------------------------------------ */

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key !== readyPatientStorageKey) {
        return;
      }

      const updatedIds = parseLockedPatientIds(event.newValue);

      setLockedReadyPatientIds(updatedIds);
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [readyPatientStorageKey]);

  /* ------------------------------------------------------
     Load appointments and waiting records
  ------------------------------------------------------ */

  const loadAppointments = useCallback(async () => {
    try {
      setLoadError("");

      const [appointmentsResponse, waitingResponse] = await Promise.all([
        getAppointmentsByDate(selectedDate),
        getAllWaitingRecords(),
      ]);

      const appointmentRecords = extractAppointments(appointmentsResponse);

      const waitingList = extractWaitingRecords(waitingResponse);

      setAppointments(appointmentRecords);

      setWaitingRecords(waitingList);
    } catch (error) {
      console.error("Error loading queue appointments:", error);

      setLoadError(
        "Unable to load the patient queue. Reconnecting automatically.",
      );
    } finally {
      setLoading(false);

      setHasLoadedAppointments(true);
    }
  }, [selectedDate]);

  useEffect(() => {
    setLoading(true);

    setHasLoadedAppointments(false);

    loadAppointments();

    const refreshInterval = window.setInterval(() => {
      loadAppointments();
    }, 15000);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [loadAppointments]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadAppointments();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadAppointments]);

  /* ------------------------------------------------------
     Active waiting data
  ------------------------------------------------------ */

  const activeWaitingRecords = useMemo(() => {
    return waitingRecords.filter(isActiveWaitingRecord);
  }, [waitingRecords]);

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
      const appointmentId = getAppointmentId(appointment);

      return Boolean(appointmentId && waitingRecordMap.has(appointmentId));
    },
    [waitingRecordMap],
  );

  /* ------------------------------------------------------
     Visible appointments
  ------------------------------------------------------ */

  const visibleAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const normalizedStatus = normalizeStatus(appointment?.status);

      return VISIBLE_STATUSES.includes(normalizedStatus);
    });
  }, [appointments]);

  /* ------------------------------------------------------
     Current treatment patient
  ------------------------------------------------------ */

  const inTreatmentPatients = useMemo(() => {
    return visibleAppointments
      .filter((appointment) => {
        return normalizeStatus(appointment?.status) === "in treatment";
      })
      .sort(sortByAppointmentNumber);
  }, [visibleAppointments]);

  const currentTreatmentPatient = inTreatmentPatients[0] || null;

  /* ------------------------------------------------------
     Highest completed treatment number
  ------------------------------------------------------ */

  const completedTreatmentPatients = useMemo(() => {
    return visibleAppointments
      .filter((appointment) => {
        const normalizedStatus = normalizeStatus(appointment?.status);

        return TREATMENT_COMPLETED_STATUSES.includes(normalizedStatus);
      })
      .sort(sortByHighestAppointmentNumber);
  }, [visibleAppointments]);

  const highestCompletedTreatmentPatient =
    completedTreatmentPatients[0] || null;

  /* ------------------------------------------------------
     Checked-in patients
  ------------------------------------------------------ */

  const checkedInPatients = useMemo(() => {
    return visibleAppointments
      .filter((appointment) => {
        return (
          normalizeStatus(appointment?.status) === "checked in" &&
          !isAppointmentWaiting(appointment)
        );
      })
      .sort(sortCheckedInPatients);
  }, [visibleAppointments, isAppointmentWaiting]);

  /* ------------------------------------------------------
     Keep two ready patients locked
  ------------------------------------------------------ */

  useEffect(() => {
    if (!hasLoadedAppointments) {
      return;
    }

    if (readyPatientLockDate !== selectedDate) {
      return;
    }

    setLockedReadyPatientIds((currentPatientIds) => {
      const availablePatientIds = checkedInPatients
        .map(getAppointmentId)
        .filter(Boolean);

      const validCurrentIds = currentPatientIds
        .map(normalizeIdentifier)
        .filter(
          (appointmentId) =>
            appointmentId && availablePatientIds.includes(appointmentId),
        );

      const additionalPatientIds = availablePatientIds.filter(
        (appointmentId) => !validCurrentIds.includes(appointmentId),
      );

      const effectivePatientIds = [
        ...validCurrentIds,
        ...additionalPatientIds,
      ].slice(0, LOCKED_PATIENT_COUNT);

      if (arraysAreEqual(currentPatientIds, effectivePatientIds)) {
        return currentPatientIds;
      }

      return effectivePatientIds;
    });
  }, [
    checkedInPatients,
    hasLoadedAppointments,
    readyPatientLockDate,
    selectedDate,
  ]);

  /* ------------------------------------------------------
     Ready patients
  ------------------------------------------------------ */

  const readyPatients = useMemo(() => {
    return lockedReadyPatientIds
      .map((lockedPatientId) => {
        return (
          checkedInPatients.find((appointment) => {
            return (
              getAppointmentId(appointment) ===
              normalizeIdentifier(lockedPatientId)
            );
          }) || null
        );
      })
      .filter(Boolean)
      .slice(0, LOCKED_PATIENT_COUNT);
  }, [checkedInPatients, lockedReadyPatientIds]);

  const firstReadyPatient = readyPatients[0] || null;

  const secondReadyPatient = readyPatients[1] || null;

  /* ------------------------------------------------------
     Individual scrolling queue items
  ------------------------------------------------------ */

  const tickerItems = useMemo(() => {
    return createTickerItems(visibleAppointments, waitingRecordMap);
  }, [visibleAppointments, waitingRecordMap]);

  const tickerDuration = useMemo(() => {
    const calculatedDuration = tickerItems.length * 6;

    return `${Math.max(calculatedDuration, 24)}s`;
  }, [tickerItems.length]);

  const queueLiveText = loadError ? "Reconnecting" : "Queue is live";

  /* ------------------------------------------------------
     Render
  ------------------------------------------------------ */

  return (
    <div
      className={[
        "queue-display-page",
        embedded
          ? "queue-display-page-embedded"
          : "queue-display-page-fullscreen",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="queue-display-header">
        <div className="queue-display-brand">
          <div className="queue-display-brand-icon">
            <MedicineBoxOutlined />
          </div>

          <div className="queue-display-brand-content">
            <Text className="queue-display-eyebrow">PATIENT QUEUE</Text>

            <Title level={1} className="queue-display-title">
               Dental CAD / CAM Laboratory
            </Title>

            <Text className="queue-display-subtitle">
              Please watch the screen for your queue number
            </Text>
          </div>
        </div>

        <div className="queue-display-date-time">
          <div className="queue-display-date">
            <CalendarOutlined />

            <span>{formatDisplayDate(currentDateTime)}</span>
          </div>

          <div className="queue-display-time">
            {formatDisplayTime(currentDateTime)}
          </div>

          <div
            className={[
              "queue-display-live-status",
              loadError ? "queue-display-live-status-error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="queue-display-live-dot" />

            <Text>{queueLiveText}</Text>
          </div>
        </div>
      </header>

      {loadError && (
        <div className="queue-display-error" role="alert">
          <CloseCircleOutlined />

          <Text>{loadError}</Text>
        </div>
      )}

      {loading && !hasLoadedAppointments ? (
        <div className="queue-display-loading">
          <Spin size="large" />

          <Text>Loading patient queue...</Text>
        </div>
      ) : (
        <>
          <main className="queue-display-main queue-display-main-four-panels">
            <QueuePatientPanel
              type="treatment"
              appointment={currentTreatmentPatient}
            />

            <QueuePatientPanel
              type="ready"
              readyPosition={0}
              appointment={firstReadyPatient}
            />

            <QueuePatientPanel
              type="ready"
              readyPosition={1}
              appointment={secondReadyPatient}
            />

            <CompletedQueuePanel
              appointment={highestCompletedTreatmentPatient}
            />
          </main>

          <section className="queue-bottom-scroller">
            <div className="queue-scroller-viewport">
              {tickerItems.length > 0 ? (
                <div
                  className="queue-scroller-track"
                  style={{
                    "--queue-scroll-duration": tickerDuration,
                  }}
                >
                  <div className="queue-scroller-set">
                    {tickerItems.map((item, index) => (
                      <QueueScrollerItem
                        key={`queue-original-${
                          item.appointmentId || item.appointmentNumber
                        }-${index}`}
                        item={item}
                        currentTreatmentPatient={currentTreatmentPatient}
                        readyPatients={readyPatients}
                        currentDateTime={currentDateTime}
                      />
                    ))}
                  </div>

                  <div className="queue-scroller-set" aria-hidden="true">
                    {tickerItems.map((item, index) => (
                      <QueueScrollerItem
                        key={`queue-copy-${
                          item.appointmentId || item.appointmentNumber
                        }-${index}`}
                        item={item}
                        currentTreatmentPatient={currentTreatmentPatient}
                        readyPatients={readyPatients}
                        currentDateTime={currentDateTime}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="queue-scroller-empty">
                  <ClockCircleOutlined />

                  <Text>No appointment numbers are currently available</Text>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default QueueDisplay;
