import React, { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Row,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";

import {
  CheckCircleOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  MessageOutlined,
  MobileOutlined,
  ReloadOutlined,
  SendOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import { sendSMS } from "../api/endPoints";

import "./css/SMSManagement.css";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "dental_sms_templates";
const SMS_HISTORY_KEY = "dental_sms_test_history";

/* =========================================================
   DEFAULT SMS TEMPLATES
========================================================= */

const DEFAULT_TEMPLATES = {
  doctorArrival: {
    key: "doctorArrival",
    title: "Doctor Arrival SMS",
    description:
      "Sent when the doctor arrives and patients should remain available.",
    enabled: true,

    message:
      "Dear {{patientName}}, the doctor has arrived at Dental CAD/CAM Laboratory. " +
      "Your queue number is #{{appointmentNumber}}. " +
      "Please remain available at the clinic. Thank you.",

    variables: ["patientName", "appointmentNumber"],
  },

  appointmentDetails: {
    key: "appointmentDetails",
    title: "Appointment Confirmation",
    description:
      "Sent when an appointment is created or confirmed for a patient.",
    enabled: true,

    message:
      "Dear {{patientName}}, your appointment at Dental CAD/CAM Laboratory is confirmed for " +
      "{{date}} at {{time}}. " +
      "Appointment No: #{{appointmentNumber}}. " +
      "Treatment: {{reason}}. Thank you.",

    variables: ["patientName", "date", "time", "appointmentNumber", "reason"],
  },

  eBill: {
    key: "eBill",
    title: "E-Bill / Payment SMS",
    description:
      "Sent after receiving a payment or when providing an electronic bill.",
    enabled: true,

    message:
      "Dear {{patientName}}, payment received for your treatment at Dental CAD/CAM Laboratory. " +
      "Total: Rs. {{total}}. " +
      "Paid: Rs. {{paid}}. " +
      "Balance: Rs. {{balance}}. " +
      "E-Bill: {{billLink}}. Thank you.",

    variables: ["patientName", "total", "paid", "balance", "billLink"],
  },
};

/* =========================================================
   SAMPLE VALUES
========================================================= */

const SAMPLE_VALUES = {
  patientName: "Nimal Perera",
  appointmentNumber: "12",
  date: dayjs().format("YYYY-MM-DD"),
  time: "04:00 PM",
  reason: "Dental Cleaning",
  total: "8,500.00",
  paid: "5,000.00",
  balance: "3,500.00",
  billLink: "https://clinic.lk/bill/12345",
};

/* =========================================================
   HELPERS
========================================================= */

const replaceVariables = (template, values = {}) => {
  if (!template) return "";

  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const variableName = String(key || "").trim();

    return values[variableName] ?? `{{${variableName}}}`;
  });
};

const calculateSmsParts = (text = "") => {
  const length = text.length;

  if (length === 0) {
    return {
      characters: 0,
      parts: 0,
    };
  }

  if (length <= 160) {
    return {
      characters: length,
      parts: 1,
    };
  }

  return {
    characters: length,
    parts: Math.ceil(length / 153),
  };
};

