import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  CalendarOutlined,
  ClearOutlined,
  DeleteOutlined,
  HolderOutlined,
  LeftOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SaveOutlined,
  SearchOutlined,
  UnorderedListOutlined,
  UpOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined,
} from "@ant-design/icons";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import ClinicPage from "../components/ClinicPage";

import {
  getAppointmentsByDate,
  getQueueOrderByDate,
  saveQueueOrder,
  updateAppointmentStatus,
} from "../api/endPoints";

import "./css/QueueManager.css";

const { Title, Text } = Typography;

const AUTO_SAVE_DELAY = 5000;
const TOP_QUEUE_ID = "TOP_QUEUE";
const AVAILABLE_QUEUE_ID = "AVAILABLE_QUEUE";

const IN_TREATMENT_STATUSES = ["in treatment", "in-treatment", "in_treatment"];

const COMPLETED_FLOW_STATUSES = [
  "treatment done",
  "treatment-done",
  "treatment_done",
  "payment pending",
  "payment-pending",
  "payment_pending",
  "paid",
];

const normalize = (value) => String(value ?? "").trim();

const normalizeStatus = (value) => normalize(value).toLowerCase();

const normalizeSearch = (value) => normalize(value).toLowerCase();

const normalizePhoneSearch = (value) => normalize(value).replace(/\D/g, "");

const getAppointmentId = (appointment) =>
  normalize(appointment?.id ?? appointment?.appointment_id);

const getAppointmentNumber = (appointment) =>
  normalize(appointment?.appointment_number);

const getPatientId = (appointment) =>
  normalize(appointment?.patient_id ?? appointment?.patient?.id);

const getPatientPhone = (appointment) =>
  normalize(
    appointment?.patient_phone ??
      appointment?.phone ??
      appointment?.mobile ??
      appointment?.contact_number ??
      appointment?.patient?.phone,
  );

const appointmentNumberValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
};

const isWaiting = (appointment) =>
  normalizeStatus(appointment?.status) === "waiting";

const isInTreatment = (appointment) =>
  IN_TREATMENT_STATUSES.includes(normalizeStatus(appointment?.status));

const isCompletedFlow = (appointment) =>
  COMPLETED_FLOW_STATUSES.includes(normalizeStatus(appointment?.status));

const isSystemSkip = (appointment) =>
  normalize(appointment?.patient_name).toUpperCase() === "SYSTEM_SKIP";

const matchesAppointmentSearch = (appointment, searchValue) => {
  const query = normalizeSearch(searchValue);

  if (!query) {
    return true;
  }

  const patientName = normalizeSearch(appointment?.patient_name);
  const patientId = normalizeSearch(getPatientId(appointment));
  const appointmentNumber = normalizeSearch(getAppointmentNumber(appointment));
  const numberQuery = query.replace(/^#/, "");
  const phone = normalizePhoneSearch(getPatientPhone(appointment));
  const phoneQuery = normalizePhoneSearch(query);

  return (
    patientName.includes(query) ||
    patientId.includes(query) ||
    appointmentNumber.includes(numberQuery) ||
    (phoneQuery && phone.includes(phoneQuery))
  );
};

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

  return Array.isArray(queueOrder)
    ? queueOrder.map(normalize).filter(Boolean)
    : [];
};

const QueueCardMain = ({
  appointment,
  position,
  showPosition = false,
  showSystemSkip = false,
}) => {
  const inTreatment = isInTreatment(appointment);
  const waiting = isWaiting(appointment);
  const systemSkip = isSystemSkip(appointment);

  const statusColor = systemSkip
    ? "red"
    : inTreatment
      ? "green"
      : waiting
        ? "gold"
        : "blue";

  return (
    <>
      {showPosition && <div className="queue-card-position">{position}</div>}

      {showSystemSkip && systemSkip && (
        <div className="queue-card-system-skip-badge">SYSTEM SKIP</div>
      )}

      <div className="queue-card-main">
        <div className="queue-card-number">
          <span>#</span>
          {getAppointmentNumber(appointment)}
        </div>

        {appointment?.patient_name && (
          <div className="queue-card-name">{appointment.patient_name}</div>
        )}
      </div>

      <div className="queue-card-meta">
        {appointment?.appointment_time && (
          <Tag>{appointment.appointment_time}</Tag>
        )}

        {appointment?.status && (
          <Tag color={statusColor}>{appointment.status}</Tag>
        )}
      </div>
    </>
  );
};

const QueueSearch = ({
  value,
  onChange,
  placeholder = "Search name, # or phone...",
}) => (
  <Input
    allowClear
    prefix={<SearchOutlined />}
    placeholder={placeholder}
    value={value}
    className="queue-search-input"
    onChange={(event) => onChange(event.target.value)}
  />
);

