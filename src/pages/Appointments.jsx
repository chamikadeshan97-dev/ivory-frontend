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
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
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
  CloseCircleOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  LoginOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  SearchOutlined,
  UserAddOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import {
  checkInAppointmentToQueue,
  createAppointment,
  createPatient,
  getAppointments,
  getCommonTreatments,
  getDentists,
  getPatients,
  updateAppointment,
  updateAppointmentStatus,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";

import "./css/Appointments.css";

dayjs.extend(customParseFormat);

const {
  Title,
  Text,
} = Typography;

/* --------------------------------------------------------
   Status options
-------------------------------------------------------- */

const bookingStatusOptions = [
  {
    label: "Pending",
    value: "Pending",
  },
  {
    label: "Confirmed",
    value: "Confirmed",
  },
  {
    label: "Cancelled",
    value: "Cancelled",
  },
];

const allStatusOptions = [
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
    label: "In Treatment",
    value: "In Treatment",
  },
  {
    label: "Treatment Done",
    value: "Treatment Done",
  },
  {
    label: "Payment Pending",
    value: "Payment Pending",
  },
  {
    label: "Paid",
    value: "Paid",
  },
  {
    label: "Completed",
    value: "Completed",
  },
  {
    label: "Cancelled",
    value: "Cancelled",
  },
];

const lockedStatuses = [
  "Checked In",
  "In Treatment",
  "Treatment Done",
  "Payment Pending",
  "Paid",
  "Completed",
];

const activeStatuses = [
  "Pending",
  "Confirmed",
  "Checked In",
  "In Treatment",
  "Treatment Done",
  "Payment Pending",
];

const completedStatuses = [
  "Paid",
  "Completed",
];

/* --------------------------------------------------------
   Form options
-------------------------------------------------------- */

const genderOptions = [
  {
    label: "Male",
    value: "Male",
  },
  {
    label: "Female",
    value: "Female",
  },
  {
    label: "Other",
    value: "Other",
  },
];

/* --------------------------------------------------------
   Time slots
-------------------------------------------------------- */

const makeTimeOption = (time) => ({
  value: time,
  label: dayjs(time, "HH:mm").format("h:mm A"),
});

const generateTimeSlots = (
  startTime,
  endTime,
  gapMinutes,
) => {
  const slots = [];

  const [
    startHours,
    startMinutes,
  ] = startTime.split(":").map(Number);

  const [
    endHours,
    endMinutes,
  ] = endTime.split(":").map(Number);

  let currentMinutes =
    startHours * 60 + startMinutes;

  const finalMinutes =
    endHours * 60 + endMinutes;

  while (currentMinutes <= finalMinutes) {
    const slotHours = Math.floor(
      currentMinutes / 60,
    );

    const slotMinutes =
      currentMinutes % 60;

    slots.push(
      `${String(slotHours).padStart(
        2,
        "0",
      )}:${String(slotMinutes).padStart(
        2,
        "0",
      )}`,
    );

    currentMinutes += gapMinutes;
  }

  return slots;
};

const appointmentTimeOptions = [
  {
    label: "Morning",
    options: [
      "08:00",
      "08:30",
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
    ].map(makeTimeOption),
  },
  {
    label: "Afternoon",
    options: [
      "12:00",
      "12:30",
      "13:00",
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
    ].map(makeTimeOption),
  },
  {
    label: "Evening",
    options: generateTimeSlots(
      "16:00",
      "19:30",
      15,
    ).map(makeTimeOption),
  },
  {
    label: "Night",
    options: generateTimeSlots(
      "20:00",
      "23:30",
      5,
    ).map(makeTimeOption),
  },
];

const appointmentTimeSlots =
  appointmentTimeOptions.flatMap((group) =>
    group.options.map(
      (option) => option.value,
    ),
  );

/* --------------------------------------------------------
   Helpers
-------------------------------------------------------- */

const extractArray = (response) => {
  const data =
    response?.data?.data ||
    response?.data ||
    [];

  return Array.isArray(data)
    ? data
    : [];
};

const normalizeStatus = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const normalizeText = (value) => {
  return String(value ?? "").trim();
};

const getAppointmentId = (record) => {
  return (
    record?.id ||
    record?.appointment_id ||
    ""
  );
};

const getPatientId = (patient) => {
  return (
    patient?.patient_id ||
    patient?.id ||
    ""
  );
};

