import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Spin, Typography } from "antd";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
  WifiOutlined,
} from "@ant-design/icons";

import {
  getAllWaitingRecords,
  getAppointmentsByDate,
  getDoctorArrivalStatus,
} from "../api/endPoints";

import "./css/QueueDisplay.css";

const { Title, Text } = Typography;

/* ========================================================
   CONFIGURATION
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

const DISPLAY_NEXT_PATIENT_COUNT = 8;

const READY_PATIENT_STORAGE_PREFIX =
  "queue-display-ready-patient";

/* ========================================================
   GENERAL HELPERS
======================================================== */

const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase();

const normalizeIdentifier = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return String(value).trim();
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

const getAppointmentId = (appointment) =>
  normalizeIdentifier(
    appointment?.appointment_id ??
      appointment?.id,
  );

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
    return "--";
  }

  return String(appointmentNumber).padStart(
    2,
    "0",
  );
};

const getNumericAppointmentNumber = (
  appointment,
) => {
  const number = Number(
    appointment?.appointment_number ??
      appointment?.queue_number ??
      appointment?.number,
  );

  return Number.isFinite(number)
    ? number
    : Number.MAX_SAFE_INTEGER;
};

/* ========================================================
   DATE / TIME HELPERS
======================================================== */

const formatDateForApi = (date) => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

const formatDisplayTime = (date) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);

const formatArrivalTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const formatWaitingDuration = (
  startTime,
  currentTime = new Date(),
) => {
  if (!startTime) {
    return "00:00";
  }

  const normalized =
    String(startTime).trim();

  let parsedStartTime = null;

  const timeOnlyMatch = normalized.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i,
  );

  if (timeOnlyMatch) {
    let hours = Number(
      timeOnlyMatch[1],
    );

    const minutes = Number(
      timeOnlyMatch[2],
    );

    const seconds = Number(
      timeOnlyMatch[3] || 0,
    );

    const meridiem = String(
      timeOnlyMatch[4] || "",
    ).toUpperCase();

    if (
      meridiem === "AM" &&
      hours === 12
    ) {
      hours = 0;
    }

    if (
      meridiem === "PM" &&
      hours < 12
    ) {
      hours += 12;
    }

    parsedStartTime = new Date(
      currentTime,
    );

    parsedStartTime.setHours(
      hours,
      minutes,
      seconds,
      0,
    );
  } else {
    const parsedDate = new Date(
      normalized,
    );

    if (
      !Number.isNaN(
        parsedDate.getTime(),
      )
    ) {
      parsedStartTime = parsedDate;
    }
  }

  if (!parsedStartTime) {
    return "00:00";
  }

  const milliseconds =
    currentTime.getTime() -
    parsedStartTime.getTime();

  const totalSeconds = Math.max(
    0,
    Math.floor(milliseconds / 1000),
  );

  const minutes = Math.floor(
    totalSeconds / 60,
  );

  const seconds =
    totalSeconds % 60;

  return `${String(minutes).padStart(
    2,
    "0",
  )}:${String(seconds).padStart(
    2,
    "0",
  )}`;
};

/* ========================================================
   SORTING HELPERS
======================================================== */

const getAppointmentTimeValue = (
  appointment,
) =>
  appointment?.appointment_time || "";

const getCheckedInTimeValue = (
  appointment,
) =>
  appointment?.checked_in_time ||
  appointment?.appointment_time ||
  appointment?.updated_at ||
  "";

const getComparableTimeValue = (
  value,
) => {
  const normalized =
    String(value || "").trim();

  if (!normalized) {
    return Number.MAX_SAFE_INTEGER;
  }

  const match = normalized.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i,
  );

  if (match) {
    let hours = Number(match[1]);

    const minutes = Number(match[2]);

    const seconds = Number(
      match[3] || 0,
    );

    const meridiem = String(
      match[4] || "",
    ).toUpperCase();

    if (
      meridiem === "AM" &&
      hours === 12
    ) {
      hours = 0;
    }

    if (
      meridiem === "PM" &&
      hours < 12
    ) {
      hours += 12;
    }

    return (
      hours * 3600 +
      minutes * 60 +
      seconds
    );
  }

  const timestamp =
    Date.parse(normalized);

  if (Number.isFinite(timestamp)) {
    return timestamp;
  }

  return Number.MAX_SAFE_INTEGER;
};

const sortCheckedInPatients = (
  a,
  b,
) => {
  const firstTime =
    getComparableTimeValue(
      getCheckedInTimeValue(a),
    );

  const secondTime =
    getComparableTimeValue(
      getCheckedInTimeValue(b),
    );

  if (firstTime !== secondTime) {
    return firstTime - secondTime;
  }

  return (
    getNumericAppointmentNumber(a) -
    getNumericAppointmentNumber(b)
  );
};

const sortByAppointmentNumber = (
  a,
  b,
) => {
  const numberComparison =
    getNumericAppointmentNumber(a) -
    getNumericAppointmentNumber(b);

  if (numberComparison !== 0) {
    return numberComparison;
  }

  return (
    getComparableTimeValue(
      getAppointmentTimeValue(a),
    ) -
    getComparableTimeValue(
      getAppointmentTimeValue(b),
    )
  );
};