const SortableQueueCard = ({
  appointment,
  position,
  queueLength,
  onMoveFirst,
  onMovePrevious,
  onMoveNext,
  onMoveLast,
  onMoveToPosition,
  onRemove,
  onMoveToWaiting,
  movingToWaiting,
  onMoveToTreatment,
  movingToTreatment,
  roomOccupied,
}) => {
  const appointmentId = getAppointmentId(appointment);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: appointmentId,
    data: {
      source: "queue",
      appointment,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const first = position === 1;
  const last = position === queueLength;

  const positionOptions = Array.from({ length: queueLength }, (_, index) => ({
    label: `Position ${index + 1}`,
    value: index + 1,
  }));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "queue-card",
        "queue-card-active",
        isDragging ? "queue-card-dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="queue-card-drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`Drag appointment ${getAppointmentNumber(appointment)}`}
      >
        <HolderOutlined />
        <span>Drag</span>
      </button>

      <QueueCardMain
        appointment={appointment}
        position={position}
        showPosition
      />

      <div className="queue-card-treatment-action">
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Tooltip title="Move this patient to the waiting area">
            <span className="queue-card-treatment-button-wrapper">
              <Button
                block
                icon={<RightOutlined />}
                loading={movingToWaiting}
                disabled={movingToWaiting || movingToTreatment}
                className="queue-card-waiting-button"
                onClick={() => onMoveToWaiting(appointment)}
              >
                Move to Waiting
              </Button>
            </span>
          </Tooltip>

          <Tooltip
            title={
              roomOccupied
                ? "Another patient is currently in treatment"
                : "Move this patient directly to the treatment room"
            }
          >
            <span className="queue-card-treatment-button-wrapper">
              <Button
                type="primary"
                block
                icon={<MedicineBoxOutlined />}
                loading={movingToTreatment}
                disabled={roomOccupied || movingToWaiting || movingToTreatment}
                className="queue-card-treatment-button"
                onClick={() => onMoveToTreatment(appointment)}
              >
                {roomOccupied ? "Room Occupied" : "Move to Treatment"}
              </Button>
            </span>
          </Tooltip>
        </Space>
      </div>

      <div className="queue-card-controls">
        <div className="queue-card-move-buttons">
          <Tooltip title="Move to first">
            <Button
              size="small"
              icon={<VerticalAlignTopOutlined />}
              disabled={first}
              onClick={onMoveFirst}
            />
          </Tooltip>

          <Tooltip title="Move one position back">
            <Button
              size="small"
              icon={<LeftOutlined />}
              disabled={first}
              onClick={onMovePrevious}
            />
          </Tooltip>

          <Tooltip title="Move one position forward">
            <Button
              size="small"
              icon={<RightOutlined />}
              disabled={last}
              onClick={onMoveNext}
            />
          </Tooltip>

          <Tooltip title="Move to last">
            <Button
              size="small"
              icon={<VerticalAlignBottomOutlined />}
              disabled={last}
              onClick={onMoveLast}
            />
          </Tooltip>
        </div>

        <Select
          size="small"
          value={position}
          options={positionOptions}
          className="queue-card-position-select"
          onChange={onMoveToPosition}
        />

        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          className="queue-card-remove-button"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
    </div>
  );
};

const AvailableAppointmentCard = ({ appointment, onAdd }) => {
  const appointmentId = getAppointmentId(appointment);
  const systemSkip = isSystemSkip(appointment);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: appointmentId,
      data: {
        source: "available",
        appointment,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "queue-card",
        "queue-card-available",
        systemSkip ? "queue-card-system-skip" : "",
        isDragging ? "queue-card-dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="queue-card-drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`Drag appointment ${getAppointmentNumber(appointment)}`}
      >
        <HolderOutlined />
        <span>Drag</span>
      </button>

      <QueueCardMain appointment={appointment} showSystemSkip />

      <Button
        type="primary"
        icon={<PlusOutlined />}
        block
        className="queue-card-add-button"
        onClick={() => onAdd(appointment)}
      >
        Add to Queue
      </Button>
    </div>
  );
};

const WaitingCard = ({
  appointment,
  currentTreatment,
  movingToTreatment,
  movingToPending,
  onMoveToTreatment,
  onMoveToPending,
}) => {
  const roomOccupied = Boolean(currentTreatment);

  return (
    <div className="queue-card queue-card-waiting">
      <div className="queue-card-waiting-badge">WAITING</div>

      <QueueCardMain appointment={appointment} />

      <div className="queue-card-treatment-action">
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Tooltip
            title={
              roomOccupied
                ? `Appointment #${getAppointmentNumber(
                    currentTreatment,
                  )} is currently in treatment`
                : "Move this patient to the treatment room"
            }
          >
            <span className="queue-card-treatment-button-wrapper">
              <Button
                type="primary"
                block
                icon={<MedicineBoxOutlined />}
                disabled={roomOccupied || movingToPending}
                loading={movingToTreatment}
                className="queue-card-treatment-button"
                onClick={() => onMoveToTreatment(appointment)}
              >
                {roomOccupied ? "Room Occupied" : "Move to Treatment"}
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="Move this patient back to the active queue">
            <span className="queue-card-treatment-button-wrapper">
              <Button
                block
                icon={<LeftOutlined />}
                loading={movingToPending}
                disabled={movingToTreatment || movingToPending}
                className="queue-card-pending-button"
                onClick={() => onMoveToPending(appointment)}
              >
                Move Back to Queue
              </Button>
            </span>
          </Tooltip>
        </Space>
      </div>
    </div>
  );
};

const CompletedFlowCard = ({ appointment, onReset, resetting }) => {
  const status = normalizeStatus(appointment?.status);

  const getStatusColor = () => {
    if (
      ["treatment done", "treatment-done", "treatment_done"].includes(status)
    ) {
      return "purple";
    }

    if (
      ["payment pending", "payment-pending", "payment_pending"].includes(status)
    ) {
      return "orange";
    }

    if (status === "paid") {
      return "green";
    }

    return "default";
  };

  const getStatusLabel = () => {
    if (
      ["treatment done", "treatment-done", "treatment_done"].includes(status)
    ) {
      return "Treatment Done";
    }

    if (
      ["payment pending", "payment-pending", "payment_pending"].includes(status)
    ) {
      return "Payment Pending";
    }

    if (status === "paid") {
      return "Paid";
    }

    return appointment?.status;
  };

  return (
    <div className="queue-progress-card">
      <div className="queue-progress-card-number">
        #{getAppointmentNumber(appointment)}
      </div>

      <div className="queue-progress-card-content">
        <div className="queue-progress-card-name">
          {appointment?.patient_name || "Unknown Patient"}
        </div>

        <div className="queue-progress-card-meta">
          {appointment?.appointment_time && (
            <span>{appointment.appointment_time}</span>
          )}

          <Tag color={getStatusColor()} className="queue-progress-status">
            {getStatusLabel()}
          </Tag>
        </div>
      </div>

      <Popconfirm
        title="Reset Appointment?"
        description={`Move appointment #${getAppointmentNumber(
          appointment,
        )} back to Pending?`}
        okText="Yes, Reset"
        cancelText="Cancel"
        onConfirm={() => onReset(appointment)}
      >
        <Button
          size="small"
          danger
          loading={resetting}
          className="queue-progress-reset-button"
        >
          Reset
        </Button>
      </Popconfirm>
    </div>
  );
};

