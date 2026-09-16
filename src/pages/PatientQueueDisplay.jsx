import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Spin,
  Typography,
} from "antd";

import {
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  LoadingOutlined,
  MedicineBoxOutlined,
  MoonOutlined,
  ReloadOutlined,
  RightOutlined,
  SunOutlined,
  TeamOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";

import dayjs from "dayjs";

import {
  getAppointmentsByDate,
  getQueueOrderByDate,
} from "../api/endPoints";

import "./css/PatientQueueDisplay.css";

const { Title, Text } = Typography;

/* ========================================================
   CONFIGURATION
======================================================== */

const REFRESH_INTERVAL = 10000;

const READY_PATIENT_COUNT = 2;

const UPCOMING_PATIENT_COUNT = 8;

const THEME_STORAGE_KEY =
  "patient-queue-display-theme";

/* ========================================================
   STATUSES
======================================================== */

const COMPLETED_STATUSES = [
  "treatment done",
  "treatment completed",
  "payment pending",
  "paid",
  "completed",
  "cancelled",
  "canceled",
];

const IN_TREATMENT_STATUSES = [
  "in treatment",
];

/* ========================================================
   HELPERS
======================================================== */

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const clean = (value) =>
  String(value ?? "").trim();

const getAppointmentId = (
  appointment,
) =>
  clean(
    appointment?.id ??
      appointment?.appointment_id,
  );

const getAppointmentNumber = (
  appointment,
) =>
  clean(
    appointment?.appointment_number,
  );

/* ========================================================
   RESPONSE HELPERS
======================================================== */

const extractAppointments = (
  response,
) => {
  const data =
    response?.data?.data ??
    response?.data ??
    [];

  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(
      data?.appointments,
    )
  ) {
    return data.appointments;
  }

  return [];
};

const extractQueueOrder = (
  response,
) => {
  const queueOrder =
    response?.data?.data
      ?.queue_order ??
    response?.data?.queue_order ??
    [];

  if (!Array.isArray(queueOrder)) {
    return [];
  }

  return queueOrder.map((id) =>
    clean(id),
  );
};

/* ========================================================
   GET INITIAL THEME
======================================================== */

const getInitialTheme = () => {
  try {
    const savedTheme =
      localStorage.getItem(
        THEME_STORAGE_KEY,
      );

    if (
      savedTheme === "light" ||
      savedTheme === "dark"
    ) {
      return savedTheme;
    }

    const prefersDark =
      window.matchMedia?.(
        "(prefers-color-scheme: dark)",
      )?.matches;

    return prefersDark
      ? "dark"
      : "light";
  } catch {
    return "dark";
  }
};

/* ========================================================
   APPOINTMENT NUMBER
======================================================== */