const sortByHighestAppointmentNumber = (
  a,
  b,
) =>
  getNumericAppointmentNumber(b) -
  getNumericAppointmentNumber(a);

const arraysAreEqual = (
  firstArray,
  secondArray,
) => {
  if (
    firstArray.length !==
    secondArray.length
  ) {
    return false;
  }

  return firstArray.every(
    (value, index) =>
      String(value) ===
      String(secondArray[index]),
  );
};

/* ========================================================
   LOCK HELPERS
======================================================== */

const parseLockedPatientIds = (
  storedValue,
) => {
  if (!storedValue) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(storedValue);

    if (Array.isArray(parsed)) {
      return parsed
        .map(normalizeIdentifier)
        .filter(Boolean)
        .slice(
          0,
          LOCKED_PATIENT_COUNT,
        );
    }

    const single =
      normalizeIdentifier(parsed);

    return single ? [single] : [];
  } catch {
    const single =
      normalizeIdentifier(
        storedValue,
      );

    return single ? [single] : [];
  }
};

/* ========================================================
   WAITING HELPERS
======================================================== */

const extractWaitingRecords = (
  response,
) => {
  const data =
    response?.data ?? response;

  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(data?.records)
  ) {
    return data.records;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const getWaitingAppointmentId = (
  record,
) =>
  normalizeIdentifier(
    record?.appointment_id ??
      record?.id,
  );

const isActiveWaitingRecord = (
  record,
) => {
  const appointmentId =
    getWaitingAppointmentId(record);

  const startTime = String(
    record?.start_time ?? "",
  ).trim();

  const endTime = String(
    record?.end_time ?? "",
  ).trim();

  return Boolean(
    appointmentId &&
      startTime &&
      !endTime,
  );
};

/* ========================================================
   API RESPONSE HELPERS
======================================================== */

const extractAppointments = (
  response,
) => {
  const data =
    response?.data ?? response;

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

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const extractDoctorArrivalRecord = (
  response,
) => {
  const data =
    response?.data ?? response;

  if (!data) {
    return null;
  }

  if (
    data?.data &&
    !Array.isArray(data.data)
  ) {
    return data.data;
  }

  if (data?.record) {
    return data.record;
  }

  return data;
};

/* ========================================================
   STATUS DISPLAY
======================================================== */

const getDisplayStatus = (
  appointment,
  waitingRecord,
) => {
  if (waitingRecord) {
    return {
      key: "waiting",
      label: "Waiting",
      IconComponent:
        ClockCircleOutlined,
      waitingStartTime:
        waitingRecord.start_time || "",
    };
  }

  const status = normalizeStatus(
    appointment?.status,
  );

  if (
    TREATMENT_COMPLETED_STATUSES.includes(
      status,
    )
  ) {
    return {
      key: "treatment-done",
      label: "Done",
      IconComponent:
        CheckCircleOutlined,
      waitingStartTime: "",
    };
  }

  if (
    status === "cancelled" ||
    status === "canceled"
  ) {
    return {
      key: "cancelled",
      label: "Cancelled",
      IconComponent:
        CloseCircleOutlined,
      waitingStartTime: "",
    };
  }

  if (
    status === "in treatment"
  ) {
    return {
      key: "in-treatment",
      label: "In Treatment",
      IconComponent:
        MedicineBoxOutlined,
      waitingStartTime: "",
    };
  }

  if (status === "checked in") {
    return {
      key: "checked-in",
      label: "Checked In",
      IconComponent: UserOutlined,
      waitingStartTime: "",
    };
  }

  if (status === "confirmed") {
    return {
      key: "confirmed",
      label: "Confirmed",
      IconComponent:
        ClockCircleOutlined,
      waitingStartTime: "",
    };
  }

  return {
    key: "pending",
    label: "Pending",
    IconComponent:
      ClockCircleOutlined,
    waitingStartTime: "",
  };
};

/* ========================================================
   TICKER DATA
======================================================== */

const createTickerItems = (
  appointmentRecords,
  waitingRecordMap,
) => {
  const uniqueAppointments =
    new Map();

  appointmentRecords.forEach(
    (appointment, index) => {
      const number =
        getNumericAppointmentNumber(
          appointment,
        );

      if (
        number ===
        Number.MAX_SAFE_INTEGER
      ) {
        return;
      }

      const appointmentId =
        getAppointmentId(
          appointment,
        );

      const uniqueKey =
        appointmentId ||
        `${number}-${index}`;

      uniqueAppointments.set(
        uniqueKey,
        appointment,
      );
    },
  );

  return Array.from(
    uniqueAppointments.values(),
  )
    .map((appointment) => {
      const appointmentId =
        getAppointmentId(
          appointment,
        );

      const waitingRecord =
        appointmentId
          ? waitingRecordMap.get(
              appointmentId,
            )
          : null;

      const status =
        getDisplayStatus(
          appointment,
          waitingRecord,
        );

      return {
        appointmentId,

        appointmentNumber:
          getNumericAppointmentNumber(
            appointment,
          ),

        statusKey: status.key,

        statusLabel: status.label,

        waitingStartTime:
          status.waitingStartTime,

        IconComponent:
          status.IconComponent,
      };
    })
    .sort(
      (a, b) =>
        a.appointmentNumber -
        b.appointmentNumber,
    );
};

/* ========================================================
   SMALL UI COMPONENTS
======================================================== */

const HeaderStatistic = ({
  icon,
  label,
  value,
  tone = "default",
}) => (
  <div
    className={[
      "queue-header-stat",
      `queue-header-stat--${tone}`,
    ].join(" ")}
  >
    <div className="queue-header-stat-icon">
      {icon}
    </div>

    <div className="queue-header-stat-content">
      <span className="queue-header-stat-value">
        {value}
      </span>

      <span className="queue-header-stat-label">
        {label}
      </span>
    </div>
  </div>
);

/* ========================================================
   NOW SERVING
======================================================== */

const QueuePatientPanel = ({
  appointment,
  doctorArrived,
}) => {
  return (
    <section
      className={[
        "queue-card",
        "queue-card-now",
        appointment
          ? "queue-card-active"
          : "queue-card-empty",
      ].join(" ")}
    >
      <div className="queue-card-accent" />

      <div className="queue-card-header">
        <div className="queue-card-header-left">
          <div className="queue-card-header-icon">
            <MedicineBoxOutlined />
          </div>

          <div>
            <Text className="queue-card-kicker">
              TREATMENT ROOM
            </Text>

            <Title
              level={2}
              className="queue-card-title"
            >
              Now Serving
            </Title>
          </div>
        </div>

        {appointment && (
          <div className="queue-card-live-badge">
            <span />

            LIVE
          </div>
        )}
      </div>

      <div className="queue-card-body queue-now-body">
        {appointment ? (
          <>
            <div className="queue-now-message">
              Patient currently receiving treatment
            </div>

            <div className="queue-now-number-ring">
              <div className="queue-now-number-inner">
                <span className="queue-now-hash">
                  #
                </span>

                <span className="queue-now-number">
                  {getAppointmentNumber(
                    appointment,
                  )}
                </span>
              </div>
            </div>

            <div className="queue-now-status">
              <span className="queue-now-status-dot" />

              NOW BEING TREATED
            </div>

            <Text className="queue-now-helper">
              Please wait until your queue
              number is called.
            </Text>
          </>
        ) : (
          <div className="queue-empty-state">
            <div className="queue-empty-icon">
              <UserOutlined />
            </div>

            <Text className="queue-empty-title">
              {doctorArrived
                ? "Treatment Room Available"
                : "Waiting for Doctor"}
            </Text>

            <Text className="queue-empty-description">
              {doctorArrived
                ? "The next patient will be called shortly."
                : "Queue processing will begin once the doctor arrives."}
            </Text>
          </div>
        )}
      </div>
    </section>
  );
};

/* ========================================================
   NEXT PATIENTS
======================================================== */

const NextPatientsPanel = ({
  patients = [],
  doctorArrived = false,
}) => {
  const displayedPatients =
    Array.from(
      {
        length:
          DISPLAY_NEXT_PATIENT_COUNT,
      },
      (_, index) =>
        patients[index] || null,
    );

  const hasAnyPatient =
    displayedPatients.some(Boolean);

  return (
    <section
      className={[
        "queue-card",
        "queue-card-next",
        doctorArrived
          ? "queue-card-next-arrived"
          : "queue-card-next-waiting",
      ].join(" ")}
    >
      <div className="queue-card-accent" />

      <div className="queue-card-header queue-next-header">
        <div className="queue-card-header-left">
          <div className="queue-card-header-icon">
            <TeamOutlined />
          </div>

          <div>
            <Text className="queue-card-kicker">
              {doctorArrived
                ? "UPCOMING QUEUE"
                : "CHECKED-IN QUEUE"}
            </Text>

            <Title
              level={2}
              className="queue-card-title"
            >
              {doctorArrived
                ? "Please Be Ready"
                : "Patient Queue"}
            </Title>
          </div>
        </div>

        <div className="queue-next-summary">
          {doctorArrived ? (
            <>
              <div className="queue-next-summary-ready">
                <span />

                2 Ready
              </div>

              <div className="queue-next-summary-total">
                Next 8
              </div>
            </>
          ) : (
            <div className="queue-next-summary-total">
              Queue Order
            </div>
          )}
        </div>
      </div>

      <div className="queue-card-body queue-next-body">
        {hasAnyPatient ? (
          <div className="queue-next-grid">
            {displayedPatients.map(
              (appointment, index) => {
                const position =
                  index + 1;

                const isLocked =
                  doctorArrived &&
                  index <
                    LOCKED_PATIENT_COUNT;

                const isFirst =
                  doctorArrived &&
                  position === 1;

                const isSecond =
                  doctorArrived &&
                  position === 2;

                return (
                  <div
                    key={
                      appointment
                        ? `${
                            getAppointmentId(
                              appointment,
                            ) ||
                            getAppointmentNumber(
                              appointment,
                            )
                          }-${position}`
                        : `empty-${position}`
                    }
                    className={[
                      "queue-next-item",

                      isFirst
                        ? "queue-next-item-first"
                        : "",

                      isSecond
                        ? "queue-next-item-second"
                        : "",

                      isLocked
                        ? "queue-next-item-ready"
                        : "",

                      !appointment
                        ? "queue-next-item-empty"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="queue-next-item-top">
                      <span className="queue-next-position">
                        {doctorArrived
                          ? `NEXT ${position}`
                          : `QUEUE ${position}`}
                      </span>

                      {isLocked &&
                        appointment && (
                          <span className="queue-ready-pill">
                            READY
                          </span>
                        )}
                    </div>

                    <div className="queue-next-number">
                      {appointment
                        ? getAppointmentNumber(
                            appointment,
                          )
                        : "--"}
                    </div>

                    <div className="queue-next-item-footer">
                      {!appointment ? (
                        "AVAILABLE"
                      ) : !doctorArrived ? (
                        "IN QUEUE"
                      ) : isFirst ? (
                        <>
                          <span className="queue-ready-dot" />

                          PLEASE BE READY
                        </>
                      ) : isSecond ? (
                        <>
                          <span className="queue-ready-dot" />

                          REMAIN READY
                        </>
                      ) : (
                        "UPCOMING"
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        ) : (
          <div className="queue-empty-state">
            <div className="queue-empty-icon">
              <TeamOutlined />
            </div>

            <Text className="queue-empty-title">
              {doctorArrived
                ? "No Patients in Queue"
                : "No Checked-In Patients"}
            </Text>

            <Text className="queue-empty-description">
              New checked-in patients
              will automatically appear
              here.
            </Text>
          </div>
        )}
      </div>
    </section>
  );
};

/* ========================================================
   COMPLETED
======================================================== */

const CompletedQueuePanel = ({
  appointment,
}) => {
  return (
    <section
      className={[
        "queue-card",
        "queue-card-completed",
        appointment
          ? "queue-card-active"
          : "queue-card-empty",
      ].join(" ")}
    >
      <div className="queue-card-accent" />

      <div className="queue-card-header">
        <div className="queue-card-header-left">
          <div className="queue-card-header-icon">
            <CheckCircleOutlined />
          </div>

          <div>
            <Text className="queue-card-kicker">
              COMPLETED
            </Text>

            <Title
              level={2}
              className="queue-card-title"
            >
              Last Completed
            </Title>
          </div>
        </div>
      </div>

      <div className="queue-card-body queue-completed-body">
        {appointment ? (
          <>
            <Text className="queue-completed-label">
              Most recently completed treatment
            </Text>

            <div className="queue-completed-number-ring">
              <div className="queue-completed-number">
                {getAppointmentNumber(
                  appointment,
                )}
              </div>
            </div>

            <div className="queue-completed-status">
              <CheckCircleOutlined />

              TREATMENT COMPLETED
            </div>

            <Text className="queue-completed-helper">
              Thank you for visiting us.
            </Text>
          </>
        ) : (
          <div className="queue-empty-state">
            <div className="queue-empty-icon">
              <CheckCircleOutlined />
            </div>

            <Text className="queue-empty-title">
              No Completed Treatments
            </Text>

            <Text className="queue-empty-description">
              The latest completed queue
              number will appear here.
            </Text>
          </div>
        )}
      </div>
    </section>
  );
};

/* ========================================================
   TICKER ITEM
======================================================== */

const QueueScrollerItem = ({
  item,
  currentTreatmentPatient,
  readyPatients,
  currentDateTime,
  doctorArrived,
}) => {
  const ItemIcon =
    item?.IconComponent ||
    ClockCircleOutlined;

  const itemAppointmentId =
    normalizeIdentifier(
      item?.appointmentId,
    );

  const treatmentAppointmentId =
    getAppointmentId(
      currentTreatmentPatient,
    );

  const readyPatientPosition =
    doctorArrived
      ? readyPatients.findIndex(
          (appointment) =>
            getAppointmentId(
              appointment,
            ) === itemAppointmentId,
        )
      : -1;

  const isCurrentTreatment =
    Boolean(
      currentTreatmentPatient &&
        treatmentAppointmentId &&
        treatmentAppointmentId ===
          itemAppointmentId,
    );

  const isReadyPatient =
    doctorArrived &&
    readyPatientPosition !== -1;

  const isFirstReady =
    readyPatientPosition === 0;

  const isSecondReady =
    readyPatientPosition === 1;

  const isWaiting =
    item?.statusKey === "waiting";

  return (
    <div
      className={[
        "queue-scroller-item",

        `queue-scroller-item-${item.statusKey}`,

        isCurrentTreatment
          ? "queue-scroller-item-serving"
          : "",

        isFirstReady
          ? "queue-scroller-item-next-one"
          : "",

        isSecondReady
          ? "queue-scroller-item-next-two"
          : "",

        isWaiting
          ? "queue-scroller-item-waiting"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="queue-scroller-number">
        {String(
          item.appointmentNumber,
        ).padStart(2, "0")}
      </div>

      <div className="queue-scroller-information">
        {isCurrentTreatment ? (
          <span className="queue-scroller-special-label">
            <MedicineBoxOutlined />

            NOW SERVING
          </span>
        ) : isFirstReady ? (
          <span className="queue-scroller-special-label">
            <span className="queue-scroller-ready-dot" />

            NEXT 1
          </span>
        ) : isSecondReady ? (
          <span className="queue-scroller-special-label">
            <span className="queue-scroller-ready-dot" />

            NEXT 2
          </span>
        ) : isWaiting ? (
          <>
            <span className="queue-scroller-status">
              <ItemIcon />

              WAITING
            </span>

            <span className="queue-scroller-duration">
              {formatWaitingDuration(
                item.waitingStartTime,
                currentDateTime,
              )}
            </span>
          </>
        ) : (
          <span className="queue-scroller-status">
            <ItemIcon />

            {item.statusLabel}
          </span>
        )}
      </div>
    </div>
  );
};

/* ========================================================
   MAIN COMPONENT
======================================================== */

const QueueDisplay = ({
  embedded = false,
}) => {
  const [
    appointments,
    setAppointments,
  ] = useState([]);

  const [
    waitingRecords,
    setWaitingRecords,
  ] = useState([]);

  const [
    doctorArrived,
    setDoctorArrived,
  ] = useState(false);

  const [
    doctorArrivalRecord,
    setDoctorArrivalRecord,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    hasLoadedAppointments,
    setHasLoadedAppointments,
  ] = useState(false);

  const [loadError, setLoadError] =
    useState("");

  const [
    currentDateTime,
    setCurrentDateTime,
  ] = useState(new Date());

  const [
    lockedReadyPatientIds,
    setLockedReadyPatientIds,
  ] = useState([]);

  const [
    readyPatientLockDate,
    setReadyPatientLockDate,
  ] = useState(null);

  /* ========================================================
     CURRENT DATE
  ======================================================== */

  const selectedDate =
    useMemo(
      () =>
        formatDateForApi(
          currentDateTime,
        ),
      [currentDateTime],
    );

  const readyPatientStorageKey =
    useMemo(
      () =>
        `${READY_PATIENT_STORAGE_PREFIX}:${selectedDate}`,
      [selectedDate],
    );

  /* ========================================================
     CLOCK
  ======================================================== */

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        setCurrentDateTime(
          new Date(),
        );
      }, 1000);

    return () =>
      window.clearInterval(
        interval,
      );
  }, []);

  /* ========================================================
     RESTORE LOCKS
  ======================================================== */

  useEffect(() => {
    let savedIds = [];

    try {
      const stored =
        window.localStorage.getItem(
          readyPatientStorageKey,
        );

      savedIds =
        parseLockedPatientIds(
          stored,
        );
    } catch {
      savedIds = [];
    }

    setReadyPatientLockDate(
      selectedDate,
    );

    setLockedReadyPatientIds(
      savedIds,
    );
  }, [
    readyPatientStorageKey,
    selectedDate,
  ]);

  /* ========================================================
     SAVE LOCKS
  ======================================================== */

  useEffect(() => {
    if (
      readyPatientLockDate !==
      selectedDate
    ) {
      return;
    }

    try {
      if (!doctorArrived) {
        window.localStorage.removeItem(
          readyPatientStorageKey,
        );

        return;
      }

      if (
        lockedReadyPatientIds.length
      ) {
        window.localStorage.setItem(
          readyPatientStorageKey,
          JSON.stringify(
            lockedReadyPatientIds,
          ),
        );
      } else {
        window.localStorage.removeItem(
          readyPatientStorageKey,
        );
      }
    } catch {
      // localStorage unavailable
    }
  }, [
    doctorArrived,
    lockedReadyPatientIds,
    readyPatientLockDate,
    readyPatientStorageKey,
    selectedDate,
  ]);

  /* ========================================================
     STORAGE SYNC
  ======================================================== */

  useEffect(() => {
    const handleStorageChange = (
      event,
    ) => {
      if (
        event.key !==
        readyPatientStorageKey
      ) {
        return;
      }

      if (!doctorArrived) {
        setLockedReadyPatientIds(
          [],
        );

        return;
      }

      setLockedReadyPatientIds(
        parseLockedPatientIds(
          event.newValue,
        ),
      );
    };

    window.addEventListener(
      "storage",
      handleStorageChange,
    );

    return () =>
      window.removeEventListener(
        "storage",
        handleStorageChange,
      );
  }, [
    doctorArrived,
    readyPatientStorageKey,
  ]);

  /* ========================================================
     DOCTOR ARRIVAL
  ======================================================== */

  const fetchDoctorArrivalStatus =
    useCallback(async () => {
      try {
        const response =
          await getDoctorArrivalStatus(
            selectedDate,
          );

        const record =
          extractDoctorArrivalRecord(
            response,
          );

        const arrived =
          convertToBoolean(
            record?.arrived,
          );

        setDoctorArrivalRecord(
          record,
        );

        setDoctorArrived(
          arrived,
        );

        if (!arrived) {
          setLockedReadyPatientIds(
            [],
          );

          try {
            window.localStorage.removeItem(
              readyPatientStorageKey,
            );
          } catch {
            // ignored
          }
        }
      } catch (error) {
        console.error(
          "Failed to load doctor arrival status:",
          error,
        );

        setDoctorArrivalRecord(
          null,
        );

        setDoctorArrived(false);

        setLockedReadyPatientIds(
          [],
        );
      }
    }, [
      selectedDate,
      readyPatientStorageKey,
    ]);

  /* ========================================================
     LOAD APPOINTMENTS
  ======================================================== */

  const loadAppointments =
    useCallback(async () => {
      try {
        setLoadError("");

        const [
          appointmentsResponse,
          waitingResponse,
        ] = await Promise.all([
          getAppointmentsByDate(
            selectedDate,
          ),
          getAllWaitingRecords(),
        ]);

        setAppointments(
          extractAppointments(
            appointmentsResponse,
          ),
        );

        setWaitingRecords(
          extractWaitingRecords(
            waitingResponse,
          ),
        );
      } catch (error) {
        console.error(
          "Error loading queue:",
          error,
        );

        setLoadError(
          "Queue connection interrupted. Reconnecting automatically...",
        );
      } finally {
        setLoading(false);

        setHasLoadedAppointments(
          true,
        );
      }
    }, [selectedDate]);

  /* ========================================================
     REFRESH
  ======================================================== */

  useEffect(() => {
    setLoading(true);

    setHasLoadedAppointments(
      false,
    );

    loadAppointments();

    fetchDoctorArrivalStatus();

    const interval =
      window.setInterval(() => {
        loadAppointments();

        fetchDoctorArrivalStatus();
      }, 15000);

    return () =>
      window.clearInterval(
        interval,
      );
  }, [
    loadAppointments,
    fetchDoctorArrivalStatus,
  ]);

  useEffect(() => {
    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          loadAppointments();

          fetchDoctorArrivalStatus();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () =>
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
  }, [
    loadAppointments,
    fetchDoctorArrivalStatus,
  ]);

  /* ========================================================
     WAITING MAP
  ======================================================== */

  const activeWaitingRecords =
    useMemo(
      () =>
        waitingRecords.filter(
          isActiveWaitingRecord,
        ),
      [waitingRecords],
    );

  const waitingRecordMap =
    useMemo(
      () =>
        new Map(
          activeWaitingRecords.map(
            (record) => [
              getWaitingAppointmentId(
                record,
              ),
              record,
            ],
          ),
        ),
      [activeWaitingRecords],
    );

  const isAppointmentWaiting =
    useCallback(
      (appointment) => {
        const id =
          getAppointmentId(
            appointment,
          );

        return Boolean(
          id &&
            waitingRecordMap.has(id),
        );
      },
      [waitingRecordMap],
    );

  /* ========================================================
     VISIBLE APPOINTMENTS
  ======================================================== */

  const visibleAppointments =
    useMemo(
      () =>
        appointments.filter(
          (appointment) =>
            VISIBLE_STATUSES.includes(
              normalizeStatus(
                appointment?.status,
              ),
            ),
        ),
      [appointments],
    );

  /* ========================================================
     CURRENT TREATMENT
  ======================================================== */

  const inTreatmentPatients =
    useMemo(
      () =>
        visibleAppointments
          .filter(
            (appointment) =>
              normalizeStatus(
                appointment?.status,
              ) === "in treatment",
          )
          .sort(
            sortByAppointmentNumber,
          ),
      [visibleAppointments],
    );

  const currentTreatmentPatient =
    inTreatmentPatients[0] ||
    null;

  /* ========================================================
     COMPLETED
  ======================================================== */

  const completedTreatmentPatients =
    useMemo(
      () =>
        visibleAppointments
          .filter((appointment) =>
            TREATMENT_COMPLETED_STATUSES.includes(
              normalizeStatus(
                appointment?.status,
              ),
            ),
          )
          .sort(
            sortByHighestAppointmentNumber,
          ),
      [visibleAppointments],
    );

  const highestCompletedTreatmentPatient =
    completedTreatmentPatients[0] ||
    null;

  /* ========================================================
     CHECKED-IN
  ======================================================== */

  const checkedInPatients =
    useMemo(
      () =>
        visibleAppointments
          .filter(
            (appointment) =>
              normalizeStatus(
                appointment?.status,
              ) === "checked in" &&
              !isAppointmentWaiting(
                appointment,
              ),
          )
          .sort(
            sortCheckedInPatients,
          ),
      [
        visibleAppointments,
        isAppointmentWaiting,
      ],
    );

  /* ========================================================
     AUTO LOCK NEXT TWO
  ======================================================== */

  useEffect(() => {
    if (
      !hasLoadedAppointments
    ) {
      return;
    }

    if (
      readyPatientLockDate !==
      selectedDate
    ) {
      return;
    }

    if (!doctorArrived) {
      setLockedReadyPatientIds(
        [],
      );

      try {
        window.localStorage.removeItem(
          readyPatientStorageKey,
        );
      } catch {
        // ignored
      }

      return;
    }

    setLockedReadyPatientIds(
      (currentIds) => {
        const availableIds =
          checkedInPatients
            .map(getAppointmentId)
            .filter(Boolean);

        const validCurrentIds =
          currentIds
            .map(
              normalizeIdentifier,
            )
            .filter(
              (id) =>
                id &&
                availableIds.includes(
                  id,
                ),
            );

        const additionalIds =
          availableIds.filter(
            (id) =>
              !validCurrentIds.includes(
                id,
              ),
          );

        const finalIds = [
          ...validCurrentIds,
          ...additionalIds,
        ].slice(
          0,
          LOCKED_PATIENT_COUNT,
        );

        if (
          arraysAreEqual(
            currentIds,
            finalIds,
          )
        ) {
          return currentIds;
        }

        return finalIds;
      },
    );
  }, [
    doctorArrived,
    checkedInPatients,
    hasLoadedAppointments,
    readyPatientLockDate,
    selectedDate,
    readyPatientStorageKey,
  ]);

  /* ========================================================
     READY PATIENTS
  ======================================================== */

  const readyPatients =
    useMemo(() => {
      if (!doctorArrived) {
        return [];
      }

      return lockedReadyPatientIds
        .map(
          (lockedId) =>
            checkedInPatients.find(
              (appointment) =>
                getAppointmentId(
                  appointment,
                ) ===
                normalizeIdentifier(
                  lockedId,
                ),
            ) || null,
        )
        .filter(Boolean)
        .slice(
          0,
          LOCKED_PATIENT_COUNT,
        );
    }, [
      doctorArrived,
      checkedInPatients,
      lockedReadyPatientIds,
    ]);

  /* ========================================================
     NEXT 8
  ======================================================== */

  const nextEightPatients =
    useMemo(() => {
      if (!doctorArrived) {
        return checkedInPatients.slice(
          0,
          DISPLAY_NEXT_PATIENT_COUNT,
        );
      }

      const lockedPatients =
        readyPatients.filter(Boolean);

      const lockedIds =
        new Set(
          lockedPatients
            .map(getAppointmentId)
            .filter(Boolean),
        );

      const additionalPatients =
        checkedInPatients.filter(
          (appointment) => {
            const id =
              getAppointmentId(
                appointment,
              );

            return (
              id &&
              !lockedIds.has(id)
            );
          },
        );

      return [
        ...lockedPatients,
        ...additionalPatients,
      ].slice(
        0,
        DISPLAY_NEXT_PATIENT_COUNT,
      );
    }, [
      doctorArrived,
      readyPatients,
      checkedInPatients,
    ]);

  /* ========================================================
     TICKER
  ======================================================== */

  const tickerItems =
    useMemo(
      () =>
        createTickerItems(
          visibleAppointments,
          waitingRecordMap,
        ),
      [
        visibleAppointments,
        waitingRecordMap,
      ],
    );

  const tickerDuration =
    useMemo(() => {
      const duration =
        tickerItems.length * 6;

      return `${Math.max(
        duration,
        28,
      )}s`;
    }, [tickerItems.length]);

  /* ========================================================
     EXTRA DISPLAY VALUES
  ======================================================== */

  const totalQueueCount =
    checkedInPatients.length;

  const waitingCount =
    activeWaitingRecords.length;

  const completedCount =
    completedTreatmentPatients.length;

  const queueModeText =
    doctorArrived
      ? "Live Treatment Queue"
      : "Pre-Arrival Queue";

  /* ========================================================
     RENDER
  ======================================================== */

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
      {/* Background decorations */}

      <div className="queue-display-bg-glow queue-display-bg-glow-one" />

      <div className="queue-display-bg-glow queue-display-bg-glow-two" />

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="queue-display-header">
        <div className="queue-display-brand-section">
          <div className="queue-display-logo">
            <MedicineBoxOutlined />
          </div>

          <div className="queue-display-brand-text">
            <div className="queue-display-eyebrow">
              DENTAL PATIENT MANAGEMENT
            </div>

            <Title
              level={1}
              className="queue-display-title"
            >
              Dental CAD / CAM
              Laboratory
            </Title>

            <Text className="queue-display-subtitle">
              Live Patient Queue &
              Treatment Status
            </Text>
          </div>
        </div>

        <div className="queue-display-header-right">
          <div
            className={[
              "queue-doctor-status-card",

              doctorArrived
                ? "queue-doctor-status-card-arrived"
                : "queue-doctor-status-card-waiting",
            ].join(" ")}
          >
            <div className="queue-doctor-status-icon">
              <SafetyCertificateOutlined />
            </div>

            <div className="queue-doctor-status-details">
              <span className="queue-doctor-status-caption">
                DOCTOR STATUS
              </span>

              <span className="queue-doctor-status-text">
                {doctorArrived
                  ? "Doctor Available"
                  : "Waiting for Doctor"}
              </span>

              {doctorArrived &&
                doctorArrivalRecord?.arrived_at && (
                  <span className="queue-doctor-arrival-time">
                    Arrived at{" "}
                    {formatArrivalTime(
                      doctorArrivalRecord.arrived_at,
                    )}
                  </span>
                )}
            </div>

            <span className="queue-doctor-status-indicator" />
          </div>

          <div className="queue-header-clock">
            <div className="queue-header-date">
              <CalendarOutlined />

              {formatDisplayDate(
                currentDateTime,
              )}
            </div>

            <div className="queue-header-time">
              {formatDisplayTime(
                currentDateTime,
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================
          OVERVIEW BAR
      =================================================== */}

      <section className="queue-display-overview">
        <div className="queue-mode-indicator">
          <div
            className={[
              "queue-mode-icon",
              doctorArrived
                ? "queue-mode-icon-active"
                : "",
            ].join(" ")}
          >
            <WifiOutlined />
          </div>

          <div>
            <span className="queue-mode-label">
              CURRENT MODE
            </span>

            <span className="queue-mode-value">
              {queueModeText}
            </span>
          </div>
        </div>

        <div className="queue-header-statistics">
          <HeaderStatistic
            icon={<TeamOutlined />}
            label="In Queue"
            value={totalQueueCount}
            tone="queue"
          />

          <HeaderStatistic
            icon={
              <ClockCircleOutlined />
            }
            label="On Hold"
            value={waitingCount}
            tone="waiting"
          />

          <HeaderStatistic
            icon={
              <MedicineBoxOutlined />
            }
            label="In Treatment"
            value={
              currentTreatmentPatient
                ? 1
                : 0
            }
            tone="treatment"
          />

          <HeaderStatistic
            icon={
              <CheckCircleOutlined />
            }
            label="Completed"
            value={completedCount}
            tone="completed"
          />
        </div>

        <div
          className={[
            "queue-system-status",

            loadError
              ? "queue-system-status-error"
              : "",
          ].join(" ")}
        >
          <span className="queue-system-status-dot" />

          <div>
            <span className="queue-system-status-title">
              {loadError
                ? "RECONNECTING"
                : "QUEUE LIVE"}
            </span>

            <span className="queue-system-status-subtitle">
              Auto refresh every 15 sec
            </span>
          </div>
        </div>
      </section>

      {/* ===================================================
          DOCTOR NOT ARRIVED MESSAGE
      =================================================== */}

      {!doctorArrived &&
        !loading && (
          <div className="queue-doctor-waiting-banner">
            <div className="queue-doctor-waiting-banner-icon">
              <ClockCircleOutlined />
            </div>

            <div className="queue-doctor-waiting-banner-content">
              <strong>
                Doctor has not arrived yet
              </strong>

              <span>
                Checked-in patients
                remain in the normal queue.
                Ready positions will be
                assigned after doctor
                arrival.
              </span>
            </div>
          </div>
        )}

      {/* ===================================================
          ERROR
      =================================================== */}

      {loadError && (
        <div
          className="queue-display-error"
          role="alert"
        >
          <CloseCircleOutlined />

          <span>{loadError}</span>
        </div>
      )}

      {/* ===================================================
          CONTENT
      =================================================== */}

      {loading &&
      !hasLoadedAppointments ? (
        <div className="queue-display-loading">
          <div className="queue-display-loading-box">
            <Spin size="large" />

            <div className="queue-display-loading-title">
              Preparing Patient Queue
            </div>

            <div className="queue-display-loading-subtitle">
              Loading today's appointments
              and treatment status...
            </div>
          </div>
        </div>
      ) : (
        <>
          <main className="queue-display-main">
            <QueuePatientPanel
              appointment={
                currentTreatmentPatient
              }
              doctorArrived={
                doctorArrived
              }
            />

            <NextPatientsPanel
              patients={
                nextEightPatients
              }
              doctorArrived={
                doctorArrived
              }
            />

            <CompletedQueuePanel
              appointment={
                highestCompletedTreatmentPatient
              }
            />
          </main>

          {/* =================================================
              BOTTOM TICKER
          ================================================= */}

          <section className="queue-bottom-section">
            <div className="queue-bottom-title">
              <div className="queue-bottom-title-icon">
                <WifiOutlined />
              </div>

              <div>
                <span>
                  LIVE QUEUE STATUS
                </span>

                <small>
                  Today's appointment
                  numbers
                </small>
              </div>
            </div>

            <div className="queue-scroller-viewport">
              <div className="queue-scroller-fade queue-scroller-fade-left" />

              <div className="queue-scroller-fade queue-scroller-fade-right" />

              {tickerItems.length >
              0 ? (
                <div
                  className="queue-scroller-track"
                  style={{
                    "--queue-scroll-duration":
                      tickerDuration,
                  }}
                >
                  <div className="queue-scroller-set">
                    {tickerItems.map(
                      (
                        item,
                        index,
                      ) => (
                        <QueueScrollerItem
                          key={`queue-original-${
                            item.appointmentId ||
                            item.appointmentNumber
                          }-${index}`}
                          item={item}
                          currentTreatmentPatient={
                            currentTreatmentPatient
                          }
                          readyPatients={
                            readyPatients
                          }
                          currentDateTime={
                            currentDateTime
                          }
                          doctorArrived={
                            doctorArrived
                          }
                        />
                      ),
                    )}
                  </div>

                  <div
                    className="queue-scroller-set"
                    aria-hidden="true"
                  >
                    {tickerItems.map(
                      (
                        item,
                        index,
                      ) => (
                        <QueueScrollerItem
                          key={`queue-copy-${
                            item.appointmentId ||
                            item.appointmentNumber
                          }-${index}`}
                          item={item}
                          currentTreatmentPatient={
                            currentTreatmentPatient
                          }
                          readyPatients={
                            readyPatients
                          }
                          currentDateTime={
                            currentDateTime
                          }
                          doctorArrived={
                            doctorArrived
                          }
                        />
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <div className="queue-scroller-empty">
                  <ClockCircleOutlined />

                  <span>
                    No appointment numbers
                    available
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              FOOTER
          ================================================= */}

          <footer className="queue-display-footer">
            <span>
              Please remain in the waiting
              area until your number is
              displayed.
            </span>

            <span className="queue-display-footer-divider">
              •
            </span>

            <span>
              Thank you for your patience.
            </span>
          </footer>
        </>
      )}
    </div>
  );
};

export default QueueDisplay;