const CompletedFlowArea = ({
  appointments,
  onReset,
  resettingAppointmentId,
}) => (
  <div className="queue-progress-panel">
    <div className="queue-progress-panel-header">
      <div>
        <div className="queue-progress-eyebrow">PATIENT PROGRESS</div>

        <Title level={5} className="queue-progress-title">
          Treatment / Payment
        </Title>
      </div>

      <Tag color="purple">{appointments.length}</Tag>
    </div>

    <div className="queue-progress-list">
      {appointments.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No patients in treatment/payment progress"
        />
      ) : (
        appointments.map((appointment) => {
          const appointmentId = getAppointmentId(appointment);

          return (
            <CompletedFlowCard
              key={appointmentId}
              appointment={appointment}
              onReset={onReset}
              resetting={resettingAppointmentId === appointmentId}
            />
          );
        })
      )}
    </div>
  </div>
);

const ActiveQueueArea = ({
  queue,
  searchValue,
  onMoveFirst,
  onMovePrevious,
  onMoveNext,
  onMoveLast,
  onMoveToPosition,
  onRemove,
  onMoveToWaiting,
  movingToWaitingId,
  onMoveToTreatment,
  movingToTreatmentId,
  currentTreatment,
}) => {
  const roomOccupied = Boolean(currentTreatment);

  const { setNodeRef, isOver } = useDroppable({
    id: TOP_QUEUE_ID,
    data: {
      source: "queue-container",
    },
  });

  const visibleCount = queue.filter((appointment) =>
    matchesAppointmentSearch(appointment, searchValue),
  ).length;

  return (
    <div
      ref={setNodeRef}
      className={[
        "queue-drop-area",
        "queue-drop-area-top",
        isOver ? "queue-drop-area-over" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {queue.length === 0 ? (
        <div className="queue-empty-drop">
          <div className="queue-empty-drop-icon">
            <UpOutlined />
          </div>

          <strong>Add appointments to the queue</strong>

          <span>
            Use the Add to Queue buttons below or drag appointment cards here.
          </span>
        </div>
      ) : visibleCount === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No matching patients in queue"
        />
      ) : (
        <SortableContext
          items={queue.map(getAppointmentId)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="queue-card-row">
            {queue.map((appointment, index) => {
              const id = getAppointmentId(appointment);

              if (!matchesAppointmentSearch(appointment, searchValue)) {
                return null;
              }

              return (
                <SortableQueueCard
                  key={id}
                  appointment={appointment}
                  position={index + 1}
                  queueLength={queue.length}
                  onMoveFirst={() => onMoveFirst(id)}
                  onMovePrevious={() => onMovePrevious(id)}
                  onMoveNext={() => onMoveNext(id)}
                  onMoveLast={() => onMoveLast(id)}
                  onMoveToPosition={(newPosition) =>
                    onMoveToPosition(id, newPosition)
                  }
                  onRemove={() => onRemove(id)}
                  onMoveToWaiting={onMoveToWaiting}
                  movingToWaiting={movingToWaitingId === id}
                  onMoveToTreatment={onMoveToTreatment}
                  movingToTreatment={movingToTreatmentId === id}
                  roomOccupied={roomOccupied}
                />
              );
            })}
          </div>
        </SortableContext>
      )}
    </div>
  );
};

const WaitingArea = ({
  appointments,
  searchValue,
  currentTreatment,
  movingToTreatmentId,
  movingToPendingId,
  onMoveToTreatment,
  onMoveToPending,
}) => {
  const filteredAppointments = appointments.filter((appointment) =>
    matchesAppointmentSearch(appointment, searchValue),
  );

  return (
    <div className="queue-waiting-area">
      {filteredAppointments.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            searchValue
              ? "No matching waiting patients"
              : "No patients currently waiting"
          }
        />
      ) : (
        <div className="queue-card-row">
          {filteredAppointments.map((appointment) => {
            const id = getAppointmentId(appointment);

            return (
              <WaitingCard
                key={id}
                appointment={appointment}
                currentTreatment={currentTreatment}
                movingToTreatment={movingToTreatmentId === id}
                movingToPending={movingToPendingId === id}
                onMoveToTreatment={onMoveToTreatment}
                onMoveToPending={onMoveToPending}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const AvailableQueueArea = ({ appointments, onAdd }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: AVAILABLE_QUEUE_ID,
    data: {
      source: "available-container",
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        "queue-drop-area",
        "queue-drop-area-bottom",
        isOver ? "queue-drop-area-remove" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {appointments.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No available appointments"
        />
      ) : (
        <div className="queue-card-row">
          {appointments.map((appointment) => (
            <AvailableAppointmentCard
              key={getAppointmentId(appointment)}
              appointment={appointment}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DragPreview = ({ appointment }) => {
  if (!appointment) {
    return null;
  }

  return (
    <div className="queue-card queue-card-overlay">
      <QueueCardMain appointment={appointment} />
    </div>
  );
};

const QueueManager = () => {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(dayjs());

  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [savedQueueIds, setSavedQueueIds] = useState([]);

  const [activeAppointment, setActiveAppointment] = useState(null);

  const [movingToWaitingId, setMovingToWaitingId] = useState("");
  const [movingToTreatmentId, setMovingToTreatmentId] = useState("");
  const [movingToPendingId, setMovingToPendingId] = useState("");
  const [resettingAppointmentId, setResettingAppointmentId] = useState("");

  const [finishingTreatment, setFinishingTreatment] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [queueSearch, setQueueSearch] = useState("");
  const [waitingSearch, setWaitingSearch] = useState("");
  const [appointmentSearch, setAppointmentSearch] = useState("");

  const queueRef = useRef([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const selectedDateString = useMemo(
    () => selectedDate.format("YYYY-MM-DD"),
    [selectedDate],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const currentTreatment = useMemo(
    () =>
      appointments.find((appointment) => isInTreatment(appointment)) ?? null,
    [appointments],
  );

  const completedFlowAppointments = useMemo(
    () =>
      appointments
        .filter(isCompletedFlow)
        .sort(
          (a, b) =>
            appointmentNumberValue(getAppointmentNumber(a)) -
            appointmentNumberValue(getAppointmentNumber(b)),
        ),
    [appointments],
  );

  const waitingAppointmentIds = useMemo(
    () =>
      new Set(
        appointments.filter(isWaiting).map(getAppointmentId).filter(Boolean),
      ),
    [appointments],
  );

  // Waiting patients remain in the master queue so their
  // original position can be restored when they return.
  const activeQueueAppointments = useMemo(
    () =>
      queue.filter(
        (appointment) =>
          !waitingAppointmentIds.has(getAppointmentId(appointment)),
      ),
    [queue, waitingAppointmentIds],
  );

  const waitingAppointments = useMemo(
    () =>
      appointments
        .filter(isWaiting)
        .sort(
          (a, b) =>
            appointmentNumberValue(getAppointmentNumber(a)) -
            appointmentNumberValue(getAppointmentNumber(b)),
        ),
    [appointments],
  );

  const availableAppointments = useMemo(() => {
    const queuedIds = new Set(queue.map(getAppointmentId));

    return appointments
      .filter((appointment) => {
        const id = getAppointmentId(appointment);

        return (
          !queuedIds.has(id) &&
          !isWaiting(appointment) &&
          !isInTreatment(appointment) &&
          !isCompletedFlow(appointment)
        );
      })
      .sort(
        (a, b) =>
          appointmentNumberValue(getAppointmentNumber(a)) -
          appointmentNumberValue(getAppointmentNumber(b)),
      );
  }, [appointments, queue]);

  const filteredAvailableAppointments = useMemo(
    () =>
      availableAppointments.filter((appointment) =>
        matchesAppointmentSearch(appointment, appointmentSearch),
      ),
    [availableAppointments, appointmentSearch],
  );

  const updateChangedState = useCallback(
    (nextQueue) => {
      const nextIds = nextQueue.map(getAppointmentId).filter(Boolean);

      setChanged(JSON.stringify(nextIds) !== JSON.stringify(savedQueueIds));
    },
    [savedQueueIds],
  );

  const changeQueue = useCallback(
    (updater) => {
      setQueue((currentQueue) => {
        const nextQueue =
          typeof updater === "function" ? updater(currentQueue) : updater;

        queueRef.current = nextQueue;
        updateChangedState(nextQueue);

        return nextQueue;
      });
    },
    [updateChangedState],
  );

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const [appointmentsResponse, queueResponse] = await Promise.all([
        getAppointmentsByDate(selectedDateString),
        getQueueOrderByDate(selectedDateString),
      ]);

      const validAppointments = extractAppointments(appointmentsResponse)
        .filter((appointment) => {
          const id = getAppointmentId(appointment);
          const number = getAppointmentNumber(appointment);

          return id && number && number !== "-";
        })
        .sort(
          (a, b) =>
            appointmentNumberValue(getAppointmentNumber(a)) -
            appointmentNumberValue(getAppointmentNumber(b)),
        );

      setAppointments(validAppointments);

      const savedIds = extractQueueOrder(queueResponse);
      setSavedQueueIds(savedIds);

      const appointmentMap = new Map(
        validAppointments.map((appointment) => [
          getAppointmentId(appointment),
          appointment,
        ]),
      );

      const savedAppointments = savedIds
        .map((appointmentId) => appointmentMap.get(appointmentId))
        .filter(Boolean)
        .filter(
          (appointment) =>
            !isInTreatment(appointment) && !isCompletedFlow(appointment),
        );

      setQueue(savedAppointments);
      queueRef.current = savedAppointments;

      const validSavedIds = savedAppointments.map(getAppointmentId);

      setChanged(JSON.stringify(validSavedIds) !== JSON.stringify(savedIds));
    } catch (error) {
      console.error("Failed to load queue:", error);

      setLoadError(
        error?.response?.data?.message || "Failed to load daily queue.",
      );

      setAppointments([]);
      setQueue([]);
      queueRef.current = [];
    } finally {
      setLoading(false);
    }
  }, [selectedDateString]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleAddAppointment = useCallback(
    (appointment) => {
      const appointmentId = getAppointmentId(appointment);

      changeQueue((currentQueue) => {
        const alreadyExists = currentQueue.some(
          (item) => getAppointmentId(item) === appointmentId,
        );

        if (alreadyExists) {
          return currentQueue;
        }

        return [...currentQueue, appointment];
      });
    },
    [changeQueue],
  );

  const handleRemoveAppointment = useCallback(
    (appointmentId) => {
      changeQueue((currentQueue) =>
        currentQueue.filter(
          (appointment) => getAppointmentId(appointment) !== appointmentId,
        ),
      );
    },
    [changeQueue],
  );

  const reorderActiveQueue = useCallback(
    (appointmentId, targetActiveIndex) => {
      changeQueue((currentQueue) => {
        const activeSlots = [];
        const activeAppointments = [];

        currentQueue.forEach((appointment, index) => {
          if (!waitingAppointmentIds.has(getAppointmentId(appointment))) {
            activeSlots.push(index);
            activeAppointments.push(appointment);
          }
        });

        const oldActiveIndex = activeAppointments.findIndex(
          (appointment) => getAppointmentId(appointment) === appointmentId,
        );

        if (oldActiveIndex === -1) {
          return currentQueue;
        }

        const safeTarget = Math.max(
          0,
          Math.min(Number(targetActiveIndex), activeAppointments.length - 1),
        );

        if (oldActiveIndex === safeTarget) {
          return currentQueue;
        }

        const reorderedActive = arrayMove(
          activeAppointments,
          oldActiveIndex,
          safeTarget,
        );

        const nextQueue = [...currentQueue];

        activeSlots.forEach((masterIndex, index) => {
          nextQueue[masterIndex] = reorderedActive[index];
        });

        return nextQueue;
      });
    },
    [changeQueue, waitingAppointmentIds],
  );

  const handleMoveFirst = useCallback(
    (appointmentId) => {
      reorderActiveQueue(appointmentId, 0);
    },
    [reorderActiveQueue],
  );

  const handleMovePrevious = useCallback(
    (appointmentId) => {
      const activeAppointments = queueRef.current.filter(
        (appointment) =>
          !waitingAppointmentIds.has(getAppointmentId(appointment)),
      );

      const currentIndex = activeAppointments.findIndex(
        (appointment) => getAppointmentId(appointment) === appointmentId,
      );

      if (currentIndex <= 0) {
        return;
      }

      reorderActiveQueue(appointmentId, currentIndex - 1);
    },
    [reorderActiveQueue, waitingAppointmentIds],
  );

  const handleMoveNext = useCallback(
    (appointmentId) => {
      const activeAppointments = queueRef.current.filter(
        (appointment) =>
          !waitingAppointmentIds.has(getAppointmentId(appointment)),
      );

      const currentIndex = activeAppointments.findIndex(
        (appointment) => getAppointmentId(appointment) === appointmentId,
      );

      if (
        currentIndex === -1 ||
        currentIndex >= activeAppointments.length - 1
      ) {
        return;
      }

      reorderActiveQueue(appointmentId, currentIndex + 1);
    },
    [reorderActiveQueue, waitingAppointmentIds],
  );

  const handleMoveLast = useCallback(
    (appointmentId) => {
      const activeCount = queueRef.current.filter(
        (appointment) =>
          !waitingAppointmentIds.has(getAppointmentId(appointment)),
      ).length;

      if (activeCount <= 1) {
        return;
      }

      reorderActiveQueue(appointmentId, activeCount - 1);
    },
    [reorderActiveQueue, waitingAppointmentIds],
  );

  const handleMoveToPosition = useCallback(
    (appointmentId, newPosition) => {
      reorderActiveQueue(appointmentId, Number(newPosition) - 1);
    },
    [reorderActiveQueue],
  );

  const handleMoveToPending = useCallback(async (appointment) => {
    const appointmentId = getAppointmentId(appointment);

    if (!appointmentId) {
      message.error("Appointment ID not found.");
      return;
    }

    if (!isWaiting(appointment)) {
      message.warning("This patient is not currently waiting.");
      return;
    }

    try {
      setMovingToPendingId(appointmentId);

      await updateAppointmentStatus(appointmentId, "Pending");

      setAppointments((currentAppointments) =>
        currentAppointments.map((item) =>
          getAppointmentId(item) === appointmentId
            ? { ...item, status: "Pending" }
            : item,
        ),
      );

      message.success(
        `Appointment #${getAppointmentNumber(
          appointment,
        )} moved back to the queue.`,
      );
    } catch (error) {
      console.error("Failed to move patient to pending:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to move patient back to the queue.",
      );
    } finally {
      setMovingToPendingId("");
    }
  }, []);

  const handleMoveToWaiting = useCallback(async (appointment) => {
    const appointmentId = getAppointmentId(appointment);

    if (!appointmentId) {
      message.error("Appointment ID not found.");
      return;
    }

    if (isWaiting(appointment)) {
      message.warning("This patient is already waiting.");
      return;
    }

    try {
      setMovingToWaitingId(appointmentId);

      await updateAppointmentStatus(appointmentId, "Waiting");

      setAppointments((currentAppointments) =>
        currentAppointments.map((item) =>
          getAppointmentId(item) === appointmentId
            ? { ...item, status: "Waiting" }
            : item,
        ),
      );

      message.success(
        `Appointment #${getAppointmentNumber(appointment)} moved to waiting.`,
      );
    } catch (error) {
      console.error("Failed to move patient to waiting:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to move patient to waiting.",
      );
    } finally {
      setMovingToWaitingId("");
    }
  }, []);

  const handleMoveToTreatment = useCallback(
    async (appointment) => {
      const appointmentId = getAppointmentId(appointment);

      if (!appointmentId) {
        message.error("Appointment ID not found.");
        return;
      }

      if (currentTreatment) {
        message.warning(
          `Appointment #${getAppointmentNumber(
            currentTreatment,
          )} is already in treatment.`,
        );
        return;
      }

      try {
        setMovingToTreatmentId(appointmentId);

        await updateAppointmentStatus(appointmentId, "In Treatment");

        const treatmentAppointment = {
          ...appointment,
          status: "In Treatment",
        };

        setAppointments((currentAppointments) =>
          currentAppointments.map((item) =>
            getAppointmentId(item) === appointmentId
              ? treatmentAppointment
              : item,
          ),
        );

        changeQueue((currentQueue) =>
          currentQueue.filter(
            (item) => getAppointmentId(item) !== appointmentId,
          ),
        );

        message.success(
          `Appointment #${getAppointmentNumber(
            appointment,
          )} moved to treatment.`,
        );
      } catch (error) {
        console.error("Failed to move patient to treatment:", error);

        message.error(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to move patient to treatment.",
        );
      } finally {
        setMovingToTreatmentId("");
      }
    },
    [currentTreatment, changeQueue],
  );

  const handleDragStart = ({ active }) => {
    setActiveAppointment(active.data.current?.appointment ?? null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveAppointment(null);

    if (!over) {
      return;
    }

    const source = active.data.current?.source;
    const overSource = over.data.current?.source;
    const activeId = normalize(active.id);
    const overId = normalize(over.id);

    if (source === "available") {
      const draggedAppointment = active.data.current?.appointment;

      if (!draggedAppointment) {
        return;
      }

      if (overId === TOP_QUEUE_ID) {
        handleAddAppointment(draggedAppointment);
        return;
      }

      if (overSource === "queue") {
        changeQueue((currentQueue) => {
          const exists = currentQueue.some(
            (appointment) => getAppointmentId(appointment) === activeId,
          );

          if (exists) {
            return currentQueue;
          }

          const targetIndex = currentQueue.findIndex(
            (appointment) => getAppointmentId(appointment) === overId,
          );

          if (targetIndex === -1) {
            return [...currentQueue, draggedAppointment];
          }

          const nextQueue = [...currentQueue];
          nextQueue.splice(targetIndex, 0, draggedAppointment);

          return nextQueue;
        });
      }

      return;
    }

    if (
      source === "queue" &&
      (overId === AVAILABLE_QUEUE_ID || overSource === "available")
    ) {
      handleRemoveAppointment(activeId);
      return;
    }

    if (source !== "queue") {
      return;
    }

    if (overId === TOP_QUEUE_ID) {
      handleMoveLast(activeId);
      return;
    }

    if (overSource !== "queue") {
      return;
    }

    const activeQueue = queueRef.current.filter(
      (appointment) =>
        !waitingAppointmentIds.has(getAppointmentId(appointment)),
    );

    const oldIndex = activeQueue.findIndex(
      (appointment) => getAppointmentId(appointment) === activeId,
    );

    const newIndex = activeQueue.findIndex(
      (appointment) => getAppointmentId(appointment) === overId,
    );

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    reorderActiveQueue(activeId, newIndex);
  };

  const handleDragCancel = () => {
    setActiveAppointment(null);
  };

  const handleAddAll = () => {
    if (availableAppointments.length === 0) {
      return;
    }

    changeQueue((currentQueue) => {
      const currentIds = new Set(currentQueue.map(getAppointmentId));

      const appointmentsToAdd = availableAppointments.filter(
        (appointment) => !currentIds.has(getAppointmentId(appointment)),
      );

      return [...currentQueue, ...appointmentsToAdd];
    });
  };

  const handleClearQueue = () => {
    changeQueue((currentQueue) =>
      currentQueue.filter((appointment) =>
        waitingAppointmentIds.has(getAppointmentId(appointment)),
      ),
    );
  };

  const handleSortQueue = () => {
    changeQueue((currentQueue) => {
      const activeSlots = [];
      const activeAppointments = [];

      currentQueue.forEach((appointment, index) => {
        if (!waitingAppointmentIds.has(getAppointmentId(appointment))) {
          activeSlots.push(index);
          activeAppointments.push(appointment);
        }
      });

      const sortedActive = [...activeAppointments].sort(
        (a, b) =>
          appointmentNumberValue(getAppointmentNumber(a)) -
          appointmentNumberValue(getAppointmentNumber(b)),
      );

      const nextQueue = [...currentQueue];

      activeSlots.forEach((masterIndex, index) => {
        nextQueue[masterIndex] = sortedActive[index];
      });

      return nextQueue;
    });
  };

  const saveQueueNow = useCallback(
    async ({ silent = false } = {}) => {
      const queueOrder = queueRef.current.map(getAppointmentId).filter(Boolean);

      try {
        setSaving(true);

        await saveQueueOrder({
          date: selectedDateString,
          queue_order: queueOrder,
        });

        setSavedQueueIds(queueOrder);

        const latestQueueOrder = queueRef.current
          .map(getAppointmentId)
          .filter(Boolean);

        setChanged(
          JSON.stringify(latestQueueOrder) !== JSON.stringify(queueOrder),
        );

        if (!silent) {
          message.success("Queue saved successfully.");
        }
      } catch (error) {
        console.error("Failed to save queue:", error);

        setChanged(true);

        if (silent) {
          message.error("Auto-save failed. Please use Save Queue.");
        } else {
          message.error(
            error?.response?.data?.message || "Failed to save queue.",
          );
        }
      } finally {
        setSaving(false);
      }
    },
    [selectedDateString],
  );

  const handleSaveQueue = () => {
    saveQueueNow({ silent: false });
  };

  useEffect(() => {
    if (!changed || loading || saving) {
      return;
    }

    const timer = window.setTimeout(() => {
      saveQueueNow({ silent: true });
    }, AUTO_SAVE_DELAY);

    return () => window.clearTimeout(timer);
  }, [queue, changed, loading, saving, saveQueueNow]);

  const handleOpenTreatment = () => {
    if (!currentTreatment) {
      return;
    }

    navigate("/current-treatment", {
      state: {
        appointmentId: getAppointmentId(currentTreatment),
        appointmentNumber: getAppointmentNumber(currentTreatment),
        appointment: currentTreatment,
      },
    });
  };

  const handleKeepWaiting = useCallback(async () => {
    if (!currentTreatment) {
      message.warning("No patient is currently in treatment.");
      return;
    }

    const appointmentId = getAppointmentId(currentTreatment);

    if (!appointmentId) {
      message.error("Appointment ID not found.");
      return;
    }

    try {
      setFinishingTreatment(true);

      await updateAppointmentStatus(appointmentId, "Waiting");

      message.success(
        `Patient #${getAppointmentNumber(
          currentTreatment,
        )} moved back to waiting.`,
      );

      await loadQueue();
    } catch (error) {
      console.error("Failed to keep patient waiting:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to move patient back to waiting.",
      );
    } finally {
      setFinishingTreatment(false);
    }
  }, [currentTreatment, loadQueue]);

  const handleDoneTreatment = useCallback(async () => {
    if (!currentTreatment) {
      message.warning("No patient is currently in treatment.");
      return;
    }

    const appointmentId = getAppointmentId(currentTreatment);

    if (!appointmentId) {
      message.error("Appointment ID not found.");
      return;
    }

    try {
      setFinishingTreatment(true);

      await updateAppointmentStatus(appointmentId, "Treatment Done");

      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          getAppointmentId(appointment) === appointmentId
            ? {
                ...appointment,
                status: "Treatment Done",
              }
            : appointment,
        ),
      );

      message.success(
        `Appointment #${getAppointmentNumber(
          currentTreatment,
        )} marked as Treatment Done.`,
      );
    } catch (error) {
      console.error("Failed to complete treatment:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to complete treatment.",
      );
    } finally {
      setFinishingTreatment(false);
    }
  }, [currentTreatment]);

  const handleResetAppointment = async (appointment) => {
    const appointmentId = getAppointmentId(appointment);

    if (!appointmentId) {
      message.error("Appointment ID not found.");
      return;
    }

    try {
      setResettingAppointmentId(appointmentId);

      await updateAppointmentStatus(appointmentId, "Pending");

      message.success(
        `Appointment #${getAppointmentNumber(appointment)} reset to Pending.`,
      );

      await loadQueue();
    } catch (error) {
      console.error("Failed to reset appointment:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to reset appointment.",
      );
    } finally {
      setResettingAppointmentId("");
    }
  };

  return (
    <ClinicPage>
      <div className="queue-manager-page">
        <div className="queue-manager-header">
          <div>
            <div className="queue-manager-eyebrow">DAILY PATIENT QUEUE</div>

            <Title level={2} className="queue-manager-page-title">
              Queue Manager
            </Title>

            <Text type="secondary">
              Manage the daily queue, waiting patients and treatment-room flow.
            </Text>
          </div>

          <Space wrap className="queue-manager-header-actions">
            <DatePicker
              value={selectedDate}
              allowClear={false}
              format="DD MMM YYYY"
              suffixIcon={<CalendarOutlined />}
              onChange={(date) => {
                if (!date) {
                  return;
                }

                setSelectedDate(date);
                setQueueSearch("");
                setWaitingSearch("");
                setAppointmentSearch("");
              }}
            />

            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={loadQueue}
            >
              Refresh
            </Button>

            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={loading || !changed}
              onClick={handleSaveQueue}
            >
              Save Queue
            </Button>
          </Space>
        </div>

        {loadError && (
          <Alert
            type="error"
            showIcon
            message={loadError}
            className="queue-manager-alert"
          />
        )}

        {currentTreatment && (
          <Alert
            type="info"
            showIcon
            icon={<MedicineBoxOutlined />}
            className="queue-manager-alert queue-current-treatment-alert"
            message={
              <Space wrap>
                <strong>Treatment Room:</strong>

                <span>
                  #{getAppointmentNumber(currentTreatment)}{" "}
                  {currentTreatment?.patient_name}
                </span>

                <Tag color="green">In Treatment</Tag>

                <Button type="link" size="small" onClick={handleOpenTreatment}>
                  Open Treatment
                </Button>
              </Space>
            }
          />
        )}

        <Spin spinning={loading}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <Row gutter={[16, 16]} align="stretch">
              <Col xs={24} sm={24} md={7} lg={6} xl={5}>
                <Card
                  bordered={false}
                  className="queue-section-card queue-treatment-side-card"
                  style={{ height: "100%" }}
                >
                  <div className="queue-treatment-side-header">
                    <div className="queue-treatment-side-icon">
                      <MedicineBoxOutlined />
                    </div>

                    <div>
                      <div className="queue-treatment-side-eyebrow">
                        TREATMENT ROOM
                      </div>

                      <Title level={4} className="queue-treatment-side-title">
                        In Treatment
                      </Title>
                    </div>
                  </div>

                  {currentTreatment ? (
                    <div className="queue-treatment-patient-card">
                      <div className="queue-treatment-appointment-number">
                        {getAppointmentNumber(currentTreatment)}
                      </div>

                      <div className="queue-treatment-patient-name">
                        {currentTreatment?.patient_name || "Unknown Patient"}
                      </div>

                      {getPatientPhone(currentTreatment) && (
                        <div className="queue-treatment-patient-info">
                          {getPatientPhone(currentTreatment)}
                        </div>
                      )}

                      <div className="queue-treatment-actions">
                        <Button
                          type="primary"
                          block
                          icon={<MedicineBoxOutlined />}
                          className="queue-treatment-open-button"
                          onClick={handleOpenTreatment}
                          disabled={finishingTreatment}
                        >
                          Open Treatment
                        </Button>

                        <Popconfirm
                          title="Keep Patient Waiting?"
                          description={`Move appointment #${getAppointmentNumber(
                            currentTreatment,
                          )} back to waiting?`}
                          okText="Yes, Keep Waiting"
                          cancelText="Cancel"
                          onConfirm={handleKeepWaiting}
                        >
                          <Button
                            block
                            disabled={finishingTreatment}
                            className="queue-treatment-waiting-button"
                          >
                            Keep Waiting
                          </Button>
                        </Popconfirm>

                        <Popconfirm
                          title="Complete Treatment?"
                          description={`Mark appointment #${getAppointmentNumber(
                            currentTreatment,
                          )} as Treatment Done?`}
                          okText="Yes, Done"
                          cancelText="Cancel"
                          onConfirm={handleDoneTreatment}
                        >
                          <Button
                            block
                            loading={finishingTreatment}
                            className="queue-treatment-done-button"
                          >
                            Done the Treatment
                          </Button>
                        </Popconfirm>
                      </div>
                    </div>
                  ) : (
                    <div className="queue-treatment-empty">
                      <div className="queue-treatment-empty-icon">
                        <MedicineBoxOutlined />
                      </div>

                      <Tag color="green">Room Available</Tag>

                      <strong>No Patient In Treatment</strong>

                      <Text type="secondary">
                        Select a patient from the queue or waiting area to begin
                        treatment.
                      </Text>
                    </div>
                  )}
                </Card>
              </Col>

              <Col xs={24} sm={24} md={17} lg={18} xl={19}>
                <Card
                  bordered={false}
                  className="queue-section-card queue-section-active"
                  style={{ height: "100%" }}
                >
                  <div className="queue-section-header">
                    <div className="queue-section-title-row">
                      <div className="queue-section-number">1</div>

                      <Title level={4} className="queue-section-title">
                        Updated Queue
                      </Title>
                    </div>

                    <Space wrap>
                      <QueueSearch
                        value={queueSearch}
                        onChange={setQueueSearch}
                      />

                      <Tag color="blue">
                        {activeQueueAppointments.length} Patients
                      </Tag>

                      <Button
                        size="small"
                        icon={<UnorderedListOutlined />}
                        disabled={activeQueueAppointments.length < 2}
                        onClick={handleSortQueue}
                      >
                        Sort #1 → Last
                      </Button>

                      <Popconfirm
                        title="Clear queue?"
                        description="All active queued patients will return to Daily Appointments. Waiting patients remain reserved."
                        okText="Clear"
                        cancelText="Cancel"
                        onConfirm={handleClearQueue}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<ClearOutlined />}
                          disabled={activeQueueAppointments.length === 0}
                        >
                          Clear
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>

                  <div className="queue-active">
                    <ActiveQueueArea
                      queue={activeQueueAppointments}
                      searchValue={queueSearch}
                      onMoveFirst={handleMoveFirst}
                      onMovePrevious={handleMovePrevious}
                      onMoveNext={handleMoveNext}
                      onMoveLast={handleMoveLast}
                      onMoveToPosition={handleMoveToPosition}
                      onRemove={handleRemoveAppointment}
                      onMoveToWaiting={handleMoveToWaiting}
                      movingToWaitingId={movingToWaitingId}
                      onMoveToTreatment={handleMoveToTreatment}
                      movingToTreatmentId={movingToTreatmentId}
                      currentTreatment={currentTreatment}
                    />
                  </div>
                </Card>
              </Col>
            </Row>

            <div className="queue-transfer-hint">
              <div className="queue-transfer-arrow">↓</div>
              <span>Move ready patients from the queue into Waiting</span>
              <div className="queue-transfer-arrow">↓</div>
            </div>

            {waitingAppointments.length > 0 && (
              <Card
                bordered={false}
                className="queue-section-card queue-section-waiting"
              >
                <div className="queue-section-header">
                  <div className="queue-section-title-row">
                    <div className="queue-section-number queue-section-number-waiting">
                      2
                    </div>

                    <div>
                      <Title level={4} className="queue-section-title">
                        Waiting Area
                      </Title>

                      <Text type="secondary">
                        Patients who are ready and waiting to enter the
                        treatment room.
                      </Text>
                    </div>
                  </div>

                  <Space wrap>
                    <QueueSearch
                      value={waitingSearch}
                      onChange={setWaitingSearch}
                    />

                    {currentTreatment ? (
                      <Tag color="orange">Room Occupied</Tag>
                    ) : (
                      <Tag color="green">Room Available</Tag>
                    )}

                    <Tag color="gold">{waitingAppointments.length} Waiting</Tag>
                  </Space>
                </div>

                <WaitingArea
                  appointments={waitingAppointments}
                  searchValue={waitingSearch}
                  currentTreatment={currentTreatment}
                  movingToTreatmentId={movingToTreatmentId}
                  movingToPendingId={movingToPendingId}
                  onMoveToTreatment={handleMoveToTreatment}
                  onMoveToPending={handleMoveToPending}
                />
              </Card>
            )}

            <Card
              bordered={false}
              className="queue-section-card queue-section-available"
            >
              <div className="queue-section-header">
                <div className="queue-section-title-row">
                  <div className="queue-section-number queue-section-number-secondary">
                    3
                  </div>

                  <div>
                    <Title level={4} className="queue-section-title">
                      Daily Appointments
                    </Title>

                    <Text type="secondary">
                      Appointments not yet added to the queue.
                    </Text>
                  </div>
                </div>

                <Space wrap>
                  <QueueSearch
                    value={appointmentSearch}
                    onChange={setAppointmentSearch}
                  />

                  <Tag>{availableAppointments.length} Available</Tag>

                  <Button
                    type="primary"
                    ghost
                    size="small"
                    icon={<PlusOutlined />}
                    disabled={availableAppointments.length === 0}
                    onClick={handleAddAll}
                  >
                    Add All
                  </Button>
                </Space>
              </div>

              <AvailableQueueArea
                appointments={filteredAvailableAppointments}
                onAdd={handleAddAppointment}
              />
            </Card>

            {completedFlowAppointments.length > 0 && (
              <>
                <div className="queue-transfer-hint">
                  <div className="queue-transfer-arrow">↓</div>
                  <span>Treatment and payment progress</span>
                  <div className="queue-transfer-arrow">↓</div>
                </div>

                <CompletedFlowArea
                  appointments={completedFlowAppointments}
                  onReset={handleResetAppointment}
                  resettingAppointmentId={resettingAppointmentId}
                />
              </>
            )}

            <DragOverlay>
              <DragPreview appointment={activeAppointment} />
            </DragOverlay>
          </DndContext>
        </Spin>
      </div>
    </ClinicPage>
  );
};

export default QueueManager;
