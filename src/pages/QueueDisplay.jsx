import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";

import {
  ClockCircleOutlined,
  MedicineBoxOutlined,
  SoundOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { getAppointmentsByDate } from "../api/endPoints";

/*
 * Automatically load QueueDisplay1.css,
 * QueueDisplay2.css and other available queue themes.
 */
const themeFiles = import.meta.glob("./css/QueueDisplay*.css", {
  query: "?url",
  import: "default",
  eager: true,
});

const { Title, Text } = Typography;

const ACTIVE_STATUSES = ["Confirmed", "Checked In"];

/*
 * Theme 1 – Modern Clinical
 */
const DEFAULT_THEME = "1";
const THEME_STORAGE_KEY = "queue-display-theme";

const getTodayDate = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatClock = (date) =>
  date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const formatDate = (date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const sortByQueueNumber = (first, second) => {
  return (
    Number(first?.queue_no || 0) -
    Number(second?.queue_no || 0)
  );
};

const getThemeCssUrl = (themeNumber) => {
  return themeFiles[`./css/QueueDisplay${themeNumber}.css`];
};

const QueueDisplay = () => {
  const [selectedDate] = useState(getTodayDate);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  /*
   * Force Theme 1 for this patient-facing queue screen.
   * Theme selection controls remain hidden.
   */
  const selectedTheme = DEFAULT_THEME;

  /*
   * Load Theme 1 CSS dynamically.
   */
  useEffect(() => {
    const themeUrl = getThemeCssUrl(selectedTheme);

    if (!themeUrl) {
      console.warn(
        `Queue display CSS file not found: QueueDisplay${selectedTheme}.css`,
      );

      return undefined;
    }

    let themeLink = document.getElementById(
      "queue-display-theme-css",
    );

    if (!themeLink) {
      themeLink = document.createElement("link");
      themeLink.id = "queue-display-theme-css";
      themeLink.rel = "stylesheet";

      document.head.appendChild(themeLink);
    }

    themeLink.href = themeUrl;

    /*
     * Replace any previously stored queue theme.
     */
    localStorage.setItem(
      THEME_STORAGE_KEY,
      selectedTheme,
    );

    return undefined;
  }, [selectedTheme]);

  /*
   * Remove queue theme CSS when leaving this page.
   */
  useEffect(() => {
    return () => {
      const themeLink = document.getElementById(
        "queue-display-theme-css",
      );

      if (themeLink) {
        themeLink.remove();
      }
    };
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);

      const response =
        await getAppointmentsByDate(selectedDate);

      if (response?.data?.success) {
        setAppointments(response.data.data || []);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error("Failed to load queue:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  /*
   * Load queue immediately and refresh it every 10 seconds.
   */
  useEffect(() => {
    fetchQueue();

    const queueInterval = window.setInterval(
      fetchQueue,
      10000,
    );

    const clockInterval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(queueInterval);
      window.clearInterval(clockInterval);
    };
  }, [fetchQueue]);

  /*
   * Patient currently inside the treatment room.
   */
  const currentPatient = useMemo(() => {
    return appointments
      .filter(
        (appointment) =>
          appointment.status === "In Treatment",
      )
      .sort(sortByQueueNumber)[0];
  }, [appointments]);

  /*
   * Confirmed and checked-in patients waiting.
   */
  const waitingPatients = useMemo(() => {
    return appointments
      .filter((appointment) =>
        ACTIVE_STATUSES.includes(appointment.status),
      )
      .sort(sortByQueueNumber);
  }, [appointments]);

  const nextPatient = waitingPatients[0];

  const waitingCount = waitingPatients.length;

  return (
    <div className="queue-page simple-queue-page">
      <div className="queue-background-decoration queue-decoration-one" />
      <div className="queue-background-decoration queue-decoration-two" />

      <div className="queue-wrapper simple-queue-wrapper">
        {/* Header */}
        <header className="queue-header simple-queue-header">
          <div className="clinic-heading">
            <div className="clinic-icon">
              <MedicineBoxOutlined />
            </div>

            <div className="clinic-heading-content">
              <Text className="clinic-label">
                PATIENT QUEUE
              </Text>

              <Title level={1} className="queue-title">
                Dental Clinic Queue
              </Title>

              <Text className="queue-subtitle">
                Please watch the screen for your queue
                number
              </Text>
            </div>
          </div>

          <div className="queue-clock-box">
            <Text className="queue-date">
              {formatDate(currentTime)}
            </Text>

            <Title level={2} className="queue-clock">
              {formatClock(currentTime)}
            </Title>

            <div className="queue-live-indicator">
              <span
                className={`live-dot ${
                  loading ? "updating" : ""
                }`}
              />

              <Text>
                {loading
                  ? "Updating queue"
                  : "Queue is live"}
              </Text>
            </div>
          </div>
        </header>

        {loading && appointments.length === 0 ? (
          <Card className="loading-card">
            <div className="loading-content">
              <Spin size="large" />

              <Title level={3}>
                Loading Today&apos;s Queue
              </Title>

              <Text>
                Please wait while the queue is updated.
              </Text>
            </div>
          </Card>
        ) : (
          <>
            <main aria-live="polite">
              <Row
                gutter={[24, 24]}
                className="queue-cards-row"
              >
                {/* Now serving */}
                <Col xs={24} lg={12}>
                  <Card className="main-card inside-card simple-main-card">
                    <div className="simple-card-header serving-header">
                      <div className="card-header-icon">
                        <UserOutlined />
                      </div>

                      <div>
                        <Text className="card-header-label">
                          TREATMENT ROOM
                        </Text>

                        <Title level={2}>
                          Now Serving
                        </Title>
                      </div>
                    </div>

                    {currentPatient ? (
                      <div
                        key={`current-${currentPatient.id}`}
                        className="queue-card-content fade-up"
                      >
                        <Text className="queue-number-label">
                          QUEUE NUMBER
                        </Text>

                        <div className="queue-number-wrapper serving-number-wrapper">
                          <div className="queue-number-circle serving">
                            {currentPatient.queue_no}
                          </div>
                        </div>

                        <Tag className="status-tag serving pulse-tag">
                          IN TREATMENT
                        </Tag>

                        <Text className="queue-helper-text">
                          This patient is currently inside the
                          treatment room.
                        </Text>
                      </div>
                    ) : (
                      <div className="empty-queue-container">
                        <div className="empty-icon serving-empty-icon">
                          <UserOutlined />
                        </div>

                        <Title level={3}>
                          No Patient Being Treated
                        </Title>

                        <Text>
                          The next patient will be called
                          shortly.
                        </Text>
                      </div>
                    )}
                  </Card>
                </Col>

                {/* Next patient */}
                <Col xs={24} lg={12}>
                  <Card className="main-card next-card simple-main-card">
                    <div className="simple-card-header next-header">
                      <div className="card-header-icon">
                        <ClockCircleOutlined />
                      </div>

                      <div>
                        <Text className="card-header-label">
                          PLEASE PREPARE
                        </Text>

                        <Title level={2}>
                          Next Patient
                        </Title>
                      </div>
                    </div>

                    {nextPatient ? (
                      <div
                        key={`next-${nextPatient.id}`}
                        className="queue-card-content fade-up"
                      >
                        <Text className="queue-number-label">
                          QUEUE NUMBER
                        </Text>

                        <div className="queue-number-wrapper next-number-wrapper">
                          <div className="queue-number-circle next">
                            {nextPatient.queue_no}
                          </div>
                        </div>

                        <Tag className="status-tag next">
                          PLEASE BE READY
                        </Tag>

                        <Text className="queue-helper-text">
                          Please remain close to the waiting
                          area.
                        </Text>
                      </div>
                    ) : (
                      <div className="empty-queue-container">
                        <div className="empty-icon next-empty-icon">
                          <ClockCircleOutlined />
                        </div>

                        <Title level={3}>
                          No Patient Waiting
                        </Title>

                        <Text>
                          There are currently no patients in
                          the waiting queue.
                        </Text>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            </main>
{/* 
 */}
          </>
        )}
      </div>
    </div>
  );
};

export default QueueDisplay;