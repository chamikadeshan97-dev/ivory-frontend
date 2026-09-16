import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Progress,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
} from "antd";

import {
  CheckCircleFilled,
  DeleteOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  InboxOutlined,
  MedicineBoxOutlined,
  ReloadOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";

import {
  getAllPatients,
  uploadPatientMedia,
} from "../api/endPoints";

import "./css/PatientMediaUpload.css";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

/* ========================================================
   CONFIG
======================================================== */

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 10;

const ACCEPTED_FILE_EXTENSIONS =
  ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf";

/* ========================================================
   MEDIA CONFIG
======================================================== */

const MEDIA_TYPES = {
  XRAY: "X-Ray",
  TREATMENT_PHOTO: "Treatment Photo",
  CLINICAL_PHOTO: "Clinical Photo",
  DOCUMENT: "Document",
  OTHER: "Other",
};

const XRAY_CATEGORIES = [
  "IOPA",
  "OPG",
  "Bitewing",
  "Occlusal",
  "Cephalometric",
  "CBCT",
  "Other",
];

const TREATMENT_PHOTO_CATEGORIES = [
  "Before",
  "During",
  "After",
];

const MEDIA_TYPE_OPTIONS = [
  {
    label: "X-Ray",
    value: MEDIA_TYPES.XRAY,
  },
  {
    label: "Treatment Photo",
    value: MEDIA_TYPES.TREATMENT_PHOTO,
  },
  {
    label: "Clinical Photo",
    value: MEDIA_TYPES.CLINICAL_PHOTO,
  },
  {
    label: "Document",
    value: MEDIA_TYPES.DOCUMENT,
  },
  {
    label: "Other",
    value: MEDIA_TYPES.OTHER,
  },
];

/* ========================================================
   PATIENT HELPERS
======================================================== */

const getPatientId = (patient) =>
  patient?.patient_id ||
  patient?.patientId ||
  patient?.id ||
  "";

const getPatientName = (patient) => {
  const fullName =
    patient?.patient_name ||
    patient?.full_name ||
    patient?.name;

  if (fullName) {
    return fullName;
  }

  return [
    patient?.first_name,
    patient?.last_name,
  ]
    .filter(Boolean)
    .join(" ");
};

const getPatientMobile = (patient) =>
  patient?.mobile ||
  patient?.mobile_number ||
  patient?.phone ||
  patient?.telephone ||
  "";

const getPatientNic = (patient) =>
  patient?.nic ||
  patient?.NIC ||
  patient?.national_id ||
  "";

/* ========================================================
   FILE HELPERS
======================================================== */

const getFileSize = (size) => {
  const bytes = Number(size || 0);

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
};

const getFileIcon = (file) => {
  const type = String(
    file?.type ||
      file?.originFileObj?.type ||
      "",
  ).toLowerCase();

  const name = String(
    file?.name || "",
  ).toLowerCase();

  if (
    type === "application/pdf" ||
    name.endsWith(".pdf")
  ) {
    return (
      <FilePdfOutlined className="patient-media-file-icon patient-media-file-icon-pdf" />
    );
  }

  return (
    <FileImageOutlined className="patient-media-file-icon" />
  );
};

/* ========================================================
   PAGE
======================================================== */

const PatientMediaUpload = () => {
  const [form] = Form.useForm();

  const [messageApi, contextHolder] =
    message.useMessage();

  const [patients, setPatients] =
    useState([]);

  const [
    loadingPatients,
    setLoadingPatients,
  ] = useState(false);

  const [
    selectedPatientId,
    setSelectedPatientId,
  ] = useState(null);

  const [
    selectedMediaType,
    setSelectedMediaType,
  ] = useState(null);

  const [fileList, setFileList] =
    useState([]);

  const [uploading, setUploading] =
    useState(false);

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState(0);

  const [
    uploadComplete,
    setUploadComplete,
  ] = useState(false);

  /* ========================================================
     SELECTED PATIENT
  ======================================================== */

  const selectedPatient = useMemo(() => {
    return patients.find(
      (patient) =>
        String(
          getPatientId(patient),
        ) ===
        String(selectedPatientId),
    );
  }, [
    patients,
    selectedPatientId,
  ]);

  /* ========================================================
     LOAD PATIENTS
  ======================================================== */

  const loadPatients = async () => {
    try {
      setLoadingPatients(true);

      const response =
        await getAllPatients();

      const responseData =
        response?.data?.data ??
        response?.data?.patients ??
        response?.data ??
        [];

      setPatients(
        Array.isArray(responseData)
          ? responseData
          : [],
      );
    } catch (error) {
      console.error(
        "Failed to load patients:",
        error,
      );

      messageApi.error(
        error?.response?.data
          ?.message ||
          error?.message ||
          "Failed to load patients",
      );
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  /* ========================================================
     PATIENT OPTIONS
  ======================================================== */

  const patientOptions = useMemo(() => {
    return patients.map(
      (patient) => {
        const patientId =
          getPatientId(patient);

        const name =
          getPatientName(patient);

        const mobile =
          getPatientMobile(patient);

        return {
          value: patientId,

          searchText: [
            patientId,
            name,
            mobile,
            getPatientNic(patient),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),

          label: (
            <div className="patient-media-patient-option">
              <div className="patient-media-patient-option-main">
                <span className="patient-media-patient-option-id">
                  {patientId}
                </span>

                <span className="patient-media-patient-option-name">
                  {name ||
                    "Unnamed patient"}
                </span>
              </div>

              {mobile && (
                <span className="patient-media-patient-option-mobile">
                  {mobile}
                </span>
              )}
            </div>
          ),
        };
      },
    );
  }, [patients]);

  /* ========================================================
     CATEGORY OPTIONS BASED ON MEDIA TYPE
  ======================================================== */

  const categoryOptions =
    useMemo(() => {
      if (
        selectedMediaType ===
        MEDIA_TYPES.XRAY
      ) {
        return XRAY_CATEGORIES.map(
          (item) => ({
            label: item,
            value: item,
          }),
        );
      }

      if (
        selectedMediaType ===
        MEDIA_TYPES.TREATMENT_PHOTO
      ) {
        return TREATMENT_PHOTO_CATEGORIES.map(
          (item) => ({
            label: item,
            value: item,
          }),
        );
      }

      return [];
    }, [selectedMediaType]);

  const showCategory =
    selectedMediaType ===
      MEDIA_TYPES.XRAY ||
    selectedMediaType ===
      MEDIA_TYPES.TREATMENT_PHOTO;

  /* ========================================================
     MEDIA TYPE CHANGE
  ======================================================== */

  const handleMediaTypeChange = (
    value,
  ) => {
    setSelectedMediaType(
      value || null,
    );

    form.setFieldsValue({
      category: undefined,
    });

    setUploadComplete(false);
  };

  /* ========================================================
     FILE VALIDATION
  ======================================================== */

  const beforeUpload = (file) => {
    const sizeMb =
      file.size / 1024 / 1024;

    if (
      sizeMb >
      MAX_FILE_SIZE_MB
    ) {
      messageApi.error(
        `${file.name} is larger than ${MAX_FILE_SIZE_MB} MB`,
      );

      return Upload.LIST_IGNORE;
    }

    return false;
  };

  /* ========================================================
     FILE CHANGE
  ======================================================== */

  const handleFileChange = ({
    fileList: nextFileList,
  }) => {
    setUploadComplete(false);

    const limitedFiles =
      nextFileList.slice(
        0,
        MAX_FILES,
      );

    setFileList(limitedFiles);

    if (
      nextFileList.length >
      MAX_FILES
    ) {
      messageApi.warning(
        `Maximum ${MAX_FILES} files can be uploaded at once`,
      );
    }
  };

  /* ========================================================
     REMOVE FILE
  ======================================================== */

  const handleRemoveFile = (
    fileUid,
  ) => {
    setFileList((current) =>
      current.filter(
        (file) =>
          file.uid !== fileUid,
      ),
    );
  };

  /* ========================================================
     CLEAR
  ======================================================== */

  const handleClear = () => {
    form.resetFields();

    setSelectedPatientId(null);

    setSelectedMediaType(null);

    setFileList([]);

    setUploadProgress(0);

    setUploadComplete(false);
  };

  /* ========================================================
     UPLOAD
  ======================================================== */

  const handleUpload = async () => {
    try {
      const values =
        await form.validateFields();

      if (!fileList.length) {
        messageApi.warning(
          "Please select at least one file",
        );

        return;
      }

      const formData =
        new FormData();

      /* =========================
         REQUIRED DATA
      ========================= */

      formData.append(
        "patient_id",
        values.patient_id,
      );

      formData.append(
        "media_type",
        values.media_type,
      );

      /* =========================
         OPTIONAL CATEGORY
      ========================= */

      if (values.category) {
        formData.append(
          "category",
          values.category,
        );
      }

      /* =========================
         DESCRIPTION
      ========================= */

      if (
        values.description?.trim()
      ) {
        formData.append(
          "description",
          values.description.trim(),
        );
      }

      /* =========================
         FILES
      ========================= */

      fileList.forEach((file) => {
        const actualFile =
          file.originFileObj ||
          file;

        formData.append(
          "files",
          actualFile,
        );
      });

      setUploading(true);

      setUploadProgress(0);

      setUploadComplete(false);

      const response =
        await uploadPatientMedia(
          formData,

          (progressEvent) => {
            if (
              !progressEvent.total
            ) {
              return;
            }

            const percentage =
              Math.round(
                (progressEvent.loaded *
                  100) /
                  progressEvent.total,
              );

            setUploadProgress(
              percentage,
            );
          },
        );

      const uploadedCount =
        response?.data?.data
          ?.length ??
        response?.data?.files
          ?.length ??
        fileList.length;

      setUploadProgress(100);

      setUploadComplete(true);

      messageApi.success(
        `${uploadedCount} file${
          uploadedCount === 1
            ? ""
            : "s"
        } uploaded successfully`,
      );

      setFileList([]);

      form.setFieldsValue({
        description: "",
        category: undefined,
      });
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error(
        "Patient media upload failed:",
        error,
      );

      messageApi.error(
        error?.response?.data
          ?.message ||
          error?.message ||
          "Failed to upload patient media",
      );

      setUploadComplete(false);
    } finally {
      setUploading(false);
    }
  };

  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <div className="patient-media-page">
      {contextHolder}

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="patient-media-header">
        <div>
          <div className="patient-media-header-icon">
            <MedicineBoxOutlined />
          </div>

          <div>
            <Title
              level={2}
              className="patient-media-title"
            >
              Patient Media Upload
            </Title>

            <Paragraph className="patient-media-subtitle">
              Upload X-rays,
              treatment photos,
              clinical photos and
              patient documents.
            </Paragraph>
          </div>
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={handleClear}
          disabled={uploading}
        >
          Clear
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
      >
        {/* ==================================================
            TOP ROW
        ================================================== */}

        <Row gutter={[20, 20]}>
          {/* =================================================
              PATIENT DETAILS
          ================================================= */}

          <Col
            xs={24}
            lg={12}
          >
            <Card
              className="patient-media-card patient-media-equal-card"
              title={
                <Space>
                  <UserOutlined />

                  <span>
                    Patient Details
                  </span>
                </Space>
              }
            >
              <Form.Item
                label="Patient"
                name="patient_id"
                rules={[
                  {
                    required: true,
                    message:
                      "Please select a patient",
                  },
                ]}
              >
                <Select
                  showSearch
                  allowClear
                  size="large"
                  loading={
                    loadingPatients
                  }
                  placeholder="Search by patient ID, name, mobile or NIC"
                  options={
                    patientOptions
                  }
                  filterOption={(
                    input,
                    option,
                  ) =>
                    String(
                      option?.searchText ||
                        "",
                    ).includes(
                      input
                        .toLowerCase()
                        .trim(),
                    )
                  }
                  onChange={(
                    value,
                  ) => {
                    setSelectedPatientId(
                      value || null,
                    );

                    setUploadComplete(
                      false,
                    );
                  }}
                />
              </Form.Item>

              {!selectedPatient && (
                <Alert
                  type="info"
                  showIcon
                  message="Select a patient"
                  description="Choose the patient whose clinical media you want to upload."
                />
              )}

              {selectedPatient && (
                <div className="patient-media-selected-patient">
                  <div className="patient-media-selected-avatar">
                    <UserOutlined />
                  </div>

                  <div className="patient-media-selected-details">
                    <div className="patient-media-selected-top">
                      <Text
                        strong
                        className="patient-media-selected-name"
                      >
                        {getPatientName(
                          selectedPatient,
                        ) ||
                          "Unnamed Patient"}
                      </Text>

                      <Tag color="blue">
                        {getPatientId(
                          selectedPatient,
                        )}
                      </Tag>
                    </div>

                    <Space
                      size={[18, 8]}
                      wrap
                    >
                      {getPatientMobile(
                        selectedPatient,
                      ) && (
                        <Text type="secondary">
                          Mobile:{" "}
                          {getPatientMobile(
                            selectedPatient,
                          )}
                        </Text>
                      )}

                      {getPatientNic(
                        selectedPatient,
                      ) && (
                        <Text type="secondary">
                          NIC:{" "}
                          {getPatientNic(
                            selectedPatient,
                          )}
                        </Text>
                      )}
                    </Space>
                  </div>
                </div>
              )}
            </Card>
          </Col>

          {/* =================================================
              MEDIA DETAILS
          ================================================= */}

          <Col
            xs={24}
            lg={12}
          >
            <Card
              className="patient-media-card patient-media-equal-card"
              title={
                <Space>
                  <FileImageOutlined />

                  <span>
                    Media Details
                  </span>
                </Space>
              }
            >
              <Row gutter={[16, 0]}>
                <Col
                  xs={24}
                  md={
                    showCategory
                      ? 12
                      : 24
                  }
                >
                  <Form.Item
                    label="Media Type"
                    name="media_type"
                    rules={[
                      {
                        required:
                          true,
                        message:
                          "Please select media type",
                      },
                    ]}
                  >
                    <Select
                      size="large"
                      placeholder="Select media type"
                      options={
                        MEDIA_TYPE_OPTIONS
                      }
                      onChange={
                        handleMediaTypeChange
                      }
                    />
                  </Form.Item>
                </Col>

                {showCategory && (
                  <Col
                    xs={24}
                    md={12}
                  >
                    <Form.Item
                      label={
                        selectedMediaType ===
                        MEDIA_TYPES.XRAY
                          ? "X-Ray Category"
                          : "Photo Stage"
                      }
                      name="category"
                      rules={[
                        {
                          required:
                            true,
                          message:
                            selectedMediaType ===
                            MEDIA_TYPES.XRAY
                              ? "Please select X-ray category"
                              : "Please select treatment photo stage",
                        },
                      ]}
                    >
                      <Select
                        size="large"
                        placeholder={
                          selectedMediaType ===
                          MEDIA_TYPES.XRAY
                            ? "Select X-ray category"
                            : "Select photo stage"
                        }
                        options={
                          categoryOptions
                        }
                      />
                    </Form.Item>
                  </Col>
                )}
              </Row>

              <Form.Item
                label="Description"
                name="description"
              >
                <Input.TextArea
                  rows={4}
                  maxLength={250}
                  showCount
                  placeholder={
                    selectedMediaType ===
                    MEDIA_TYPES.XRAY
                      ? "Example: Upper right first molar IOPA"
                      : selectedMediaType ===
                          MEDIA_TYPES.TREATMENT_PHOTO
                        ? "Example: Before crown preparation"
                        : selectedMediaType ===
                            MEDIA_TYPES.CLINICAL_PHOTO
                          ? "Example: Intraoral clinical photograph"
                          : selectedMediaType ===
                              MEDIA_TYPES.DOCUMENT
                            ? "Example: Referral letter"
                            : "Add optional notes about this media"
                  }
                />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* ==================================================
            BOTTOM ROW
        ================================================== */}

        <Row>
          <Col span={24}>
            <Card
              className="patient-media-card"
              title={
                <Space>
                  <UploadOutlined />

                  <span>
                    Upload Files
                  </span>
                </Space>
              }
            >
              <Alert
                type="info"
                showIcon
                className="patient-media-info"
                message="Supported files"
                description={`JPG, JPEG, PNG, WEBP, HEIC, HEIF and PDF. Maximum ${MAX_FILE_SIZE_MB} MB per file and ${MAX_FILES} files per upload.`}
              />

              <Dragger
                multiple
                accept={
                  ACCEPTED_FILE_EXTENSIONS
                }
                beforeUpload={
                  beforeUpload
                }
                fileList={[]}
                showUploadList={
                  false
                }
                onChange={
                  handleFileChange
                }
                disabled={
                  uploading ||
                  !selectedPatient ||
                  !selectedMediaType
                }
                className="patient-media-dragger"
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>

                <p className="ant-upload-text">
                  {!selectedPatient
                    ? "Select a patient first"
                    : !selectedMediaType
                      ? "Select a media type first"
                      : "Click or drag files here to upload"}
                </p>

                <p className="ant-upload-hint">
                  You can upload
                  multiple files together.
                </p>
              </Dragger>

              {/* ============================================
                  SELECTED FILES
              ============================================ */}

              {fileList.length >
                0 && (
                <div className="patient-media-files-section">
                  <div className="patient-media-files-header">
                    <Text strong>
                      Selected Files
                    </Text>

                    <Tag>
                      {fileList.length} /{" "}
                      {MAX_FILES}
                    </Tag>
                  </div>

                  <div className="patient-media-files-list">
                    {fileList.map(
                      (file) => (
                        <div
                          key={
                            file.uid
                          }
                          className="patient-media-file-row"
                        >
                          <div className="patient-media-file-main">
                            {getFileIcon(
                              file,
                            )}

                            <div className="patient-media-file-info">
                              <Text
                                strong
                                ellipsis
                              >
                                {
                                  file.name
                                }
                              </Text>

                              <Text
                                type="secondary"
                                className="patient-media-file-size"
                              >
                                {getFileSize(
                                  file.size ||
                                    file
                                      ?.originFileObj
                                      ?.size,
                                )}
                              </Text>
                            </div>
                          </div>

                          <Button
                            type="text"
                            danger
                            icon={
                              <DeleteOutlined />
                            }
                            disabled={
                              uploading
                            }
                            onClick={() =>
                              handleRemoveFile(
                                file.uid,
                              )
                            }
                          />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* ============================================
                  PROGRESS
              ============================================ */}

              {(uploading ||
                uploadProgress >
                  0) && (
                <div className="patient-media-progress">
                  <div className="patient-media-progress-header">
                    <Text strong>
                      {uploading
                        ? "Uploading..."
                        : uploadComplete
                          ? "Upload completed"
                          : "Upload"}
                    </Text>

                    <Text type="secondary">
                      {
                        uploadProgress
                      }
                      %
                    </Text>
                  </div>

                  <Progress
                    percent={
                      uploadProgress
                    }
                    status={
                      uploadComplete
                        ? "success"
                        : "active"
                    }
                  />
                </div>
              )}

              {uploadComplete && (
                <Alert
                  type="success"
                  showIcon
                  icon={
                    <CheckCircleFilled />
                  }
                  className="patient-media-success"
                  message="Patient media uploaded successfully"
                />
              )}

              {/* ============================================
                  ACTIONS
              ============================================ */}

              <div className="patient-media-actions">
                <Button
                  size="large"
                  onClick={
                    handleClear
                  }
                  disabled={
                    uploading
                  }
                >
                  Clear
                </Button>

                <Button
                  type="primary"
                  size="large"
                  icon={
                    <UploadOutlined />
                  }
                  loading={
                    uploading
                  }
                  disabled={
                    !selectedPatient ||
                    !selectedMediaType ||
                    !fileList.length
                  }
                  onClick={
                    handleUpload
                  }
                >
                  Upload Files
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default PatientMediaUpload;