import React, {
  useCallback,
  useEffect,
  useMemo,
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
  MedicineBoxOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import {
  getFollowUpPatients,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";

import "./css/FollowUpPatients.css";

const {
  Title,
  Text,
  Paragraph,
} = Typography;

/* --------------------------------------------------------
   Helpers
-------------------------------------------------------- */

const convertToBoolean = (value) => {
  if (
    value === true ||
    value === 1
  ) {
    return true;
  }

  return [
    "true",
    "yes",
    "1",
  ].includes(
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

const extractFollowUpData = (
  response,
) => {
  return (
    response?.data?.data ??
    response?.data ??
    {}
  );
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

const hasPatientAllergy = (
  record,
) => {
  return convertToBoolean(
    record?.has_allergies ??
      record?.is_allergies ??
      record?.hasAllergies,
  );
};

const getAllergyDetails = (
  record,
) => {
  return (
    record?.allergy_details ||
    record?.allergies ||
    record?.allergy ||
    "Patient has a recorded allergy."
  );
};

const getTreatmentName = (
  record,
) => {
  return (
    record?.treatment_performed ||
    record?.treatment_name ||
    record?.treatment_details ||
    "Not specified"
  );
};

const getTreatmentDate = (
  record,
) => {
  return (
    record?.previous_treatment_date ||
    record?.treatment_date ||
    record?.created_at
  );
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
  const [
    selectedDate,
    setSelectedDate,
  ] = useState(dayjs());

  const [
    followUps,
    setFollowUps,
  ] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [
    contactFilter,
    setContactFilter,
  ] = useState("all");

  const selectedDateString =
    useMemo(() => {
      return selectedDate.format(
        "YYYY-MM-DD",
      );
    }, [selectedDate]);

  const formattedSelectedDate =
    useMemo(() => {
      return selectedDate.format(
        "DD MMMM YYYY",
      );
    }, [selectedDate]);

  const isSelectedDateToday =
    selectedDate.isSame(
      dayjs(),
      "day",
    );

  /* ------------------------------------------------------
     Load follow-up patients
  ------------------------------------------------------ */

  const loadFollowUps =
    useCallback(async () => {
      setLoading(true);

      try {
        const response =
          await getFollowUpPatients(
            selectedDateString,
          );

        const result =
          extractFollowUpData(
            response,
          );

        const followUpList =
          result?.follow_ups ??
          result?.followUps ??
          [];

        setFollowUps(
          Array.isArray(
            followUpList,
          )
            ? followUpList
            : [],
        );
      } catch (error) {
        console.error(
          "Failed to load follow-up patients:",
          error,
        );

        setFollowUps([]);

        message.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Unable to load follow-up patients.",
        );
      } finally {
        setLoading(false);
      }
    }, [selectedDateString]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

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

  const handleToday = () => {
    setSelectedDate(dayjs());
  };

  /* ------------------------------------------------------
     Summary
  ------------------------------------------------------ */

  const summary = useMemo(() => {
    const allergyPatients =
      followUps.filter(
        hasPatientAllergy,
      ).length;

    const contactablePatients =
      followUps.filter(
        (record) =>
          Boolean(
            cleanPhoneNumber(
              getPatientPhone(
                record,
              ),
            ),
          ),
      ).length;

    const missingPhone =
      followUps.length -
      contactablePatients;

    return {
      total: followUps.length,

      contactable:
        contactablePatients,

      missingPhone,

      allergies:
        allergyPatients,
    };
  }, [followUps]);

  /* ------------------------------------------------------
     Search and filtering
  ------------------------------------------------------ */

  const filteredFollowUps =
    useMemo(() => {
      const keyword =
        normalizeValue(search);

      return followUps.filter(
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
      followUps,
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
      subtitle={`Patients advised by the doctor to return on ${formattedSelectedDate}.`}
      icon={<CalendarOutlined />}
      actions={[
        <div
          key="date"
          className="follow-up-date-control"
        >
          <div className="follow-up-date-control__icon">
            <CalendarOutlined />
          </div>

          <DatePicker
            value={selectedDate}
            format="DD MMM YYYY"
            allowClear={false}
            onChange={(date) => {
              if (date) {
                setSelectedDate(
                  date,
                );
              }
            }}
            className="follow-up-date-picker"
          />
        </div>,

        <Button
          key="today"
          icon={
            <CalendarOutlined />
          }
          type={
            isSelectedDateToday
              ? "primary"
              : "default"
          }
          onClick={handleToday}
        >
          Today
        </Button>,

        <Button
          key="refresh"
          icon={
            <ReloadOutlined />
          }
          loading={loading}
          onClick={loadFollowUps}
        >
          Refresh
        </Button>,
      ]}
    >
      {/* Reminder information */}

      <Alert
        type="info"
        showIcon
        message="Contact reminder list"
        description="These patients were advised to return on the selected date. Contact them to remind them and arrange an appointment when required."
        className="follow-up-reminder-alert"
      />

      {/* Summary cards */}

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
            title="Patients to Contact"
            value={summary.total}
            helper={formattedSelectedDate}
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
              summary.contactable
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
              summary.missingPhone
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
              summary.allergies
            }
            helper="Review before booking"
            tone="red"
            icon={
              <WarningOutlined />
            }
          />
        </Col>
      </Row>

      {/* Follow-up directory */}

      <Card
        bordered={false}
        className="follow-up-directory-card"
      >
        <div className="follow-up-directory-header">
          <div>
            <Title level={4}>
              Follow-up Schedule
            </Title>

            <Text type="secondary">
              Review previous treatment
              details and contact patients
              due to return.
            </Text>
          </div>

          <div className="follow-up-directory-header__meta">
            <Tag color="blue">
              {
                filteredFollowUps.length
              }{" "}
              patient
              {filteredFollowUps.length ===
              1
                ? ""
                : "s"}
            </Tag>

            {isSelectedDateToday && (
              <Tag
                color="green"
                icon={
                  <CheckCircleOutlined />
                }
              >
                Today
              </Tag>
            )}
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
                label: `All (${summary.total})`,
                value: "all",
              },
              {
                label: `Contactable (${summary.contactable})`,
                value:
                  "contactable",
              },
              {
                label: `Allergies (${summary.allergies})`,
                value:
                  "allergies",
              },
              {
                label: `No Phone (${summary.missingPhone})`,
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
            `${getPatientId(
              record,
            )}-${
              record
                ?.next_appointment_date
            }-${index}`
          }
          columns={columns}
          dataSource={
            filteredFollowUps
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
                        : `No patients were advised to return on ${selectedDate.format(
                            "DD MMM YYYY",
                          )}.`}
                    </Text>
                  </div>
                }
              />
            ),
          }}
        />
      </Card>
    </ClinicPage>
  );
};

export default FollowUpPatients;