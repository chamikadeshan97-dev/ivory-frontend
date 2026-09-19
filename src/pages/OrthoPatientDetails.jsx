// src/pages/OrthoPatientDetails.jsx

import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";

import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  InboxOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { useNavigate, useParams } from "react-router-dom";

import dayjs from "dayjs";

import {
  createOrthoPayment,
  createOrthoVisit,
  deleteOrthoMedia,
  downloadOrthoMedia,
  getOrthoCaseSummary,
  getOrthoMediaViewUrl,
  uploadOrthoMedia,
} from "../api/endPoints";

import "./css/OrthoPatientDetails.css";

const { Title, Text, Paragraph } = Typography;

/* ========================================================
   CONFIG
======================================================== */

const MAX_MEDIA_FILES = 10;

const MAX_MEDIA_SIZE_MB = 10;

const ALLOWED_MEDIA_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
  "pdf",
];

/* ========================================================
   HELPERS
======================================================== */

const clean = (value) => String(value ?? "").trim();

const normalize = (value) => clean(value).toLowerCase();

const numberValue = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const formatMoney = (value) =>
  `Rs. ${numberValue(value).toLocaleString("en-LK")}`;

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = dayjs(value);

  if (!parsed.isValid()) {
    return value;
  }

  return parsed.format("DD/MM/YYYY");
};

const getStatusColor = (status) => {
  switch (normalize(status)) {
    case "active":
      return "green";

    case "completed":
      return "blue";

    case "on hold":
      return "orange";

    case "cancelled":
      return "red";

    default:
      return "default";
  }
};

const getMediaColor = (type) => {
  switch (normalize(type)) {
    case "clinical photo":
      return "blue";

    case "x-ray":
      return "purple";

    case "document":
      return "orange";

    case "scan":
      return "cyan";

    default:
      return "default";
  }
};

const getFileExtension = (fileName) => {
  const value = clean(fileName);

  if (!value.includes(".")) {
    return "";
  }

  return value.split(".").pop().toLowerCase();
};

const isAllowedMediaFile = (file) => {
  const extension = getFileExtension(file?.name);

  return ALLOWED_MEDIA_EXTENSIONS.includes(extension);
};

const isAllowedMediaSize = (file) => {
  if (!file?.size) {
    return true;
  }

  const sizeMb = file.size / 1024 / 1024;

  return sizeMb <= MAX_MEDIA_SIZE_MB;
};

const isPdfMedia = (record) => {
  const mimeType = normalize(record?.mime_type);

  const extension = getFileExtension(record?.file_name);

  return mimeType === "application/pdf" || extension === "pdf";
};

const isBrowserImageMedia = (record) => {
  const mimeType = normalize(record?.mime_type);

  const extension = getFileExtension(record?.file_name);

  if (
    ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mimeType)
  ) {
    return true;
  }

  return ["jpg", "jpeg", "png", "webp"].includes(extension);
};