const getHistory = () => {
  try {
    const saved = localStorage.getItem(SMS_HISTORY_KEY);

    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

/* =========================================================
   COMPONENT
========================================================= */

const SMSManagement = () => {
  const [messageApi, contextHolder] = message.useMessage();

  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);

  const [editingTemplate, setEditingTemplate] = useState(null);

  const [previewTemplate, setPreviewTemplate] = useState(null);

  const [testTemplate, setTestTemplate] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const [testModalOpen, setTestModalOpen] = useState(false);

  const [sending, setSending] = useState(false);

  const [history, setHistory] = useState([]);

  const [editForm] = Form.useForm();

  const [testForm] = Form.useForm();

  /* =========================================================
     LOAD SETTINGS
  ========================================================= */

  useEffect(() => {
    try {
      const savedTemplates = localStorage.getItem(STORAGE_KEY);

      if (savedTemplates) {
        const parsedTemplates = JSON.parse(savedTemplates);

        setTemplates({
          ...DEFAULT_TEMPLATES,
          ...parsedTemplates,
        });
      }

      setHistory(getHistory());
    } catch (error) {
      console.error("Failed to load SMS settings:", error);
    }
  }, []);

  /* =========================================================
     STATISTICS
  ========================================================= */

  const templateList = useMemo(() => Object.values(templates), [templates]);

  const enabledCount = useMemo(
    () => templateList.filter((item) => item.enabled).length,
    [templateList],
  );

  const disabledCount = templateList.length - enabledCount;

  /* =========================================================
     SAVE LOCAL SETTINGS
  ========================================================= */

  const saveTemplates = (nextTemplates) => {
    setTemplates(nextTemplates);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTemplates));
  };

  /* =========================================================
     ENABLE / DISABLE
  ========================================================= */

  const handleToggleTemplate = (templateKey, checked) => {
    const nextTemplates = {
      ...templates,

      [templateKey]: {
        ...templates[templateKey],
        enabled: checked,
      },
    };

    saveTemplates(nextTemplates);

    messageApi.success(
      checked ? "SMS template enabled" : "SMS template disabled",
    );
  };

  /* =========================================================
     EDIT
  ========================================================= */

  const openEditModal = (template) => {
    setEditingTemplate(template);

    editForm.setFieldsValue({
      title: template.title,
      message: template.message,
    });

    setEditModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      const values = await editForm.validateFields();

      if (!editingTemplate?.key) {
        return;
      }

      const nextTemplates = {
        ...templates,

        [editingTemplate.key]: {
          ...templates[editingTemplate.key],

          title: String(values.title || "").trim(),

          message: String(values.message || "").trim(),
        },
      };

      saveTemplates(nextTemplates);

      setEditModalOpen(false);
      setEditingTemplate(null);

      messageApi.success("SMS template updated successfully");
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error(error);

      messageApi.error("Failed to update SMS template");
    }
  };

  /* =========================================================
     RESET
  ========================================================= */

  const handleResetTemplate = (templateKey) => {
    Modal.confirm({
      title: "Reset SMS Template?",

      content:
        "This will replace your current message with the original default template.",

      okText: "Reset",

      onOk: () => {
        const nextTemplates = {
          ...templates,

          [templateKey]: {
            ...DEFAULT_TEMPLATES[templateKey],

            enabled: templates[templateKey]?.enabled ?? true,
          },
        };

        saveTemplates(nextTemplates);

        messageApi.success("Template restored");
      },
    });
  };

  /* =========================================================
     PREVIEW
  ========================================================= */

  const openPreviewModal = (template) => {
    setPreviewTemplate(template);
    setPreviewModalOpen(true);
  };

  const previewMessage = previewTemplate
    ? replaceVariables(previewTemplate.message, SAMPLE_VALUES)
    : "";

  const previewStats = calculateSmsParts(previewMessage);

  /* =========================================================
     TEST SMS
  ========================================================= */

  const openTestModal = (template) => {
    setTestTemplate(template);

    testForm.resetFields();

    setTestModalOpen(true);
  };

  const testMessage = useMemo(() => {
    if (!testTemplate) return "";

    return replaceVariables(testTemplate.message, SAMPLE_VALUES);
  }, [testTemplate]);

  const handleSendTestSMS = async () => {
    try {
      const values = await testForm.validateFields();

      if (!testTemplate) {
        return;
      }

      setSending(true);

      const payload = {
        number: String(values.mobile || "").trim(),

        content: testMessage,

        type: testTemplate.key,
      };
      console.log(payload);

      const response = await sendSMS(payload);

      const historyItem = {
        id: Date.now(),

        date: dayjs().format("YYYY-MM-DD HH:mm:ss"),

        mobile: payload.mobile,

        template: testTemplate.title,

        message: testMessage,

        status: "Sent",

        response: response?.message || "SMS request completed successfully",
      };

      const nextHistory = [historyItem, ...history].slice(0, 50);

      setHistory(nextHistory);

      localStorage.setItem(SMS_HISTORY_KEY, JSON.stringify(nextHistory));

      messageApi.success("Test SMS sent successfully");

      setTestModalOpen(false);
      testForm.resetFields();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error("Failed to send SMS:", error);

      messageApi.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to send SMS",
      );
    } finally {
      setSending(false);
    }
  };

  /* =========================================================
     HISTORY TABLE
  ========================================================= */

  const historyColumns = [
    {
      title: "Date / Time",
      dataIndex: "date",
      key: "date",
      width: 180,
    },

    {
      title: "Mobile",
      dataIndex: "mobile",
      key: "mobile",
      width: 140,
    },

    {
      title: "Template",
      dataIndex: "template",
      key: "template",
      width: 220,
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,

      render: (status) => <Tag color="green">{status}</Tag>,
    },

    {
      title: "Message",
      dataIndex: "message",
      key: "message",

      ellipsis: true,

      render: (value) => (
        <Tooltip title={value}>
          <span>{value}</span>
        </Tooltip>
      ),
    },
  ];

  /* =========================================================
     UI
  ========================================================= */

  return (
    <>
      {contextHolder}

      <div className="sms-management-page">
        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="sms-page-header">
          <div>
            <Space>
              <div className="sms-header-icon">
                <MessageOutlined />
              </div>

              <div>
                <Title level={2} className="sms-page-title">
                  SMS Management
                </Title>

                <Text type="secondary">
                  Manage patient SMS templates and test outgoing messages.
                </Text>
              </div>
            </Space>
          </div>
        </div>

        {/* =====================================================
            STATISTICS
        ====================================================== */}

        <Row gutter={[16, 16]} className="sms-statistics-row">
          <Col xs={24} sm={12} lg={6}>
            <Card className="sms-stat-card">
              <Statistic
                title="SMS Templates"
                value={templateList.length}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="sms-stat-card">
              <Statistic
                title="Enabled"
                value={enabledCount}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="sms-stat-card">
              <Statistic
                title="Disabled"
                value={disabledCount}
                prefix={<SettingOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="sms-stat-card">
              <Statistic
                title="Test SMS Sent"
                value={history.length}
                prefix={<SendOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* =====================================================
            INFO
        ====================================================== */}

        <Alert
          className="sms-info-alert"
          type="info"
          showIcon
          message="SMS Template Management"
          description={
            <>
              Use variables such as <Text code>{"{{patientName}}"}</Text> and{" "}
              <Text code>{"{{appointmentNumber}}"}</Text>. They will
              automatically be replaced with actual patient details before
              sending.
            </>
          }
        />

        {/* =====================================================
            TEMPLATE CARDS
        ====================================================== */}

        <div className="sms-section-header">
          <div>
            <Title level={4}>Message Templates</Title>

            <Text type="secondary">Configure messages used by the clinic.</Text>
          </div>
        </div>

        <Row gutter={[18, 18]}>
          {templateList.map((template) => {
            const stats = calculateSmsParts(template.message);

            return (
              <Col xs={24} md={12} xl={8} key={template.key}>
                <Card
                  className={
                    template.enabled
                      ? "sms-template-card"
                      : "sms-template-card sms-template-disabled"
                  }
                >
                  <div className="sms-template-card-header">
                    <div className="sms-template-icon">
                      <MessageOutlined />
                    </div>

                    <Switch
                      checked={template.enabled}
                      onChange={(checked) =>
                        handleToggleTemplate(template.key, checked)
                      }
                    />
                  </div>

                  <Title level={4} className="sms-template-title">
                    {template.title}
                  </Title>

                  <Paragraph
                    type="secondary"
                    className="sms-template-description"
                  >
                    {template.description}
                  </Paragraph>

                  <div className="sms-message-preview">{template.message}</div>

                  <div className="sms-template-meta">
                    <Space wrap>
                      <Tag>{stats.characters} Characters</Tag>

                      <Tag>
                        ~{stats.parts} SMS
                        {stats.parts === 1 ? "" : " Parts"}
                      </Tag>

                      {template.enabled ? (
                        <Tag color="green">Enabled</Tag>
                      ) : (
                        <Tag color="default">Disabled</Tag>
                      )}
                    </Space>
                  </div>

                  <div className="sms-variable-area">
                    <Text type="secondary" className="sms-variable-label">
                      Variables
                    </Text>

                    <Space wrap>
                      {template.variables.map((variable) => (
                        <Tag key={variable}>{`{{${variable}}}`}</Tag>
                      ))}
                    </Space>
                  </div>

                  <div className="sms-card-actions">
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => openEditModal(template)}
                    >
                      Edit
                    </Button>

                    <Button
                      icon={<EyeOutlined />}
                      onClick={() => openPreviewModal(template)}
                    >
                      Preview
                    </Button>

                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      disabled={!template.enabled}
                      onClick={() => openTestModal(template)}
                    >
                      Test
                    </Button>

                    <Tooltip title="Restore default message">
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => handleResetTemplate(template.key)}
                      />
                    </Tooltip>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>

        {/* =====================================================
            HISTORY
        ====================================================== */}

        <Card
          className="sms-history-card"
          title={
            <Space>
              <MobileOutlined />

              <span>Recent Test SMS</span>
            </Space>
          }
        >
          {history.length ? (
            <Table
              rowKey="id"
              columns={historyColumns}
              dataSource={history}
              pagination={{
                pageSize: 5,
                showSizeChanger: false,
              }}
              scroll={{
                x: 850,
              }}
            />
          ) : (
            <Empty description="No test SMS sent yet" />
          )}
        </Card>

        {/* =====================================================
            EDIT MODAL
        ====================================================== */}

        <Modal
          title="Edit SMS Template"
          open={editModalOpen}
          onCancel={() => {
            setEditModalOpen(false);
            setEditingTemplate(null);
          }}
          onOk={handleSaveTemplate}
          okText="Save Template"
          width={720}
        >
          <Form form={editForm} layout="vertical">
            <Form.Item
              label="Template Name"
              name="title"
              rules={[
                {
                  required: true,
                  message: "Please enter the template name",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="SMS Message"
              name="message"
              rules={[
                {
                  required: true,
                  message: "Please enter the SMS message",
                },
              ]}
            >
              <TextArea rows={8} showCount maxLength={1000} />
            </Form.Item>

            {editingTemplate && (
              <>
                <Text type="secondary">Available variables</Text>

                <div className="sms-modal-variables">
                  <Space wrap>
                    {editingTemplate.variables.map((variable) => (
                      <Tag key={variable}>{`{{${variable}}}`}</Tag>
                    ))}
                  </Space>
                </div>
              </>
            )}
          </Form>
        </Modal>

        {/* =====================================================
            PREVIEW MODAL
        ====================================================== */}

        <Modal
          title="SMS Preview"
          open={previewModalOpen}
          footer={[
            <Button key="close" onClick={() => setPreviewModalOpen(false)}>
              Close
            </Button>,
          ]}
          onCancel={() => setPreviewModalOpen(false)}
          width={620}
        >
          {previewTemplate && (
            <>
              <div className="sms-phone-preview">
                <div className="sms-phone-header">
                  Dental CAD/CAM Laboratory
                </div>

                <div className="sms-phone-content">
                  <div className="sms-message-bubble">{previewMessage}</div>
                </div>
              </div>

              <div className="sms-preview-stats">
                <Tag>{previewStats.characters} Characters</Tag>

                <Tag>
                  Estimated {previewStats.parts} SMS
                  {previewStats.parts === 1 ? "" : " Parts"}
                </Tag>
              </div>
            </>
          )}
        </Modal>

        {/* =====================================================
            TEST SMS MODAL
        ====================================================== */}

        <Modal
          title="Send Test SMS"
          open={testModalOpen}
          onCancel={() => {
            setTestModalOpen(false);
            testForm.resetFields();
          }}
          onOk={handleSendTestSMS}
          okText="Send SMS"
          confirmLoading={sending}
          okButtonProps={{
            icon: <SendOutlined />,
          }}
          width={650}
        >
          {testTemplate && (
            <>
              <Alert
                type="warning"
                showIcon
                message="Test SMS"
                description="This sends an actual SMS through your configured SMS provider."
                className="sms-test-alert"
              />

              <Form form={testForm} layout="vertical">
                <Form.Item
                  label="Mobile Number"
                  name="mobile"
                  rules={[
                    {
                      required: true,
                      message: "Please enter a mobile number",
                    },

                    {
                      pattern: /^(?:\+94|94|0)?7\d{8}$/,
                      message: "Enter a valid Sri Lankan mobile number",
                    },
                  ]}
                >
                  <Input
                    prefix={<MobileOutlined />}
                    placeholder="0771234567"
                    maxLength={12}
                  />
                </Form.Item>
              </Form>

              <Text strong>Message Preview</Text>

              <div className="sms-test-message">{testMessage}</div>

              <Text type="secondary">
                Sample patient values are used for this test message.
              </Text>
            </>
          )}
        </Modal>
      </div>
    </>
  );
};

export default SMSManagement;
