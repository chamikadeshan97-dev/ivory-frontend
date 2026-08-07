import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CreditCardOutlined,
  MedicineBoxOutlined,
  SmileOutlined,
  UserOutlined,
} from "@ant-design/icons";

import {
  getAppointmentById,
  getAppointmentsByDate,
  updateAppointmentStatus,
  createTreatment,
  createPayment,
} from "../api/endPoints";

const { Title, Text } = Typography;
const { TextArea } = Input;

const statusSteps = [
  "Confirmed",
  "Checked In",
  "In Treatment",
  "Treatment Done",
  "Payment Pending",
  "Paid",
  "Completed",
];

const getApiErrorMessage = (error, fallbackMessage) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage
  );
};

const pageStyles = {
  page: {
    padding: 24,
    background: "#f5f7fb",
    minHeight: "100vh",
  },
  mainCard: {
    borderRadius: 16,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  softCard: {
    borderRadius: 16,
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
  },
  queueCard: {
    borderRadius: 18,
    textAlign: "center",
    minWidth: 150,
    background: "linear-gradient(135deg, #1677ff, #13c2c2)",
    color: "#fff",
  },
  bigButton: {
    height: 46,
    fontWeight: 600,
    borderRadius: 10,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "#eef4ff",
    color: "#1677ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 17,
  },
};

const ManageAppointment = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [updatingStatus, setUpdatingStatus] = useState("");
  const [treatmentLoading, setTreatmentLoading] = useState(false);

  const [appointment, setAppointment] = useState(null);
  const [dailyAppointments, setDailyAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [statusError, setStatusError] = useState("");

  const [treatmentForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const fetchDailyAppointments = async (appointmentDate) => {
    if (!appointmentDate) return;

    try {
      setQueueLoading(true);

      const res = await getAppointmentsByDate(appointmentDate);

      if (res.data?.success) {
        setDailyAppointments(res.data.data || []);
      }
    } catch (error) {
      console.error(error);
      setDailyAppointments([]);
    } finally {
      setQueueLoading(false);
    }
  };
  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const res = await getAppointmentById(id);
      if (res.data?.success) {
        const loadedAppointment = res.data.data;
        setAppointment(loadedAppointment);

        fetchDailyAppointments(loadedAppointment.appointment_date);
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to load appointment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();

    const interval = setInterval(fetchAppointment, 3000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (!appointment) return;

    treatmentForm.setFieldsValue({
      diagnosis: appointment.diagnosis || "",
      treatment_performed: appointment.treatment_performed || "",
      prescription: appointment.prescription || "",
      doctor_notes: appointment.doctor_notes || "",
      next_appointment_date: appointment.next_appointment_date || "",
      treatment_date:
        appointment.treatment_date || new Date().toISOString().split("T")[0],
    });

    paymentForm.setFieldsValue({
      treatment_id: appointment.treatment_id || "",
      payment_method: "Cash",
    });
  }, [appointment, treatmentForm, paymentForm]);

  const nextPatient = useMemo(() => {
    if (!appointment || !dailyAppointments.length) return null;

    const currentQueueNo = Number(appointment.queue_no || 0);
    const currentTime = appointment.appointment_time || "";

    const activeAppointments = dailyAppointments
      .filter((item) => {
        return !["Cancelled", "Completed"].includes(item.status);
      })
      .sort((a, b) => {
        const queueA = Number(a.queue_no || 0);
        const queueB = Number(b.queue_no || 0);

        if (queueA && queueB && queueA !== queueB) {
          return queueA - queueB;
        }

        return (a.appointment_time || "").localeCompare(
          b.appointment_time || "",
        );
      });

    return (
      activeAppointments.find((item) => {
        const itemQueueNo = Number(item.queue_no || 0);

        if (currentQueueNo && itemQueueNo) {
          return itemQueueNo > currentQueueNo;
        }

        return (item.appointment_time || "") > currentTime;
      }) || null
    );
  }, [appointment, dailyAppointments]);

  const handleNextPatientClick = () => {
    const nextPatientId = nextPatient?.id || nextPatient?.appointment_id;

    if (!nextPatientId) {
      message.warning("Next patient appointment ID not found");
      return;
    }

    navigate(`/appointments/${nextPatientId}/manage`);
  };

  const previousPatient = useMemo(() => {
    if (!appointment || !dailyAppointments.length) return null;

    const currentQueueNo = Number(appointment.queue_no || 0);
    const currentTime = appointment.appointment_time || "";

    const sortedAppointments = dailyAppointments
      .filter((item) => item.status !== "Cancelled")
      .sort((a, b) => {
        const queueA = Number(a.queue_no || 0);
        const queueB = Number(b.queue_no || 0);

        if (queueA && queueB && queueA !== queueB) {
          return queueA - queueB;
        }

        return (a.appointment_time || "").localeCompare(
          b.appointment_time || "",
        );
      });

    const currentIndex = sortedAppointments.findIndex((item) => {
      return (
        item.appointment_id === appointment.appointment_id ||
        item.id === appointment.id
      );
    });

    if (currentIndex > 0) {
      return sortedAppointments[currentIndex - 1];
    }

    return (
      [...sortedAppointments].reverse().find((item) => {
        const itemQueueNo = Number(item.queue_no || 0);

        if (currentQueueNo && itemQueueNo) {
          return itemQueueNo < currentQueueNo;
        }

        return (item.appointment_time || "") < currentTime;
      }) || null
    );
  }, [appointment, dailyAppointments]);

  const handlePreviousPatientClick = () => {
    const previousPatientId =
      previousPatient?.id || previousPatient?.appointment_id;

    if (!previousPatientId) {
      message.warning("Previous patient appointment ID not found");
      return;
    }

    navigate(`/appointments/${previousPatientId}/manage`);
  };
  const currentStepIndex = useMemo(() => {
    if (!appointment?.status) return -1;
    return statusSteps.indexOf(appointment.status);
  }, [appointment]);

  const canEnterTreatment = appointment?.status === "In Treatment";
  const treatmentSaved = !!appointment?.treatment_id;

  const canEnterPayment = ["Treatment Done", "Payment Pending"].includes(
    appointment?.status,
  );

  const paymentFinished = ["Paid", "Completed", "Partial"].includes(
    appointment?.status,
  );

  const paymentRequired = ["Treatment Done", "Payment Pending"].includes(
    appointment?.status,
  );

  const nextStatus = useMemo(() => {
    if (!appointment) return null;

    if (appointment.status === "Pending") return "Confirmed";
    if (["Cancelled", "Completed"].includes(appointment.status)) return null;

    if (appointment.status === "In Treatment" && !appointment.treatment_id) {
      return null;
    }

    if (["Treatment Done", "Payment Pending"].includes(appointment.status)) {
      return null;
    }

    const currentIndex = statusSteps.indexOf(appointment.status);
    if (currentIndex === -1) return "Confirmed";

    return statusSteps[currentIndex + 1] || null;
  }, [appointment]);

  const getStatusColor = (status) => {
    if (status === "Completed") return "green";
    if (status === "Cancelled") return "red";
    if (status === "In Treatment") return "blue";
    if (status === "Paid") return "green";
    if (status === "Payment Pending") return "orange";
    if (status === "Treatment Done") return "purple";
    return "cyan";
  };

  const getSimpleStatusText = (status) => {
    if (status === "Confirmed") return "Appointment is ready";
    if (status === "Checked In") return "Patient has arrived";
    if (status === "In Treatment") return "Patient is with the dentist";
    if (status === "Treatment Done") return "Treatment is finished";
    if (status === "Payment Pending") return "Payment is still needed";
    if (status === "Paid") return "Payment is completed";
    if (status === "Completed") return "Patient visit is completed";
    if (status === "Cancelled") return "Appointment was cancelled";
    return "Waiting to start";
  };

  const getNextActionText = (status) => {
    if (status === "Confirmed") return "Mark Patient as Arrived";
    if (status === "Checked In") return "Send Patient to Dentist";
    if (status === "In Treatment") return "Save Treatment First";
    if (status === "Treatment Done") return "Collect Payment";
    if (status === "Payment Pending") return "Collect Remaining Payment";
    if (status === "Paid") return "Complete Visit";
    return `Move to ${status}`;
  };

  const handleStatusUpdate = async (status) => {
    try {
      setStatusError("");
      setUpdatingStatus(status);

      await updateAppointmentStatus(id, status);
      await fetchAppointment();

      message.success(`Appointment moved to ${status}`);
    } catch (error) {
      console.error(error);

      const errorMessage = getApiErrorMessage(
        error,
        "Failed to update appointment status",
      );

      setStatusError(errorMessage);
      message.error(errorMessage);
    } finally {
      setUpdatingStatus("");
    }
  };

  const handleTreatmentSubmit = async (values) => {
    if (!appointment) return;

    try {
      setTreatmentLoading(true);
      setStatusError("");

      const payload = {
        appointment_id: appointment.appointment_id,
        patient_id: appointment.patient_id,
        dentist_id: appointment.dentist_id,
        diagnosis: values.diagnosis,
        treatment_performed: values.treatment_performed,
        prescription: values.prescription || "",
        doctor_notes: values.doctor_notes || "",
        next_appointment_date: values.next_appointment_date || "",
        treatment_date: values.treatment_date,
      };

      await createTreatment(payload);
      await updateAppointmentStatus(id, "Treatment Done");
      await fetchAppointment();

      message.success("Treatment details saved successfully");
    } catch (error) {
      console.error(error);

      message.error(getApiErrorMessage(error, "Failed to save treatment"));
    } finally {
      setTreatmentLoading(false);
    }
  };

  const handlePaymentSubmit = async (values) => {
    const treatmentCharge = Number(values.treatment_charge);
    const paymentAmount = Number(values.payment_amount);

    if (!values.treatment_id) {
      message.warning("Please save treatment details first");
      return;
    }

    try {
      setPaymentLoading(true);
      setStatusError("");

      const payload = {
        patient_id: appointment.patient_id,
        treatment_id: values.treatment_id,
        treatment_charge: treatmentCharge,
        payment_amount: paymentAmount,
        payment_method: values.payment_method,
        payment_date: new Date().toISOString().split("T")[0],
        receipt_number: values.receipt_number || "",
      };

      const paymentRes = await createPayment(payload);
      const paymentStatus = paymentRes.data?.data?.status;

      if (paymentStatus === "Paid" || paymentStatus === "Partial") {
        await updateAppointmentStatus(id, "Paid");
      } else {
        await updateAppointmentStatus(id, "Payment Pending");
      }

      paymentForm.resetFields();
      await fetchAppointment();

      message.success("Payment saved successfully");
    } catch (error) {
      console.error(error);

      message.error(getApiErrorMessage(error, "Failed to save payment"));
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading && !appointment) {
    return (
      <div style={pageStyles.page}>
        <Card style={pageStyles.softCard}>
          <Spin />{" "}
          <Text style={{ marginLeft: 12 }}>Loading appointment...</Text>
        </Card>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div style={pageStyles.page}>
        <Card style={pageStyles.softCard}>
          <Alert type="error" message="Appointment not found" showIcon />
        </Card>
      </div>
    );
  }

  return (
    <div style={pageStyles.page}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card style={pageStyles.mainCard}>
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                Back
              </Button>

              <Title level={2} style={{ marginTop: 18, marginBottom: 6 }}>
                Patient Visit
              </Title>

              <Text type="secondary" style={{ fontSize: 15 }}>
                Simple view to manage patient arrival, treatment, payment, and
                leaving.
              </Text>
            </Col>

            <Col xs={24} md={12}>
              <Row gutter={[12, 12]} style={{ height: "100%" }}>
                {/* Previous Patient */}
                <Col xs={24} sm={8}>
                  <Card
                    hoverable={!!previousPatient}
                    onClick={
                      previousPatient ? handlePreviousPatientClick : undefined
                    }
                    bodyStyle={{ padding: 16 }}
                    style={{
                      borderRadius: 18,
                      height: "100%",
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      cursor: previousPatient ? "pointer" : "default",
                      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Previous
                    </Text>

                    {previousPatient ? (
                      <>
                        <Title
                          level={2}
                          style={{
                            margin: "6px 0 4px",
                            color: "#64748b",
                            fontSize: 30,
                            lineHeight: 1,
                          }}
                        >
                          #{previousPatient.queue_no || "-"}
                        </Title>

                        <Text
                          strong
                          ellipsis
                          style={{ display: "block", fontSize: 13 }}
                        >
                          {previousPatient.patient_name || "Unknown Patient"}
                        </Text>

                        <Tag color="default" style={{ marginTop: 8 }}>
                          {previousPatient.appointment_time || "-"}
                        </Tag>
                      </>
                    ) : (
                      <div style={{ marginTop: 18 }}>
                        <Text strong>No previous</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          First patient
                        </Text>
                      </div>
                    )}
                  </Card>
                </Col>

                {/* Current Patient */}
                <Col xs={24} sm={8}>
                  <Card
                    bodyStyle={{ padding: 16 }}
                    style={{
                      borderRadius: 18,
                      height: "100%",
                      background: "linear-gradient(135deg, #1677ff, #13c2c2)",
                      color: "#fff",
                      border: "none",
                      boxShadow: "0 8px 20px rgba(22, 119, 255, 0.22)",
                    }}
                  >
                    <Text
                      style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}
                    >
                      Current
                    </Text>

                    <Title
                      level={1}
                      style={{
                        margin: "6px 0 4px",
                        color: "#fff",
                        fontSize: 36,
                        lineHeight: 1,
                      }}
                    >
                      #{appointment.queue_no || "-"}
                    </Title>

                    <Text
                      strong
                      ellipsis
                      style={{
                        display: "block",
                        color: "#fff",
                        fontSize: 13,
                      }}
                    >
                      {appointment.patient_name || "Unknown Patient"}
                    </Text>

                    <Text
                      style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}
                    >
                      Now handling
                    </Text>
                  </Card>
                </Col>

                {/* Next Patient */}
                <Col xs={24} sm={8}>
                  <Card
                    hoverable={!!nextPatient}
                    onClick={nextPatient ? handleNextPatientClick : undefined}
                    bodyStyle={{ padding: 16 }}
                    style={{
                      borderRadius: 18,
                      height: "100%",
                      background: "#ffffff",
                      border: "1px solid #dbeafe",
                      cursor: nextPatient ? "pointer" : "default",
                      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Next
                    </Text>

                    {queueLoading ? (
                      <div style={{ marginTop: 18 }}>
                        <Spin size="small" />
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          Checking...
                        </Text>
                      </div>
                    ) : nextPatient ? (
                      <>
                        <Title
                          level={2}
                          style={{
                            margin: "6px 0 4px",
                            color: "#1677ff",
                            fontSize: 30,
                            lineHeight: 1,
                          }}
                        >
                          #{nextPatient.queue_no || "-"}
                        </Title>

                        <Text
                          strong
                          ellipsis
                          style={{ display: "block", fontSize: 13 }}
                        >
                          {nextPatient.patient_name || "Unknown Patient"}
                        </Text>

                        <Tag color="blue" style={{ marginTop: 8 }}>
                          {nextPatient.appointment_time || "-"}
                        </Tag>
                      </>
                    ) : (
                      <div style={{ marginTop: 18 }}>
                        <Text strong>No next</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Queue is clear
                        </Text>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        {statusError && (
          <Alert
            type="error"
            showIcon
            closable
            message={statusError}
            onClose={() => setStatusError("")}
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <Card style={pageStyles.softCard}>
                <Row gutter={[16, 16]} align="middle">
                  <Col xs={24} md={16}>
                    <Space align="start">
                      <div style={pageStyles.iconCircle}>
                        <UserOutlined />
                      </div>

                      <div>
                        <Text type="secondary">Current Patient</Text>

                        <Title level={3} style={{ margin: "4px 0" }}>
                          {appointment.patient_name || "Unknown Patient"}
                        </Title>

                        <Text>{appointment.phone || "No phone number"}</Text>
                      </div>
                    </Space>
                  </Col>

                  <Col xs={24} md={8}>
                    <Card
                      size="small"
                      style={{
                        borderRadius: 14,
                        background: "#fafafa",
                      }}
                    >
                      <Text type="secondary">Now</Text>
                      <br />
                      <Tag
                        color={getStatusColor(appointment.status)}
                        style={{
                          marginTop: 8,
                          fontSize: 14,
                          padding: "4px 10px",
                        }}
                      >
                        {appointment.status || "Pending"}
                      </Tag>

                      <div style={{ marginTop: 10 }}>
                        <Text strong>
                          {getSimpleStatusText(appointment.status)}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Descriptions
                  bordered
                  column={{ xs: 1, md: 2 }}
                  style={{ marginTop: 20 }}
                >
                  <Descriptions.Item label="Patient ID">
                    {appointment.patient_id}
                  </Descriptions.Item>
                  <Descriptions.Item label="Age">
                    {appointment.age || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Gender">
                    {appointment.gender || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Address">
                    {appointment.address || "-"}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card
                style={pageStyles.softCard}
                title={
                  <div style={pageStyles.sectionHeader}>
                    <div style={pageStyles.iconCircle}>
                      <MedicineBoxOutlined />
                    </div>
                    <div>
                      <div>Dental Treatment</div>
                      <Text type="secondary" style={{ fontWeight: 400 }}>
                        Add what the dentist did for this patient.
                      </Text>
                    </div>
                  </div>
                }
                extra={
                  treatmentSaved ? (
                    <Tag color="blue">Saved</Tag>
                  ) : canEnterTreatment ? (
                    <Tag color="blue">Ready to Fill</Tag>
                  ) : (
                    <Tag color="orange">Not Yet</Tag>
                  )
                }
              >
                {!canEnterTreatment && !treatmentSaved && (
                  <Alert
                    type="info"
                    showIcon
                    message="Treatment details can be added after the patient is sent to the dentist."
                  />
                )}

                {treatmentSaved && (
                  <Descriptions bordered column={1}>
                    <Descriptions.Item label="Treatment ID">
                      {appointment.treatment_id}
                    </Descriptions.Item>
                    <Descriptions.Item label="Diagnosis">
                      {appointment.diagnosis || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Treatment Done">
                      {appointment.treatment_performed || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Prescription">
                      {appointment.prescription || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Dentist Notes">
                      {appointment.doctor_notes || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Next Visit Date">
                      {appointment.next_appointment_date || "-"}
                    </Descriptions.Item>
                  </Descriptions>
                )}

                {canEnterTreatment && !treatmentSaved && (
                  <Form
                    layout="vertical"
                    form={treatmentForm}
                    onFinish={handleTreatmentSubmit}
                  >
                    <Form.Item
                      label="What is the problem?"
                      name="diagnosis"
                      rules={[
                        { required: true, message: "Please enter diagnosis" },
                      ]}
                    >
                      <TextArea rows={3} placeholder="Example: Tooth pain" />
                    </Form.Item>

                    <Form.Item
                      label="What treatment was done?"
                      name="treatment_performed"
                      rules={[
                        {
                          required: true,
                          message: "Please enter treatment performed",
                        },
                      ]}
                    >
                      <TextArea
                        rows={3}
                        placeholder="Example: Cleaning, filling, extraction"
                      />
                    </Form.Item>

                    <Form.Item
                      label="Medicine / Prescription"
                      name="prescription"
                    >
                      <TextArea rows={3} placeholder="Optional" />
                    </Form.Item>

                    <Form.Item label="Dentist Notes" name="doctor_notes">
                      <TextArea rows={3} placeholder="Optional" />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Next Visit Date"
                          name="next_appointment_date"
                        >
                          <Input type="date" />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Treatment Date"
                          name="treatment_date"
                          rules={[
                            {
                              required: true,
                              message: "Please select treatment date",
                            },
                          ]}
                        >
                          <Input type="date" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={treatmentLoading}
                      style={pageStyles.bigButton}
                    >
                      Save Treatment
                    </Button>
                  </Form>
                )}
              </Card>

              <Card
                style={pageStyles.softCard}
                title={
                  <div style={pageStyles.sectionHeader}>
                    <div style={pageStyles.iconCircle}>
                      <CreditCardOutlined />
                    </div>
                    <div>
                      <div>Payment</div>
                      <Text type="secondary" style={{ fontWeight: 400 }}>
                        Add the payment after the treatment is finished.
                      </Text>
                    </div>
                  </div>
                }
                extra={
                  paymentFinished ? (
                    <Tag color="green">Payment Saved</Tag>
                  ) : canEnterPayment ? (
                    <Tag color="orange">Need Payment</Tag>
                  ) : (
                    <Tag color="orange">Not Yet</Tag>
                  )
                }
              >
                {!paymentFinished && !canEnterPayment && (
                  <Alert
                    type="info"
                    showIcon
                    message="Payment can be added after treatment is saved."
                  />
                )}

                {paymentFinished && (
                  <Alert
                    type="success"
                    showIcon
                    message="Payment has been saved for this patient visit."
                  />
                )}

                {canEnterPayment && (
                  <Form
                    layout="vertical"
                    form={paymentForm}
                    onFinish={handlePaymentSubmit}
                  >
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Treatment ID" name="treatment_id">
                          <Input readOnly />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Total Treatment Charge"
                          name="treatment_charge"
                          rules={[
                            {
                              required: true,
                              message: "Please enter treatment charge",
                            },
                          ]}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            min={1}
                            placeholder="Example: 5000"
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Amount Paid Now"
                          name="payment_amount"
                          rules={[
                            {
                              required: true,
                              message: "Please enter payment amount",
                            },
                          ]}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            min={1}
                            placeholder="Example: 5000"
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Payment Type"
                          name="payment_method"
                          rules={[
                            {
                              required: true,
                              message: "Please select payment method",
                            },
                          ]}
                        >
                          <Select
                            options={[
                              { value: "Cash", label: "Cash" },
                              { value: "Card", label: "Card" },
                              {
                                value: "Bank Transfer",
                                label: "Bank Transfer",
                              },
                              {
                                value: "Online Payment",
                                label: "Online Payment",
                              },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item label="Receipt Number" name="receipt_number">
                      <Input placeholder="Optional receipt number" />
                    </Form.Item>

                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={paymentLoading}
                      style={pageStyles.bigButton}
                    >
                      Save Payment
                    </Button>
                  </Form>
                )}
              </Card>

              <Card style={pageStyles.softCard} title="Visit Details">
                <Descriptions bordered column={{ xs: 1, md: 2 }}>
                  <Descriptions.Item label="Appointment ID">
                    {appointment.appointment_id}
                  </Descriptions.Item>
                  <Descriptions.Item label="Date">
                    {appointment.appointment_date}
                  </Descriptions.Item>
                  <Descriptions.Item label="Time">
                    {appointment.appointment_time}
                  </Descriptions.Item>
                  <Descriptions.Item label="Dentist">
                    {appointment.dentist_name || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Reason for Visit" span={2}>
                    {appointment.reason_for_visit || "-"}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Space>
          </Col>

          <Col xs={24} lg={8}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <Card
                style={pageStyles.softCard}
                title={
                  <div style={pageStyles.sectionHeader}>
                    <div style={pageStyles.iconCircle}>
                      <SmileOutlined />
                    </div>
                    <div>
                      <div>What to do now?</div>
                      <Text type="secondary" style={{ fontWeight: 400 }}>
                        Follow this simple next step.
                      </Text>
                    </div>
                  </div>
                }
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  {nextStatus === "In Treatment" && (
                    <Alert
                      type="info"
                      showIcon
                      message="Only one patient can be inside treatment for this date."
                    />
                  )}

                  {appointment.status === "In Treatment" &&
                  !appointment.treatment_id ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="Please save treatment details before moving forward."
                    />
                  ) : paymentRequired ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="Please save the payment. The status will update automatically."
                    />
                  ) : nextStatus ? (
                    <Button
                      type="primary"
                      block
                      size="large"
                      loading={updatingStatus === nextStatus}
                      onClick={() => handleStatusUpdate(nextStatus)}
                      style={pageStyles.bigButton}
                    >
                      {getNextActionText(appointment.status)}
                    </Button>
                  ) : (
                    <Alert
                      type="success"
                      showIcon
                      message="This patient visit is finished."
                    />
                  )}

                  {appointment.status !== "Cancelled" &&
                    appointment.status !== "Completed" && (
                      <Button
                        danger
                        block
                        size="large"
                        icon={<CloseCircleOutlined />}
                        loading={updatingStatus === "Cancelled"}
                        onClick={() => handleStatusUpdate("Cancelled")}
                        style={pageStyles.bigButton}
                      >
                        Cancel Visit
                      </Button>
                    )}

                  {appointment.status === "Paid" && (
                    <Button
                      type="primary"
                      block
                      size="large"
                      icon={<CheckCircleOutlined />}
                      loading={updatingStatus === "Completed"}
                      onClick={() => handleStatusUpdate("Completed")}
                      style={pageStyles.bigButton}
                    >
                      Patient Left / Finish Visit
                    </Button>
                  )}
                </Space>
              </Card>

              <Card style={pageStyles.softCard} title="Visit Progress">
                <Steps
                  direction="vertical"
                  current={currentStepIndex}
                  items={statusSteps.map((step) => ({
                    title:
                      step === "Confirmed"
                        ? "Ready"
                        : step === "Checked In"
                          ? "Arrived"
                          : step === "In Treatment"
                            ? "With Dentist"
                            : step === "Treatment Done"
                              ? "Treatment Finished"
                              : step === "Payment Pending"
                                ? "Need Payment"
                                : step === "Paid"
                                  ? "Payment Done"
                                  : "Visit Finished",
                    description:
                      step === "Confirmed"
                        ? "Appointment is confirmed"
                        : step === "Checked In"
                          ? "Patient came to clinic"
                          : step === "In Treatment"
                            ? "Dentist is treating patient"
                            : step === "Treatment Done"
                              ? "Treatment details saved"
                              : step === "Payment Pending"
                                ? "Waiting for payment"
                                : step === "Paid"
                                  ? "Payment saved"
                                  : "Patient left the clinic",
                  }))}
                />
              </Card>
            </Space>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default ManageAppointment;
