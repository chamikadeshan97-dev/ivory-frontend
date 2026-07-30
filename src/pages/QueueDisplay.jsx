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

import { getAppointmentsByDate } from "../api/endPoints";

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

  return String(value);
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

/*
 * Converts different time values into a
 * comparable numeric value.
 *
 * Supported examples:
 *
 * 08:30
 * 08:30:00
 * 8:30 AM
 * 2026-07-28T08:30:00
 */
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

/* ========================================================
   Status display helpers
======================================================== */

const getDisplayStatus = (appointment) => {
  const normalizedStatus = normalizeStatus(appointment?.status);

  if (TREATMENT_COMPLETED_STATUSES.includes(normalizedStatus)) {
    return {
      key: "treatment-done",
      label: "Done",
      IconComponent: CheckCircleOutlined,
    };
  }

  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    return {
      key: "cancelled",
      label: "Cancelled",
      IconComponent: CloseCircleOutlined,
    };
  }

  if (normalizedStatus === "in treatment") {
    return {
      key: "in-treatment",
      label: "In Treatment",
      IconComponent: MedicineBoxOutlined,
    };
  }

  if (normalizedStatus === "checked in") {
    return {
      key: "checked-in",
      label: "Checked In",
      IconComponent: UserOutlined,
    };
  }

  return {
    key: "pending",
    label: "Pending",
    IconComponent: ClockCircleOutlined,
  };
};

/*
 * Creates one separate scrolling item for every
 * appointment.
 *
 * Appointments are not merged when they have the
 * same status.
 */
