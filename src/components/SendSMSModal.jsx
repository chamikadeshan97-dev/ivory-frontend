// components/SendSMSModal.jsx

import React, { useEffect, useState } from "react";

import {
  Button,
  Input,
  Modal,
  Space,
  Typography,
  message,
} from "antd";

import {
  MessageOutlined,
  SendOutlined,
} from "@ant-design/icons";

import { sendSMS } from "../api/endPoints";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const SendSMSModal = ({
  open,
  onClose,
  mobile,
  patientName,
  defaultMessage,
  title = "Send SMS",
  onSuccess,
}) => {
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setMessageText(defaultMessage || "");
    }
  }, [open, defaultMessage]);

  const handleSend = async () => {
    if (!mobile) {
      message.error("Patient mobile number is not available");
      return;
    }

    if (!messageText.trim()) {
      message.error("SMS message cannot be empty");
      return;
    }

    try {
      setSending(true);

      await sendSMS({
        mobile,
        message: messageText.trim(),
      });

      message.success("SMS sent successfully");

      onSuccess?.();

      onClose();
    } catch (error) {
      console.error("SMS sending failed:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to send SMS",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <MessageOutlined />
          {title}
        </Space>
      }
      onCancel={onClose}
      footer={[
        <Button
          key="cancel"
          onClick={onClose}
          disabled={sending}
        >
          Cancel
        </Button>,

        <Button
          key="send"
          type="primary"
          icon={<SendOutlined />}
          loading={sending}
          onClick={handleSend}
        >
          Send SMS
        </Button>,
      ]}
      width={600}
      destroyOnClose
    >
      <Space
        direction="vertical"
        size={16}
        style={{ width: "100%" }}
      >
        <div>
          <Text type="secondary">Patient</Text>

          <div>
            <Text strong>
              {patientName || "Unknown Patient"}
            </Text>
          </div>
        </div>

        <div>
          <Text type="secondary">Mobile Number</Text>

          <div>
            <Text strong>
              {mobile || "Not available"}
            </Text>
          </div>
        </div>

        <div>
          <Text strong>SMS Message</Text>

          <TextArea
            style={{ marginTop: 8 }}
            value={messageText}
            onChange={(event) =>
              setMessageText(event.target.value)
            }
            rows={7}
            maxLength={1000}
            showCount
            placeholder="Enter SMS message..."
          />
        </div>

        <Paragraph
          type="secondary"
          style={{ marginBottom: 0 }}
        >
          You can edit the generated message before sending.
        </Paragraph>
      </Space>
    </Modal>
  );
};

export default SendSMSModal;