const formatFileSize = (value) => {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "-";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/* ========================================================
   COMPONENT
======================================================== */

const OrthoPatientDetails = () => {
  const navigate = useNavigate();

  const { caseId } = useParams();

  /* ======================================================
       PAGE STATE
    ====================================================== */

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [summary, setSummary] = useState(null);

  /* ======================================================
       VISIT STATE
    ====================================================== */

  const [visitModalOpen, setVisitModalOpen] = useState(false);

  const [savingVisit, setSavingVisit] = useState(false);

  const [visitForm] = Form.useForm();

  /* ======================================================
       PAYMENT STATE
    ====================================================== */

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const [savingPayment, setSavingPayment] = useState(false);

  const [paymentForm] = Form.useForm();

  /* ======================================================
       MEDIA UPLOAD STATE
    ====================================================== */

  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [mediaFiles, setMediaFiles] = useState([]);

  const [mediaForm] = Form.useForm();

  const selectedMediaType = Form.useWatch("media_type", mediaForm);

  /* ======================================================
       MEDIA VIEW STATE
    ====================================================== */

  const [previewMedia, setPreviewMedia] = useState(null);

  const [previewOpen, setPreviewOpen] = useState(false);

  const [downloadingMediaId, setDownloadingMediaId] = useState("");

  const [deletingMediaId, setDeletingMediaId] = useState("");

  /* ======================================================
       LOAD DATA
    ====================================================== */

  const loadSummary = useCallback(async () => {
    if (!caseId) {
      return;
    }

    try {
      setLoading(true);

      setError("");

      const response = await getOrthoCaseSummary(caseId);

      const data = response?.data?.data || null;

      setSummary(data);
    } catch (err) {
      console.error("Failed to load Ortho case:", err);

      const errorMessage =
        err?.response?.data?.message || "Failed to load Ortho case.";

      setError(errorMessage);

      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  /* ======================================================
       DERIVED DATA
    ====================================================== */

  const orthoCase = summary?.case || {};

  const financials = summary?.financials || {};

  const visits = summary?.visits || [];

  const payments = summary?.payments || [];

  const media = summary?.media || [];

  const lastVisit = summary?.last_visit || null;

  const nextVisitDate =
    summary?.next_visit_date || orthoCase?.next_visit_date || "";

  const paymentPercentage = useMemo(() => {
    const totalFee = numberValue(financials.total_fee);

    const totalPaid = numberValue(financials.total_paid);

    if (totalFee <= 0) {
      return 0;
    }

    return Math.min(Math.round((totalPaid / totalFee) * 100), 100);
  }, [financials.total_fee, financials.total_paid]);

  const daysSinceLastVisit = useMemo(() => {
    if (!lastVisit?.visit_date) {
      return null;
    }

    const date = dayjs(lastVisit.visit_date);

    if (!date.isValid()) {
      return null;
    }

    return dayjs().startOf("day").diff(date.startOf("day"), "day");
  }, [lastVisit]);

  const nextVisitState = useMemo(() => {
    if (!nextVisitDate) {
      return {
        label: "Not Scheduled",
        status: "none",
      };
    }

    const next = dayjs(nextVisitDate).startOf("day");

    const today = dayjs().startOf("day");

    if (!next.isValid()) {
      return {
        label: nextVisitDate,
        status: "none",
      };
    }

    if (next.isBefore(today)) {
      return {
        label: formatDate(nextVisitDate),
        status: "overdue",
      };
    }

    if (next.isSame(today)) {
      return {
        label: "Today",
        status: "today",
      };
    }

    return {
      label: formatDate(nextVisitDate),
      status: "upcoming",
    };
  }, [nextVisitDate]);

  /* ======================================================
       VISIT ACTIONS
    ====================================================== */

  const handleAddVisit = () => {
    visitForm.resetFields();

    visitForm.setFieldsValue({
      visit_date: dayjs(),

      dentist_id: orthoCase?.dentist_id || "",

      procedure: undefined,
    });

    setVisitModalOpen(true);
  };

  const handleCloseVisitModal = () => {
    if (savingVisit) {
      return;
    }

    setVisitModalOpen(false);

    visitForm.resetFields();
  };

  const handleCreateVisit = async () => {
    try {
      const values = await visitForm.validateFields();

      setSavingVisit(true);

      const payload = {
        appointment_id: clean(values.appointment_id),

        dentist_id: clean(values.dentist_id),

        visit_date: values.visit_date
          ? values.visit_date.format("YYYY-MM-DD")
          : "",

        procedure: clean(values.procedure),

        clinical_notes: clean(values.clinical_notes),

        appliance_changes: clean(values.appliance_changes),

        elastics: clean(values.elastics),

        next_visit_date: values.next_visit_date
          ? values.next_visit_date.format("YYYY-MM-DD")
          : "",

        next_visit_plan: clean(values.next_visit_plan),
      };

      await createOrthoVisit(caseId, payload);

      message.success("Ortho visit added successfully.");

      setVisitModalOpen(false);

      visitForm.resetFields();

      await loadSummary();
    } catch (err) {
      if (err?.errorFields) {
        return;
      }

      console.error("Failed to add Ortho visit:", err);

      message.error(
        err?.response?.data?.message || "Failed to add Ortho visit.",
      );
    } finally {
      setSavingVisit(false);
    }
  };

  /* ======================================================
       PAYMENT ACTIONS
    ====================================================== */

  const handleOpenPaymentModal = () => {
    paymentForm.resetFields();

    paymentForm.setFieldsValue({
      payment_date: dayjs(),

      ortho_visit_id: lastVisit?.ortho_visit_id || undefined,

      payment_type: "Installment",

      payment_method: "Cash",
    });

    setPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    if (savingPayment) {
      return;
    }

    setPaymentModalOpen(false);

    paymentForm.resetFields();
  };

  const handleCreatePayment = async () => {
    try {
      const values = await paymentForm.validateFields();

      setSavingPayment(true);

      const amount = Number(values.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        message.warning("Please enter a valid payment amount.");

        return;
      }

      const payload = {
        ortho_visit_id: clean(values.ortho_visit_id),

        payment_date: values.payment_date
          ? values.payment_date.format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD"),

        payment_type: clean(values.payment_type),

        payment_method: clean(values.payment_method),

        amount,

        receipt_no: clean(values.receipt_no),

        notes: clean(values.notes),
      };

      await createOrthoPayment(caseId, payload);

      message.success("Ortho payment added successfully.");

      setPaymentModalOpen(false);

      paymentForm.resetFields();

      await loadSummary();
    } catch (err) {
      if (err?.errorFields) {
        return;
      }

      console.error("Failed to add Ortho payment:", err);

      message.error(
        err?.response?.data?.message || "Failed to add Ortho payment.",
      );
    } finally {
      setSavingPayment(false);
    }
  };

  /* ======================================================
       MEDIA UPLOAD ACTIONS
    ====================================================== */

  const handleOpenMediaModal = () => {
    mediaForm.resetFields();

    setMediaFiles([]);

    mediaForm.setFieldsValue({
      media_date: dayjs(),

      stage: visits.length === 0 ? "Before Treatment" : "During Treatment",

      ortho_visit_id: lastVisit?.ortho_visit_id || undefined,
    });

    setMediaModalOpen(true);
  };

  const handleCloseMediaModal = () => {
    if (uploadingMedia) {
      return;
    }

    setMediaModalOpen(false);

    setMediaFiles([]);

    mediaForm.resetFields();
  };

  const handleBeforeMediaUpload = (file) => {
    if (!isAllowedMediaFile(file)) {
      message.error(`${file.name}: unsupported file type.`);

      return Upload.LIST_IGNORE;
    }

    if (!isAllowedMediaSize(file)) {
      message.error(
        `${file.name}: maximum file size is ${MAX_MEDIA_SIZE_MB} MB.`,
      );

      return Upload.LIST_IGNORE;
    }

    if (mediaFiles.length >= MAX_MEDIA_FILES) {
      message.warning(`Maximum ${MAX_MEDIA_FILES} files are allowed.`);

      return Upload.LIST_IGNORE;
    }

    return false;
  };

  const handleMediaFileChange = ({ fileList }) => {
    const filtered = fileList
      .filter((item) => {
        const sourceFile = item.originFileObj || item;

        return isAllowedMediaFile(sourceFile) && isAllowedMediaSize(sourceFile);
      })
      .slice(0, MAX_MEDIA_FILES);

    setMediaFiles(filtered);
  };

  const handleUploadMedia = async () => {
    try {
      const values = await mediaForm.validateFields();

      if (mediaFiles.length === 0) {
        message.warning("Please select at least one file.");

        return;
      }

      setUploadingMedia(true);

      const formData = new FormData();

      formData.append(
        "media_date",
        values.media_date
          ? values.media_date.format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD"),
      );

      formData.append("media_type", clean(values.media_type));

      formData.append("category", clean(values.category));

      formData.append("stage", clean(values.stage));

      formData.append("description", clean(values.description));

      formData.append("ortho_visit_id", clean(values.ortho_visit_id));

      mediaFiles.forEach((item) => {
        const file = item.originFileObj || item;

        if (file instanceof File) {
          formData.append("files", file, file.name);
        }
      });

      await uploadOrthoMedia(caseId, formData);

      message.success(
        mediaFiles.length === 1
          ? "Ortho media uploaded successfully."
          : `${mediaFiles.length} Ortho media files uploaded successfully.`,
      );

      setMediaModalOpen(false);

      setMediaFiles([]);

      mediaForm.resetFields();

      await loadSummary();
    } catch (err) {
      if (err?.errorFields) {
        return;
      }

      console.error("Failed to upload Ortho media:", err);

      message.error(
        err?.response?.data?.message || "Failed to upload Ortho media.",
      );
    } finally {
      setUploadingMedia(false);
    }
  };

  /* ======================================================
       MEDIA VIEW / DOWNLOAD / DELETE
    ====================================================== */

  const handleViewMedia = (record) => {
    if (!record?.ortho_media_id) {
      message.warning("Media ID is missing.");

      return;
    }

    setPreviewMedia(record);

    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);

    setPreviewMedia(null);
  };

  const handleDownloadMedia = async (record) => {
    const mediaId = record?.ortho_media_id;

    if (!mediaId) {
      message.warning("Media ID is missing.");

      return;
    }

    try {
      setDownloadingMediaId(mediaId);

      const response = await downloadOrthoMedia(mediaId);

      const contentType =
        response?.headers?.["content-type"] ||
        record?.mime_type ||
        "application/octet-stream";

      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
              type: contentType,
            });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = record?.file_name || `ortho-media-${mediaId}`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download Ortho media:", err);

      message.error(
        err?.response?.data?.message || "Failed to download Ortho media.",
      );
    } finally {
      setDownloadingMediaId("");
    }
  };

  const handleDeleteMedia = async (record) => {
    const mediaId = record?.ortho_media_id;

    if (!mediaId) {
      message.warning("Media ID is missing.");

      return;
    }

    try {
      setDeletingMediaId(mediaId);

      await deleteOrthoMedia(mediaId);

      message.success("Ortho media deleted successfully.");

      if (previewMedia?.ortho_media_id === mediaId) {
        handleClosePreview();
      }

      await loadSummary();
    } catch (err) {
      console.error("Failed to delete Ortho media:", err);

      message.error(
        err?.response?.data?.message || "Failed to delete Ortho media.",
      );
    } finally {
      setDeletingMediaId("");
    }
  };

  /* ======================================================
       MEDIA CATEGORY OPTIONS
    ====================================================== */

  const mediaCategoryOptions = useMemo(() => {
    switch (normalize(selectedMediaType)) {
      case "clinical photo":
        return [
          {
            value: "Front View",
            label: "Front View",
          },
          {
            value: "Right Side",
            label: "Right Side",
          },
          {
            value: "Left Side",
            label: "Left Side",
          },
          {
            value: "Upper Occlusal",
            label: "Upper Occlusal",
          },
          {
            value: "Lower Occlusal",
            label: "Lower Occlusal",
          },
          {
            value: "Smile",
            label: "Smile",
          },
          {
            value: "Profile",
            label: "Profile",
          },
          {
            value: "Other",
            label: "Other",
          },
        ];

      case "x-ray":
        return [
          {
            value: "IOPA",
            label: "IOPA",
          },
          {
            value: "OPG",
            label: "OPG",
          },
          {
            value: "Bitewing",
            label: "Bitewing",
          },
          {
            value: "Occlusal",
            label: "Occlusal",
          },
          {
            value: "Cephalometric",
            label: "Cephalometric",
          },
          {
            value: "CBCT",
            label: "CBCT",
          },
          {
            value: "Other",
            label: "Other",
          },
        ];

      case "document":
        return [
          {
            value: "Treatment Plan",
            label: "Treatment Plan",
          },
          {
            value: "Consent",
            label: "Consent",
          },
          {
            value: "Report",
            label: "Report",
          },
          {
            value: "Other",
            label: "Other",
          },
        ];

      default:
        return [
          {
            value: "Other",
            label: "Other",
          },
        ];
    }
  }, [selectedMediaType]);

  /* ======================================================
       VISIT TABLE
    ====================================================== */

  const visitColumns = [
    {
      title: "Visit",

      dataIndex: "visit_number",

      key: "visit_number",

      width: 95,

      render: (value) => <Tag color="blue">#{value}</Tag>,
    },

    {
      title: "Date",

      dataIndex: "visit_date",

      key: "visit_date",

      width: 120,

      render: (value) => formatDate(value),
    },

    {
      title: "Procedure",

      dataIndex: "procedure",

      key: "procedure",

      width: 180,

      render: (value) => <Text strong>{value || "-"}</Text>,
    },

    {
      title: "Clinical Notes",

      dataIndex: "clinical_notes",

      key: "clinical_notes",

      render: (value) => (
        <div className="ortho-table-notes">{value || "-"}</div>
      ),
    },

    {
      title: "Appliance / Wire",

      dataIndex: "appliance_changes",

      key: "appliance_changes",

      render: (value) => value || "-",
    },

    {
      title: "Elastics",

      dataIndex: "elastics",

      key: "elastics",

      render: (value) => value || "-",
    },

    {
      title: "Next Visit",

      dataIndex: "next_visit_date",

      key: "next_visit_date",

      width: 120,

      render: (value) => formatDate(value),
    },

    {
      title: "Next Plan",

      dataIndex: "next_visit_plan",

      key: "next_visit_plan",

      render: (value) => value || "-",
    },
  ];

  /* ======================================================
       PAYMENT TABLE
    ====================================================== */

  const paymentColumns = [
    {
      title: "Receipt",

      dataIndex: "receipt_no",

      key: "receipt_no",

      render: (value) => <Text strong>{value || "-"}</Text>,
    },

    {
      title: "Date",

      dataIndex: "payment_date",

      key: "payment_date",

      render: (value) => formatDate(value),
    },

    {
      title: "Visit",

      dataIndex: "ortho_visit_id",

      key: "ortho_visit_id",

      render: (value) => value || "-",
    },

    {
      title: "Type",

      dataIndex: "payment_type",

      key: "payment_type",

      render: (value) => <Tag>{value || "-"}</Tag>,
    },

    {
      title: "Method",

      dataIndex: "payment_method",

      key: "payment_method",

      render: (value) => value || "-",
    },

    {
      title: "Amount",

      dataIndex: "amount",

      key: "amount",

      align: "right",

      render: (value) => (
        <Text strong type="success">
          {formatMoney(value)}
        </Text>
      ),
    },

    {
      title: "Notes",

      dataIndex: "notes",

      key: "notes",

      render: (value) => value || "-",
    },
  ];

  /* ======================================================
       MEDIA TABLE
    ====================================================== */

  const mediaColumns = [
    {
      title: "Preview",

      key: "preview",

      width: 80,

      render: (_, record) => {
        if (isBrowserImageMedia(record)) {
          const url = getOrthoMediaViewUrl(record.ortho_media_id);

          return (
            <div
              onClick={() => handleViewMedia(record)}
              style={{
                cursor: "pointer",

                width: 54,

                height: 54,

                borderRadius: 8,

                overflow: "hidden",
              }}
            >
              <Image
                src={url}
                alt={record.file_name || "Ortho media"}
                preview={false}
                width={54}
                height={54}
                style={{
                  objectFit: "cover",
                }}
              />
            </div>
          );
        }

        if (isPdfMedia(record)) {
          return (
            <Button
              type="text"
              icon={
                <FilePdfOutlined
                  style={{
                    fontSize: 28,
                  }}
                />
              }
              onClick={() => handleViewMedia(record)}
            />
          );
        }

        return (
          <Button
            type="text"
            icon={
              <FileImageOutlined
                style={{
                  fontSize: 26,
                }}
              />
            }
            onClick={() => handleViewMedia(record)}
          />
        );
      },
    },

    {
      title: "Date",

      dataIndex: "media_date",

      key: "media_date",

      width: 120,

      render: (value) => formatDate(value),
    },

    {
      title: "Type",

      dataIndex: "media_type",

      key: "media_type",

      render: (value) => <Tag color={getMediaColor(value)}>{value || "-"}</Tag>,
    },

    {
      title: "Category",

      dataIndex: "category",

      key: "category",

      render: (value) => value || "-",
    },

    {
      title: "Stage",

      dataIndex: "stage",

      key: "stage",

      render: (value) => <Tag>{value || "-"}</Tag>,
    },

    {
      title: "Visit",

      dataIndex: "ortho_visit_id",

      key: "ortho_visit_id",

      render: (value) => value || "-",
    },

    {
      title: "Description",

      dataIndex: "description",

      key: "description",

      render: (value) => value || "-",
    },

    {
      title: "File Name",

      dataIndex: "file_name",

      key: "file_name",

      render: (value) => (
        <Text
          ellipsis={{
            tooltip: value || "",
          }}
          style={{
            maxWidth: 180,

            display: "block",
          }}
        >
          {value || "-"}
        </Text>
      ),
    },

    {
      title: "Size",

      dataIndex: "file_size",

      key: "file_size",

      width: 100,

      render: (value) => formatFileSize(value),
    },

    {
      title: "Actions",

      key: "actions",

      width: 180,

      fixed: "right",

      render: (_, record) => {
        const mediaId = record.ortho_media_id;

        if (!mediaId) {
          return <Text type="secondary">No file</Text>;
        }

        return (
          <Space size={4}>
            <Tooltip title="View">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewMedia(record)}
              />
            </Tooltip>

            <Tooltip title="Download">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                loading={downloadingMediaId === mediaId}
                onClick={() => handleDownloadMedia(record)}
              />
            </Tooltip>

            <Popconfirm
              title="Delete media?"
              description="This file will be removed."
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{
                danger: true,

                loading: deletingMediaId === mediaId,
              }}
              onConfirm={() => handleDeleteMedia(record)}
            >
              <Tooltip title="Delete">
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={deletingMediaId === mediaId}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  /* ======================================================
       TIMELINE
    ====================================================== */

  const visitTimelineItems = useMemo(() => {
    return [...visits]
      .sort((a, b) => numberValue(b.visit_number) - numberValue(a.visit_number))
      .map((visit) => ({
        color: "blue",

        children: (
          <div className="ortho-timeline-card">
            <div className="ortho-timeline-header">
              <div>
                <Tag color="blue">Visit #{visit.visit_number}</Tag>

                <Text strong className="ortho-timeline-date">
                  {formatDate(visit.visit_date)}
                </Text>
              </div>
            </div>

            <Title level={5} className="ortho-timeline-title">
              {visit.procedure || "Orthodontic Visit"}
            </Title>

            {visit.clinical_notes && (
              <Paragraph className="ortho-timeline-notes">
                {visit.clinical_notes}
              </Paragraph>
            )}

            <div className="ortho-timeline-meta">
              {visit.appliance_changes && (
                <span>
                  <strong>Appliance:</strong> {visit.appliance_changes}
                </span>
              )}

              {visit.elastics && (
                <span>
                  <strong>Elastics:</strong> {visit.elastics}
                </span>
              )}

              {visit.next_visit_date && (
                <span>
                  <strong>Next Visit:</strong>{" "}
                  {formatDate(visit.next_visit_date)}
                </span>
              )}

              {visit.next_visit_plan && (
                <span>
                  <strong>Next Plan:</strong> {visit.next_visit_plan}
                </span>
              )}
            </div>
          </div>
        ),
      }));
  }, [visits]);

  /* ======================================================
       TABS
    ====================================================== */

  const tabItems = [
    {
      key: "overview",

      label: "Overview",

      children: (
        <div className="ortho-tab-content">
          <Row gutter={[18, 18]}>
            <Col xs={24} xl={12}>
              <Card
                className="ortho-content-card"
                title={
                  <Space>
                    <MedicineBoxOutlined />
                    Treatment Details
                  </Space>
                }
              >
                <Descriptions
                  bordered
                  column={1}
                  size="small"
                  className="ortho-descriptions"
                >
                  <Descriptions.Item label="Case ID">
                    {orthoCase.ortho_case_id || "-"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Patient ID">
                    {orthoCase.patient_id || "-"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Dentist">
                    {orthoCase.dentist_id || "-"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Treatment Type">
                    {orthoCase.treatment_type || "-"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Treatment Area">
                    {orthoCase.treatment_area || "-"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Treatment Started">
                    {formatDate(orthoCase.start_date)}
                  </Descriptions.Item>

                  <Descriptions.Item label="Estimated Duration">
                    {orthoCase.estimated_duration || "-"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Diagnosis">
                    {orthoCase.diagnosis || "-"}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card
                className="ortho-content-card"
                title={
                  <Space>
                    <DollarOutlined />
                    Financial Summary
                  </Space>
                }
              >
                <div className="ortho-payment-overview">
                  <div>
                    <Text type="secondary">Total Treatment Fee</Text>

                    <Title level={3} className="ortho-money-title">
                      {formatMoney(financials.total_fee)}
                    </Title>
                  </div>

                  <Progress
                    percent={paymentPercentage}
                    status={paymentPercentage >= 100 ? "success" : "active"}
                  />

                  <div className="ortho-payment-grid">
                    <div>
                      <Text type="secondary">Paid</Text>

                      <Text strong className="ortho-payment-paid">
                        {formatMoney(financials.total_paid)}
                      </Text>
                    </div>

                    <div>
                      <Text type="secondary">Balance</Text>

                      <Text strong className="ortho-payment-balance">
                        {formatMoney(financials.balance)}
                      </Text>
                    </div>

                    <div>
                      <Text type="secondary">Plan</Text>

                      <Text strong>{orthoCase.payment_plan || "-"}</Text>
                    </div>

                    <div>
                      <Text type="secondary">Monthly</Text>

                      <Text strong>
                        {formatMoney(orthoCase.monthly_payment)}
                      </Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>

            <Col span={24}>
              <Card
                className="ortho-content-card"
                title={
                  <Space>
                    <ScheduleOutlined />
                    Treatment Timeline
                  </Space>
                }
              >
                {visitTimelineItems.length > 0 ? (
                  <Timeline items={visitTimelineItems} />
                ) : (
                  <Empty description="No Ortho visits recorded yet." />
                )}
              </Card>
            </Col>

            <Col span={24}>
              <Card
                className="ortho-content-card"
                title="Initial / General Notes"
              >
                <Paragraph className="ortho-general-notes">
                  {orthoCase.notes || "No notes recorded."}
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },

    {
      key: "visits",

      label: (
        <Space>
          Visits
          <Tag>{visits.length}</Tag>
        </Space>
      ),

      children: (
        <div className="ortho-tab-content">
          <div className="ortho-tab-toolbar">
            <div>
              <Title level={4} className="ortho-section-title">
                Visit History
              </Title>

              <Text type="secondary">
                Record and review clinical progress for each Ortho visit.
              </Text>
            </div>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddVisit}
            >
              Add Visit
            </Button>
          </div>

          <Card
            className="ortho-table-card"
            styles={{
              body: {
                padding: 0,
              },
            }}
          >
            <Table
              rowKey="ortho_visit_id"
              columns={visitColumns}
              dataSource={visits}
              scroll={{
                x: 1400,
              }}
              pagination={{
                pageSize: 10,

                showSizeChanger: true,
              }}
              locale={{
                emptyText: "No Ortho visits recorded.",
              }}
            />
          </Card>
        </div>
      ),
    },

    {
      key: "payments",

      label: (
        <Space>
          Payments
          <Tag>{payments.length}</Tag>
        </Space>
      ),

      children: (
        <div className="ortho-tab-content">
          <div className="ortho-tab-toolbar">
            <div>
              <Title level={4} className="ortho-section-title">
                Payment History
              </Title>

              <Text type="secondary">
                Record and review Ortho treatment payments.
              </Text>
            </div>

            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={handleOpenPaymentModal}
            >
              Add Payment
            </Button>
          </div>

          <Row gutter={[16, 16]} className="ortho-payment-stat-row">
            <Col xs={24} md={8}>
              <Card className="ortho-mini-stat">
                <Statistic
                  title="Total Fee"
                  value={numberValue(financials.total_fee)}
                  prefix="Rs."
                />
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card className="ortho-mini-stat">
                <Statistic
                  title="Paid"
                  value={numberValue(financials.total_paid)}
                  prefix="Rs."
                />
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card className="ortho-mini-stat">
                <Statistic
                  title="Balance"
                  value={numberValue(financials.balance)}
                  prefix="Rs."
                />
              </Card>
            </Col>
          </Row>

          <Card
            className="ortho-table-card"
            styles={{
              body: {
                padding: 0,
              },
            }}
          >
            <Table
              rowKey="ortho_payment_id"
              columns={paymentColumns}
              dataSource={payments}
              scroll={{
                x: 1000,
              }}
              pagination={{
                pageSize: 10,
              }}
              locale={{
                emptyText: "No Ortho payments recorded.",
              }}
            />
          </Card>
        </div>
      ),
    },

    {
      key: "media",

      label: (
        <Space>
          Photos / X-Rays
          <Tag>{media.length}</Tag>
        </Space>
      ),

      children: (
        <div className="ortho-tab-content">
          <div className="ortho-tab-toolbar">
            <div>
              <Title level={4} className="ortho-section-title">
                Ortho Media
              </Title>

              <Text type="secondary">
                Treatment photos, X-rays, scans and documents.
              </Text>
            </div>

            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleOpenMediaModal}
            >
              Add Images
            </Button>
          </div>

          <Card
            className="ortho-table-card"
            styles={{
              body: {
                padding: 0,
              },
            }}
          >
            <Table
              rowKey="ortho_media_id"
              columns={mediaColumns}
              dataSource={media}
              scroll={{
                x: 1450,
              }}
              pagination={{
                pageSize: 10,
              }}
              locale={{
                emptyText: "No Ortho media uploaded.",
              }}
            />
          </Card>
        </div>
      ),
    },

    {
      key: "appointments",

      label: "Appointments",

      children: (
        <div className="ortho-tab-content">
          <Card className="ortho-content-card">
            <Empty description="Ortho appointments will be connected with the existing appointment system." />
          </Card>
        </div>
      ),
    },
  ];

  /* ======================================================
       LOADING
    ====================================================== */

  if (loading && !summary) {
    return (
      <div className="ortho-page-loader">
        <Spin size="large" tip="Loading Ortho case..." />
      </div>
    );
  }

  /* ======================================================
       UI
    ====================================================== */

  return (
    <div className="ortho-details-page">
      {/* ==================================================
            HEADER
        ================================================== */}

      <div className="ortho-details-header">
        <div className="ortho-header-left">
          <Tooltip title="Back to Ortho Patients">
            <Button
              className="ortho-back-button"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/ortho")}
            />
          </Tooltip>

          <Avatar
            size={58}
            icon={<UserOutlined />}
            className="ortho-patient-avatar"
          />

          <div>
            <div className="ortho-title-row">
              <Title level={2} className="ortho-page-title">
                {orthoCase.patient_name ||
                  orthoCase.patient_id ||
                  "Ortho Patient"}
              </Title>

              <Tag
                color={getStatusColor(orthoCase.status)}
                className="ortho-status-tag"
              >
                {orthoCase.status || "Unknown"}
              </Tag>
            </div>

            <Space wrap size={12}>
              <Text type="secondary">
                Case: <strong>{orthoCase.ortho_case_id || caseId}</strong>
              </Text>

              <Text type="secondary">
                Patient: <strong>{orthoCase.patient_id || "-"}</strong>
              </Text>

              <Text type="secondary">
                Doctor: <strong>{orthoCase.dentist_id || "-"}</strong>
              </Text>
            </Space>
          </div>
        </div>

        {/* ================================================
              TOP ACTION BUTTONS
          ================================================ */}

        <div className="ortho-header-actions">
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={loadSummary}
          >
            Refresh
          </Button>

          <Button icon={<MedicineBoxOutlined />} onClick={handleAddVisit}>
            Add Visit
          </Button>

          <Button icon={<DollarOutlined />} onClick={handleOpenPaymentModal}>
            Add Payment
          </Button>

          <Button
            type="primary"
            icon={<FileImageOutlined />}
            onClick={handleOpenMediaModal}
          >
            Add Images
          </Button>
        </div>
      </div>

      {/* ==================================================
            ERROR
        ================================================== */}

      {error && (
        <Alert
          type="error"
          showIcon
          closable
          message={error}
          className="ortho-error"
          onClose={() => setError("")}
        />
      )}

      {/* ==================================================
            SUMMARY CARDS
        ================================================== */}

      <Row gutter={[16, 16]} className="ortho-summary-grid">
        <Col xs={24} sm={12} xl={6}>
          <Card className="ortho-summary-card">
            <div className="ortho-summary-icon visits">
              <MedicineBoxOutlined />
            </div>

            <Statistic title="Total Visits" value={summary?.visit_count || 0} />

            <Text type="secondary">Complete Ortho treatment history</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="ortho-summary-card">
            <div className="ortho-summary-icon paid">
              <DollarOutlined />
            </div>

            <Statistic
              title="Total Paid"
              value={numberValue(financials.total_paid)}
              prefix="Rs."
            />

            <Text type="secondary">{paymentPercentage}% of treatment fee</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="ortho-summary-card">
            <div className="ortho-summary-icon balance">
              <DollarOutlined />
            </div>

            <Statistic
              title="Balance"
              value={numberValue(financials.balance)}
              prefix="Rs."
            />

            <Text type="secondary">Remaining treatment balance</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="ortho-summary-card">
            <div className="ortho-summary-icon media">
              <FileImageOutlined />
            </div>

            <Statistic title="Media Files" value={summary?.media_count || 0} />

            <Text type="secondary">Photos, X-rays and documents</Text>
          </Card>
        </Col>
      </Row>

      {/* ==================================================
            VISIT STATUS
        ================================================== */}

      <Row gutter={[16, 16]} className="ortho-visit-status-row">
        <Col xs={24} lg={12}>
          <Card className="ortho-visit-highlight-card">
            <div className="ortho-highlight-icon">
              <ClockCircleOutlined />
            </div>

            <div className="ortho-highlight-content">
              <Text type="secondary">Last Visit</Text>

              <Title level={4} className="ortho-highlight-title">
                {lastVisit ? formatDate(lastVisit.visit_date) : "No visits yet"}
              </Title>

              {lastVisit?.procedure && <Text>{lastVisit.procedure}</Text>}

              {daysSinceLastVisit !== null && (
                <Text type="secondary">
                  {daysSinceLastVisit} day
                  {daysSinceLastVisit === 1 ? "" : "s"} ago
                </Text>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            className={`ortho-visit-highlight-card ortho-next-${nextVisitState.status}`}
          >
            <div className="ortho-highlight-icon">
              <CalendarOutlined />
            </div>

            <div className="ortho-highlight-content">
              <Text type="secondary">Next Visit</Text>

              <Title level={4} className="ortho-highlight-title">
                {nextVisitState.label}
              </Title>

              {lastVisit?.next_visit_plan && (
                <Text>{lastVisit.next_visit_plan}</Text>
              )}

              {nextVisitState.status === "overdue" && (
                <Tag color="red">Visit Overdue</Tag>
              )}

              {nextVisitState.status === "today" && (
                <Tag color="orange">Due Today</Tag>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* ==================================================
            TABS
        ================================================== */}

      <Card className="ortho-main-card">
        <Tabs defaultActiveKey="overview" items={tabItems} size="large" />
      </Card>

      {/* ==================================================
            ADD VISIT MODAL
        ================================================== */}

      <Modal
        title={
          <Space>
            <MedicineBoxOutlined />
            Add Ortho Visit
          </Space>
        }
        open={visitModalOpen}
        onCancel={handleCloseVisitModal}
        onOk={handleCreateVisit}
        okText="Save Visit"
        confirmLoading={savingVisit}
        width={850}
        destroyOnHidden
        maskClosable={!savingVisit}
        closable={!savingVisit}
      >
        <div className="ortho-visit-modal-info">
          <Text type="secondary">Case</Text>

          <Text strong>{orthoCase.ortho_case_id || caseId}</Text>

          <Text type="secondary">Patient</Text>

          <Text strong>{orthoCase.patient_id || "-"}</Text>

          <Text type="secondary">Next Visit Number</Text>

          <Text strong>#{visits.length + 1}</Text>
        </div>

        <Form form={visitForm} layout="vertical" className="ortho-visit-form">
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="visit_date"
                label="Visit Date"
                rules={[
                  {
                    required: true,

                    message: "Please select the visit date.",
                  },
                ]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{
                    width: "100%",
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="dentist_id" label="Dentist">
                <Input placeholder="Dentist ID" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="appointment_id" label="Appointment ID">
                <Input placeholder="Optional appointment ID" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="procedure"
                label="Procedure / Work Done"
                rules={[
                  {
                    required: true,

                    message: "Please select the work done.",
                  },
                ]}
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Select procedure"
                  options={[
                    {
                      value: "Initial Bonding",
                      label: "Initial Bonding",
                    },
                    {
                      value: "Wire Adjustment",
                      label: "Wire Adjustment",
                    },
                    {
                      value: "Wire Change",
                      label: "Wire Change",
                    },
                    {
                      value: "Bracket Repair",
                      label: "Bracket Repair",
                    },
                    {
                      value: "Elastic Review",
                      label: "Elastic Review",
                    },
                    {
                      value: "Aligner Review",
                      label: "Aligner Review",
                    },
                    {
                      value: "Debonding",
                      label: "Debonding",
                    },
                    {
                      value: "Retainer Review",
                      label: "Retainer Review",
                    },
                    {
                      value: "Other",
                      label: "Other",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name="clinical_notes" label="Clinical Notes">
                <Input.TextArea
                  rows={4}
                  maxLength={2000}
                  showCount
                  placeholder="Enter clinical findings, progress, observations and treatment details..."
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="appliance_changes"
                label="Appliance / Wire Changes"
              >
                <Input placeholder="Example: NiTi 0.018 upper wire" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="elastics" label="Elastics">
                <Input placeholder="Example: Continue light elastics" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="next_visit_date" label="Next Visit Date">
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{
                    width: "100%",
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="next_visit_plan" label="Next Visit Plan">
                <Input placeholder="Example: Check bite and change wire" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ==================================================
            ADD PAYMENT MODAL
        ================================================== */}

      <Modal
        title={
          <Space>
            <DollarOutlined />
            Add Ortho Payment
          </Space>
        }
        open={paymentModalOpen}
        onCancel={handleClosePaymentModal}
        onOk={handleCreatePayment}
        okText="Save Payment"
        confirmLoading={savingPayment}
        width={720}
        destroyOnHidden
        maskClosable={!savingPayment}
        closable={!savingPayment}
      >
        <Alert
          type="info"
          showIcon
          style={{
            marginBottom: 20,
          }}
          message="Payment Summary"
          description={
            <Space wrap size={18}>
              <span>
                Total: <strong>{formatMoney(financials.total_fee)}</strong>
              </span>

              <span>
                Paid: <strong>{formatMoney(financials.total_paid)}</strong>
              </span>

              <span>
                Balance: <strong>{formatMoney(financials.balance)}</strong>
              </span>
            </Space>
          }
        />

        <Form form={paymentForm} layout="vertical">
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="payment_date"
                label="Payment Date"
                rules={[
                  {
                    required: true,

                    message: "Please select the payment date.",
                  },
                ]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{
                    width: "100%",
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="ortho_visit_id" label="Related Visit">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select related visit"
                  options={visits.map((visit) => ({
                    value: visit.ortho_visit_id,

                    label: `Visit #${visit.visit_number} - ${formatDate(
                      visit.visit_date,
                    )}`,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="amount"
                label="Amount"
                rules={[
                  {
                    required: true,

                    message: "Please enter payment amount.",
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  precision={2}
                  prefix="Rs."
                  placeholder="Enter amount"
                  style={{
                    width: "100%",
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="payment_type"
                label="Payment Type"
                rules={[
                  {
                    required: true,

                    message: "Please select payment type.",
                  },
                ]}
              >
                <Select
                  placeholder="Select payment type"
                  options={[
                    {
                      value: "Initial Payment",

                      label: "Initial Payment",
                    },
                    {
                      value: "Installment",

                      label: "Installment",
                    },
                    {
                      value: "Monthly Payment",

                      label: "Monthly Payment",
                    },
                    {
                      value: "Final Payment",

                      label: "Final Payment",
                    },
                    {
                      value: "Other",

                      label: "Other",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="payment_method"
                label="Payment Method"
                rules={[
                  {
                    required: true,

                    message: "Please select payment method.",
                  },
                ]}
              >
                <Select
                  placeholder="Select payment method"
                  options={[
                    {
                      value: "Cash",
                      label: "Cash",
                    },
                    {
                      value: "Card",
                      label: "Card",
                    },
                    {
                      value: "Bank Transfer",
                      label: "Bank Transfer",
                    },
                    {
                      value: "Online",
                      label: "Online",
                    },
                    {
                      value: "Other",
                      label: "Other",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="receipt_no" label="Receipt Number">
                <Input placeholder="Optional receipt number" />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea
                  rows={3}
                  maxLength={1000}
                  showCount
                  placeholder="Optional payment notes..."
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ==================================================
            MEDIA UPLOAD MODAL
        ================================================== */}

      <Modal
        title={
          <Space>
            <UploadOutlined />
            Add Ortho Images / Media
          </Space>
        }
        open={mediaModalOpen}
        onCancel={handleCloseMediaModal}
        onOk={handleUploadMedia}
        okText="Upload Media"
        confirmLoading={uploadingMedia}
        width={850}
        destroyOnHidden
        maskClosable={!uploadingMedia}
        closable={!uploadingMedia}
      >
        <Alert
          type="info"
          showIcon
          message="Ortho Treatment Media"
          description={`You can upload up to ${MAX_MEDIA_FILES} files. Maximum ${MAX_MEDIA_SIZE_MB} MB per file.`}
          style={{
            marginBottom: 20,
          }}
        />

        <Form form={mediaForm} layout="vertical">
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="media_date"
                label="Media Date"
                rules={[
                  {
                    required: true,

                    message: "Please select the media date.",
                  },
                ]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{
                    width: "100%",
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="ortho_visit_id" label="Related Visit">
                <Select
                  allowClear
                  showSearch
                  placeholder="Select related visit"
                  optionFilterProp="label"
                  options={visits.map((visit) => ({
                    value: visit.ortho_visit_id,

                    label: `Visit #${visit.visit_number} - ${formatDate(
                      visit.visit_date,
                    )}`,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="media_type"
                label="Media Type"
                rules={[
                  {
                    required: true,

                    message: "Please select the media type.",
                  },
                ]}
              >
                <Select
                  placeholder="Select media type"
                  onChange={() => {
                    mediaForm.setFieldValue("category", undefined);
                  }}
                  options={[
                    {
                      value: "Clinical Photo",
                      label: "Clinical Photo",
                    },
                    {
                      value: "X-Ray",
                      label: "X-Ray",
                    },
                    {
                      value: "Document",
                      label: "Document",
                    },
                    {
                      value: "Scan",
                      label: "Scan",
                    },
                    {
                      value: "Other",
                      label: "Other",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="category" label="Category">
                <Select
                  allowClear
                  showSearch
                  placeholder="Select category"
                  optionFilterProp="label"
                  options={mediaCategoryOptions}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="stage"
                label="Treatment Stage"
                rules={[
                  {
                    required: true,

                    message: "Please select the treatment stage.",
                  },
                ]}
              >
                <Select
                  placeholder="Select treatment stage"
                  options={[
                    {
                      value: "Before Treatment",
                      label: "Before Treatment",
                    },
                    {
                      value: "During Treatment",
                      label: "During Treatment",
                    },
                    {
                      value: "After Treatment",
                      label: "After Treatment",
                    },
                    {
                      value: "Retainer Stage",
                      label: "Retainer Stage",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name="description" label="Description">
                <Input.TextArea
                  rows={3}
                  maxLength={1000}
                  showCount
                  placeholder="Example: Front progress photo after 6 months of treatment..."
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="Files" required>
                <Upload.Dragger
                  multiple
                  disabled={uploadingMedia}
                  fileList={mediaFiles}
                  beforeUpload={handleBeforeMediaUpload}
                  onChange={handleMediaFileChange}
                  onRemove={(file) => {
                    setMediaFiles((current) =>
                      current.filter((item) => item.uid !== file.uid),
                    );
                  }}
                  accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf"
                  maxCount={MAX_MEDIA_FILES}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>

                  <p className="ant-upload-text">
                    Click or drag files here to upload
                  </p>

                  <p className="ant-upload-hint">
                    JPG, JPEG, PNG, WEBP, HEIC, HEIF and PDF
                  </p>

                  <p className="ant-upload-hint">
                    Maximum {MAX_MEDIA_FILES} files • {MAX_MEDIA_SIZE_MB} MB
                    each
                  </p>
                </Upload.Dragger>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ==================================================
            MEDIA PREVIEW MODAL
        ================================================== */}

      <Modal
        open={previewOpen}
        title={
          <Space>
            {isPdfMedia(previewMedia) ? (
              <FilePdfOutlined />
            ) : (
              <FileImageOutlined />
            )}

            <span>{previewMedia?.file_name || "Ortho Media"}</span>
          </Space>
        }
        width={1000}
        centered
        destroyOnHidden
        onCancel={handleClosePreview}
        footer={
          previewMedia
            ? [
                <Button key="close" onClick={handleClosePreview}>
                  Close
                </Button>,

                <Button
                  key="download"
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={downloadingMediaId === previewMedia.ortho_media_id}
                  onClick={() => handleDownloadMedia(previewMedia)}
                >
                  Download
                </Button>,
              ]
            : null
        }
      >
        {previewMedia && (
          <div
            style={{
              display: "flex",

              flexDirection: "column",

              gap: 18,
            }}
          >
<div className="ortho-media-preview-area">
              {isBrowserImageMedia(previewMedia) ? (
                <Image
                  src={getOrthoMediaViewUrl(previewMedia.ortho_media_id)}
                  alt={previewMedia.file_name || "Ortho media"}
                  preview
                  style={{
                    maxWidth: "100%",

                    maxHeight: "70vh",

                    objectFit: "contain",
                  }}
                />
              ) : isPdfMedia(previewMedia) ? (
                <iframe
                  src={getOrthoMediaViewUrl(previewMedia.ortho_media_id)}
                  title={previewMedia.file_name || "Ortho PDF"}
                  className="ortho-media-preview-pdf"
                />
              ) : (
                <Empty
                  image={
                    <FileImageOutlined
                      style={{
                        fontSize: 60,
                      }}
                    />
                  }
                  description={
                    <>
                      <div>Preview is not supported for this file type.</div>

                      <Text type="secondary">
                        You can download the file to view it.
                      </Text>
                    </>
                  }
                />
              )}
            </div>

            <Descriptions
              bordered
              size="small"
              column={{
                xs: 1,

                sm: 2,

                md: 3,
              }}
            >
              <Descriptions.Item label="Type">
                <Tag color={getMediaColor(previewMedia.media_type)}>
                  {previewMedia.media_type || "-"}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Category">
                {previewMedia.category || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Stage">
                <Tag>{previewMedia.stage || "-"}</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Date">
                {formatDate(previewMedia.media_date)}
              </Descriptions.Item>

              <Descriptions.Item label="Visit">
                {previewMedia.ortho_visit_id || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Size">
                {formatFileSize(previewMedia.file_size)}
              </Descriptions.Item>

              <Descriptions.Item label="File Name" span={3}>
                {previewMedia.file_name || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Description" span={3}>
                {previewMedia.description || "-"}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrthoPatientDetails;
