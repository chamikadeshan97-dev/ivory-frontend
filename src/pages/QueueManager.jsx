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
  DatePicker,
  Empty,
  Popconfirm,
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
  CheckCircleOutlined,
  ClearOutlined,
  DeleteOutlined,
  HolderOutlined,
  LeftOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SaveOutlined,
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

/* ========================================================
   Configuration
======================================================== */

const AUTO_SAVE_DELAY = 5000;

const TOP_QUEUE_ID = "TOP_QUEUE";

const AVAILABLE_QUEUE_ID =
  "AVAILABLE_QUEUE";

/* ========================================================
   Statuses
======================================================== */

const IN_TREATMENT_STATUSES = [
  "in treatment",
  "in-treatment",
  "in_treatment",
];

/* ========================================================
   Helpers
======================================================== */

const normalize = (value) =>
  String(value ?? "").trim();

const normalizeStatus = (value) =>
  normalize(value).toLowerCase();

const getAppointmentId = (
  appointment
) =>
  normalize(
    appointment?.id ??
      appointment?.appointment_id
  );

const getAppointmentNumber = (
  appointment
) =>
  normalize(
    appointment?.appointment_number
  );

const appointmentNumberValue = (
  value
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : Number.MAX_SAFE_INTEGER;
};

const isInTreatment = (
  appointment
) =>
  IN_TREATMENT_STATUSES.includes(
    normalizeStatus(
      appointment?.status
    )
  );

/* ========================================================
   SYSTEM SKIP
======================================================== */

const isSystemSkip = (
  appointment
) => {
  return (
    normalize(
      appointment?.patient_name
    ).toUpperCase() ===
    "SYSTEM_SKIP"
  );
};

/* ========================================================
   Extract Appointments
======================================================== */

const extractAppointments = (
  response
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
      data?.appointments
    )
  ) {
    return data.appointments;
  }

  return [];
};

/* ========================================================
   Extract Queue Order
======================================================== */

const extractQueueOrder = (
  response
) => {
  const queueOrder =
    response?.data?.data
      ?.queue_order ??
    response?.data?.queue_order ??
    [];

  return Array.isArray(queueOrder)
    ? queueOrder
        .map(normalize)
        .filter(Boolean)
    : [];
};

/* ========================================================
   Queue Card Main Content
======================================================== */

const QueueCardMain = ({
  appointment,
  position,
  showPosition = false,
  showSystemSkip = false,
}) => {
  const inTreatment =
    isInTreatment(
      appointment
    );

  const systemSkip =
    isSystemSkip(
      appointment
    );

  return (
    <>
      {showPosition && (
        <div className="queue-card-position">
          {position}
        </div>
      )}

    

      {showSystemSkip &&
        systemSkip && (
          <div className="queue-card-system-skip-badge">
            SYSTEM SKIP
          </div>
        )}

      <div className="queue-card-main">
        <div className="queue-card-number">
          <span>#</span>

          {getAppointmentNumber(
            appointment
          )}
        </div>

        {appointment?.patient_name && (
          <div className="queue-card-name">
            {
              appointment.patient_name
            }
          </div>
        )}
      </div>

      <div className="queue-card-meta">
        {appointment?.appointment_time && (
          <Tag>
            {
              appointment.appointment_time
            }
          </Tag>
        )}

        {appointment?.status && (
          <Tag
            color={
              showSystemSkip &&
              systemSkip
                ? "red"
                : inTreatment
                  ? "green"
                  : "blue"
            }
          >
            {appointment.status}
          </Tag>
        )}
      </div>
    </>
  );
};

