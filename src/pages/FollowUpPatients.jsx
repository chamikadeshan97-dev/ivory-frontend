import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Modal,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  IdcardOutlined,
  LeftOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import { getFollowUpPatients } from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";

import "./css/FollowUpPatients.css";

const { Title, Text, Paragraph } = Typography;

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

const normalizeValue = (value) => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = dayjs(value);

  return date.isValid()
    ? date.format("DD MMM YYYY")
    : value;
};

const cleanPhoneNumber = (value) => {
  return String(value ?? "")
    .replace(/[^\d+]/g, "")
    .trim();
};

const extractFollowUpList = (response) => {
  const result =
    response?.data?.data ??
    response?.data ??
    {};

  if (Array.isArray(result)) {
    return result;
  }

  const followUpList =
    result?.follow_ups ??
    result?.followUps ??
    result?.records ??
    [];

  return Array.isArray(followUpList)
    ? followUpList
    : [];
};

const getPatientName = (record) => {
  return (
    record?.patient_name ||
    record?.name ||
    "Unknown Patient"
  );
};

const getPatientId = (record) => {
  return (
    record?.patient_id ||
    record?.id ||
    "-"
  );
};

const getPatientPhone = (record) => {
  return (
    record?.phone ||
    record?.phone_number ||
    record?.mobile ||
    "-"
  );
};

const hasPatientAllergy = (record) => {
  return convertToBoolean(
    record?.has_allergies ??
      record?.is_allergies ??
      record?.hasAllergies,
  );
};

const getAllergyDetails = (record) => {
  return (
    record?.allergy_details ||
    record?.allergies ||
    record?.allergy ||
    "Patient has a recorded allergy."
  );
};

const getTreatmentName = (record) => {
  return (
    record?.treatment_performed ||
    record?.treatment_name ||
    record?.treatment_details ||
    "Not specified"
  );
};

const getTreatmentDate = (record) => {
  return (
    record?.previous_treatment_date ||
    record?.treatment_date ||
    record?.created_at
  );
};

const calculateFollowUpSummary = (
  records = [],
) => {
  const safeRecords = Array.isArray(records)
    ? records
    : [];

  const contactable = safeRecords.filter(
    (record) =>
      Boolean(
        cleanPhoneNumber(
          getPatientPhone(record),
        ),
      ),
  ).length;

  const allergies = safeRecords.filter(
    hasPatientAllergy,
  ).length;

  return {
    total: safeRecords.length,
    contactable,
    missingPhone:
      safeRecords.length - contactable,
    allergies,
  };
};

/* --------------------------------------------------------
   Summary card
-------------------------------------------------------- */

const FollowUpSummaryCard = ({
  title,
  value,
  helper,
  icon,
  tone,
}) => {
  return (
    <Card
      bordered={false}
      className={`follow-up-summary-card follow-up-summary-card--${tone}`}
    >
      <div className="follow-up-summary-card__content">
        <div>
          <Text className="follow-up-summary-card__title">
            {title}
          </Text>

          <div className="follow-up-summary-card__value">
            {value}
          </div>

          <Text className="follow-up-summary-card__helper">
            {helper}
          </Text>
        </div>

        <div className="follow-up-summary-card__icon">
          {icon}
        </div>
      </div>
    </Card>
  );
};

/* --------------------------------------------------------
   Component
-------------------------------------------------------- */