const AppointmentNumber = ({
  appointment,
  className = "",
  showHash = true,
}) => {
  const number =
    getAppointmentNumber(
      appointment,
    );

  if (!appointment || !number) {
    return (
      <div
        className={[
          "pq-number",
          "pq-number-empty",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        —
      </div>
    );
  }

  return (
    <div
      className={[
        "pq-number",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showHash && (
        <span className="pq-number-hash">
          
        </span>
      )}

      <span>{number}</span>
    </div>
  );
};

/* ========================================================
   PATIENT QUEUE DISPLAY
======================================================== */

const PatientQueueDisplay = () => {
  const [
    currentDateTime,
    setCurrentDateTime,
  ] = useState(dayjs());

  const [
    appointments,
    setAppointments,
  ] = useState([]);

  const [
    savedQueue,
    setSavedQueue,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState(null);

  const isFirstLoad =
    useRef(true);

  /* ======================================================
     THEME
  ====================================================== */

  const [
    themeMode,
    setThemeMode,
  ] = useState(getInitialTheme);

  const isDarkMode =
    themeMode === "dark";

  const handleThemeChange =
    useCallback(() => {
      setThemeMode((currentTheme) =>
        currentTheme === "dark"
          ? "light"
          : "dark",
      );
    }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        themeMode,
      );
    } catch (error) {
      console.warn(
        "Unable to save queue display theme:",
        error,
      );
    }
  }, [themeMode]);

  /* ======================================================
     CURRENT DATE
  ====================================================== */

  const currentDate =
    useMemo(
      () =>
        currentDateTime.format(
          "YYYY-MM-DD",
        ),
      [currentDateTime],
    );

  /* ======================================================
     CLOCK
  ====================================================== */

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setCurrentDateTime(
          dayjs(),
        );
      }, 1000);

    return () =>
      window.clearInterval(
        timer,
      );
  }, []);

  /* ======================================================
     LOAD QUEUE
  ====================================================== */

  const loadQueue =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (!silent) {
            setRefreshing(true);
          }

          setLoadError("");

          const [
            appointmentResponse,
            queueResponse,
          ] = await Promise.all([
            getAppointmentsByDate(
              currentDate,
            ),

            getQueueOrderByDate(
              currentDate,
            ),
          ]);

          setAppointments(
            extractAppointments(
              appointmentResponse,
            ),
          );

          setSavedQueue(
            extractQueueOrder(
              queueResponse,
            ),
          );

          setLastUpdated(dayjs());
        } catch (error) {
          console.error(
            "Failed to load patient queue:",
            error,
          );

          setLoadError(
            error?.response?.data
              ?.message ||
              "Unable to refresh patient queue.",
          );
        } finally {
          setRefreshing(false);

          if (isFirstLoad.current) {
            isFirstLoad.current = false;

            setLoading(false);
          }
        }
      },
      [currentDate],
    );

  /* ======================================================
     INITIAL LOAD
  ====================================================== */

  useEffect(() => {
    setLoading(true);

    isFirstLoad.current = true;

    loadQueue({ silent: true });
  }, [loadQueue]);

  /* ======================================================
     AUTO REFRESH
  ====================================================== */

  useEffect(() => {
    const interval =
      window.setInterval(
        () =>
          loadQueue({
            silent: true,
          }),
        REFRESH_INTERVAL,
      );

    return () =>
      window.clearInterval(
        interval,
      );
  }, [loadQueue]);

  /* ======================================================
     MANUAL REFRESH
  ====================================================== */

  const handleManualRefresh =
    useCallback(() => {
      loadQueue({ silent: false });
    }, [loadQueue]);

  /* ======================================================
     APPOINTMENT MAP
  ====================================================== */

  const appointmentMap =
    useMemo(() => {
      return new Map(
        appointments.map(
          (appointment) => [
            getAppointmentId(
              appointment,
            ),
            appointment,
          ],
        ),
      );
    }, [appointments]);

  /* ======================================================
     ORDERED QUEUE
  ====================================================== */

  const orderedQueue =
    useMemo(() => {
      return savedQueue
        .map((appointmentId) =>
          appointmentMap.get(
            appointmentId,
          ),
        )
        .filter(Boolean)
        .filter((appointment) =>
          Boolean(
            getAppointmentNumber(
              appointment,
            ),
          ),
        );
    }, [
      savedQueue,
      appointmentMap,
    ]);

  /* ======================================================
     NOW SERVING
  ====================================================== */

  const nowServing =
    useMemo(() => {
      return (
        orderedQueue.find(
          (appointment) =>
            IN_TREATMENT_STATUSES.includes(
              normalize(
                appointment.status,
              ),
            ),
        ) ?? null
      );
    }, [orderedQueue]);

  /* ======================================================
     WAITING QUEUE
  ====================================================== */

  const waitingQueue =
    useMemo(() => {
      return orderedQueue.filter(
        (appointment) => {
          const status =
            normalize(
              appointment.status,
            );

          if (
            IN_TREATMENT_STATUSES.includes(
              status,
            )
          ) {
            return false;
          }

          if (
            COMPLETED_STATUSES.includes(
              status,
            )
          ) {
            return false;
          }

          return true;
        },
      );
    }, [orderedQueue]);

  /* ======================================================
     READY PATIENTS
  ====================================================== */

  const readyPatients =
    useMemo(
      () =>
        waitingQueue.slice(
          0,
          READY_PATIENT_COUNT,
        ),
      [waitingQueue],
    );

  /* ======================================================
     UPCOMING PATIENTS
  ====================================================== */

  const upcomingPatients =
    useMemo(
      () =>
        waitingQueue.slice(
          READY_PATIENT_COUNT,
          READY_PATIENT_COUNT +
            UPCOMING_PATIENT_COUNT,
        ),
      [waitingQueue],
    );

  /* ======================================================
     COMPLETED COUNT
  ====================================================== */

  const completedCount =
    useMemo(() => {
      return orderedQueue.filter(
        (appointment) =>
          COMPLETED_STATUSES.includes(
            normalize(
              appointment.status,
            ),
          ),
      ).length;
    }, [orderedQueue]);

  /* ======================================================
     EMPTY STATE
  ====================================================== */

  const queueEmpty =
    !nowServing &&
    waitingQueue.length === 0;

  /* ======================================================
     ANNOUNCEMENT (SR)
  ====================================================== */

  const liveAnnouncement =
    useMemo(() => {
      if (loading) {
        return "Loading patient queue";
      }

      if (queueEmpty) {
        return "Queue not started. No patients waiting.";
      }

      const currentNumber =
        getAppointmentNumber(
          nowServing,
        );

      const nextNumber =
        getAppointmentNumber(
          readyPatients[0],
        );

      if (currentNumber && nextNumber) {
        return `Now serving appointment ${currentNumber}. Next is appointment ${nextNumber}.`;
      }

      if (currentNumber) {
        return `Now serving appointment ${currentNumber}.`;
      }

      if (nextNumber) {
        return `Next appointment is ${nextNumber}.`;
      }

      return "Queue updated.";
    }, [
      loading,
      queueEmpty,
      nowServing,
      readyPatients,
    ]);

  /* ======================================================
     LAST UPDATED LABEL
  ====================================================== */

  const lastUpdatedLabel =
    useMemo(() => {
      if (!lastUpdated) {
        return "—";
      }

      return lastUpdated.format(
        "hh:mm:ss A",
      );
    }, [lastUpdated]);

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <div
      className={[
        "pq-page",
        isDarkMode
          ? "pq-theme-dark"
          : "pq-theme-light",
      ].join(" ")}
    >
      {/* Screen-reader live region */}
      <div
        className="pq-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveAnnouncement}
      </div>

      {/* ==================================================
          HEADER
      =================================================== */}

      <header className="pq-header">
        <div className="pq-brand">
          <div
            className="pq-brand-logo"
            aria-hidden="true"
          >
            <MedicineBoxOutlined />
          </div>

          <div className="pq-brand-content">
            <div className="pq-brand-eyebrow">
              PATIENT QUEUE
            </div>

            <h1 className="pq-brand-title">
              Dental Clinic
            </h1>

            <div className="pq-brand-description">
              Live appointment queue
            </div>
          </div>
        </div>

        <div className="pq-header-right">
          {/* ==============================================
              SUMMARY
          =============================================== */}

          <div
            className="pq-header-summary"
            aria-label="Queue summary"
          >
            <div className="pq-summary-item">
              <div
                className="pq-summary-icon"
                aria-hidden="true"
              >
                <TeamOutlined />
              </div>

              <div>
                <span className="pq-summary-value">
                  {
                    waitingQueue.length
                  }
                </span>

                <span className="pq-summary-label">
                  Waiting
                </span>
              </div>
            </div>

            <div
              className="pq-summary-divider"
              aria-hidden="true"
            />

            <div className="pq-summary-item">
              <div
                className="pq-summary-icon pq-summary-icon-success"
                aria-hidden="true"
              >
                <CheckCircleFilled />
              </div>

              <div>
                <span className="pq-summary-value">
                  {completedCount}
                </span>

                <span className="pq-summary-label">
                  Completed
                </span>
              </div>
            </div>
          </div>

          {/* ==============================================
              REFRESH BUTTON
          =============================================== */}

          <button
            type="button"
            className="pq-theme-toggle"
            onClick={
              handleManualRefresh
            }
            disabled={refreshing}
            aria-label="Refresh queue"
            title={`Last updated ${lastUpdatedLabel}`}
          >
            <span className="pq-theme-toggle-icon">
              {refreshing ? (
                <LoadingOutlined />
              ) : (
                <ReloadOutlined />
              )}
            </span>

            <span className="pq-theme-toggle-text">
              Refresh
            </span>
          </button>

          {/* ==============================================
              THEME BUTTON
          =============================================== */}

          <button
            type="button"
            className="pq-theme-toggle"
            onClick={
              handleThemeChange
            }
            aria-label={
              isDarkMode
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            title={
              isDarkMode
                ? "Switch to Light Mode"
                : "Switch to Dark Mode"
            }
          >
            <span className="pq-theme-toggle-icon">
              {isDarkMode ? (
                <SunOutlined />
              ) : (
                <MoonOutlined />
              )}
            </span>

            <span className="pq-theme-toggle-text">
              {isDarkMode
                ? "Light"
                : "Dark"}
            </span>
          </button>

          {/* ==============================================
              CLOCK
          =============================================== */}

          <div className="pq-clock">
            <div className="pq-date">
              <CalendarOutlined />

              <span>
                {currentDateTime.format(
                  "dddd, DD MMMM YYYY",
                )}
              </span>
            </div>

            <div
              className="pq-time"
              aria-live="off"
            >
              {currentDateTime.format(
                "hh:mm:ss A",
              )}
            </div>

            <div className="pq-live-status">
              <span className="pq-live-dot" />

              Live Queue
            </div>
          </div>
        </div>
      </header>

      {/* ==================================================
          ERROR
      =================================================== */}

      {loadError && (
        <div className="pq-alert-container">
          <Alert
            type="warning"
            showIcon
            message="Connection problem"
            description="Displaying the latest available queue. Reconnecting automatically."
          />
        </div>
      )}

      {/* ==================================================
          CONTENT
      =================================================== */}

      <div className="pq-content">
        {loading &&
        orderedQueue.length === 0 ? (
          <div
            className="pq-state-screen"
            role="status"
            aria-live="polite"
          >
            <Spin size="large" />

            <Title level={3}>
              Loading patient queue
            </Title>

            <Text type="secondary">
              Please wait a moment
            </Text>
          </div>
        ) : queueEmpty ? (
          <div
            className="pq-state-screen"
            role="status"
          >
            <div
              className="pq-empty-icon"
              aria-hidden="true"
            >
              <ClockCircleOutlined />
            </div>

            <Title level={2}>
              Queue Not Started
            </Title>

            <Text type="secondary">
              No patients are currently
              waiting.
            </Text>
          </div>
        ) : (
          <main className="pq-main">
            {/* ============================================
                MAIN TOP GRID
            ============================================= */}

            <div className="pq-top-grid">
              {/* ==========================================
                  NOW SERVING
              =========================================== */}

              <section
                className="pq-serving"
                aria-label="Now serving"
              >
                <div className="pq-serving-top">
                  <div className="pq-serving-status">
                    <span className="pq-serving-status-dot" />

                    CURRENT PATIENT
                  </div>

                  <div
                    className="pq-serving-icon"
                    aria-hidden="true"
                  >
                    <CheckCircleFilled />
                  </div>
                </div>

                <div className="pq-serving-content">
                  <div className="pq-serving-title">
                    Now Serving
                  </div>

                  <div className="pq-serving-circle">
                    <AppointmentNumber
                      appointment={
                        nowServing
                      }
                      className="pq-serving-number"
                    />
                  </div>

                  
                </div>

               
              </section>

              {/* ==========================================
                  NEXT PATIENTS
              =========================================== */}

              <section
                className="pq-next-section"
                aria-label="Next patients"
              >
                <div className="pq-section-heading">
                  <div>
                    <div className="pq-section-eyebrow">
                      PLEASE GET READY
                    </div>

                    <h2 className="pq-section-title">
                      Next Patients
                    </h2>
                  </div>

                  <div className="pq-section-pill">
                    Next{" "}
                    {
                      READY_PATIENT_COUNT
                    }
                  </div>
                </div>

                <div className="pq-next-grid">
                  {Array.from({
                    length:
                      READY_PATIENT_COUNT,
                  }).map(
                    (_, index) => {
                      const appointment =
                        readyPatients[
                          index
                        ];

                      return (
                        <article
                          key={index}
                          className={[
                            "pq-next-card",

                            index === 0
                              ? "pq-next-card-primary"
                              : "",

                            !appointment
                              ? "pq-next-card-empty"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div className="pq-next-card-top">
                            <div className="pq-next-position">
                              {index === 0
                                ? "NEXT"
                                : "AFTER NEXT"}
                            </div>

                            <div className="pq-next-order">
                              {index + 1}
                            </div>
                          </div>

                          <div className="pq-next-circle">
                            <AppointmentNumber
                              appointment={
                                appointment
                              }
                              className="pq-next-number"
                            />
                          </div>

                          <div className="pq-next-message">
                            {appointment
                              ? index ===
                                  0
                                ? "Please stay ready near the treatment room"
                                : "Please stay ready in the waiting area"
                              : "Waiting for patient"}
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>
              </section>
            </div>

            {/* ============================================
                UPCOMING QUEUE
            ============================================= */}

            <section
              className="pq-upcoming"
              aria-label="Upcoming patients"
            >
              <div className="pq-upcoming-heading">
                <div>
                  <div className="pq-section-eyebrow">
                    WAITING LIST
                  </div>

                  <h2 className="pq-section-title">
                    Upcoming Patients
                  </h2>
                </div>

                <div className="pq-waiting-pill">
                  <TeamOutlined />

                  <strong>
                    {
                      waitingQueue.length
                    }
                  </strong>

                  <span>
                    patients waiting
                  </span>
                </div>
              </div>

              {upcomingPatients.length >
              0 ? (
                <div className="pq-upcoming-grid">
                  {upcomingPatients.map(
                    (
                      appointment,
                      index,
                    ) => (
                      <article
                        key={getAppointmentId(
                          appointment,
                        )}
                        className="pq-upcoming-card"
                      >
                        <div className="pq-upcoming-position">
                          <span>
                            QUEUE
                          </span>

                          <strong>
                            {index +
                              READY_PATIENT_COUNT +
                              1}
                          </strong>
                        </div>

                        <div className="pq-upcoming-number-circle">
                          <AppointmentNumber
                            appointment={
                              appointment
                            }
                            className="pq-upcoming-number"
                          />
                        </div>
                      </article>
                    ),
                  )}
                </div>
              ) : (
                <div className="pq-no-upcoming">
                  <CheckCircleFilled />

                  <div>
                    <strong>
                      Queue is clear
                    </strong>

                    <span>
                      No additional
                      patients are
                      currently waiting.
                    </span>
                  </div>
                </div>
              )}
            </section>
          </main>
        )}
      </div>

      {/* ==================================================
          FOOTER
      =================================================== */}

      
      
    </div>
  );
};

export default PatientQueueDisplay;