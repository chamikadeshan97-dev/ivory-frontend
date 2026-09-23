import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Alert, Spin, Typography } from "antd";

import {
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  MedicineBoxOutlined,
  MoonOutlined,
  SoundFilled,
  SunOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import { getAppointmentsByDate, getQueueOrderByDate } from "../api/endPoints";

import "./css/PatientQueueDisplay.css";

const { Title, Text } = Typography;

/* =========================================================
   CONFIG
========================================================= */

const REFRESH_INTERVAL = 10000;

const READY_PATIENT_COUNT = 2;

const UPCOMING_PATIENT_COUNT = 100;

const THEME_STORAGE_KEY = "patient-queue-display-theme";

/* =========================================================
   STATUS CONFIG
========================================================= */

const COMPLETED_STATUSES = [
  "treatment done",
  "treatment completed",
  "payment pending",
  "paid",
  "completed",
  "cancelled",
  "canceled",
];

const IN_TREATMENT_STATUSES = ["in treatment"];

/* =========================================================
   BASIC HELPERS
========================================================= */

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const clean = (value) => String(value ?? "").trim();

const getAppointmentId = (appointment) =>
  clean(appointment?.id ?? appointment?.appointment_id);

const getAppointmentNumber = (appointment) =>
  clean(appointment?.appointment_number);

const isWaitingAppointment = (appointment) =>
  normalize(appointment?.status) === "waiting";

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const extractAppointments = (response) => {
  const data = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.appointments)) {
    return data.appointments;
  }

  return [];
};

const extractQueueOrder = (response) => {
  const queueOrder =
    response?.data?.data?.queue_order ?? response?.data?.queue_order ?? [];

  if (!Array.isArray(queueOrder)) {
    return [];
  }

  return queueOrder.map((id) => clean(id));
};

/* =========================================================
   INITIAL THEME
========================================================= */

const getInitialTheme = () => {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)",
    )?.matches;

    return prefersDark ? "dark" : "light";
  } catch {
    return "dark";
  }
};

/* =========================================================
   APPOINTMENT NUMBER
========================================================= */