const FollowUpPatients = () => {
  const requestSequenceRef = useRef(0);

  const [weekStart, setWeekStart] =
    useState(dayjs().startOf("day"));

  const [
    weeklyFollowUps,
    setWeeklyFollowUps,
  ] = useState({});

  const [loading, setLoading] =
    useState(false);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(null);

  const [
    isModalOpen,
    setIsModalOpen,
  ] = useState(false);

  const [search, setSearch] =
    useState("");

  const [
    contactFilter,
    setContactFilter,
  ] = useState("all");

  /* ------------------------------------------------------
     Seven-day date range
  ------------------------------------------------------ */

  const weekDates = useMemo(() => {
    return Array.from(
      { length: 7 },
      (_, index) =>
        weekStart
          .add(index, "day")
          .startOf("day"),
    );
  }, [weekStart]);

  const weekDateStrings = useMemo(() => {
    return weekDates.map((date) =>
      date.format("YYYY-MM-DD"),
    );
  }, [weekDates]);

  const weekEnd = useMemo(() => {
    return weekStart.add(6, "day");
  }, [weekStart]);

  const weekRangeLabel = useMemo(() => {
    const sameMonth = weekStart.isSame(
      weekEnd,
      "month",
    );

    const sameYear = weekStart.isSame(
      weekEnd,
      "year",
    );

    if (sameMonth) {
      return `${weekStart.format(
        "DD",
      )} – ${weekEnd.format(
        "DD MMMM YYYY",
      )}`;
    }

    if (sameYear) {
      return `${weekStart.format(
        "DD MMM",
      )} – ${weekEnd.format(
        "DD MMM YYYY",
      )}`;
    }

    return `${weekStart.format(
      "DD MMM YYYY",
    )} – ${weekEnd.format(
      "DD MMM YYYY",
    )}`;
  }, [weekStart, weekEnd]);

  /* ------------------------------------------------------
     Load follow-ups for all seven days
  ------------------------------------------------------ */

  const loadWeekFollowUps =
    useCallback(async () => {
      const requestSequence =
        requestSequenceRef.current + 1;

      requestSequenceRef.current =
        requestSequence;

      setLoading(true);

      try {
        const responses =
          await Promise.allSettled(
            weekDateStrings.map(
              (dateString) =>
                getFollowUpPatients(
                  dateString,
                ),
            ),
          );

        if (
          requestSequence !==
          requestSequenceRef.current
        ) {
          return;
        }

        const nextWeeklyData = {};

        let failedRequestCount = 0;

        responses.forEach(
          (result, index) => {
            const dateString =
              weekDateStrings[index];

            if (
              result.status ===
              "fulfilled"
            ) {
              nextWeeklyData[
                dateString
              ] =
                extractFollowUpList(
                  result.value,
                );
            } else {
              failedRequestCount += 1;

              nextWeeklyData[
                dateString
              ] = [];

              console.error(
                `Failed to load follow-ups for ${dateString}:`,
                result.reason,
              );
            }
          },
        );

        setWeeklyFollowUps(
          nextWeeklyData,
        );

        if (
          failedRequestCount > 0
        ) {
          message.warning(
            `${failedRequestCount} day${
              failedRequestCount === 1
                ? ""
                : "s"
            } could not be loaded.`,
          );
        }
      } catch (error) {
        console.error(
          "Failed to load the follow-up calendar:",
          error,
        );

        if (
          requestSequence ===
          requestSequenceRef.current
        ) {
          setWeeklyFollowUps({});

          message.error(
            error?.response?.data
              ?.message ||
              error?.message ||
              "Unable to load the follow-up calendar.",
          );
        }
      } finally {
        if (
          requestSequence ===
          requestSequenceRef.current
        ) {
          setLoading(false);
        }
      }
    }, [weekDateStrings]);

  useEffect(() => {
    loadWeekFollowUps();
  }, [loadWeekFollowUps]);

  /* ------------------------------------------------------
     Weekly summary
  ------------------------------------------------------ */

  const allWeekFollowUps =
    useMemo(() => {
      return weekDateStrings.flatMap(
        (dateString) => {
          const records =
            weeklyFollowUps[
              dateString
            ];

          return Array.isArray(records)
            ? records
            : [];
        },
      );
    }, [
      weeklyFollowUps,
      weekDateStrings,
    ]);

  const weekSummary = useMemo(() => {
    return calculateFollowUpSummary(
      allWeekFollowUps,
    );
  }, [allWeekFollowUps]);

  /* ------------------------------------------------------
     Selected date data
  ------------------------------------------------------ */

  const selectedDateString =
    useMemo(() => {
      return selectedDate
        ? selectedDate.format(
            "YYYY-MM-DD",
          )
        : null;
    }, [selectedDate]);

  const selectedDateFollowUps =
    useMemo(() => {
      if (!selectedDateString) {
        return [];
      }

      const records =
        weeklyFollowUps[
          selectedDateString
        ];

      return Array.isArray(records)
        ? records
        : [];
    }, [
      selectedDateString,
      weeklyFollowUps,
    ]);

  const selectedDateSummary =
    useMemo(() => {
      return calculateFollowUpSummary(
        selectedDateFollowUps,
      );
    }, [selectedDateFollowUps]);

  /* ------------------------------------------------------
     Contact actions
  ------------------------------------------------------ */

  const handleCallPatient = (
    phone,
  ) => {
    const cleanedPhone =
      cleanPhoneNumber(phone);

    if (!cleanedPhone) {
      message.warning(
        "This patient does not have a valid phone number.",
      );

      return;
    }

    window.location.href = `tel:${cleanedPhone}`;
  };

  const handleCopyPhone = async (
    phone,
  ) => {
    const cleanedPhone =
      cleanPhoneNumber(phone);

    if (!cleanedPhone) {
      message.warning(
        "No phone number available.",
      );

      return;
    }

    try {
      if (
        navigator?.clipboard
          ?.writeText
      ) {
        await navigator.clipboard.writeText(
          cleanedPhone,
        );
      } else {
        const temporaryInput =
          document.createElement(
            "input",
          );

        temporaryInput.value =
          cleanedPhone;

        document.body.appendChild(
          temporaryInput,
        );

        temporaryInput.select();

        document.execCommand(
          "copy",
        );

        document.body.removeChild(
          temporaryInput,
        );
      }

      message.success(
        "Phone number copied.",
      );
    } catch (error) {
      console.error(
        "Failed to copy phone number:",
        error,
      );

      message.error(
        "Unable to copy phone number.",
      );
    }
  };

  /* ------------------------------------------------------
     Calendar navigation
  ------------------------------------------------------ */

  const closeDetailsModal = () => {
    setIsModalOpen(false);
    setSearch("");
    setContactFilter("all");
  };

  const updateWeekStart = (
    newStartDate,
  ) => {
    if (!newStartDate) {
      return;
    }

    closeDetailsModal();
    setSelectedDate(null);

    setWeekStart(
      newStartDate.startOf("day"),
    );
  };

  const handlePreviousSevenDays =
    () => {
      updateWeekStart(
        weekStart.subtract(7, "day"),
      );
    };

  const handleNextSevenDays = () => {
    updateWeekStart(
      weekStart.add(7, "day"),
    );
  };

  const handleToday = () => {
    updateWeekStart(
      dayjs().startOf("day"),
    );
  };

  const handleOpenDate = (date) => {
    setSelectedDate(date);
    setSearch("");
    setContactFilter("all");
    setIsModalOpen(true);
  };

  /* ------------------------------------------------------
     Modal search and filtering
  ------------------------------------------------------ */

  const filteredSelectedFollowUps =
    useMemo(() => {
      const keyword =
        normalizeValue(search);

      return selectedDateFollowUps.filter(
        (record) => {
          const hasAllergies =
            hasPatientAllergy(
              record,
            );

          const hasPhone =
            Boolean(
              cleanPhoneNumber(
                getPatientPhone(
                  record,
                ),
              ),
            );

          const matchesSearch =
            !keyword ||
            [
              getPatientName(
                record,
              ),

              getPatientId(record),

              getPatientPhone(
                record,
              ),

              getTreatmentName(
                record,
              ),

              record?.diagnosis,

              record?.doctor_notes,

              record
                ?.next_appointment_date,
            ].some((value) =>
              normalizeValue(
                value,
              ).includes(keyword),
            );

          const matchesFilter =
            contactFilter ===
              "all" ||
            (contactFilter ===
              "contactable" &&
              hasPhone) ||
            (contactFilter ===
              "allergies" &&
              hasAllergies) ||
            (contactFilter ===
              "no-phone" &&
              !hasPhone);

          return (
            matchesSearch &&
            matchesFilter
          );
        },
      );
    }, [
      selectedDateFollowUps,
      search,
      contactFilter,
    ]);

  /* ------------------------------------------------------
     Table columns
  ------------------------------------------------------ */

  const columns = [
    {
      title: "Patient",
      key: "patient",
      width: 255,
      fixed: "left",

      render: (_, record) => {
        const hasAllergies =
          hasPatientAllergy(
            record,
          );

        return (
          <Space
            size={11}
            align="start"
          >
            <Avatar
              size={43}
              icon={
                <UserOutlined />
              }
              className={
                hasAllergies
                  ? "follow-up-patient-avatar follow-up-patient-avatar--allergy"
                  : "follow-up-patient-avatar"
              }
            />

            <div className="follow-up-patient-cell">
              <Space
                wrap
                size={5}
              >
                <Text strong>
                  {getPatientName(
                    record,
                  )}
                </Text>

                {hasAllergies && (
                  <Tooltip
                    title={getAllergyDetails(
                      record,
                    )}
                  >
                    <Tag
                      color="red"
                      icon={
                        <WarningOutlined />
                      }
                      className="follow-up-allergy-tag"
                    >
                      Allergy
                    </Tag>
                  </Tooltip>
                )}
              </Space>

              <Text type="secondary">
                <IdcardOutlined />{" "}
                {getPatientId(
                  record,
                )}
              </Text>

              {(record?.age ||
                record?.gender) && (
                <Text type="secondary">
                  {record?.age
                    ? `${record.age} years`
                    : "Age not provided"}

                  {record?.gender
                    ? ` • ${record.gender}`
                    : ""}
                </Text>
              )}
            </div>
          </Space>
        );
      },
    },

    {
      title: "Contact",
      key: "contact",
      width: 205,

      render: (_, record) => {
        const phone =
          getPatientPhone(
            record,
          );

        const hasPhone =
          Boolean(
            cleanPhoneNumber(
              phone,
            ),
          );

        return (
          <div className="follow-up-contact-cell">
            <Text
              strong
              className={
                hasPhone
                  ? ""
                  : "follow-up-missing-phone"
              }
            >
              <PhoneOutlined />{" "}
              {hasPhone
                ? phone
                : "No phone number"}
            </Text>

            <Space size={7}>
              <Button
                type="primary"
                size="small"
                icon={
                  <PhoneOutlined />
                }
                disabled={!hasPhone}
                onClick={() =>
                  handleCallPatient(
                    phone,
                  )
                }
              >
                Call
              </Button>

              <Tooltip title="Copy phone number">
                <Button
                  size="small"
                  aria-label="Copy phone number"
                  icon={
                    <CopyOutlined />
                  }
                  disabled={
                    !hasPhone
                  }
                  onClick={() =>
                    handleCopyPhone(
                      phone,
                    )
                  }
                />
              </Tooltip>
            </Space>
          </div>
        );
      },
    },

    {
      title: "Previous Treatment",
      key: "previous_treatment",
      width: 285,

      render: (_, record) => (
        <div className="follow-up-treatment-cell">
          <Space
            size={8}
            align="start"
          >
            <div className="follow-up-treatment-icon">
              <MedicineBoxOutlined />
            </div>

            <div>
              <Text
                strong
                ellipsis={{
                  tooltip:
                    getTreatmentName(
                      record,
                    ),
                }}
              >
                {getTreatmentName(
                  record,
                )}
              </Text>

              <Text type="secondary">
                Diagnosis:{" "}
                {record?.diagnosis ||
                  "-"}
              </Text>

              <Text type="secondary">
                <ClockCircleOutlined />{" "}
                {formatDate(
                  getTreatmentDate(
                    record,
                  ),
                )}
              </Text>
            </div>
          </Space>
        </div>
      ),
    },

    {
      title: "Doctor Instructions",
      key: "doctor_notes",
      width: 310,

      render: (_, record) => (
        <Paragraph
          ellipsis={{
            rows: 3,
            expandable: true,
            symbol: "More",
          }}
          className="follow-up-doctor-notes"
        >
          {record?.doctor_notes ||
            "No special instructions provided."}
        </Paragraph>
      ),
    },

    {
      title: "Return Date",
      dataIndex:
        "next_appointment_date",
      key: "next_appointment_date",
      width: 180,

      render: (value) => (
        <Tag
          color="blue"
          icon={
            <CalendarOutlined />
          }
          className="follow-up-date-tag"
        >
          {formatDate(value)}
        </Tag>
      ),
    },
  ];

  /* ------------------------------------------------------
     Render
  ------------------------------------------------------ */

  return (
    <ClinicPage
      title="Patient Follow-ups"
      subtitle="Review upcoming patient follow-ups using the seven-day calendar."
      icon={<CalendarOutlined />}
      actions={[
        <div
          key="start-date"
          className="follow-up-date-control"
        >
          <div className="follow-up-date-control__icon">
            <CalendarOutlined />
          </div>

          <DatePicker
            value={weekStart}
            format="DD MMM YYYY"
            allowClear={false}
            onChange={(date) => {
              if (date) {
                updateWeekStart(
                  date,
                );
              }
            }}
            className="follow-up-date-picker"
          />
        </div>,

        <Button
          key="previous"
          icon={<LeftOutlined />}
          onClick={
            handlePreviousSevenDays
          }
        >
          Previous 7 Days
        </Button>,

        <Button
          key="today"
          type={
            weekStart.isSame(
              dayjs(),
              "day",
            )
              ? "primary"
              : "default"
          }
          icon={
            <CalendarOutlined />
          }
          onClick={handleToday}
        >
          Today
        </Button>,

        <Button
          key="next"
          icon={<RightOutlined />}
          onClick={
            handleNextSevenDays
          }
        >
          Next 7 Days
        </Button>,

        <Button
          key="refresh"
          icon={
            <ReloadOutlined />
          }
          loading={loading}
          onClick={
            loadWeekFollowUps
          }
        >
          Refresh
        </Button>,
      ]}
    >
      {/* Reminder information */}

      <Alert
        type="info"
        showIcon
        message="Seven-day follow-up calendar"
        description="Each date displays the number of patients advised to return. Select a date to view patient, treatment and contact details."
        className="follow-up-reminder-alert"
      />

      {/* Weekly summary */}

      <Row
        gutter={[16, 16]}
        className="follow-up-summary-row"
      >
        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <FollowUpSummaryCard
            title="Total Follow-ups"
            value={
              weekSummary.total
            }
            helper={weekRangeLabel}
            tone="blue"
            icon={
              <UserOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <FollowUpSummaryCard
            title="Phone Available"
            value={
              weekSummary.contactable
            }
            helper="Patients ready to contact"
            tone="green"
            icon={
              <PhoneOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <FollowUpSummaryCard
            title="Missing Phone"
            value={
              weekSummary.missingPhone
            }
            helper="Contact details required"
            tone="orange"
            icon={
              <WarningOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <FollowUpSummaryCard
            title="Allergy Patients"
            value={
              weekSummary.allergies
            }
            helper="Review before booking"
            tone="red"
            icon={
              <WarningOutlined />
            }
          />
        </Col>
      </Row>

      {/* Seven-day calendar */}

      <Card
        bordered={false}
        className="follow-up-calendar-card"
      >
        <div className="follow-up-calendar-header">
          <div>
            <Title level={4}>
              Follow-up Calendar
            </Title>

            <Text type="secondary">
              Select any date to view
              the patients expected to
              return.
            </Text>
          </div>

          <div className="follow-up-calendar-header__meta">
            <Tag
              color="blue"
              icon={
                <CalendarOutlined />
              }
            >
              {weekRangeLabel}
            </Tag>

            <Tag>
              7-day window
            </Tag>
          </div>
        </div>

        <div
          className={
            loading
              ? "follow-up-calendar-grid follow-up-calendar-grid--loading"
              : "follow-up-calendar-grid"
          }
        >
          {weekDates.map((date) => {
            const dateString =
              date.format(
                "YYYY-MM-DD",
              );

            const records =
              weeklyFollowUps[
                dateString
              ] ?? [];

            const daySummary =
              calculateFollowUpSummary(
                records,
              );

            const isToday =
              date.isSame(
                dayjs(),
                "day",
              );

            const isTomorrow =
              date.isSame(
                dayjs().add(
                  1,
                  "day",
                ),
                "day",
              );

            const hasPatients =
              daySummary.total > 0;

            const hasAllergies =
              daySummary.allergies > 0;

            const dayCardClasses = [
              "follow-up-day-card",

              isToday
                ? "follow-up-day-card--today"
                : "",

              hasPatients
                ? "follow-up-day-card--has-patients"
                : "",

              hasAllergies
                ? "follow-up-day-card--allergy"
                : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                type="button"
                key={dateString}
                className={
                  dayCardClasses
                }
                onClick={() =>
                  handleOpenDate(
                    date,
                  )
                }
                aria-label={`View ${daySummary.total} follow-up patient${
                  daySummary.total ===
                  1
                    ? ""
                    : "s"
                } for ${date.format(
                  "DD MMMM YYYY",
                )}`}
              >
                <div className="follow-up-day-card__top">
                  <div>
                    <Text className="follow-up-day-card__weekday">
                      {date.format(
                        "dddd",
                      )}
                    </Text>

                    <Text className="follow-up-day-card__full-date">
                      {date.format(
                        "DD MMM YYYY",
                      )}
                    </Text>
                  </div>

                  {isToday && (
                    <Tag
                      color="green"
                      icon={
                        <CheckCircleOutlined />
                      }
                      className="follow-up-day-card__status"
                    >
                      Today
                    </Tag>
                  )}

                  {isTomorrow &&
                    !isToday && (
                      <Tag
                        color="blue"
                        className="follow-up-day-card__status"
                      >
                        Tomorrow
                      </Tag>
                    )}
                </div>

                <div className="follow-up-day-card__date-section">
                  <div className="follow-up-day-card__date-number">
                    {date.format(
                      "DD",
                    )}
                  </div>

                  <div className="follow-up-day-card__month">
                    {date.format(
                      "MMMM",
                    )}
                  </div>
                </div>

                <div className="follow-up-day-card__count-section">
                  <div className="follow-up-day-card__count">
                    {
                      daySummary.total
                    }
                  </div>

                  <Text className="follow-up-day-card__count-label">
                    Follow-up
                    {daySummary.total ===
                    1
                      ? ""
                      : "s"}
                  </Text>
                </div>

                <div className="follow-up-day-card__details">
                  <div>
                    <PhoneOutlined />

                    <span>
                      {
                        daySummary.contactable
                      }{" "}
                      contactable
                    </span>
                  </div>

                  <div>
                    <WarningOutlined />

                    <span>
                      {
                        daySummary.allergies
                      }{" "}
                      allerg
                      {daySummary.allergies ===
                      1
                        ? "y"
                        : "ies"}
                    </span>
                  </div>
                </div>

                <div className="follow-up-day-card__footer">
                  {loading
                    ? "Loading records..."
                    : hasPatients
                      ? "Click to view patients"
                      : "No follow-ups scheduled"}

                  <RightOutlined />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected date modal */}

      <Modal
        open={isModalOpen}
        onCancel={
          closeDetailsModal
        }
        footer={null}
        width={1420}
        destroyOnClose
        className="follow-up-details-modal"
        title={
          <div className="follow-up-modal-title">
            <div className="follow-up-modal-title__icon">
              <CalendarOutlined />
            </div>

            <div>
              <Title level={4}>
                Follow-ups for{" "}
                {selectedDate
                  ? selectedDate.format(
                      "DD MMMM YYYY",
                    )
                  : ""}
              </Title>

              <Text type="secondary">
                Review treatment
                details and contact the
                relevant patients.
              </Text>
            </div>
          </div>
        }
      >
        <div className="follow-up-modal-summary">
          <div className="follow-up-modal-summary__item">
            <Text>Total Patients</Text>

            <strong>
              {
                selectedDateSummary.total
              }
            </strong>
          </div>

          <div className="follow-up-modal-summary__item follow-up-modal-summary__item--green">
            <Text>Phone Available</Text>

            <strong>
              {
                selectedDateSummary.contactable
              }
            </strong>
          </div>

          <div className="follow-up-modal-summary__item follow-up-modal-summary__item--orange">
            <Text>Missing Phone</Text>

            <strong>
              {
                selectedDateSummary.missingPhone
              }
            </strong>
          </div>

          <div className="follow-up-modal-summary__item follow-up-modal-summary__item--red">
            <Text>Allergy Patients</Text>

            <strong>
              {
                selectedDateSummary.allergies
              }
            </strong>
          </div>
        </div>

        <div className="follow-up-toolbar">
          <Input
            allowClear
            prefix={
              <SearchOutlined />
            }
            placeholder="Search patient, phone, treatment, diagnosis or instructions"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            className="follow-up-search-input"
          />

          <Segmented
            value={contactFilter}
            onChange={
              setContactFilter
            }
            className="follow-up-filter"
            options={[
              {
                label: `All (${selectedDateSummary.total})`,
                value: "all",
              },
              {
                label: `Contactable (${selectedDateSummary.contactable})`,
                value:
                  "contactable",
              },
              {
                label: `Allergies (${selectedDateSummary.allergies})`,
                value:
                  "allergies",
              },
              {
                label: `No Phone (${selectedDateSummary.missingPhone})`,
                value:
                  "no-phone",
              },
            ]}
          />
        </div>

        <Table
          rowKey={(
            record,
            index,
          ) =>
            record?.treatment_id ||
            record?.appointment_id ||
            `${getPatientId(
              record,
            )}-${
              record
                ?.next_appointment_date
            }-${index}`
          }
          columns={columns}
          dataSource={
            filteredSelectedFollowUps
          }
          loading={loading}
          scroll={{
            x: 1280,
          }}
          pagination={{
            pageSize: 8,
            showSizeChanger: false,

            showTotal: (total) =>
              `${total} patient${
                total === 1
                  ? ""
                  : "s"
              }`,
          }}
          rowClassName={(record) => {
            if (
              hasPatientAllergy(
                record,
              )
            ) {
              return "follow-up-row follow-up-row--allergy";
            }

            if (
              !cleanPhoneNumber(
                getPatientPhone(
                  record,
                ),
              )
            ) {
              return "follow-up-row follow-up-row--missing-phone";
            }

            return "follow-up-row";
          }}
          locale={{
            emptyText: (
              <Empty
                image={
                  Empty.PRESENTED_IMAGE_SIMPLE
                }
                description={
                  <div className="follow-up-empty-content">
                    <Text strong>
                      {search ||
                      contactFilter !==
                        "all"
                        ? "No matching follow-up patients"
                        : "No follow-up patients"}
                    </Text>

                    <Text type="secondary">
                      {search ||
                      contactFilter !==
                        "all"
                        ? "Try changing the search or contact filter."
                        : `No patients were advised to return on ${
                            selectedDate
                              ? selectedDate.format(
                                  "DD MMM YYYY",
                                )
                              : "this date"
                          }.`}
                    </Text>
                  </div>
                }
              />
            ),
          }}
        />
      </Modal>
    </ClinicPage>
  );
};

export default FollowUpPatients;