/* ========================================================
   TOP Queue Card

   Supports:
   - Drag
   - Move First
   - Move Previous
   - Move Next
   - Move Last
   - Direct Position
   - Remove
   - Move to Treatment
======================================================== */

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

  onMoveToTreatment,

  roomOccupied,
  movingToTreatment,
}) => {
  const appointmentId =
    getAppointmentId(
      appointment
    );

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
    transform:
      CSS.Transform.toString(
        transform
      ),

    transition,
  };

  const first =
    position === 1;

  const last =
    position === queueLength;

  const positionOptions =
    Array.from(
      {
        length: queueLength,
      },
      (_, index) => ({
        label: `Position ${
          index + 1
        }`,

        value: index + 1,
      })
    );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "queue-card",
        "queue-card-active",

        isInTreatment(
          appointment
        )
          ? "queue-card-current-treatment"
          : "",

        isDragging
          ? "queue-card-dragging"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ===============================================
          Drag Handle
      ================================================ */}

      <button
        type="button"
        className="queue-card-drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`Drag appointment ${getAppointmentNumber(
          appointment
        )}`}
      >
        <HolderOutlined />

        <span>
          Drag
        </span>
      </button>

      {/* ===============================================
          Main Information
      ================================================ */}

      <QueueCardMain
        appointment={
          appointment
        }
        position={position}
        showPosition
      />

      {/* ===============================================
          MOVE TO TREATMENT
      ================================================ */}

      <div className="queue-card-treatment-action">
        <Tooltip
          title={
            roomOccupied
              ? "Another patient is currently in treatment"
              : "Move this patient to the treatment room"
          }
        >
          <span className="queue-card-treatment-button-wrapper">
            <Button
              type="primary"
              block
              icon={
                <MedicineBoxOutlined />
              }
              disabled={
                roomOccupied
              }
              loading={
                movingToTreatment
              }
              className="queue-card-treatment-button"
              onClick={() =>
                onMoveToTreatment(
                  appointment
                )
              }
            >
              {roomOccupied
                ? "Room Occupied"
                : "Move to Treatment"}
            </Button>
          </span>
        </Tooltip>
      </div>

      {/* ===============================================
          Queue Controls
      ================================================ */}

      <div className="queue-card-controls">
        <div className="queue-card-move-buttons">
          <Tooltip title="Move to first">
            <Button
              size="small"
              icon={
                <VerticalAlignTopOutlined />
              }
              disabled={first}
              onClick={
                onMoveFirst
              }
            />
          </Tooltip>

          <Tooltip title="Move one position back">
            <Button
              size="small"
              icon={
                <LeftOutlined />
              }
              disabled={first}
              onClick={
                onMovePrevious
              }
            />
          </Tooltip>

          <Tooltip title="Move one position forward">
            <Button
              size="small"
              icon={
                <RightOutlined />
              }
              disabled={last}
              onClick={
                onMoveNext
              }
            />
          </Tooltip>

          <Tooltip title="Move to last">
            <Button
              size="small"
              icon={
                <VerticalAlignBottomOutlined />
              }
              disabled={last}
              onClick={
                onMoveLast
              }
            />
          </Tooltip>
        </div>

        {/* =============================================
            Direct Position
        ============================================== */}

        <Select
          size="small"
          value={position}
          options={
            positionOptions
          }
          className="queue-card-position-select"
          onChange={
            onMoveToPosition
          }
        />

        {/* =============================================
            Remove
        ============================================== */}

        <Button
          danger
          size="small"
          icon={
            <DeleteOutlined />
          }
          className="queue-card-remove-button"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
    </div>
  );
};

/* ========================================================
   BOTTOM Appointment Card

   Only:
   - Drag
   - Add to Queue

   SYSTEM_SKIP = RED
======================================================== */

const AvailableAppointmentCard = ({
  appointment,
  onAdd,
}) => {
  const appointmentId =
    getAppointmentId(
      appointment
    );

  const systemSkip =
    isSystemSkip(
      appointment
    );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: appointmentId,

    data: {
      source: "available",
      appointment,
    },
  });

  const style = {
    transform:
      CSS.Translate.toString(
        transform
      ),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "queue-card",
        "queue-card-available",

        systemSkip
          ? "queue-card-system-skip"
          : "",

        isDragging
          ? "queue-card-dragging"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ===============================================
          Drag
      ================================================ */}

      <button
        type="button"
        className="queue-card-drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`Drag appointment ${getAppointmentNumber(
          appointment
        )}`}
      >
        <HolderOutlined />

        <span>
          Drag
        </span>
      </button>

      {/* ===============================================
          Main Content
      ================================================ */}

      <QueueCardMain
        appointment={
          appointment
        }
        showSystemSkip
      />

      {/* ===============================================
          Add To Queue
      ================================================ */}

      <Button
        type="primary"
        icon={
          <PlusOutlined />
        }
        block
        className="queue-card-add-button"
        onClick={() =>
          onAdd(
            appointment
          )
        }
      >
        Add to Queue
      </Button>
    </div>
  );
};

/* ========================================================
   Active Queue Area
======================================================== */

const ActiveQueueArea = ({
  queue,

  onMoveFirst,
  onMovePrevious,
  onMoveNext,
  onMoveLast,
  onMoveToPosition,

  onRemove,

  onMoveToTreatment,

  currentTreatment,
  movingToTreatmentId,
}) => {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: TOP_QUEUE_ID,

    data: {
      source:
        "queue-container",
    },
  });

  const roomOccupied =
    Boolean(
      currentTreatment
    );

  return (
    <div
      ref={setNodeRef}
      className={[
        "queue-drop-area",
        "queue-drop-area-top",

        isOver
          ? "queue-drop-area-over"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {queue.length === 0 ? (
        <div className="queue-empty-drop">
          <div className="queue-empty-drop-icon">
            <UpOutlined />
          </div>

          <strong>
            Add appointments to
            the queue
          </strong>

          <span>
            Use the Add to Queue
            buttons below or drag
            appointment cards here.
          </span>
        </div>
      ) : (
        <SortableContext
          items={queue.map(
            (appointment) =>
              getAppointmentId(
                appointment
              )
          )}
          strategy={
            horizontalListSortingStrategy
          }
        >
          <div className="queue-card-row">
            {queue.map(
              (
                appointment,
                index
              ) => {
                const id =
                  getAppointmentId(
                    appointment
                  );

                const position =
                  index + 1;

                return (
                  <SortableQueueCard
                    key={id}

                    appointment={
                      appointment
                    }

                    position={
                      position
                    }

                    queueLength={
                      queue.length
                    }

                    onMoveFirst={() =>
                      onMoveFirst(
                        id
                      )
                    }

                    onMovePrevious={() =>
                      onMovePrevious(
                        id
                      )
                    }

                    onMoveNext={() =>
                      onMoveNext(
                        id
                      )
                    }

                    onMoveLast={() =>
                      onMoveLast(
                        id
                      )
                    }

                    onMoveToPosition={(
                      newPosition
                    ) =>
                      onMoveToPosition(
                        id,
                        newPosition
                      )
                    }

                    onRemove={() =>
                      onRemove(
                        id
                      )
                    }

                    onMoveToTreatment={
                      onMoveToTreatment
                    }

                    roomOccupied={
                      roomOccupied
                    }

                    movingToTreatment={
                      movingToTreatmentId ===
                      id
                    }
                  />
                );
              }
            )}
          </div>
        </SortableContext>
      )}
    </div>
  );
};

/* ========================================================
   Available Appointments Area
======================================================== */

const AvailableQueueArea = ({
  appointments,
  onAdd,
}) => {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: AVAILABLE_QUEUE_ID,

    data: {
      source:
        "available-container",
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        "queue-drop-area",
        "queue-drop-area-bottom",

        isOver
          ? "queue-drop-area-remove"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {appointments.length ===
      0 ? (
        <Empty
          image={
            Empty.PRESENTED_IMAGE_SIMPLE
          }
          description="All appointments are in the active queue"
        />
      ) : (
        <div className="queue-card-row">
          {appointments.map(
            (appointment) => (
              <AvailableAppointmentCard
                key={getAppointmentId(
                  appointment
                )}
                appointment={
                  appointment
                }
                onAdd={onAdd}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};

/* ========================================================
   Drag Preview
======================================================== */

const DragPreview = ({
  appointment,
}) => {
  if (!appointment) {
    return null;
  }

  return (
    <div className="queue-card queue-card-overlay">
      <QueueCardMain
        appointment={
          appointment
        }
      />
    </div>
  );
};

/* ========================================================
   Queue Manager
======================================================== */

const QueueManager = () => {
  const navigate =
    useNavigate();

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(dayjs());

  const [
    appointments,
    setAppointments,
  ] = useState([]);

  const [
    queue,
    setQueue,
  ] = useState([]);

  const [
    savedQueueIds,
    setSavedQueueIds,
  ] = useState([]);

  const [
    activeAppointment,
    setActiveAppointment,
  ] = useState(null);

  const [
    movingToTreatmentId,
    setMovingToTreatmentId,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    changed,
    setChanged,
  ] = useState(false);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const queueRef =
    useRef([]);

  useEffect(() => {
    queueRef.current =
      queue;
  }, [queue]);

  /* ======================================================
     Date
  ====================================================== */

  const selectedDateString =
    useMemo(
      () =>
        selectedDate.format(
          "YYYY-MM-DD"
        ),

      [selectedDate]
    );

  /* ======================================================
     Drag Sensors
  ====================================================== */

  const sensors = useSensors(
    useSensor(
      PointerSensor,
      {
        activationConstraint: {
          distance: 6,
        },
      }
    )
  );

  /* ======================================================
     Current Treatment

     IMPORTANT:
     This controls whether the room
     is available.
  ====================================================== */

  const currentTreatment =
    useMemo(() => {
      return (
        appointments.find(
          (appointment) =>
            isInTreatment(
              appointment
            )
        ) ?? null
      );
    }, [appointments]);

  /* ======================================================
     Available Appointments

     Excludes:
     - already in queue
     - current treatment

     Sorted appointment #1 -> last
  ====================================================== */

  const availableAppointments =
    useMemo(() => {
      const queuedIds =
        new Set(
          queue.map(
            (appointment) =>
              getAppointmentId(
                appointment
              )
          )
        );

      return appointments
        .filter(
          (appointment) => {
            const id =
              getAppointmentId(
                appointment
              );

            if (
              queuedIds.has(id)
            ) {
              return false;
            }

            if (
              isInTreatment(
                appointment
              )
            ) {
              return false;
            }

            return true;
          }
        )
        .sort(
          (a, b) =>
            appointmentNumberValue(
              getAppointmentNumber(
                a
              )
            ) -
            appointmentNumberValue(
              getAppointmentNumber(
                b
              )
            )
        );
    }, [
      appointments,
      queue,
    ]);

  /* ======================================================
     Detect Queue Changes
  ====================================================== */

  const updateChangedState =
    useCallback(
      (nextQueue) => {
        const nextIds =
          nextQueue
            .map(
              (appointment) =>
                getAppointmentId(
                  appointment
                )
            )
            .filter(Boolean);

        setChanged(
          JSON.stringify(
            nextIds
          ) !==
            JSON.stringify(
              savedQueueIds
            )
        );
      },
      [savedQueueIds]
    );

  /* ======================================================
     Central Queue Change
  ====================================================== */

  const changeQueue =
    useCallback(
      (updater) => {
        setQueue(
          (
            currentQueue
          ) => {
            const nextQueue =
              typeof updater ===
              "function"
                ? updater(
                    currentQueue
                  )
                : updater;

            queueRef.current =
              nextQueue;

            updateChangedState(
              nextQueue
            );

            return nextQueue;
          }
        );
      },
      [
        updateChangedState,
      ]
    );

  /* ======================================================
     Load Queue
  ====================================================== */

  const loadQueue =
    useCallback(
      async () => {
        try {
          setLoading(true);

          setLoadError(
            ""
          );

          const [
            appointmentsResponse,
            queueResponse,
          ] =
            await Promise.all([
              getAppointmentsByDate(
                selectedDateString
              ),

              getQueueOrderByDate(
                selectedDateString
              ),
            ]);

          /* ==============================================
             Daily appointments
          =============================================== */

          const dailyAppointments =
            extractAppointments(
              appointmentsResponse
            );

          const validAppointments =
            dailyAppointments
              .filter(
                (
                  appointment
                ) => {
                  const id =
                    getAppointmentId(
                      appointment
                    );

                  const number =
                    getAppointmentNumber(
                      appointment
                    );

                  if (!id) {
                    return false;
                  }

                  if (!number) {
                    return false;
                  }

                  if (
                    number ===
                    "-"
                  ) {
                    return false;
                  }

                  return true;
                }
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  appointmentNumberValue(
                    getAppointmentNumber(
                      a
                    )
                  ) -
                  appointmentNumberValue(
                    getAppointmentNumber(
                      b
                    )
                  )
              );

          setAppointments(
            validAppointments
          );

          /* ==============================================
             Saved Queue IDs
          =============================================== */

          const savedIds =
            extractQueueOrder(
              queueResponse
            );

          setSavedQueueIds(
            savedIds
          );

          /* ==============================================
             Appointment Map
          =============================================== */

          const appointmentMap =
            new Map(
              validAppointments.map(
                (
                  appointment
                ) => [
                  getAppointmentId(
                    appointment
                  ),

                  appointment,
                ]
              )
            );

          /* ==============================================
             Restore queue
          =============================================== */

          const savedAppointments =
            savedIds
              .map(
                (
                  appointmentId
                ) =>
                  appointmentMap.get(
                    appointmentId
                  )
              )
              .filter(
                Boolean
              );

          setQueue(
            savedAppointments
          );

          queueRef.current =
            savedAppointments;

          /* ==============================================
             Detect stale IDs
          =============================================== */

          const validSavedIds =
            savedAppointments.map(
              (
                appointment
              ) =>
                getAppointmentId(
                  appointment
                )
            );

          setChanged(
            JSON.stringify(
              validSavedIds
            ) !==
              JSON.stringify(
                savedIds
              )
          );
        } catch (error) {
          console.error(
            "Failed to load queue:",
            error
          );

          setLoadError(
            error?.response
              ?.data
              ?.message ||
              "Failed to load daily queue."
          );

          setAppointments(
            []
          );

          setQueue([]);

          queueRef.current =
            [];
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        selectedDateString,
      ]
    );

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  /* ======================================================
     Add Appointment
  ====================================================== */

  const handleAddAppointment =
    useCallback(
      (appointment) => {
        const appointmentId =
          getAppointmentId(
            appointment
          );

        changeQueue(
          (
            currentQueue
          ) => {
            const alreadyExists =
              currentQueue.some(
                (item) =>
                  getAppointmentId(
                    item
                  ) ===
                  appointmentId
              );

            if (
              alreadyExists
            ) {
              return currentQueue;
            }

            return [
              ...currentQueue,
              appointment,
            ];
          }
        );
      },
      [changeQueue]
    );

  /* ======================================================
     Remove Appointment
  ====================================================== */

  const handleRemoveAppointment =
    useCallback(
      (
        appointmentId
      ) => {
        changeQueue(
          (
            currentQueue
          ) =>
            currentQueue.filter(
              (
                appointment
              ) =>
                getAppointmentId(
                  appointment
                ) !==
                appointmentId
            )
        );
      },
      [changeQueue]
    );

  /* ======================================================
     Move Appointment
  ====================================================== */

  const moveAppointment =
    useCallback(
      (
        appointmentId,
        targetIndex
      ) => {
        changeQueue(
          (
            currentQueue
          ) => {
            const oldIndex =
              currentQueue.findIndex(
                (
                  appointment
                ) =>
                  getAppointmentId(
                    appointment
                  ) ===
                  appointmentId
              );

            if (
              oldIndex ===
              -1
            ) {
              return currentQueue;
            }

            const maxIndex =
              currentQueue.length -
              1;

            const safeTarget =
              Math.max(
                0,
                Math.min(
                  targetIndex,
                  maxIndex
                )
              );

            if (
              oldIndex ===
              safeTarget
            ) {
              return currentQueue;
            }

            return arrayMove(
              currentQueue,
              oldIndex,
              safeTarget
            );
          }
        );
      },
      [changeQueue]
    );

  /* ======================================================
     Move First
  ====================================================== */

  const handleMoveFirst =
    useCallback(
      (
        appointmentId
      ) => {
        moveAppointment(
          appointmentId,
          0
        );
      },
      [
        moveAppointment,
      ]
    );

  /* ======================================================
     Move Previous
  ====================================================== */

  const handleMovePrevious =
    useCallback(
      (
        appointmentId
      ) => {
        const currentIndex =
          queueRef.current.findIndex(
            (
              appointment
            ) =>
              getAppointmentId(
                appointment
              ) ===
              appointmentId
          );

        if (
          currentIndex <=
          0
        ) {
          return;
        }

        moveAppointment(
          appointmentId,
          currentIndex - 1
        );
      },
      [
        moveAppointment,
      ]
    );

  /* ======================================================
     Move Next
  ====================================================== */

  const handleMoveNext =
    useCallback(
      (
        appointmentId
      ) => {
        const currentIndex =
          queueRef.current.findIndex(
            (
              appointment
            ) =>
              getAppointmentId(
                appointment
              ) ===
              appointmentId
          );

        if (
          currentIndex ===
          -1
        ) {
          return;
        }

        if (
          currentIndex >=
          queueRef.current
            .length -
            1
        ) {
          return;
        }

        moveAppointment(
          appointmentId,
          currentIndex + 1
        );
      },
      [
        moveAppointment,
      ]
    );

  /* ======================================================
     Move Last
  ====================================================== */

  const handleMoveLast =
    useCallback(
      (
        appointmentId
      ) => {
        moveAppointment(
          appointmentId,
          queueRef.current
            .length - 1
        );
      },
      [
        moveAppointment,
      ]
    );

  /* ======================================================
     Move To Position
  ====================================================== */

  const handleMoveToPosition =
    useCallback(
      (
        appointmentId,
        newPosition
      ) => {
        moveAppointment(
          appointmentId,
          Number(
            newPosition
          ) - 1
        );
      },
      [
        moveAppointment,
      ]
    );

  /* ======================================================
     MOVE TO TREATMENT
  ====================================================== */

  const handleMoveToTreatment =
    useCallback(
      async (
        appointment
      ) => {
        const appointmentId =
          getAppointmentId(
            appointment
          );

        if (
          !appointmentId
        ) {
          message.error(
            "Appointment ID not found."
          );

          return;
        }

        /* ================================================
           Treatment room safety check
        ================================================= */

        if (
          currentTreatment
        ) {
          message.warning(
            `Appointment #${getAppointmentNumber(
              currentTreatment
            )} is already in treatment.`
          );

          return;
        }

        try {
          setMovingToTreatmentId(
            appointmentId
          );

          /* ==============================================
             Update Backend Status
          =============================================== */

          await updateAppointmentStatus(
            appointmentId,
            "In Treatment"
          );

          const treatmentAppointment =
            {
              ...appointment,

              status:
                "In Treatment",
            };

          /* ==============================================
             Update local appointments

             This immediately makes
             currentTreatment active.
          =============================================== */

          setAppointments(
            (
              currentAppointments
            ) =>
              currentAppointments.map(
                (item) =>
                  getAppointmentId(
                    item
                  ) ===
                  appointmentId
                    ? treatmentAppointment
                    : item
              )
          );

          /* ==============================================
             Remove from active queue
          =============================================== */

          changeQueue(
            (
              currentQueue
            ) =>
              currentQueue.filter(
                (item) =>
                  getAppointmentId(
                    item
                  ) !==
                  appointmentId
              )
          );

          message.success(
            `Appointment #${getAppointmentNumber(
              appointment
            )} moved to treatment.`
          );

          /* ==============================================
             Navigate to treatment page
          =============================================== */

          navigate(
            "/current-treatment",
            {
              state: {
                appointmentId,

                appointmentNumber:
                  getAppointmentNumber(
                    appointment
                  ),

                appointment:
                  treatmentAppointment,
              },
            }
          );
        } catch (error) {
          console.error(
            "Failed to move patient to treatment:",
            error
          );

          message.error(
            error?.response
              ?.data
              ?.message ||
              error?.message ||
              "Failed to move patient to treatment."
          );
        } finally {
          setMovingToTreatmentId(
            ""
          );
        }
      },
      [
        currentTreatment,
        changeQueue,
        navigate,
      ]
    );

  /* ======================================================
     Drag Start
  ====================================================== */

  const handleDragStart =
    ({
      active,
    }) => {
      setActiveAppointment(
        active.data.current
          ?.appointment ??
          null
      );
    };

  /* ======================================================
     Drag End
  ====================================================== */

  const handleDragEnd =
    ({
      active,
      over,
    }) => {
      setActiveAppointment(
        null
      );

      if (!over) {
        return;
      }

      const source =
        active.data.current
          ?.source;

      const overSource =
        over.data.current
          ?.source;

      const activeId =
        normalize(
          active.id
        );

      const overId =
        normalize(
          over.id
        );

      /* ==================================================
         AVAILABLE -> ACTIVE QUEUE
      ================================================== */

      if (
        source ===
        "available"
      ) {
        const draggedAppointment =
          active.data.current
            ?.appointment;

        if (
          !draggedAppointment
        ) {
          return;
        }

        /* ================================================
           Add at end
        ================================================= */

        if (
          overId ===
          TOP_QUEUE_ID
        ) {
          handleAddAppointment(
            draggedAppointment
          );

          return;
        }

        /* ================================================
           Insert before queue card
        ================================================= */

        if (
          overSource ===
          "queue"
        ) {
          changeQueue(
            (
              currentQueue
            ) => {
              const exists =
                currentQueue.some(
                  (
                    appointment
                  ) =>
                    getAppointmentId(
                      appointment
                    ) ===
                    activeId
                );

              if (
                exists
              ) {
                return currentQueue;
              }

              const targetIndex =
                currentQueue.findIndex(
                  (
                    appointment
                  ) =>
                    getAppointmentId(
                      appointment
                    ) ===
                    overId
                );

              if (
                targetIndex ===
                -1
              ) {
                return [
                  ...currentQueue,
                  draggedAppointment,
                ];
              }

              const nextQueue =
                [
                  ...currentQueue,
                ];

              nextQueue.splice(
                targetIndex,
                0,
                draggedAppointment
              );

              return nextQueue;
            }
          );
        }

        return;
      }

      /* ==================================================
         ACTIVE -> AVAILABLE

         Remove from queue
      ================================================== */

      if (
        source ===
          "queue" &&
        (
          overId ===
            AVAILABLE_QUEUE_ID ||
          overSource ===
            "available"
        )
      ) {
        handleRemoveAppointment(
          activeId
        );

        return;
      }

      /* ==================================================
         ACTIVE -> ACTIVE
      ================================================== */

      if (
        source ===
        "queue"
      ) {
        if (
          overId ===
          TOP_QUEUE_ID
        ) {
          handleMoveLast(
            activeId
          );

          return;
        }

        if (
          overSource !==
          "queue"
        ) {
          return;
        }

        const currentQueue =
          queueRef.current;

        const oldIndex =
          currentQueue.findIndex(
            (
              appointment
            ) =>
              getAppointmentId(
                appointment
              ) ===
              activeId
          );

        const newIndex =
          currentQueue.findIndex(
            (
              appointment
            ) =>
              getAppointmentId(
                appointment
              ) ===
              overId
          );

        if (
          oldIndex ===
            -1 ||
          newIndex ===
            -1
        ) {
          return;
        }

        if (
          oldIndex ===
          newIndex
        ) {
          return;
        }

        moveAppointment(
          activeId,
          newIndex
        );
      }
    };

  /* ======================================================
     Drag Cancel
  ====================================================== */

  const handleDragCancel =
    () => {
      setActiveAppointment(
        null
      );
    };

  /* ======================================================
     Add All
  ====================================================== */

  const handleAddAll =
    () => {
      if (
        availableAppointments.length ===
        0
      ) {
        return;
      }

      changeQueue(
        (
          currentQueue
        ) => [
          ...currentQueue,
          ...availableAppointments,
        ]
      );
    };

  /* ======================================================
     Clear Queue
  ====================================================== */

  const handleClearQueue =
    () => {
      changeQueue(
        []
      );
    };

  /* ======================================================
     Sort Queue
  ====================================================== */

  const handleSortQueue =
    () => {
      changeQueue(
        (
          currentQueue
        ) =>
          [
            ...currentQueue,
          ].sort(
            (
              a,
              b
            ) =>
              appointmentNumberValue(
                getAppointmentNumber(
                  a
                )
              ) -
              appointmentNumberValue(
                getAppointmentNumber(
                  b
                )
              )
          )
      );
    };

  /* ======================================================
     Save Queue
  ====================================================== */

  const saveQueueNow =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        const queueOrder =
          queueRef.current
            .map(
              (
                appointment
              ) =>
                getAppointmentId(
                  appointment
                )
            )
            .filter(Boolean);

        try {
          setSaving(
            true
          );

          await saveQueueOrder(
            {
              date:
                selectedDateString,

              queue_order:
                queueOrder,
            }
          );

          setSavedQueueIds(
            queueOrder
          );

          /* ==============================================
             Check if queue changed
             while save was running
          =============================================== */

          const latestQueueOrder =
            queueRef.current
              .map(
                (
                  appointment
                ) =>
                  getAppointmentId(
                    appointment
                  )
              )
              .filter(
                Boolean
              );

          const stillSame =
            JSON.stringify(
              latestQueueOrder
            ) ===
            JSON.stringify(
              queueOrder
            );

          setChanged(
            !stillSame
          );

          if (!silent) {
            message.success(
              "Queue saved successfully."
            );
          }
        } catch (error) {
          console.error(
            "Failed to save queue:",
            error
          );

          setChanged(
            true
          );

          if (
            silent
          ) {
            message.error(
              "Auto-save failed. Please use Save Queue."
            );
          } else {
            message.error(
              error?.response
                ?.data
                ?.message ||
                "Failed to save queue."
            );
          }
        } finally {
          setSaving(
            false
          );
        }
      },
      [
        selectedDateString,
      ]
    );

  /* ======================================================
     Manual Save
  ====================================================== */

  const handleSaveQueue =
    () => {
      saveQueueNow({
        silent:
          false,
      });
    };

  /* ======================================================
     Auto Save After 5 Seconds
  ====================================================== */

  useEffect(() => {
    if (!changed) {
      return;
    }

    if (loading) {
      return;
    }

    if (saving) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          saveQueueNow({
            silent:
              true,
          });
        },
        AUTO_SAVE_DELAY
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    queue,
    changed,
    loading,
    saving,
    saveQueueNow,
  ]);

  /* ======================================================
     Current Treatment
  ====================================================== */

  const handleDoneTreatment =
    () => {
      if (
        !currentTreatment
      ) {
        return;
      }

      navigate(
        "/current-treatment",
        {
          state: {
            appointmentId:
              getAppointmentId(
                currentTreatment
              ),

            appointmentNumber:
              getAppointmentNumber(
                currentTreatment
              ),

            appointment:
              currentTreatment,
          },
        }
      );
    };

  /* ======================================================
     Render
  ====================================================== */

  return (
    <ClinicPage>
      <div className="queue-manager-page">

        {/* ==============================================
            PAGE HEADER
        =============================================== */}

        <div className="queue-manager-header">
          <div>
            <div className="queue-manager-eyebrow">
              DAILY PATIENT QUEUE
            </div>

            <Title
              level={2}
              className="queue-manager-page-title"
            >
              Queue Manager
            </Title>

            <Text type="secondary">
              Add appointments to
              the queue using the
              buttons or drag them
              between the two rows.
            </Text>
          </div>

          <Space wrap>
            <DatePicker
              value={
                selectedDate
              }
              allowClear={
                false
              }
              format="DD MMM YYYY"
              suffixIcon={
                <CalendarOutlined />
              }
              onChange={(
                date
              ) => {
                if (
                  date
                ) {
                  setSelectedDate(
                    date
                  );
                }
              }}
            />

            <Button
              icon={
                <ReloadOutlined />
              }
              loading={
                loading
              }
              onClick={
                loadQueue
              }
            >
              Refresh
            </Button>

            <Button
              type="primary"
              icon={
                <SaveOutlined />
              }
              loading={
                saving
              }
              disabled={
                loading ||
                !changed
              }
              onClick={
                handleSaveQueue
              }
            >
              Save Queue
            </Button>
          </Space>
        </div>

      
      

        {loadError && (
          <Alert
            type="error"
            showIcon
            message={
              loadError
            }
            className="queue-manager-alert"
          />
        )}

        {/* ==============================================
            DND AREA
        =============================================== */}

        <Spin
          spinning={
            loading
          }
        >
          <DndContext
            sensors={
              sensors
            }
            collisionDetection={
              closestCenter
            }
            onDragStart={
              handleDragStart
            }
            onDragEnd={
              handleDragEnd
            }
            onDragCancel={
              handleDragCancel
            }
          >

            {/* ==========================================
                ROW 1
                UPDATED QUEUE
            =========================================== */}

            <Card
              bordered={
                false
              }
              className="queue-section-card queue-section-active"
            >
              <div className="queue-section-header">
                <div className="queue-section-title-row">
                  <div className="queue-section-number">
                    1
                  </div>

                  <div>
                    <Title
                      level={4}
                      className="queue-section-title"
                    >
                      Updated Queue
                    </Title>

                    <Text type="secondary">
                      Arrange the
                      queue and move
                      the next patient
                      into treatment.
                    </Text>
                  </div>
                </div>

                <Space wrap>
                  {currentTreatment ? (
                    <Tag color="orange">
                      Room Occupied
                    </Tag>
                  ) : (
                    <Tag color="green">
                      Room Available
                    </Tag>
                  )}

                  <Tag color="blue">
                    {
                      queue.length
                    }{" "}
                    Patients
                  </Tag>

                  <Button
                    size="small"
                    icon={
                      <UnorderedListOutlined />
                    }
                    disabled={
                      queue.length <
                      2
                    }
                    onClick={
                      handleSortQueue
                    }
                  >
                    Sort #1 → Last
                  </Button>

                  <Popconfirm
                    title="Clear queue?"
                    description="All patients will return to the available appointments row."
                    okText="Clear"
                    cancelText="Cancel"
                    onConfirm={
                      handleClearQueue
                    }
                  >
                    <Button
                      size="small"
                      danger
                      icon={
                        <ClearOutlined />
                      }
                      disabled={
                        queue.length ===
                        0
                      }
                    >
                      Clear
                    </Button>
                  </Popconfirm>
                </Space>
              </div>

              <ActiveQueueArea
                queue={
                  queue
                }

                onMoveFirst={
                  handleMoveFirst
                }

                onMovePrevious={
                  handleMovePrevious
                }

                onMoveNext={
                  handleMoveNext
                }

                onMoveLast={
                  handleMoveLast
                }

                onMoveToPosition={
                  handleMoveToPosition
                }

                onRemove={
                  handleRemoveAppointment
                }

                onMoveToTreatment={
                  handleMoveToTreatment
                }

                currentTreatment={
                  currentTreatment
                }

                movingToTreatmentId={
                  movingToTreatmentId
                }
              />
            </Card>

            {/* ==========================================
                TRANSFER HINT
            =========================================== */}

            <div className="queue-transfer-hint">
              <div className="queue-transfer-arrow">
                ↑
              </div>

              <span>
                Use Add / Remove
                buttons or drag cards
                between the rows
              </span>

              <div className="queue-transfer-arrow">
                ↓
              </div>
            </div>

            {/* ==========================================
                ROW 2
                DAILY APPOINTMENTS
            =========================================== */}

            <Card
              bordered={
                false
              }
              className="queue-section-card queue-section-available"
            >
              <div className="queue-section-header">
                <div className="queue-section-title-row">
                  <div className="queue-section-number queue-section-number-secondary">
                    2
                  </div>

                  <div>
                    <Title
                      level={4}
                      className="queue-section-title"
                    >
                      Daily Appointments
                    </Title>

                    <Text type="secondary">
                      Appointments are
                      always shown from
                      #1 to the last.
                    </Text>
                  </div>
                </div>

                <Space wrap>
                  <Tag>
                    {
                      availableAppointments.length
                    }{" "}
                    Available
                  </Tag>

                  <Button
                    type="primary"
                    ghost
                    size="small"
                    icon={
                      <PlusOutlined />
                    }
                    disabled={
                      availableAppointments.length ===
                      0
                    }
                    onClick={
                      handleAddAll
                    }
                  >
                    Add All
                  </Button>
                </Space>
              </div>

              <AvailableQueueArea
                appointments={
                  availableAppointments
                }
                onAdd={
                  handleAddAppointment
                }
              />
            </Card>

            {/* ==========================================
                DRAG OVERLAY
            =========================================== */}

            <DragOverlay>
              <DragPreview
                appointment={
                  activeAppointment
                }
              />
            </DragOverlay>
          </DndContext>
        </Spin>
      </div>
    </ClinicPage>
  );
};

export default QueueManager;