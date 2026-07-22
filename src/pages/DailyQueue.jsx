import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ReloadOutlined,
  ToolOutlined,
  UserOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  CalendarFilled,
  PlayCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  getDailyQueueByDate,
  updateQueueStatus,
} from "../api/endPoints";

const { Title, Text } = Typography;

const getTodayDate = () => dayjs().format("YYYY-MM-DD");

const formatTime = (value) => {
  if (!value) return "-";

  const isoTime = dayjs(value);
  if (isoTime.isValid()) return isoTime.format("h:mm A");

  const normalTime = dayjs(value, "HH:mm");
  return normalTime.isValid() ? normalTime.format("h:mm A") : value;
};

const extractArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.data?.data)) return res.data.data.data;

  return [];
};

const DailyQueue = () => {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);

      const res = await getDailyQueueByDate(selectedDate);
      const data = extractArray(res);

      const sortedData = [...data].sort((a, b) => {
        const queueA = Number(a.queue_no || 0);
        const queueB = Number(b.queue_no || 0);

        return queueA - queueB;
      });

      setQueue(sortedData);
    } catch (error) {
      console.error(error);
      message.error("Failed to fetch daily queue");
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const ongoingQueue = useMemo(() => {
    return queue.filter(
      (item) => item.status !== "Completed" && item.status !== "Cancelled",
    );
  }, [queue]);

  const completedQueue = useMemo(() => {
    return queue.filter((item) => item.status === "Completed");
  }, [queue]);

  const cancelledQueue = useMemo(() => {
    return queue.filter((item) => item.status === "Cancelled");
  }, [queue]);

  const currentInside = useMemo(() => {
    return queue.find((item) => item.status === "In Treatment") || null;
  }, [queue]);

  const previousPatient = useMemo(() => {
    const donePatients = queue
      .filter((item) =>
        ["Treatment Done", "Payment Pending", "Paid", "Completed"].includes(
          item.status,
        ),
      )
      .sort((a, b) => Number(b.queue_no || 0) - Number(a.queue_no || 0));

    return donePatients[0] || null;
  }, [queue]);

  const nextPatient = useMemo(() => {
    const waitingPatients = queue
      .filter((item) => item.status === "Waiting")
      .sort((a, b) => Number(a.queue_no || 0) - Number(b.queue_no || 0));

    return waitingPatients[0] || null;
  }, [queue]);

  const handleRowClick = (record) => {
    if (!record.appointment_id) {
      message.warning("This queue item has no linked appointment");
      return;
    }

    navigate(`/appointments/${record.appointment_id}/manage`);
  };

  const getStatusColor = (status) => {
    if (status === "Waiting") return "blue";
    if (status === "In Treatment") return "purple";
    if (status === "Treatment Done") return "geekblue";
    if (status === "Payment Pending") return "orange";
    if (status === "Paid") return "green";
    if (status === "Completed") return "green";
    if (status === "Cancelled") return "red";

    return "default";
  };

  const handleStatusUpdate = async (queueId, status) => {
    try {
      setUpdatingId(queueId);

      await updateQueueStatus(queueId, status);
      await fetchQueue();

      message.success(`Queue moved to ${status}`);
    } catch (error) {
      console.error(error);
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update queue status",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const renderPatientCard = (title, icon, patient, color, emptyText) => {
    return (
      <Card
        style={{
          borderRadius: 18,
          height: "100%",
          border: "1px solid #f0f0f0",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
        }}
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Text type="secondary">
            {icon} {title}
          </Text>

          {patient ? (
            <>
              <Title level={3} style={{ margin: 0 }}>
                Queue #{patient.queue_no || "-"}
              </Title>

              <Title level={5} style={{ margin: 0 }}>
                {patient.patient_name || "Unknown Patient"}
              </Title>

              <Text type="secondary">
                Arrived: {formatTime(patient.arrived_at)} |{" "}
                {patient.dentist_name || patient.dentist_id || "No dentist"}
              </Text>

              <Tag color={color} style={{ width: "fit-content" }}>
                {patient.status || "Waiting"}
              </Tag>
            </>
          ) : (
            <Text type="secondary">{emptyText}</Text>
          )}
        </Space>
      </Card>
    );
  };

  const columns = [
    {
      title: "Queue No",
      key: "queue_no",
      width: 110,
      render: (_, item, index) => (
        <Text strong>#{item.queue_no || index + 1}</Text>
      ),
    },
    {
      title: "Arrived Time",
      key: "arrived_at",
      width: 140,
      render: (_, item) => formatTime(item.arrived_at),
    },
    {
      title: "Patient",
      dataIndex: "patient_name",
      render: (value) => value || "-",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      render: (value) => value || "-",
    },
    {
      title: "Dentist",
      key: "dentist",
      render: (_, item) => item.dentist_name || item.dentist_id || "-",
    },
    {
      title: "Reason",
      dataIndex: "reason_for_visit",
      ellipsis: true,
      render: (value) => value || "-",
    },
    {
      title: "Source",
      dataIndex: "source",
      width: 120,
      render: (value) => value || "Appointment",
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 150,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{status || "Waiting"}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 260,
      fixed: "right",
      render: (_, item) => {
        const queueId = item.id;
        const status = item.status || "Waiting";

        return (
          <Space wrap>
            {status === "Waiting" && (
              <Button
                size="small"
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={updatingId === queueId}
                onClick={(event) => {
                  event.stopPropagation();
                  handleStatusUpdate(queueId, "In Treatment");
                }}
              >
                Start
              </Button>
            )}

            {status === "In Treatment" && (
              <Button
                size="small"
                icon={<CheckCircleOutlined />}
                loading={updatingId === queueId}
                onClick={(event) => {
                  event.stopPropagation();
                  handleStatusUpdate(queueId, "Treatment Done");
                }}
              >
                Done
              </Button>
            )}

            <Button
              size="small"
              icon={<ToolOutlined />}
              disabled={!item.appointment_id}
              onClick={(event) => {
                event.stopPropagation();

                if (!item.appointment_id) {
                  message.warning("This queue item has no linked appointment");
                  return;
                }

                navigate(`/appointments/${item.appointment_id}/manage`);
              }}
            >
              Manage
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: 24,
          padding: "26px 28px",
          borderRadius: 18,
          background: "linear-gradient(135deg, #1677ff 0%, #4096ff 100%)",
          color: "#fff",
          boxShadow: "0 10px 28px rgba(22, 119, 255, 0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Title level={2} style={{ color: "#fff", marginBottom: 4 }}>
            Daily Queue
          </Title>

          <Text style={{ color: "rgba(255,255,255,0.88)" }}>
            Only checked-in patients are shown here.
          </Text>
        </div>

        <div
          style={{
            background: "rgba(255, 255, 255, 0.18)",
            padding: "8px 10px",
            borderRadius: 16,
            border: "1px solid rgba(255, 255, 255, 0.28)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 10px 24px rgba(0, 0, 0, 0.12)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 18,
              border: "1px solid rgba(255, 255, 255, 0.24)",
            }}
          >
            <CalendarFilled />
          </div>

          <DatePicker
            allowClear
            value={dayjs(selectedDate)}
            format="YYYY-MM-DD"
            onChange={(date) =>
              setSelectedDate(
                date ? date.format("YYYY-MM-DD") : getTodayDate(),
              )
            }
            style={{
              width: 190,
              borderRadius: 10,
              fontWeight: 500,
            }}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={fetchQueue}
            loading={loading}
          />
        </div>
      </div>

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Total Queue" value={queue.length} />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Ongoing Queue" value={ongoingQueue.length} />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Completed" value={completedQueue.length} />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Cancelled" value={cancelledQueue.length} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            {renderPatientCard(
              "Previous Patient",
              <HistoryOutlined />,
              previousPatient,
              "green",
              "No previous patient yet",
            )}
          </Col>

          <Col xs={24} md={8}>
            {renderPatientCard(
              "Currently Inside",
              <UserOutlined />,
              currentInside,
              "purple",
              "No patient inside now",
            )}
          </Col>

          <Col xs={24} md={8}>
            {renderPatientCard(
              "Next Patient",
              <ClockCircleOutlined />,
              nextPatient,
              "blue",
              "No waiting patient",
            )}
          </Col>
        </Row>

        <Card title="Queue List" extra={<Text type="secondary">{selectedDate}</Text>}>
          <Table
            rowKey={(record, index) => record.id || index}
            loading={loading}
            columns={columns}
            dataSource={queue}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 1300 }}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: {
                cursor: record.appointment_id ? "pointer" : "default",
              },
            })}
          />
        </Card>
      </Space>
    </div>
  );
};

export default DailyQueue;