const AppointmentNumber = ({ appointment, className = "" }) => {
  const number = getAppointmentNumber(appointment);

  if (!appointment || !number) {
    return (
      <div
        className={["pq-number", "pq-number-empty", className]
          .filter(Boolean)
          .join(" ")}
      >
        —
      </div>
    );
  }

  return (
    <div className={["pq-number", className].filter(Boolean).join(" ")}>
      {number}
    </div>
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const PatientQueueDisplay = () => {
  /* =======================================================
     STATE
  ======================================================= */

  const [currentDateTime, setCurrentDateTime] = useState(dayjs());

  const [appointments, setAppointments] = useState([]);

  const [savedQueue, setSavedQueue] = useState([]);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState("");

  const [lastUpdated, setLastUpdated] = useState(null);

  const isFirstLoad = useRef(true);

  /* =======================================================
     THEME
  ======================================================= */

  const [themeMode, setThemeMode] = useState(getInitialTheme);

  const isDarkMode = themeMode === "dark";

  const handleThemeChange = useCallback(() => {
    setThemeMode((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark",
    );
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch (error) {
      console.warn("Unable to save queue display theme:", error);
    }
  }, [themeMode]);

  /* =======================================================
     CURRENT DATE
  ======================================================= */

  const currentDate = useMemo(
    () => currentDateTime.format("YYYY-MM-DD"),
    [currentDateTime],
  );

  /* =======================================================
     CLOCK
  ======================================================= */

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentDateTime(dayjs());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  /* =======================================================
     LOAD QUEUE
  ======================================================= */

  const loadQueue = useCallback(async () => {
    try {
      setLoadError("");

      const [appointmentResponse, queueResponse] = await Promise.all([
        getAppointmentsByDate(currentDate),

        getQueueOrderByDate(currentDate),
      ]);

      setAppointments(extractAppointments(appointmentResponse));

      setSavedQueue(extractQueueOrder(queueResponse));

      setLastUpdated(dayjs());
    } catch (error) {
      console.error("Failed to load patient queue:", error);

      setLoadError(
        error?.response?.data?.message || "Unable to refresh patient queue.",
      );
    } finally {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;

        setLoading(false);
      }
    }
  }, [currentDate]);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    setLoading(true);

    isFirstLoad.current = true;

    loadQueue();
  }, [loadQueue]);

  /* =======================================================
     AUTO REFRESH
  ======================================================= */

  useEffect(() => {
    const interval = window.setInterval(loadQueue, REFRESH_INTERVAL);

    return () => window.clearInterval(interval);
  }, [loadQueue]);

  /* =======================================================
     APPOINTMENT MAP
  ======================================================= */

  const appointmentMap = useMemo(() => {
    return new Map(
      appointments.map((appointment) => [
        getAppointmentId(appointment),
        appointment,
      ]),
    );
  }, [appointments]);

  /* =======================================================
     ORDERED QUEUE
  ======================================================= */

  const orderedQueue = useMemo(() => {
    return savedQueue
      .map((appointmentId) => appointmentMap.get(appointmentId))
      .filter(Boolean)
      .filter((appointment) => Boolean(getAppointmentNumber(appointment)));
  }, [savedQueue, appointmentMap]);

  /* =======================================================
     NOW SERVING
  ======================================================= */

  const nowServing = useMemo(() => {
    return (
      appointments.find((appointment) =>
        IN_TREATMENT_STATUSES.includes(normalize(appointment?.status)),
      ) ?? null
    );
  }, [appointments]);

  /* =======================================================
     ACTIVE QUEUE
  ======================================================= */

  const waitingQueue = useMemo(() => {
    return orderedQueue.filter((appointment) => {
      const status = normalize(appointment?.status);

      if (IN_TREATMENT_STATUSES.includes(status)) {
        return false;
      }

      if (COMPLETED_STATUSES.includes(status)) {
        return false;
      }

      return true;
    });
  }, [orderedQueue]);

  /* =======================================================
     NEXT TWO
  ======================================================= */

  const readyPatients = useMemo(
    () => waitingQueue.slice(0, READY_PATIENT_COUNT),
    [waitingQueue],
  );

  /* =======================================================
     UPCOMING EIGHT
  ======================================================= */

  const upcomingPatients = useMemo(
    () =>
      waitingQueue.slice(
        READY_PATIENT_COUNT,
        READY_PATIENT_COUNT + UPCOMING_PATIENT_COUNT,
      ),
    [waitingQueue],
  );

  /* =======================================================
     EMPTY QUEUE
  ======================================================= */

  const queueEmpty = !nowServing && waitingQueue.length === 0;

  /* =======================================================
     SCREEN READER ANNOUNCEMENT
  ======================================================= */

  const liveAnnouncement = useMemo(() => {
    if (loading) {
      return "Loading patient queue.";
    }

    if (queueEmpty) {
      return "No patients are currently waiting.";
    }

    const currentNumber = getAppointmentNumber(nowServing);

    const nextNumber = getAppointmentNumber(readyPatients[0]);

    if (currentNumber && nextNumber) {
      return `Now serving appointment ${currentNumber}. Next appointment ${nextNumber}.`;
    }

    if (currentNumber) {
      return `Now serving appointment ${currentNumber}.`;
    }

    if (nextNumber) {
      return `Next appointment ${nextNumber}.`;
    }

    return "Patient queue updated.";
  }, [loading, queueEmpty, nowServing, readyPatients]);

  /* =======================================================
     LAST UPDATED
  ======================================================= */

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) {
      return "";
    }

    return lastUpdated.format("hh:mm:ss A");
  }, [lastUpdated]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className={[
        "pq-page",
        isDarkMode ? "pq-theme-dark" : "pq-theme-light",
      ].join(" ")}
    >
      {/* ===================================================
          ACCESSIBILITY
      =================================================== */}

      <div
        className="pq-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveAnnouncement}
      </div>

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="pq-header">
        {/* BRAND */}

        <div className="pq-brand">
          <div className="pq-brand-logo">
            <MedicineBoxOutlined />
          </div>

          <div className="pq-brand-main">
            <div className="pq-brand-name">IVORY DENTAL CLINIC</div>

            <div className="pq-brand-subtitle">Live Appointment Queue</div>
          </div>
        </div>

        {/* HEADER RIGHT */}

        <div className="pq-header-right">
          {/* DATE / CLOCK */}

          <div className="pq-clock">
            <div className="pq-date">
              <CalendarOutlined />

              <span>{currentDateTime.format("dddd, DD MMMM YYYY")}</span>
            </div>

            <div className="pq-time">
              {currentDateTime.format("hh:mm:ss A")}
            </div>

            <div className="pq-live">
              <span className="pq-live-dot" />
              LIVE QUEUE
            </div>
          </div>

          {/* THEME */}

          <button
            type="button"
            className="pq-theme-button"
            onClick={handleThemeChange}
            aria-label={
              isDarkMode ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            <span className="pq-theme-button-icon">
              {isDarkMode ? <SunOutlined /> : <MoonOutlined />}
            </span>
          </button>
        </div>
      </header>

      {/* ===================================================
          ERROR
      =================================================== */}

      {loadError && (
        <div className="pq-alert-wrapper">
          <Alert
            showIcon
            type="warning"
            message="Connection problem"
            description={`Displaying the latest queue information${
              lastUpdatedLabel ? ` from ${lastUpdatedLabel}` : ""
            }. Reconnecting automatically.`}
          />
        </div>
      )}

      {/* ===================================================
          LOADING
      =================================================== */}

      {loading ? (
        <div className="pq-state-screen">
          <Spin size="large" />

          <Title level={2}>Loading Queue</Title>

          <Text type="secondary">Please wait a moment</Text>
        </div>
      ) : queueEmpty ? (
        /* =================================================
           EMPTY
        ================================================= */

        <div className="pq-state-screen">
          <div className="pq-empty-icon">
            <ClockCircleOutlined />
          </div>

          <Title level={2}>Queue Not Started</Title>

          <Text type="secondary">No patients are currently waiting.</Text>
        </div>
      ) : (
        /* =================================================
           QUEUE CONTENT
        ================================================= */

        <main className="pq-content">
          <div className="pq-layout">
            {/* =============================================
                LEFT — NOW SERVING
            ============================================= */}

            <section className="pq-serving-panel">
             
             <div className="pq-floating-clock">
  <div className="pq-serving-digital-clock">
    <ClockCircleOutlined className="pq-serving-clock-icon" />

    <span className="pq-serving-clock-time">
      {currentDateTime.format("hh:mm:ss")}
    </span>

    <span className="pq-serving-clock-period">
      {currentDateTime.format("A")}
    </span>
  </div>
</div>


              <div className="pq-serving-title">Now Serving</div>

              {/* BIG NUMBER */}

              <div className="pq-serving-number-area">
                <div className="pq-serving-ring">
                  <div className="pq-serving-circle">
                    <AppointmentNumber
                      appointment={nowServing}
                      className="pq-serving-number"
                    />
                  </div>
                </div>
              </div>

              {/* MESSAGE */}
            </section>

            {/* =============================================
                RIGHT SIDE
            ============================================= */}

            <div className="pq-right-column">
              {/* ===========================================
                  NEXT PATIENTS
              =========================================== */}

              <section className="pq-next-panel">
                <div className="pq-panel-heading">
                  <div className="pq-panel-heading-icon">
                    <TeamOutlined />
                  </div>

                  <div>
                    <h2>Next Patients</h2>
                  </div>
                </div>

                <div className="pq-next-grid">
                  {Array.from({
                    length: READY_PATIENT_COUNT,
                  }).map((_, index) => {
                    const appointment = readyPatients[index];

                    const waiting = isWaitingAppointment(appointment);

                    return (
                      <article
                        key={
                          appointment ? getAppointmentId(appointment) : index
                        }
                        className={[
                          "pq-next-card",

                          index === 0
                            ? "pq-next-card-primary"
                            : "pq-next-card-secondary",

                          waiting ? "pq-next-card-waiting" : "",

                          !appointment ? "pq-card-empty" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {/* TOP */}

                        <div className="pq-next-card-top">
                          <div className="pq-next-sequence">{index + 1}</div>

                          <div className="pq-next-label">
                            {waiting
                              ? "WAITING"
                              : index === 0
                                ? "NEXT"
                                : "AFTER NEXT"}
                          </div>

                          {waiting && (
                            <ClockCircleOutlined className="pq-next-waiting-icon" />
                          )}
                        </div>

                        {/* NUMBER */}

                        <div className="pq-next-number-area">
                          <div className="pq-next-number-circle">
                            <AppointmentNumber
                              appointment={appointment}
                              className="pq-next-number"
                            />
                          </div>
                        </div>

                        {/* MESSAGE */}

                        <div className="pq-next-message">
                          <MedicineBoxOutlined />

                          <span>
                            {!appointment
                              ? "Waiting for patient"
                              : waiting
                                ? "Please wait until called"
                                : index === 0
                                  ? "Please stay ready near the treatment room"
                                  : "Please stay ready in the waiting area"}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* ===========================================
                  UPCOMING
              =========================================== */}

              <section className="pq-upcoming-panel">
                {/* HEADER */}

                <div className="pq-upcoming-header">
                  <div className="pq-panel-heading">
                    <div className="pq-panel-heading-icon pq-upcoming-heading-icon">
                      <CalendarOutlined />
                    </div>

                    <div>
                      <h2>Upcoming Patients</h2>
                    </div>
                  </div>
                </div>

                {/* GRID */}

                {upcomingPatients.length > 0 ? (
                  <div className="pq-upcoming-scroll-window">
                    <div
                      className={[
                        "pq-upcoming-scroll-track",
                        upcomingPatients.length <= 4
                          ? "pq-upcoming-scroll-track-static"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {/* FIRST COPY */}
                      <div className="pq-upcoming-row">
                        {upcomingPatients.map((appointment, index) => {
                          const waiting = isWaitingAppointment(appointment);

                          return (
                            <article
                              key={`original-${getAppointmentId(appointment)}`}
                              className={[
                                "pq-upcoming-card",
                                waiting ? "pq-upcoming-card-waiting" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              <div className="pq-upcoming-number-area">
                                <div className="pq-upcoming-circle">
                                  <AppointmentNumber
                                    appointment={appointment}
                                    className="pq-upcoming-number"
                                  />
                                </div>
                              </div>

                              <div className="pq-queue-position">
                                QUEUE {index + READY_PATIENT_COUNT + 1}
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      {/* SECOND COPY FOR SEAMLESS LOOP */}
                      {upcomingPatients.length > 4 && (
                        <div className="pq-upcoming-row" aria-hidden="true">
                          {upcomingPatients.map((appointment, index) => {
                            const waiting = isWaitingAppointment(appointment);

                            return (
                              <article
                                key={`duplicate-${getAppointmentId(appointment)}`}
                                className={[
                                  "pq-upcoming-card",
                                  waiting ? "pq-upcoming-card-waiting" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                <div className="pq-upcoming-number-area">
                                  <div className="pq-upcoming-circle">
                                    <AppointmentNumber
                                      appointment={appointment}
                                      className="pq-upcoming-number"
                                    />
                                  </div>
                                </div>

                                <div className="pq-queue-position">
                                  QUEUE {index + READY_PATIENT_COUNT + 1}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pq-no-upcoming">
                    <CheckCircleFilled />

                    <div>
                      <strong>Queue is clear</strong>
                      <span>No additional patients are currently waiting.</span>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default PatientQueueDisplay;
