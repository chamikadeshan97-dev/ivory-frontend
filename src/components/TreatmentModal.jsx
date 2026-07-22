import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  ExclamationCircleFilled,
  MedicineBoxOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Text, Title } = Typography;

const COMMON_TREATMENT_AMOUNTS = [500, 1000, 2000, 5000, 10000];

const NEXT_APPOINTMENT_OPTIONS = [
  {
    key: "3-days",
    label: "3 Days",
    days: 3,
  },
  {
    key: "5-days",
    label: "5 Days",
    days: 5,
  },
  {
    key: "10-days",
    label: "10 Days",
    days: 10,
  },
  {
    key: "15-days",
    label: "15 Days",
    days: 15,
  },
  {
    key: "1-week",
    label: "1 Week",
    days: 7,
  },
  {
    key: "2-weeks",
    label: "2 Weeks",
    days: 14,
  },
];

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

const TreatmentModal = ({ open, loading, appointment, onCancel, onSubmit }) => {
  const [form] = Form.useForm();

  const [selectedNextOption, setSelectedNextOption] = useState(null);

  const treatmentDate = Form.useWatch("treatment_date", form);

  const nextAppointmentDate = Form.useWatch("next_appointment_date", form);

  const treatmentFee = Number(Form.useWatch("treatment_fee", form) || 0);

  const hasAllergies = convertToBoolean(
    appointment?.is_allergies ?? appointment?.has_allergies,
  );

  const allergyDetails =
    appointment?.allergies || appointment?.allergy_details || "";

  const appointmentDate =
    appointment?.appointment_date || appointment?.date || "";

  const appointmentTime =
    appointment?.appointment_time || appointment?.time || "";

  useEffect(() => {
    if (!open || !appointment) {
      return;
    }

    setSelectedNextOption(null);

    form.setFieldsValue({
      treatment_date: dayjs(),
      next_appointment_date: null,
      doctor_notes: "",
      treatment_fee: null,
      prescription: "",
    });
  }, [open, appointment, form]);

  useEffect(() => {
    if (!treatmentDate || !selectedNextOption) {
      return;
    }

    if (selectedNextOption === "custom") {
      return;
    }

    const selectedOption = NEXT_APPOINTMENT_OPTIONS.find(
      (option) => option.key === selectedNextOption,
    );

    if (!selectedOption) {
      return;
    }

    form.setFieldValue(
      "next_appointment_date",
      dayjs(treatmentDate).add(selectedOption.days, "day"),
    );
  }, [treatmentDate, selectedNextOption, form]);

  const setTreatmentFee = (amount) => {
    form.setFieldValue("treatment_fee", amount);
    form.validateFields(["treatment_fee"]);
  };

  const handleNextAppointmentOption = (option) => {
    setSelectedNextOption(option.key);

    const baseDate = treatmentDate || dayjs();

    form.setFieldValue(
      "next_appointment_date",
      dayjs(baseDate).add(option.days, "day"),
    );
  };

  const handleCustomDate = () => {
    setSelectedNextOption("custom");

    form.setFieldValue("next_appointment_date", null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const treatmentData = {
        patient_id: appointment?.patient_id || "",

        appointment_id: appointment?.appointment_id || appointment?.id || "",

        dentist_id: appointment?.dentist_id || "",

        treatment_date: values.treatment_date.format("YYYY-MM-DD"),

        next_appointment_date: values.next_appointment_date
          ? values.next_appointment_date.format("YYYY-MM-DD")
          : "",

        doctor_notes: values.doctor_notes?.trim() || "",

        treatment_fee: Number(values.treatment_fee),

        prescription: values.prescription?.trim() || "",
      };

      await onSubmit(treatmentData);

      form.resetFields();
      setSelectedNextOption(null);
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error("Treatment submission failed:", error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedNextOption(null);
    onCancel();
  };

  return (
    <Modal
      title={
        <Space wrap>
          <MedicineBoxOutlined />

          <span>Treatment Details</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      centered
      width={900}
      destroyOnHidden
      maskClosable={!loading}
      closable={!loading}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>,

        <Button
          key="save"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
        >
          Save Treatment
        </Button>,
      ]}
    >
<div
  style={{
    marginBottom: 20,
    padding: 18,
    border: hasAllergies
      ? "1px solid #ff7875"
      : "1px solid #d6e4ff",
    borderLeft: hasAllergies
      ? "6px solid #ff4d4f"
      : "6px solid #1677ff",
    borderRadius: 10,
    background: hasAllergies
      ? "#fff2f0"
      : "#f0f5ff",
    transition: "all 0.2s ease",
  }}
>
  <Row gutter={[24, 18]} align="middle">
    {/* Left side: Patient details */}
    <Col xs={24} md={hasAllergies ? 12 : 24}>
      <Space align="start" size={12}>
        <div
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            background: hasAllergies
              ? "#ff4d4f"
              : "#1677ff",
            color: "#ffffff",
            fontSize: 19,
          }}
        >
          <UserOutlined />
        </div>

        <div style={{ flex: 1 }}>
          <Text
            strong
            style={{
              display: "block",
              fontSize: 16,
              color: "#262626",
            }}
          >
            {appointment?.patient_name || "Unknown Patient"}
          </Text>

          <Text type="secondary">
            Patient ID: {appointment?.patient_id || "-"}
          </Text>

          <br />

          <Text type="secondary">
            Dentist:{" "}
            {appointment?.dentist_name ||
              appointment?.dentist_id ||
              "-"}
          </Text>
        </div>
      </Space>
    </Col>

    {/* Right side: Only show when allergies exist */}
    {hasAllergies && (
      <Col xs={24} md={12}>
        <div
          style={{
            minHeight: 76,
            display: "flex",
            alignItems: "center",
            paddingLeft: 20,
            borderLeft: "3px solid #ff4d4f",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <Text
              strong
              style={{
                display: "block",
                marginBottom: 4,
                color: "#cf1322",
                fontSize: 15,
              }}
            >
              Allergy Alert
            </Text>

            <Text
              style={{
                display: "block",
                color: "#a8071a",
                fontWeight: 500,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {allergyDetails ||
                "Allergy details not provided"}
            </Text>
          </div>
        </div>
      </Col>
    )}
  </Row>
</div>
      {/* Allergy information */}

      {!hasAllergies && (
        <Alert
          type="success"
          showIcon
          message="No known allergies recorded"
          style={{
            marginBottom: 22,
            borderRadius: 10,
          }}
        />
      )}

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          label="Treatment Date"
          name="treatment_date"
          hidden={true}
          rules={[
            {
              required: true,
              message: "Please select the treatment date",
            },
          ]}
        >
          <DatePicker
            format="YYYY-MM-DD"
            style={{
              width: "100%",
            }}
          />
        </Form.Item>

        {/* Fee and next appointment section */}

        <Row gutter={[20, 20]}>
          {/* Left side: Treatment fee */}

          <Col xs={24} md={12}>
            <div
              style={{
                height: "100%",
                padding: 16,
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                background: "#f8fafc",
              }}
            >
              <Title
                level={5}
                style={{
                  marginTop: 0,
                  marginBottom: 16,
                }}
              >
                Treatment Fee
              </Title>

              <Form.Item
                name="treatment_fee"
                rules={[
                  {
                    required: true,
                    message: "Please enter the treatment fee",
                  },
                  {
                    type: "number",
                    min: 1,
                    message: "Treatment fee must be greater than 0",
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  precision={2}
                  prefix="Rs."
                  placeholder="Enter treatment fee"
                  formatter={(value) =>
                    value
                      ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      : ""
                  }
                  parser={(value) => (value ? value.replace(/,/g, "") : "")}
                  style={{
                    width: "100%",
                    height: 42,
                  }}
                />
              </Form.Item>

              <Text strong>Common Amounts</Text>

              <Space
                wrap
                size={[8, 8]}
                style={{
                  display: "flex",
                  marginTop: 10,
                }}
              >
                {COMMON_TREATMENT_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    htmlType="button"
                    size="small"
                    type={treatmentFee === amount ? "primary" : "default"}
                    onClick={() => setTreatmentFee(amount)}
                  >
                    Rs. {amount.toLocaleString()}
                  </Button>
                ))}
              </Space>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div
              style={{
                height: "100%",
                padding: 16,
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                background: "#f8fafc",
              }}
            >
              <Title
                level={5}
                style={{
                  marginTop: 0,
                  marginBottom: 16,
                }}
              >
                Next Appointment
              </Title>

              <Space wrap size={[8, 8]}>
                {NEXT_APPOINTMENT_OPTIONS.map((option) => (
                  <Button
                    key={option.key}
                    htmlType="button"
                    size="small"
                    type={
                      selectedNextOption === option.key ? "primary" : "default"
                    }
                    onClick={() => handleNextAppointmentOption(option)}
                  >
                    {option.label}
                  </Button>
                ))}

                <Button
                  htmlType="button"
                  size="small"
                  type={selectedNextOption === "custom" ? "primary" : "default"}
                  onClick={handleCustomDate}
                >
                  Custom Date
                </Button>
              </Space>

              {selectedNextOption === "custom" && (
                <Form.Item
                  name="next_appointment_date"
                  style={{
                    marginTop: 16,
                    marginBottom: 0,
                  }}
                  rules={[
                    {
                      required: true,
                      message: "Please select the custom appointment date",
                    },
                  ]}
                >
                  <DatePicker
                    format="YYYY-MM-DD"
                    placeholder="Select custom appointment date"
                    style={{
                      width: "100%",
                    }}
                    disabledDate={(current) => {
                      const minimumDate = treatmentDate
                        ? dayjs(treatmentDate).startOf("day")
                        : dayjs().startOf("day");

                      return current && current.startOf("day") <= minimumDate;
                    }}
                  />
                </Form.Item>
              )}

              {selectedNextOption &&
                selectedNextOption !== "custom" &&
                nextAppointmentDate && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: "12px 14px",
                      border: "1px solid #b7eb8f",
                      borderRadius: 8,
                      background: "#f6ffed",
                    }}
                  >
                    <Text
                      type="secondary"
                      style={{
                        display: "block",
                        marginBottom: 2,
                      }}
                    >
                      Selected next appointment
                    </Text>

                    <Text
                      strong
                      style={{
                        color: "#389e0d",
                      }}
                    >
                      {dayjs(nextAppointmentDate).format("DD MMMM YYYY")}
                    </Text>
                  </div>
                )}

              {!selectedNextOption && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 14px",
                    border: "1px dashed #d9d9d9",
                    borderRadius: 8,
                    background: "#ffffff",
                  }}
                >
                  <Text type="secondary">Next appointment is optional.</Text>
                </div>
              )}

              {selectedNextOption !== "custom" && (
                <Form.Item name="next_appointment_date" hidden>
                  <DatePicker />
                </Form.Item>
              )}
            </div>
          </Col>
        </Row>
        <Divider />
        <Row gutter={[20, 20]}>
          <Col xs={24} md={12}>
            <Form.Item label="Prescription" name="prescription">
              <Input.TextArea
                rows={3}
                placeholder="Enter medicines, dosage and instructions"
                maxLength={1000}
                showCount
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Doctor Notes" name="doctor_notes">
              <Input.TextArea
                rows={4}
                placeholder="Enter treatment details and doctor notes"
                maxLength={1}
                showCount
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default TreatmentModal;
