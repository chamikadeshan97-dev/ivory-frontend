import React, {
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";

import {
  DeleteOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  InboxOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";

import {
  uploadPatientMedia,
} from "../../api/endPoints";

import "../css/PatientMediaUploadModal.css";

const { Text } = Typography;
const { Dragger } = Upload;

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 10;

const ACCEPTED_FILE_EXTENSIONS =
  ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf";

const MEDIA_TYPES = {
  XRAY: "X-Ray",
  TREATMENT_PHOTO:
    "Treatment Photo",
  CLINICAL_PHOTO:
    "Clinical Photo",
  DOCUMENT: "Document",
  OTHER: "Other",
};

const MEDIA_TYPE_OPTIONS = [
  {
    label: "X-Ray",
    value: MEDIA_TYPES.XRAY,
  },
  {
    label: "Treatment Photo",
    value:
      MEDIA_TYPES.TREATMENT_PHOTO,
  },
  {
    label: "Clinical Photo",
    value:
      MEDIA_TYPES.CLINICAL_PHOTO,
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

const getPatientName = (patient) =>
  patient?.name ||
  patient?.patient_name ||
  patient?.full_name ||
  "Patient";

const getFileSize = (size) => {
  const bytes = Number(size || 0);

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
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
      <FilePdfOutlined className="patient-media-upload-file-icon patient-media-upload-file-icon--pdf" />
    );
  }

  return (
    <FileImageOutlined className="patient-media-upload-file-icon" />
  );
};

const PatientMediaUploadModal = ({
  open,
  patientId,
  patient,
  onClose,
  onUploaded,
}) => {
  const [form] = Form.useForm();

  const [messageApi, contextHolder] =
    message.useMessage();

  const [mediaType, setMediaType] =
    useState(null);

  const [fileList, setFileList] =
    useState([]);

  const [uploading, setUploading] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const categoryOptions =
    useMemo(() => {
      if (
        mediaType ===
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
        mediaType ===
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
    }, [mediaType]);

  const showCategory =
    mediaType === MEDIA_TYPES.XRAY ||
    mediaType ===
      MEDIA_TYPES.TREATMENT_PHOTO;

  const resetModal = () => {
    form.resetFields();

    setMediaType(null);
    setFileList([]);
    setProgress(0);
  };

  const handleClose = () => {
    if (uploading) {
      return;
    }

    resetModal();
    onClose?.();
  };

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

  const handleFileChange = ({
    fileList: nextFileList,
  }) => {
    const limited =
      nextFileList.slice(
        0,
        MAX_FILES,
      );

    setFileList(limited);

    if (
      nextFileList.length >
      MAX_FILES
    ) {
      messageApi.warning(
        `Maximum ${MAX_FILES} files can be uploaded at once`,
      );
    }
  };

  const handleUpload = async () => {
    try {
      const values =
        await form.validateFields();

      if (!patientId) {
        messageApi.error(
          "Patient ID is missing",
        );
        return;
      }

      if (!fileList.length) {
        messageApi.warning(
          "Please select at least one file",
        );
        return;
      }

      const formData =
        new FormData();

      formData.append(
        "patient_id",
        patientId,
      );

      formData.append(
        "media_type",
        values.media_type,
      );

      if (values.category) {
        formData.append(
          "category",
          values.category,
        );
      }

      if (
        values.description?.trim()
      ) {
        formData.append(
          "description",
          values.description.trim(),
        );
      }

      fileList.forEach((file) => {
        formData.append(
          "files",
          file.originFileObj ||
            file,
        );
      });

      setUploading(true);
      setProgress(0);

      const response =
        await uploadPatientMedia(
          formData,
          (event) => {
            if (!event.total) {
              return;
            }

            setProgress(
              Math.round(
                (event.loaded * 100) /
                  event.total,
              ),
            );
          },
        );

      const uploadedCount =
        response?.data?.data
          ?.length ??
        response?.data?.files
          ?.length ??
        fileList.length;

      setProgress(100);

      messageApi.success(
        `${uploadedCount} file${
          uploadedCount === 1
            ? ""
            : "s"
        } uploaded successfully`,
      );

      resetModal();

      await onUploaded?.();
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
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {contextHolder}

      <Modal
        open={open}
        title="Add Patient Media"
        width={760}
        centered
        destroyOnHidden
        onCancel={handleClose}
        footer={[
          <Button
            key="cancel"
            disabled={uploading}
            onClick={handleClose}
          >
            Cancel
          </Button>,

          <Button
            key="upload"
            type="primary"
            icon={<UploadOutlined />}
            loading={uploading}
            disabled={!fileList.length}
            onClick={handleUpload}
          >
            Upload Files
          </Button>,
        ]}
        className="patient-media-upload-modal"
      >
        <div className="patient-media-upload-patient">
          <div className="patient-media-upload-patient__icon">
            <UserOutlined />
          </div>

          <div>
            <Text strong>
              {getPatientName(
                patient,
              )}
            </Text>

            <div>
              <Tag color="blue">
                {patientId}
              </Tag>
            </div>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="Media Type"
            name="media_type"
            rules={[
              {
                required: true,
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
              onChange={(value) => {
                setMediaType(
                  value || null,
                );

                form.setFieldValue(
                  "category",
                  undefined,
                );
              }}
            />
          </Form.Item>

          {showCategory && (
            <Form.Item
              label={
                mediaType ===
                MEDIA_TYPES.XRAY
                  ? "X-Ray Category"
                  : "Photo Stage"
              }
              name="category"
              rules={[
                {
                  required: true,
                  message:
                    mediaType ===
                    MEDIA_TYPES.XRAY
                      ? "Please select X-ray category"
                      : "Please select photo stage",
                },
              ]}
            >
              <Select
                size="large"
                placeholder={
                  mediaType ===
                  MEDIA_TYPES.XRAY
                    ? "Select X-ray category"
                    : "Select photo stage"
                }
                options={
                  categoryOptions
                }
              />
            </Form.Item>
          )}

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea
              rows={3}
              maxLength={250}
              showCount
              placeholder="Add optional notes about this media"
            />
          </Form.Item>

          <Alert
            type="info"
            showIcon
            className="patient-media-upload-info"
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
            showUploadList={false}
            onChange={
              handleFileChange
            }
            disabled={uploading}
            className="patient-media-upload-dragger"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>

            <p className="ant-upload-text">
              Click or drag files here
            </p>

            <p className="ant-upload-hint">
              Multiple files can be
              uploaded together.
            </p>
          </Dragger>

          {fileList.length > 0 && (
            <div className="patient-media-upload-files">
              <div className="patient-media-upload-files__header">
                <Text strong>
                  Selected Files
                </Text>

                <Tag>
                  {fileList.length} /{" "}
                  {MAX_FILES}
                </Tag>
              </div>

              {fileList.map(
                (file) => (
                  <div
                    key={file.uid}
                    className="patient-media-upload-file"
                  >
                    <Space>
                      {getFileIcon(
                        file,
                      )}

                      <div>
                        <Text strong>
                          {file.name}
                        </Text>

                        <div>
                          <Text type="secondary">
                            {getFileSize(
                              file.size ||
                                file
                                  ?.originFileObj
                                  ?.size,
                            )}
                          </Text>
                        </div>
                      </div>
                    </Space>

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
                        setFileList(
                          (
                            current,
                          ) =>
                            current.filter(
                              (
                                currentFile,
                              ) =>
                                currentFile.uid !==
                                file.uid,
                            ),
                        )
                      }
                    />
                  </div>
                ),
              )}
            </div>
          )}

          {uploading && (
            <div className="patient-media-upload-progress">
              <Progress
                percent={progress}
                status="active"
              />
            </div>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default PatientMediaUploadModal;