const createTickerItems = (appointmentRecords) => {
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
      const displayStatus = getDisplayStatus(appointment);

      return {
        appointmentId: getAppointmentId(appointment),

        appointmentNumber: getNumericAppointmentNumber(appointment),

        statusKey: displayStatus.key,

        statusLabel: displayStatus.label,

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

const QueuePatientPanel = ({ type, appointment }) => {
  const isTreatment = type === "treatment";

  const panelTitle = isTreatment ? "TREATMENT ROOM" : "PLEASE PREPARE";

  const panelSubtitle = isTreatment ? "Now Serving" : "Next Patient";

  const numberStatus = isTreatment ? "NOW BEING TREATED" : "PLEASE BE READY";

  const patientMessage = isTreatment
    ? "Your treatment is currently in progress."
    : "Please remain close to the waiting area.";

  const emptyTitle = isTreatment
    ? "No Patient Being Treated"
    : "No Patient Currently Waiting";

  const emptyDescription = isTreatment
    ? "The next patient will be called shortly."
    : "Please wait for the next appointment update.";

  const PanelIcon = isTreatment ? UserOutlined : ClockCircleOutlined;

  return (
    <section
      className={[
        "queue-patient-panel",
        isTreatment ? "queue-treatment-panel" : "queue-ready-panel",
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
            <Text className="queue-number-caption">QUEUE NUMBER</Text>

            <div className="queue-number-circle-wrapper" aria-live="polite">
              <div className="queue-number-circle">
                <span>{getAppointmentNumber(appointment)}</span>
              </div>
            </div>

            <div className="queue-number-status">{numberStatus}</div>

            <Text className="queue-number-message">{patientMessage}</Text>
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
   Bottom scrolling queue item
======================================================== */

const QueueScrollerItem = ({ item, currentTreatmentPatient, readyPatient }) => {
  const itemAppointmentNumber = String(item?.appointmentNumber ?? "").trim();

  const treatmentAppointmentNumber = String(
    getAppointmentNumber(currentTreatmentPatient),
  ).trim();

  const readyAppointmentNumber = String(
    getAppointmentNumber(readyPatient),
  ).trim();

  const isCurrentTreatment =
    currentTreatmentPatient &&
    treatmentAppointmentNumber !== "-" &&
    treatmentAppointmentNumber === itemAppointmentNumber;

  const isReadyPatient =
    readyPatient &&
    readyAppointmentNumber !== "-" &&
    readyAppointmentNumber === itemAppointmentNumber;

  const isHighlighted = isCurrentTreatment || isReadyPatient;

  return (
    <div
      className={[
        "queue-scroller-item",
        `queue-scroller-item-${item.statusKey}`,
        isHighlighted ? "queue-scroller-item-highlighted" : "",
        isCurrentTreatment ? "queue-scroller-item-current-treatment" : "",
        isReadyPatient ? "queue-scroller-item-ready-patient" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isCurrentTreatment && (
        <div className="queue-scroller-highlight-badge queue-scroller-treatment-badge">
          NOW SERVING
        </div>
      )}

      {isReadyPatient && (
        <div className="queue-scroller-highlight-badge queue-scroller-ready-badge">
          NEXT PATIENT
        </div>
      )}
{!isReadyPatient  && !isCurrentTreatment && (
          <Text className="queue-scroller-status">{item.statusLabel}</Text>
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

  const [loading, setLoading] = useState(true);

  const [hasLoadedAppointments, setHasLoadedAppointments] = useState(false);

  const [loadError, setLoadError] = useState("");

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const [lockedReadyPatientId, setLockedReadyPatientId] = useState(null);

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
     Restore the ready-patient lock
  ------------------------------------------------------ */

  useEffect(() => {
    let savedPatientId = null;

    try {
      savedPatientId = window.localStorage.getItem(readyPatientStorageKey);
    } catch {
      savedPatientId = null;
    }

    setReadyPatientLockDate(selectedDate);

    setLockedReadyPatientId(normalizeIdentifier(savedPatientId));
  }, [readyPatientStorageKey, selectedDate]);

  /* ------------------------------------------------------
     Save the ready-patient lock
  ------------------------------------------------------ */

  useEffect(() => {
    if (readyPatientLockDate !== selectedDate) {
      return;
    }

    try {
      if (lockedReadyPatientId) {
        window.localStorage.setItem(
          readyPatientStorageKey,
          lockedReadyPatientId,
        );
      } else {
        window.localStorage.removeItem(readyPatientStorageKey);
      }
    } catch {
      /*
       * Continue normally when local storage
       * is unavailable.
       */
    }
  }, [
    lockedReadyPatientId,
    readyPatientLockDate,
    readyPatientStorageKey,
    selectedDate,
  ]);

  /* ------------------------------------------------------
     Load appointments
  ------------------------------------------------------ */

  const loadAppointments = useCallback(async () => {
    try {
      setLoadError("");

      const response = await getAppointmentsByDate(selectedDate);

      const appointmentRecords = extractAppointments(response);

      setAppointments(appointmentRecords);
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
    }, 5000);

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
     Checked-in patients
  ------------------------------------------------------ */

  const checkedInPatients = useMemo(() => {
    return visibleAppointments
      .filter((appointment) => {
        return normalizeStatus(appointment?.status) === "checked in";
      })
      .sort(sortCheckedInPatients);
  }, [visibleAppointments]);

  /* ------------------------------------------------------
     Keep the ready patient locked
  ------------------------------------------------------ */

  useEffect(() => {
    if (!hasLoadedAppointments) {
      return;
    }

    if (readyPatientLockDate !== selectedDate) {
      return;
    }

    setLockedReadyPatientId((currentPatientId) => {
      const normalizedCurrentPatientId = normalizeIdentifier(currentPatientId);

      const currentPatientStillWaiting = checkedInPatients.some(
        (appointment) => {
          return getAppointmentId(appointment) === normalizedCurrentPatientId;
        },
      );

      if (normalizedCurrentPatientId && currentPatientStillWaiting) {
        return normalizedCurrentPatientId;
      }

      const nextWaitingPatient = checkedInPatients[0];

      return getAppointmentId(nextWaitingPatient) || null;
    });
  }, [
    checkedInPatients,
    hasLoadedAppointments,
    readyPatientLockDate,
    selectedDate,
  ]);

  /* ------------------------------------------------------
     Ready patient
  ------------------------------------------------------ */

  const readyPatient = useMemo(() => {
    if (!lockedReadyPatientId) {
      return null;
    }

    return (
      checkedInPatients.find((appointment) => {
        return (
          getAppointmentId(appointment) ===
          normalizeIdentifier(lockedReadyPatientId)
        );
      }) || null
    );
  }, [checkedInPatients, lockedReadyPatientId]);

  /* ------------------------------------------------------
     Individual scrolling queue items
  ------------------------------------------------------ */

  const tickerItems = useMemo(() => {
    return createTickerItems(visibleAppointments);
  }, [visibleAppointments]);

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
              Dental Clinic Queue
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
          <main className="queue-display-main">
            <QueuePatientPanel
              type="treatment"
              appointment={currentTreatmentPatient}
            />

            <QueuePatientPanel type="ready" appointment={readyPatient} />
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
                        readyPatient={readyPatient}
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
                        readyPatient={readyPatient}
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