const getPatientName = (patient) => {
  return (
    patient?.name ||
    [
      patient?.first_name,
      patient?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed Patient"
  );
};

const getPatientPhone = (patient) => {
  return (
    patient?.phone ||
    patient?.phone_number ||
    patient?.mobile ||
    "-"
  );
};

const getDentistId = (dentist) => {
  return (
    dentist?.dentist_id ||
    dentist?.id ||
    ""
  );
};

const getDentistName = (dentist) => {
  return (
    dentist?.name ||
    dentist?.dentist_name ||
    "Unnamed Dentist"
  );
};

const getCommonTreatmentId = (treatment) => {
  return (
    treatment?.id ||
    treatment?.common_treatment_id ||
    ""
  );
};

const getCommonTreatmentName = (treatment) => {
  return (
    treatment?.treatment_name ||
    treatment?.name ||
    ""
  );
};

const getCommonTreatmentFee = (treatment) => {
  const fee = Number(
    treatment?.fee ??
      treatment?.default_fee,
  );

  return Number.isFinite(fee)
    ? fee
    : null;
};

const checkHasAllergy = (value) => {
  if (
    value === true ||
    value === 1
  ) {
    return true;
  }

  return [
    "yes",
    "true",
    "1",
  ].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
};

const formatAppointmentTime = (time) => {
  if (!time) {
    return "-";
  }

  const parsedTime = dayjs(
    time,
    [
      "HH:mm",
      "HH:mm:ss",
      "h:mm A",
      "hh:mm A",
    ],
    true,
  );

  return parsedTime.isValid()
    ? parsedTime.format("h:mm A")
    : time;
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

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Fee not available";
  }

  return `Rs. ${amount.toLocaleString(
    "en-LK",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
};

const getStatusColor = (status) => {
  const colors = {
    Pending: "blue",
    Confirmed: "purple",
    "Checked In": "cyan",
    "In Treatment": "orange",
    "Treatment Done": "gold",
    "Payment Pending": "volcano",
    Paid: "green",
    Completed: "success",
    Cancelled: "red",
  };

  return colors[status] || "default";
};

/* --------------------------------------------------------
   Summary card
-------------------------------------------------------- */

const AppointmentSummaryCard = ({
  title,
  value,
  helper,
  icon,
  tone,
}) => {
  return (
    <Card
      bordered={false}
      className={`booking-summary-card booking-summary-card--${tone}`}
    >
      <div className="booking-summary-card__content">
        <div>
          <Text className="booking-summary-card__title">
            {title}
          </Text>

          <div className="booking-summary-card__value">
            {value}
          </div>

          <Text className="booking-summary-card__helper">
            {helper}
          </Text>
        </div>

        <div className="booking-summary-card__icon">
          {icon}
        </div>
      </div>
    </Card>
  );
};

/* --------------------------------------------------------
   Component
-------------------------------------------------------- */

const Appointments = () => {
  const [form] = Form.useForm();
  const [patientForm] = Form.useForm();

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    checkingInId,
    setCheckingInId,
  ] = useState(null);

  const [
    patientSaving,
    setPatientSaving,
  ] = useState(false);

  const [
    appointments,
    setAppointments,
  ] = useState([]);

  const [
    patients,
    setPatients,
  ] = useState([]);

  const [
    dentists,
    setDentists,
  ] = useState([]);

  const [
    commonTreatments,
    setCommonTreatments,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    dateFilter,
    setDateFilter,
  ] = useState(dayjs());

  /* ------------------------------------------------------
     Appointment modal
  ------------------------------------------------------ */

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [
    editingAppointment,
    setEditingAppointment,
  ] = useState(null);

  /* ------------------------------------------------------
     Patient modal
  ------------------------------------------------------ */

  const [
    patientModalOpen,
    setPatientModalOpen,
  ] = useState(false);

  const [
    showPatientMoreOptions,
    setShowPatientMoreOptions,
  ] = useState(false);

  /* ------------------------------------------------------
     Watched form values
  ------------------------------------------------------ */

  const patientHasAllergies =
    Form.useWatch(
      "has_allergies",
      patientForm,
    );

  const watchedAppointmentDate =
    Form.useWatch(
      "appointment_date",
      form,
    );

  const watchedAppointmentTime =
    Form.useWatch(
      "appointment_time",
      form,
    );

  const watchedReasonForVisit =
    Form.useWatch(
      "reason_for_visit",
      form,
    );

  const selectedDentistId =
    Form.useWatch(
      "dentist_id",
      form,
    );

  const selectedPatientId =
    Form.useWatch(
      "patient_id",
      form,
    );

  /* ------------------------------------------------------
     Load data
  ------------------------------------------------------ */

  const loadInitialData =
    useCallback(async () => {
      setLoading(true);

      try {
        const [
          appointmentsResponse,
          patientsResponse,
          dentistsResponse,
          commonTreatmentsResponse,
        ] = await Promise.all([
          getAppointments(),
          getPatients(),
          getDentists(),
          getCommonTreatments(),
        ]);

        const appointmentData =
          extractArray(
            appointmentsResponse,
          );

        const patientData =
          extractArray(
            patientsResponse,
          );

        const dentistData =
          extractArray(
            dentistsResponse,
          );

        const commonTreatmentData =
          extractArray(
            commonTreatmentsResponse,
          );

        const patientMap = new Map(
          patientData.map(
            (patient) => [
              String(
                getPatientId(patient),
              ),
              patient,
            ],
          ),
        );

        const dentistMap = new Map(
          dentistData.map(
            (dentist) => [
              String(
                getDentistId(dentist),
              ),
              dentist,
            ],
          ),
        );

        const enrichedAppointments =
          appointmentData.map(
            (appointment) => {
              const patient =
                patientMap.get(
                  String(
                    appointment?.patient_id,
                  ),
                );

              const dentist =
                dentistMap.get(
                  String(
                    appointment?.dentist_id,
                  ),
                );

              const allergyValue =
                patient?.has_allergies ??
                patient?.is_allergies ??
                patient?.hasAllergies ??
                false;

              return {
                ...appointment,

                patient_name:
                  appointment?.patient_name ||
                  getPatientName(patient) ||
                  appointment?.patient_id ||
                  "-",

                phone:
                  appointment?.phone ||
                  getPatientPhone(patient),

                patient_has_allergies:
                  checkHasAllergy(
                    allergyValue,
                  ),

                patient_allergy_details:
                  patient?.allergy_details ||
                  patient?.allergies ||
                  patient?.allergy ||
                  "",

                dentist_name:
                  appointment?.dentist_name ||
                  getDentistName(dentist) ||
                  appointment?.dentist_id ||
                  "-",
              };
            },
          );

        setAppointments(
          enrichedAppointments,
        );

        setPatients(patientData);
        setDentists(dentistData);

        setCommonTreatments(
          commonTreatmentData,
        );
      } catch (error) {
        console.error(
          "Failed to load appointment data:",
          error,
        );

        message.error(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load appointment data",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  /* ------------------------------------------------------
     Patient options
  ------------------------------------------------------ */

  const patientOptions = useMemo(() => {
    return patients.map((patient) => {
      const patientId =
        getPatientId(patient);

      const patientName =
        getPatientName(patient);

      const allergyValue =
        patient?.has_allergies ??
        patient?.is_allergies ??
        patient?.hasAllergies ??
        false;

      const hasAllergy =
        checkHasAllergy(
          allergyValue,
        );

      return {
        value: patientId,
        label: patientName,
        patientName,
        phone:
          getPatientPhone(patient),
        hasAllergy,

        allergyDetails:
          patient?.allergy_details ||
          patient?.allergies ||
          patient?.allergy ||
          "No allergy details were provided",
      };
    });
  }, [patients]);

  const selectedPatient = useMemo(() => {
    return patientOptions.find(
      (patient) =>
        String(patient.value) ===
        String(selectedPatientId),
    );
  }, [
    patientOptions,
    selectedPatientId,
  ]);

  /* ------------------------------------------------------
     Dentist options
  ------------------------------------------------------ */

  const dentistOptions = useMemo(() => {
    return dentists.map(
      (dentist) => ({
        label:
          getDentistName(dentist),

        value:
          getDentistId(dentist),

        specialization:
          dentist?.specialization ||
          "General Dentistry",

        status:
          dentist?.status ||
          "Active",
      }),
    );
  }, [dentists]);

  useEffect(() => {
    if (
      dentistOptions.length > 0 &&
      !form.getFieldValue(
        "dentist_id",
      )
    ) {
      form.setFieldValue(
        "dentist_id",
        dentistOptions[0].value,
      );
    }
  }, [
    dentistOptions,
    form,
  ]);

  /* ------------------------------------------------------
     Common treatment options
  ------------------------------------------------------ */

  const commonTreatmentOptions =
    useMemo(() => {
      const treatmentMap =
        new Map();

      commonTreatments.forEach(
        (treatment) => {
          const treatmentName =
            normalizeText(
              getCommonTreatmentName(
                treatment,
              ),
            );

          if (!treatmentName) {
            return;
          }

          const normalizedName =
            treatmentName.toLowerCase();

          if (
            treatmentMap.has(
              normalizedName,
            )
          ) {
            return;
          }

          treatmentMap.set(
            normalizedName,
            {
              value:
                treatmentName,

              label:
                treatmentName,

              treatmentId:
                getCommonTreatmentId(
                  treatment,
                ),

              fee:
                getCommonTreatmentFee(
                  treatment,
                ),
            },
          );
        },
      );

      /*
       * Keep an old reason visible while editing,
       * even when it no longer exists in the
       * common treatment sheet.
       */
      const existingReason =
        normalizeText(
          editingAppointment
            ?.reason_for_visit,
        );

      if (
        existingReason &&
        !treatmentMap.has(
          existingReason.toLowerCase(),
        )
      ) {
        treatmentMap.set(
          existingReason.toLowerCase(),
          {
            value: existingReason,
            label: existingReason,
            treatmentId: "",
            fee: null,
            isLegacy: true,
          },
        );
      }

      /*
       * Keep Other as a manual/general
       * appointment reason.
       */
      if (
        !treatmentMap.has("other")
      ) {
        treatmentMap.set(
          "other",
          {
            value: "Other",
            label: "Other",
            treatmentId: "",
            fee: null,
            isOther: true,
          },
        );
      }

      return Array.from(
        treatmentMap.values(),
      ).sort((first, second) => {
        if (first.isOther) {
          return 1;
        }

        if (second.isOther) {
          return -1;
        }

        return first.label.localeCompare(
          second.label,
          undefined,
          {
            sensitivity: "base",
          },
        );
      });
    }, [
      commonTreatments,
      editingAppointment,
    ]);

  const selectedCommonTreatment =
    useMemo(() => {
      const selectedReason =
        normalizeText(
          watchedReasonForVisit,
        ).toLowerCase();

      if (!selectedReason) {
        return null;
      }

      return (
        commonTreatmentOptions.find(
          (treatment) =>
            normalizeText(
              treatment.value,
            ).toLowerCase() ===
            selectedReason,
        ) || null
      );
    }, [
      commonTreatmentOptions,
      watchedReasonForVisit,
    ]);

  /* ------------------------------------------------------
     Next appointment time
  ------------------------------------------------------ */

  const getNextAppointmentTime =
    useCallback(
      (selectedDate) => {
        if (!selectedDate) {
          return appointmentTimeSlots[0];
        }

        const selectedDateText =
          selectedDate.format(
            "YYYY-MM-DD",
          );

        const sameDateAppointments =
          appointments
            .filter(
              (appointment) => {
                const appointmentDate =
                  appointment
                    ?.appointment_date ||
                  appointment?.date;

                const status =
                  appointment?.status ||
                  "Pending";

                return (
                  appointmentDate ===
                    selectedDateText &&
                  status !==
                    "Cancelled"
                );
              },
            )
            .sort(
              (first, second) => {
                const firstTime =
                  first
                    ?.appointment_time ||
                  first?.time ||
                  "";

                const secondTime =
                  second
                    ?.appointment_time ||
                  second?.time ||
                  "";

                return firstTime.localeCompare(
                  secondTime,
                );
              },
            );

        if (
          sameDateAppointments.length ===
          0
        ) {
          return appointmentTimeSlots[0];
        }

        const lastAppointment =
          sameDateAppointments[
            sameDateAppointments.length -
              1
          ];

        const lastTime =
          lastAppointment
            ?.appointment_time ||
          lastAppointment?.time;

        const lastSlotIndex =
          appointmentTimeSlots.findIndex(
            (slot) =>
              slot === lastTime,
          );

        if (lastSlotIndex === -1) {
          const nextSlot =
            appointmentTimeSlots.find(
              (slot) =>
                slot > lastTime,
            );

          return (
            nextSlot ||
            appointmentTimeSlots[
              appointmentTimeSlots.length -
                1
            ]
          );
        }

        return (
          appointmentTimeSlots[
            lastSlotIndex + 1
          ] ||
          appointmentTimeSlots[
            appointmentTimeSlots.length -
              1
          ]
        );
      },
      [appointments],
    );

  useEffect(() => {
    if (
      !modalOpen ||
      editingAppointment ||
      !watchedAppointmentDate
    ) {
      return;
    }

    form.setFieldsValue({
      appointment_time:
        getNextAppointmentTime(
          watchedAppointmentDate,
        ),
    });
  }, [
    modalOpen,
    editingAppointment,
    watchedAppointmentDate,
    appointments,
    form,
    getNextAppointmentTime,
  ]);

  /* ------------------------------------------------------
     Appointment number preview
  ------------------------------------------------------ */

  const {
    appointmentNo:
      currentModalAppointmentNo,
    lastAppointmentTime,
  } = useMemo(() => {
    if (!watchedAppointmentDate) {
      return {
        appointmentNo: 1,
        lastAppointmentTime: null,
      };
    }

    const selectedDate =
      watchedAppointmentDate.format(
        "YYYY-MM-DD",
      );

    const selectedTime =
      watchedAppointmentTime ||
      "23:59";

    const sameDateAppointments =
      appointments
        .filter(
          (appointment) => {
            const appointmentDate =
              appointment
                ?.appointment_date ||
              appointment?.date;

            const status =
              appointment?.status ||
              "Pending";

            if (
              appointmentDate !==
              selectedDate
            ) {
              return false;
            }

            if (
              status ===
              "Cancelled"
            ) {
              return false;
            }

            if (
              editingAppointment &&
              getAppointmentId(
                appointment,
              ) ===
                getAppointmentId(
                  editingAppointment,
                )
            ) {
              return false;
            }

            return true;
          },
        )
        .sort(
          (first, second) => {
            const firstTime =
              first
                ?.appointment_time ||
              first?.time ||
              "";

            const secondTime =
              second
                ?.appointment_time ||
              second?.time ||
              "";

            return firstTime.localeCompare(
              secondTime,
            );
          },
        );

    const beforeCount =
      sameDateAppointments.filter(
        (appointment) => {
          const appointmentTime =
            appointment
              ?.appointment_time ||
            appointment?.time ||
            "";

          return (
            appointmentTime <
            selectedTime
          );
        },
      ).length;

    const lastAppointment =
      sameDateAppointments.length > 0
        ? sameDateAppointments[
            sameDateAppointments.length -
              1
          ]
        : null;

    return {
      appointmentNo:
        beforeCount + 1,

      lastAppointmentTime:
        lastAppointment
          ?.appointment_time ||
        lastAppointment?.time ||
        null,
    };
  }, [
    appointments,
    watchedAppointmentDate,
    watchedAppointmentTime,
    editingAppointment,
  ]);

  /* ------------------------------------------------------
     Appointment numbering
  ------------------------------------------------------ */

  const appointmentsWithNumber =
    useMemo(() => {
      const sortedAppointments = [
        ...appointments,
      ].sort(
        (first, second) => {
          const firstDate =
            first
              ?.appointment_date ||
            first?.date ||
            "";

          const secondDate =
            second
              ?.appointment_date ||
            second?.date ||
            "";

          if (
            firstDate !== secondDate
          ) {
            return firstDate.localeCompare(
              secondDate,
            );
          }

          const firstTime =
            first
              ?.appointment_time ||
            first?.time ||
            "";

          const secondTime =
            second
              ?.appointment_time ||
            second?.time ||
            "";

          return firstTime.localeCompare(
            secondTime,
          );
        },
      );

      const numberMap = {};

      return sortedAppointments.map(
        (appointment) => {
          const date =
            appointment
              ?.appointment_date ||
            appointment?.date ||
            "";

          const status =
            appointment?.status ||
            "Pending";

          if (!numberMap[date]) {
            numberMap[date] = 1;
          }

          const appointmentNumber =
            status === "Cancelled"
              ? "-"
              : numberMap[date];

          if (
            status !== "Cancelled"
          ) {
            numberMap[date] += 1;
          }

          return {
            ...appointment,
            appointment_number:
              appointmentNumber,
          };
        },
      );
    }, [appointments]);

  /* ------------------------------------------------------
     Date-specific appointments
  ------------------------------------------------------ */

  const dateAppointments =
    useMemo(() => {
      if (!dateFilter) {
        return appointmentsWithNumber;
      }

      const selectedDate =
        dateFilter.format(
          "YYYY-MM-DD",
        );

      return appointmentsWithNumber.filter(
        (appointment) => {
          const appointmentDate =
            appointment
              ?.appointment_date ||
            appointment?.date;

          return (
            appointmentDate ===
            selectedDate
          );
        },
      );
    }, [
      appointmentsWithNumber,
      dateFilter,
    ]);

  /* ------------------------------------------------------
     Summary
  ------------------------------------------------------ */

  const appointmentSummary =
    useMemo(() => {
      const pending =
        dateAppointments.filter(
          (appointment) =>
            [
              "Pending",
              "Confirmed",
            ].includes(
              appointment?.status ||
                "Pending",
            ),
        ).length;

      const checkedIn =
        dateAppointments.filter(
          (appointment) =>
            appointment?.status ===
            "Checked In",
        ).length;

      const completed =
        dateAppointments.filter(
          (appointment) =>
            completedStatuses.includes(
              appointment?.status,
            ),
        ).length;

      const cancelled =
        dateAppointments.filter(
          (appointment) =>
            appointment?.status ===
            "Cancelled",
        ).length;

      return {
        total:
          dateAppointments.length,
        pending,
        checkedIn,
        completed,
        cancelled,
      };
    }, [dateAppointments]);

  /* ------------------------------------------------------
     Search and status filter
  ------------------------------------------------------ */

  const filteredAppointments =
    useMemo(() => {
      const keyword =
        search
          .toLowerCase()
          .trim();

      return dateAppointments.filter(
        (appointment) => {
          const status =
            appointment?.status ||
            "Pending";

          const searchableValues = [
            getAppointmentId(
              appointment,
            ),

            appointment
              ?.appointment_number,

            appointment
              ?.patient_name,

            appointment
              ?.dentist_name,

            appointment?.phone,

            appointment
              ?.reason_for_visit,

            status,
          ];

          const matchesSearch =
            !keyword ||
            searchableValues.some(
              (value) =>
                String(
                  value ?? "",
                )
                  .toLowerCase()
                  .includes(
                    keyword,
                  ),
            );

          const matchesFilter =
            statusFilter === "all" ||
            (statusFilter ===
              "active" &&
              activeStatuses.includes(
                status,
              )) ||
            (statusFilter ===
              "completed" &&
              completedStatuses.includes(
                status,
              )) ||
            (statusFilter ===
              "cancelled" &&
              status ===
                "Cancelled");

          return (
            matchesSearch &&
            matchesFilter
          );
        },
      );
    }, [
      dateAppointments,
      search,
      statusFilter,
    ]);

  /* ------------------------------------------------------
     Patient modal
  ------------------------------------------------------ */

  const openPatientModal = () => {
    patientForm.resetFields();

    patientForm.setFieldsValue({
      name: "",
      phone: "",
      age: "",
      gender: "Male",
      address: "",
      status: "Active",
      has_allergies: false,
      allergy_details: "",
    });

    setShowPatientMoreOptions(
      false,
    );

    setPatientModalOpen(true);
  };

  const closePatientModal = () => {
    setPatientModalOpen(false);

    setShowPatientMoreOptions(
      false,
    );

    patientForm.resetFields();
  };

  /* ------------------------------------------------------
     Appointment modal
  ------------------------------------------------------ */

  const openAddModal = () => {
    const today = dayjs();

    setEditingAppointment(null);

    form.resetFields();

    form.setFieldsValue({
      appointment_date: today,

      appointment_time:
        getNextAppointmentTime(
          today,
        ),

      dentist_id:
        dentistOptions[0]?.value,

      status: "Pending",

      reason_for_visit:
        undefined,
    });

    setModalOpen(true);
  };

  const openEditModal = (
    appointment,
  ) => {
    setEditingAppointment(
      appointment,
    );

    const appointmentDate =
      appointment
        ?.appointment_date ||
      appointment?.date;

    const dateValue =
      appointmentDate
        ? dayjs(
            appointmentDate,
            "YYYY-MM-DD",
          )
        : null;

    form.resetFields();

    form.setFieldsValue({
      patient_id:
        appointment?.patient_id ||
        undefined,

      dentist_id:
        appointment?.dentist_id ||
        undefined,

      appointment_date:
        dateValue,

      appointment_time:
        appointment
          ?.appointment_time ||
        appointment?.time ||
        null,

      reason_for_visit:
        appointment
          ?.reason_for_visit ||
        "",

      status:
        appointment?.status ||
        "Pending",
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAppointment(null);
    form.resetFields();
  };

  /* ------------------------------------------------------
     Create patient
  ------------------------------------------------------ */

  const handleCreatePatient =
    async () => {
      try {
        const values =
          await patientForm.validateFields();

        setPatientSaving(true);

        const hasAllergies =
          values.has_allergies ===
          true;

        const payload = {
          name:
            values.name?.trim() ||
            "",

          phone:
            values.phone?.trim() ||
            "",

          age:
            values.age || "",

          gender:
            values.gender || "",

          address:
            values.address?.trim() ||
            "",

          status:
            values.status ||
            "Active",

          has_allergies:
            hasAllergies,

          allergy_details:
            hasAllergies
              ? values
                  .allergy_details
                  ?.trim() ||
                ""
              : "",
        };

        const response =
          await createPatient(
            payload,
          );

        const newPatient =
          response?.data?.data ||
          response?.data;

        const newPatientId =
          newPatient?.patient_id ||
          newPatient?.id;

        if (!newPatientId) {
          throw new Error(
            "Patient was created, but the patient ID was not returned",
          );
        }

        message.success(
          "Patient added successfully",
        );

        await loadInitialData();

        form.setFieldValue(
          "patient_id",
          newPatientId,
        );

        closePatientModal();
      } catch (error) {
        if (error?.errorFields) {
          return;
        }

        console.error(
          "Failed to add patient:",
          error,
        );

        message.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Failed to add patient",
        );
      } finally {
        setPatientSaving(false);
      }
    };

  /* ------------------------------------------------------
     Save appointment
  ------------------------------------------------------ */

  const handleSubmit =
    async () => {
      try {
        const values =
          await form.validateFields();

        setSaving(true);

        const payload = {
          patient_id:
            values.patient_id,

          dentist_id:
            values.dentist_id,

          appointment_date:
            values.appointment_date.format(
              "YYYY-MM-DD",
            ),

          appointment_number:
            currentModalAppointmentNo,

          appointment_time:
            values.appointment_time,

          /*
           * The selected common treatment name
           * is saved as the appointment reason.
           */
          reason_for_visit:
            values.reason_for_visit ||
            "",

          status:
            values.status ||
            "Pending",
        };

        if (
          editingAppointment
        ) {
          await updateAppointment(
            getAppointmentId(
              editingAppointment,
            ),
            payload,
          );

          message.success(
            "Appointment updated successfully",
          );
        } else {
          await createAppointment(
            payload,
          );

          message.success(
            "Appointment added successfully",
          );
        }

        closeModal();

        await loadInitialData();
      } catch (error) {
        if (error?.errorFields) {
          return;
        }

        console.error(
          "Failed to save appointment:",
          error,
        );

        message.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Failed to save appointment",
        );
      } finally {
        setSaving(false);
      }
    };

  /* ------------------------------------------------------
     Status changes
  ------------------------------------------------------ */

  const handleStatusChange =
    async (
      appointment,
      status,
    ) => {
      try {
        await updateAppointmentStatus(
          getAppointmentId(
            appointment,
          ),
          status,
        );

        message.success(
          `Appointment marked as ${status}`,
        );

        setAppointments(
          (previous) =>
            previous.map((item) =>
              getAppointmentId(
                item,
              ) ===
              getAppointmentId(
                appointment,
              )
                ? {
                    ...item,
                    status,
                  }
                : item,
            ),
        );
      } catch (error) {
        console.error(
          "Failed to update appointment status:",
          error,
        );

        message.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Failed to update appointment status",
        );
      }
    };

  const handleCheckIn =
    async (appointment) => {
      const appointmentId =
        getAppointmentId(
          appointment,
        );

      try {
        setCheckingInId(
          appointmentId,
        );

        await checkInAppointmentToQueue(
          {
            appointment_id:
              appointmentId,

            queue_date:
              appointment
                ?.appointment_date ||
              appointment?.date ||
              dayjs().format(
                "YYYY-MM-DD",
              ),
          },
        );

        message.success(
          "Patient checked in and added to today's queue",
        );

        setAppointments(
          (previous) =>
            previous.map((item) =>
              getAppointmentId(
                item,
              ) ===
              appointmentId
                ? {
                    ...item,
                    status:
                      "Checked In",
                  }
                : item,
            ),
        );
      } catch (error) {
        console.error(
          "Failed to check in patient:",
          error,
        );

        message.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Failed to check in patient",
        );
      } finally {
        setCheckingInId(null);
      }
    };

  const handleCancelAppointment =
    async (appointment) => {
      await handleStatusChange(
        appointment,
        "Cancelled",
      );
    };

  /* ------------------------------------------------------
     Table columns
  ------------------------------------------------------ */

  const columns = [
    {
      title: "Appointment",
      key: "appointment",
      width: 145,
      fixed: "left",

      render: (_, record) => (
        <div className="booking-number-cell">
          <div className="booking-number-badge">
            {record
              ?.appointment_number ===
            "-"
              ? "-"
              : `#${record?.appointment_number}`}
          </div>

          <Text type="secondary">
            {getAppointmentId(
              record,
            )}
          </Text>
        </div>
      ),
    },
    {
      title: "Date and Time",
      key: "date_time",
      width: 180,

      render: (_, record) => (
        <Space
          size={9}
          align="start"
        >
          <div className="booking-date-icon">
            <CalendarOutlined />
          </div>

          <div className="booking-date-cell">
            <Text strong>
              {formatDate(
                record
                  ?.appointment_date ||
                  record?.date,
              )}
            </Text>

            <Text type="secondary">
              <ClockCircleOutlined />{" "}
              {formatAppointmentTime(
                record
                  ?.appointment_time ||
                  record?.time,
              )}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Patient",
      key: "patient",
      width: 240,

      render: (_, record) => {
        const hasAllergy =
          record
            ?.patient_has_allergies ===
          true;

        return (
          <Space
            size={10}
            align="start"
          >
            <Avatar
              size={40}
              icon={
                <UserOutlined />
              }
              className={
                hasAllergy
                  ? "booking-patient-avatar booking-patient-avatar--allergy"
                  : "booking-patient-avatar"
              }
            />

            <div className="booking-person-cell">
              <Space
                wrap
                size={5}
              >
                <Text strong>
                  {record
                    ?.patient_name ||
                    record
                      ?.patient_id ||
                    "-"}
                </Text>

                {hasAllergy && (
                  <Tag
                    color="red"
                    icon={
                      <WarningOutlined />
                    }
                    className="booking-allergy-tag"
                  >
                    Allergy
                  </Tag>
                )}
              </Space>

              <Text type="secondary">
                {record
                  ?.patient_id ||
                  "Patient"}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: "Phone",
      key: "phone",
      width: 155,

      render: (_, record) => (
        <Space size={7}>
          <PhoneOutlined className="booking-phone-icon" />

          <Text>
            {record?.phone ||
              "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Dentist",
      key: "dentist",
      width: 210,

      render: (_, record) => (
        <Space size={9}>
          <div className="booking-dentist-icon">
            <MedicineBoxOutlined />
          </div>

          <Text strong>
            {record
              ?.dentist_name ||
              record
                ?.dentist_id ||
              "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Reason",
      dataIndex:
        "reason_for_visit",
      key: "reason_for_visit",
      width: 225,
      ellipsis: true,

      render: (value) => (
        <Tooltip
          title={value || ""}
        >
          <Text type="secondary">
            {value || "-"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 165,

      filters:
        allStatusOptions.map(
          (option) => ({
            text: option.label,
            value: option.value,
          }),
        ),

      onFilter: (
        value,
        record,
      ) =>
        (record?.status ||
          "Pending") === value,

      render: (
        value,
        record,
      ) => {
        const status =
          value || "Pending";

        const isLocked =
          lockedStatuses.includes(
            status,
          );

        return (
          <Select
            value={status}
            size="small"
            className="booking-status-select"
            disabled={isLocked}
            options={
              isLocked
                ? allStatusOptions
                : bookingStatusOptions
            }
            onChange={(
              newStatus,
            ) =>
              handleStatusChange(
                record,
                newStatus,
              )
            }
            optionRender={(
              option,
            ) => (
              <Tag
                color={getStatusColor(
                  option.value,
                )}
              >
                {option.label}
              </Tag>
            )}
            labelRender={(
              selected,
            ) => (
              <Tag
                color={getStatusColor(
                  selected.value,
                )}
                className="booking-status-label"
              >
                {selected.label}
              </Tag>
            )}
          />
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 255,
      fixed: "right",

      render: (_, record) => {
        const status =
          record?.status ||
          "Pending";

        const appointmentId =
          getAppointmentId(
            record,
          );

        const isCancelled =
          status ===
          "Cancelled";

        const isConfirmed =
          status ===
          "Confirmed";

        const isCheckedInOrAfter =
          lockedStatuses.includes(
            status,
          );

        return (
          <Space size={7}>
            <Tooltip
              title={
                isConfirmed
                  ? "Check in patient"
                  : "Appointment must be confirmed first"
              }
            >
              <Button
                type="primary"
                size="small"
                icon={
                  <LoginOutlined />
                }
                loading={
                  checkingInId ===
                  appointmentId
                }
                disabled={
                  !isConfirmed
                }
                onClick={() =>
                  handleCheckIn(
                    record,
                  )
                }
              >
                Check In
              </Button>
            </Tooltip>

            <Tooltip title="Edit appointment">
              <Button
                size="small"
                icon={
                  <EditOutlined />
                }
                onClick={() =>
                  openEditModal(
                    record,
                  )
                }
                disabled={
                  isCancelled ||
                  isCheckedInOrAfter
                }
              />
            </Tooltip>

            <Popconfirm
              title="Cancel Appointment"
              description="Are you sure you want to cancel this appointment?"
              okText="Cancel Appointment"
              cancelText="Keep Appointment"
              okButtonProps={{
                danger: true,
              }}
              onConfirm={() =>
                handleCancelAppointment(
                  record,
                )
              }
              disabled={
                isCancelled ||
                isCheckedInOrAfter
              }
            >
              <Tooltip title="Cancel appointment">
                <Button
                  danger
                  size="small"
                  icon={
                    <CloseCircleOutlined />
                  }
                  disabled={
                    isCancelled ||
                    isCheckedInOrAfter
                  }
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <ClinicPage
      title="Appointments"
      subtitle="Create bookings, confirm appointments and check in patients when they arrive."
      icon={
        <ScheduleOutlined />
      }
      actions={[
        <div
          key="date-filter"
          className="booking-date-filter"
        >
          <div className="booking-date-filter__icon">
            <CalendarOutlined />
          </div>

          <div className="booking-date-filter__content">
            <Text type="secondary">
              Appointment date
            </Text>

            <DatePicker
              allowClear
              value={dateFilter}
              format="YYYY-MM-DD"
              onChange={
                setDateFilter
              }
              className="booking-date-filter__picker"
            />
          </div>
        </div>,

        <Button
          key="refresh"
          icon={
            <ReloadOutlined />
          }
          loading={loading}
          onClick={
            loadInitialData
          }
        >
          Refresh
        </Button>,

        <Button
          key="add"
          type="primary"
          icon={
            <PlusOutlined />
          }
          onClick={
            openAddModal
          }
        >
          Add Appointment
        </Button>,
      ]}
    >
      {/* Summary cards */}

      <Row
        gutter={[16, 16]}
        className="booking-summary-row"
      >
        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <AppointmentSummaryCard
            title="Total Appointments"
            value={
              appointmentSummary.total
            }
            helper={
              dateFilter
                ? formatDate(
                    dateFilter,
                  )
                : "All appointment dates"
            }
            tone="blue"
            icon={
              <ScheduleOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <AppointmentSummaryCard
            title="Pending / Confirmed"
            value={
              appointmentSummary.pending
            }
            helper="Upcoming bookings"
            tone="purple"
            icon={
              <ClockCircleOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <AppointmentSummaryCard
            title="Checked In"
            value={
              appointmentSummary.checkedIn
            }
            helper="Patients in queue"
            tone="cyan"
            icon={
              <LoginOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <AppointmentSummaryCard
            title="Completed"
            value={
              appointmentSummary.completed
            }
            helper="Paid or completed visits"
            tone="green"
            icon={
              <CheckCircleOutlined />
            }
          />
        </Col>
      </Row>

      {/* Appointment directory */}

      <Card
        bordered={false}
        className="booking-directory-card"
      >
        <div className="booking-directory-header">
          <div>
            <Title level={4}>
              Appointment Schedule
            </Title>

            <Text type="secondary">
              Review bookings, update statuses and check in arrived patients.
            </Text>
          </div>

          <Tag
            color="blue"
            className="booking-result-count"
          >
            {
              filteredAppointments.length
            }{" "}
            result
            {filteredAppointments.length !==
            1
              ? "s"
              : ""}
          </Tag>
        </div>

        <div className="booking-table-toolbar">
          <Input
            allowClear
            prefix={
              <SearchOutlined />
            }
            placeholder="Search appointment, patient, phone, dentist, reason or status"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            className="booking-search-input"
          />

          <Segmented
            value={statusFilter}
            onChange={
              setStatusFilter
            }
            className="booking-status-filter"
            options={[
              {
                label: `All (${appointmentSummary.total})`,
                value: "all",
              },
              {
                label: "Active",
                value: "active",
              },
              {
                label: `Completed (${appointmentSummary.completed})`,
                value: "completed",
              },
              {
                label: `Cancelled (${appointmentSummary.cancelled})`,
                value: "cancelled",
              },
            ]}
          />
        </div>

        <Table
          rowKey={(
            record,
            index,
          ) =>
            getAppointmentId(
              record,
            ) || index
          }
          loading={loading}
          columns={columns}
          dataSource={
            filteredAppointments
          }
          pagination={{
            pageSize: 8,
            showSizeChanger: false,

            showTotal: (total) =>
              `${total} appointment${
                total !== 1
                  ? "s"
                  : ""
              }`,
          }}
          scroll={{
            x: 1500,
          }}
          rowClassName={(
            record,
          ) => {
            const status =
              normalizeStatus(
                record?.status,
              );

            if (
              record
                ?.patient_has_allergies
            ) {
              return "booking-row booking-row--allergy";
            }

            if (
              status ===
              "checked in"
            ) {
              return "booking-row booking-row--checked-in";
            }

            if (
              status ===
              "cancelled"
            ) {
              return "booking-row booking-row--cancelled";
            }

            if (
              completedStatuses
                .map(
                  normalizeStatus,
                )
                .includes(status)
            ) {
              return "booking-row booking-row--completed";
            }

            return "booking-row";
          }}
          locale={{
            emptyText: (
              <Empty
                image={
                  Empty
                    .PRESENTED_IMAGE_SIMPLE
                }
                description={
                  search ||
                  statusFilter !==
                    "all"
                    ? "No matching appointments found"
                    : "No appointments found for this date"
                }
              >
                {!search &&
                  statusFilter ===
                    "all" && (
                    <Button
                      type="primary"
                      icon={
                        <PlusOutlined />
                      }
                      onClick={
                        openAddModal
                      }
                    >
                      Add Appointment
                    </Button>
                  )}
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Add patient modal */}

      <Modal
        title={
          <div className="booking-modal-title">
            <div className="booking-modal-title__icon">
              <UserAddOutlined />
            </div>

            <div>
              <Text strong>
                Add New Patient
              </Text>

              <Text type="secondary">
                Register a patient without leaving the appointment form.
              </Text>
            </div>
          </div>
        }
        open={
          patientModalOpen
        }
        onCancel={
          closePatientModal
        }
        onOk={
          handleCreatePatient
        }
        confirmLoading={
          patientSaving
        }
        okText="Add Patient"
        cancelText="Cancel"
        width={
          showPatientMoreOptions
            ? 900
            : 560
        }
        centered
        destroyOnHidden
        className="booking-form-modal"
      >
        <Form
          form={patientForm}
          layout="vertical"
          initialValues={{
            gender: "Male",
            status: "Active",
            has_allergies: false,
            allergy_details: "",
          }}
        >
          <Row gutter={[22, 0]}>
            <Col
              xs={24}
              md={
                showPatientMoreOptions
                  ? 12
                  : 24
              }
            >
              <div className="booking-form-section">
                <div className="booking-form-section__heading">
                  <div className="booking-form-section__icon">
                    <UserOutlined />
                  </div>

                  <div>
                    <Text strong>
                      Basic Information
                    </Text>

                    <Text type="secondary">
                      Required patient details
                    </Text>
                  </div>
                </div>

                <Form.Item
                  label="Patient Name"
                  name="name"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message:
                        "Please enter patient name",
                    },
                  ]}
                >
                  <Input
                    prefix={
                      <UserOutlined />
                    }
                    placeholder="Example: Nimal Perera"
                  />
                </Form.Item>

                <Form.Item
                  label="Phone Number"
                  name="phone"
                  rules={[
                    {
                      required: true,
                      message:
                        "Please enter phone number",
                    },
                    {
                      pattern:
                        /^[0-9]{10}$/,
                      message:
                        "Please enter a valid 10-digit phone number",
                    },
                  ]}
                >
                  <Input
                    prefix={
                      <PhoneOutlined />
                    }
                    placeholder="Example: 0771234567"
                    maxLength={10}
                  />
                </Form.Item>
              </div>

              <div className="booking-form-section booking-allergy-form-section">
                <div className="booking-form-section__heading">
                  <div className="booking-form-section__icon booking-form-section__icon--allergy">
                    <ExclamationCircleFilled />
                  </div>

                  <div>
                    <Text strong>
                      Allergy Information
                    </Text>

                    <Text type="secondary">
                      Important patient safety information
                    </Text>
                  </div>
                </div>

                <Form.Item
                  label="Does the patient have any allergies?"
                  required
                >
                  <div className="booking-allergy-choice">
                    <Button
                      htmlType="button"
                      className={
                        patientHasAllergies ===
                        false
                          ? "booking-allergy-choice__button booking-allergy-choice__button--no"
                          : "booking-allergy-choice__button"
                      }
                      onClick={() => {
                        patientForm.setFieldsValue(
                          {
                            has_allergies:
                              false,

                            allergy_details:
                              "",
                          },
                        );
                      }}
                    >
                      No Allergies
                    </Button>

                    <Button
                      htmlType="button"
                      danger
                      className={
                        patientHasAllergies ===
                        true
                          ? "booking-allergy-choice__button booking-allergy-choice__button--yes"
                          : "booking-allergy-choice__button"
                      }
                      onClick={() =>
                        patientForm.setFieldValue(
                          "has_allergies",
                          true,
                        )
                      }
                    >
                      Has Allergies
                    </Button>
                  </div>
                </Form.Item>

                <Form.Item
                  name="has_allergies"
                  hidden
                >
                  <Input type="hidden" />
                </Form.Item>

                {patientHasAllergies ===
                  true && (
                  <Alert
                    type="error"
                    showIcon
                    message="Important Allergy Information"
                    className="booking-allergy-form-alert"
                    description={
                      <Form.Item
                        label="Allergy Details"
                        name="allergy_details"
                        className="booking-allergy-details-item"
                        rules={[
                          {
                            required: true,
                            whitespace: true,
                            message:
                              "Please enter the patient's allergy details",
                          },
                        ]}
                      >
                        <Input.TextArea
                          rows={3}
                          maxLength={
                            500
                          }
                          showCount
                          placeholder="Example: Penicillin, latex, peanuts or local anaesthetic"
                        />
                      </Form.Item>
                    }
                  />
                )}
              </div>

              <div className="booking-more-options">
                <Button
                  htmlType="button"
                  type="link"
                  onClick={() =>
                    setShowPatientMoreOptions(
                      (
                        previous,
                      ) =>
                        !previous,
                    )
                  }
                >
                  {showPatientMoreOptions
                    ? "Hide additional information"
                    : "+ Add more information"}
                </Button>
              </div>
            </Col>

            {showPatientMoreOptions && (
              <Col
                xs={24}
                md={12}
              >
                <div className="booking-form-section booking-form-section--additional">
                  <div className="booking-form-section__heading">
                    <div className="booking-form-section__icon booking-form-section__icon--additional">
                      <PlusOutlined />
                    </div>

                    <div>
                      <Text strong>
                        Additional Information
                      </Text>

                      <Text type="secondary">
                        Optional patient details
                      </Text>
                    </div>
                  </div>

                  <Form.Item
                    label="Age"
                    name="age"
                    rules={[
                      {
                        pattern:
                          /^[0-9]{1,3}$/,
                        message:
                          "Please enter a valid age",
                      },
                    ]}
                  >
                    <Input
                      placeholder="Example: 35"
                      maxLength={3}
                    />
                  </Form.Item>

                  <Form.Item
                    label="Gender"
                    name="gender"
                  >
                    <Select
                      allowClear
                      placeholder="Select gender"
                      options={
                        genderOptions
                      }
                    />
                  </Form.Item>

                  <Form.Item
                    label="Address"
                    name="address"
                  >
                    <Input.TextArea
                      rows={4}
                      maxLength={500}
                      showCount
                      placeholder="Enter patient address"
                    />
                  </Form.Item>

                  <Form.Item
                    label="Status"
                    name="status"
                  >
                    <Select
                      options={[
                        {
                          label:
                            "Active",
                          value:
                            "Active",
                        },
                        {
                          label:
                            "Inactive",
                          value:
                            "Inactive",
                        },
                      ]}
                    />
                  </Form.Item>
                </div>
              </Col>
            )}
          </Row>
        </Form>
      </Modal>

      {/* Add/Edit appointment modal */}

      <Modal
        title={
          <div className="booking-modal-title">
            <div className="booking-modal-title__icon">
              {editingAppointment ? (
                <EditOutlined />
              ) : (
                <CalendarOutlined />
              )}
            </div>

            <div>
              <Text strong>
                {editingAppointment
                  ? "Edit Appointment"
                  : "Add New Appointment"}
              </Text>

              <Text type="secondary">
                {editingAppointment
                  ? "Update booking information before patient check-in."
                  : "Select the patient, dentist, date and appointment time."}
              </Text>
            </div>
          </div>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={
          editingAppointment
            ? "Update Appointment"
            : "Add Appointment"
        }
        cancelText="Cancel"
        destroyOnHidden
        centered
        width={940}
        className="booking-form-modal"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={[22, 22]}>
            <Col
              xs={24}
              lg={10}
            >
              <div className="booking-appointment-number">
                <Text>
                  Appointment Number
                </Text>

                <div className="booking-appointment-number__value">
                  #
                  {
                    currentModalAppointmentNo
                  }
                </div>

                <Text>
                  Queue number is created after check-in
                </Text>

                {lastAppointmentTime && (
                  <div className="booking-last-appointment">
                    <ClockCircleOutlined />
                    Last appointment:{" "}
                    {formatAppointmentTime(
                      lastAppointmentTime,
                    )}
                  </div>
                )}
              </div>

              <div className="booking-form-section">
                <div className="booking-form-section__heading">
                  <div className="booking-form-section__icon">
                    <UserOutlined />
                  </div>

                  <div>
                    <Text strong>
                      Patient and Dentist
                    </Text>

                    <Text type="secondary">
                      Select the patient and assigned dentist
                    </Text>
                  </div>
                </div>

                <Form.Item
                  label="Patient"
                  name="patient_id"
                  rules={[
                    {
                      required: true,
                      message:
                        "Please select patient",
                    },
                  ]}
                >
                  <Select
                    showSearch
                    size="large"
                    placeholder="Select patient"
                    options={
                      patientOptions
                    }
                    optionFilterProp="label"
                    optionRender={(
                      option,
                    ) => {
                      const patient =
                        option.data;

                      return (
                        <div
                          className={
                            patient.hasAllergy
                              ? "booking-patient-option booking-patient-option--allergy"
                              : "booking-patient-option"
                          }
                        >
                          <div>
                            <Text
                              strong={
                                patient.hasAllergy
                              }
                            >
                              {
                                patient.patientName
                              }
                            </Text>

                            <Text type="secondary">
                              {
                                patient.phone
                              }
                            </Text>
                          </div>

                          {patient.hasAllergy && (
                            <Tag
                              color="red"
                              icon={
                                <WarningOutlined />
                              }
                            >
                              Allergy
                            </Tag>
                          )}
                        </div>
                      );
                    }}
                    labelRender={({
                      value,
                      label,
                    }) => {
                      const patient =
                        patientOptions.find(
                          (item) =>
                            String(
                              item.value,
                            ) ===
                            String(
                              value,
                            ),
                        );

                      if (
                        !patient?.hasAllergy
                      ) {
                        return label;
                      }

                      return (
                        <Space size={6}>
                          <WarningOutlined className="booking-selected-allergy-icon" />

                          <Text type="danger">
                            {
                              patient.patientName
                            }
                          </Text>

                          <Tag color="red">
                            Allergy
                          </Tag>
                        </Space>
                      );
                    }}
                  />
                </Form.Item>

                {selectedPatient?.hasAllergy && (
                  <Alert
                    type="error"
                    showIcon
                    icon={
                      <WarningOutlined />
                    }
                    message="Patient Allergy Warning"
                    description={
                      <>
                        <Text strong>
                          {
                            selectedPatient.patientName
                          }
                        </Text>{" "}
                        has a recorded allergy.
                        <div className="booking-selected-allergy-details">
                          <strong>
                            Allergy details:
                          </strong>{" "}
                          {
                            selectedPatient.allergyDetails
                          }
                        </div>
                      </>
                    }
                    className="booking-selected-allergy-alert"
                  />
                )}

                <div className="booking-new-patient-action">
                  <Text type="secondary">
                    Cannot find the patient?
                  </Text>

                  <Button
                    type="primary"
                    ghost
                    icon={
                      <PlusOutlined />
                    }
                    onClick={
                      openPatientModal
                    }
                  >
                    New Patient
                  </Button>
                </div>

                <Form.Item
                  name="dentist_id"
                  hidden
                  rules={[
                    {
                      required: true,
                      message:
                        "Please select dentist",
                    },
                  ]}
                >
                  <Input type="hidden" />
                </Form.Item>

                <div className="booking-dentist-selection">
                  <Text className="booking-field-label">
                    Dentist
                  </Text>

                  <div className="booking-dentist-buttons">
                    {dentistOptions.map(
                      (dentist) => (
                        <Button
                          key={
                            dentist.value
                          }
                          type={
                            String(
                              selectedDentistId,
                            ) ===
                            String(
                              dentist.value,
                            )
                              ? "primary"
                              : "default"
                          }
                          onClick={() =>
                            form.setFieldValue(
                              "dentist_id",
                              dentist.value,
                            )
                          }
                        >
                          <MedicineBoxOutlined />

                          {
                            dentist.label
                          }
                        </Button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </Col>

            <Col
              xs={24}
              lg={14}
            >
              <div className="booking-form-section booking-form-section--schedule">
                <div className="booking-form-section__heading">
                  <div className="booking-form-section__icon booking-form-section__icon--schedule">
                    <CalendarOutlined />
                  </div>

                  <div>
                    <Text strong>
                      Appointment Schedule
                    </Text>

                    <Text type="secondary">
                      Choose the booking date, time and treatment
                    </Text>
                  </div>
                </div>

                <Form.Item
                  label="Appointment Date"
                  name="appointment_date"
                  rules={[
                    {
                      required: true,
                      message:
                        "Please select appointment date",
                    },
                  ]}
                >
                  <DatePicker
                    format="YYYY-MM-DD"
                    size="large"
                    style={{
                      width: "100%",
                    }}
                  />
                </Form.Item>

                <Form.Item
                  label="Appointment Time"
                  name="appointment_time"
                  rules={[
                    {
                      required: true,
                      message:
                        "Please select appointment time",
                    },
                  ]}
                >
                  <Select
                    size="large"
                    placeholder="Select appointment time"
                    options={
                      appointmentTimeOptions
                    }
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>

                {/* ----------------------------------------
                    Common treatment selection
                ---------------------------------------- */}

                <Form.Item
                  label="Reason For Visit / Treatment"
                  name="reason_for_visit"
                  extra="Treatments are loaded from the Common Treatments management page."
                  rules={[
                    {
                      required: true,
                      message:
                        "Please select a treatment",
                    },
                  ]}
                >
                  <Select
                    showSearch
                    allowClear
                    size="large"
                    loading={loading}
                    placeholder="Select common treatment"
                    options={
                      commonTreatmentOptions
                    }
                    optionFilterProp="label"
                    notFoundContent={
                      loading
                        ? "Loading treatments..."
                        : "No common treatments found"
                    }
                    optionRender={(
                      option,
                    ) => {
                      const treatment =
                        option.data;

                      return (
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap: 12,
                            width: "100%",
                          }}
                        >
                          <div
                            style={{
                              minWidth: 0,
                            }}
                          >
                            <Text
                              strong
                              ellipsis
                            >
                              {
                                treatment.label
                              }
                            </Text>

                            {treatment.treatmentId && (
                              <Text
                                type="secondary"
                                style={{
                                  display:
                                    "block",
                                  fontSize:
                                    12,
                                }}
                              >
                                {
                                  treatment.treatmentId
                                }
                              </Text>
                            )}
                          </div>

                          {Number.isFinite(
                            Number(
                              treatment.fee,
                            ),
                          ) && (
                            <Tag
                              color="green"
                              style={{
                                marginInlineEnd:
                                  0,
                                flexShrink:
                                  0,
                              }}
                            >
                              {formatCurrency(
                                treatment.fee,
                              )}
                            </Tag>
                          )}
                        </div>
                      );
                    }}
                  />
                </Form.Item>

                {selectedCommonTreatment &&
                  Number.isFinite(
                    Number(
                      selectedCommonTreatment.fee,
                    ),
                  ) && (
                    <Alert
                      type="success"
                      showIcon
                      icon={
                        <MedicineBoxOutlined />
                      }
                      message="Standard Treatment Fee"
                      description={
                        <Space
                          direction="vertical"
                          size={2}
                        >
                          <Text strong>
                            {
                              selectedCommonTreatment.label
                            }
                          </Text>

                          <Text>
                            Default fee:{" "}
                            <strong>
                              {formatCurrency(
                                selectedCommonTreatment.fee,
                              )}
                            </strong>
                          </Text>

                          <Text type="secondary">
                            This fee is shown for reference. The final patient charge can still be changed when recording the treatment.
                          </Text>
                        </Space>
                      }
                      style={{
                        marginBottom:
                          18,
                      }}
                    />
                  )}

                <Form.Item
                  label="Booking Status"
                  name="status"
                >
                  <Select
                    size="large"
                    options={
                      bookingStatusOptions
                    }
                  />
                </Form.Item>

                <Alert
                  type="info"
                  showIcon
                  message="Appointment workflow"
                  description="After confirmation, the receptionist can check in the patient and add them to the daily queue."
                  className="booking-workflow-alert"
                />
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>
    </ClinicPage>
  );
};

export default Appointments;