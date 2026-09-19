import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Image,
  Modal,
  Row,
  Segmented,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import {
  deletePatientMedia,
  downloadPatientMedia,
  getPatientMedia,
  getPatientMediaViewUrl,
} from "../../api/endPoints";

import PatientMediaUploadModal from "./PatientMediaUploadModal";
import PatientMediaPreviewModal from "./PatientMediaPreviewModal";

import "../css/PatientMediaTab.css";

const { Title, Text } = Typography;

/* ========================================================
   MEDIA TYPES
======================================================== */

const MEDIA_TYPES = {
  XRAY: "X-Ray",
  TREATMENT_PHOTO: "Treatment Photo",
  CLINICAL_PHOTO: "Clinical Photo",
  DOCUMENT: "Document",
  OTHER: "Other",
};

/* ========================================================
   HELPERS
======================================================== */

const getMediaId = (item) =>
  item?.media_id ||
  item?.mediaId ||
  item?.id ||
  "";

const getMediaType = (item) =>
  item?.media_type ||
  item?.mediaType ||
  "";

const getMediaCategory = (item) =>
  item?.category ||
  item?.media_category ||
  "";

const getMediaDescription = (item) =>
  item?.description || "";

const getMediaFileName = (item) =>
  item?.file_name ||
  item?.filename ||
  item?.name ||
  "Patient file";

const getMediaMimeType = (item) =>
  item?.mime_type ||
  item?.mimeType ||
  "";

const getMediaCreatedAt = (item) =>
  item?.media_date ||
  item?.created_at ||
  item?.createdAt ||
  item?.created_time ||
  "";

const isImageMedia = (item) => {
  const mimeType = String(
    getMediaMimeType(item),
  ).toLowerCase();

  const fileName = String(
    getMediaFileName(item),
  ).toLowerCase();

  return (
    mimeType.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|heic|heif)$/.test(
      fileName,
    )
  );
};

const isPdfMedia = (item) => {
  const mimeType = String(
    getMediaMimeType(item),
  ).toLowerCase();

  const fileName = String(
    getMediaFileName(item),
  ).toLowerCase();

  return (
    mimeType === "application/pdf" ||
    fileName.endsWith(".pdf")
  );
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ========================================================
   COMPONENT
======================================================== */

const PatientMediaTab = ({
  patientId,
  patient,
  onCountChange,
}) => {
  const [messageApi, contextHolder] =
    message.useMessage();

  const [media, setMedia] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [filter, setFilter] =
    useState("All");

  const [uploadOpen, setUploadOpen] =
    useState(false);

  const [previewOpen, setPreviewOpen] =
    useState(false);

  const [selectedMedia, setSelectedMedia] =
    useState(null);

  const [deletingMediaId, setDeletingMediaId] =
    useState(null);

  /* ========================================================
     LOAD MEDIA
  ======================================================== */

  const loadMedia = useCallback(async () => {
    if (!patientId) {
      setMedia([]);
      return;
    }

    try {
      setLoading(true);

      const response =
        await getPatientMedia(patientId);

      const data =
        response?.data?.data ??
        response?.data?.media ??
        response?.data ??
        [];

      const mediaData = Array.isArray(data)
        ? data
        : [];

      setMedia(mediaData);

      onCountChange?.(mediaData.length);
    } catch (error) {
      console.error(
        "Failed to load patient media:",
        error,
      );

      setMedia([]);

      onCountChange?.(0);

      messageApi.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load patient media",
      );
    } finally {
      setLoading(false);
    }
  }, [
    patientId,
    messageApi,
    onCountChange,
  ]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  useEffect(() => {
    setFilter("All");
    setSelectedMedia(null);
    setPreviewOpen(false);
    setUploadOpen(false);
  }, [patientId]);

  /* ========================================================
     COUNTS
  ======================================================== */

  const counts = useMemo(() => {
    const result = {
      All: media.length,
    };

    Object.values(MEDIA_TYPES).forEach(
      (type) => {
        result[type] = media.filter(
          (item) =>
            getMediaType(item) === type,
        ).length;
      },
    );

    return result;
  }, [media]);

  /* ========================================================
     FILTER
  ======================================================== */

  const filteredMedia = useMemo(() => {
    if (filter === "All") {
      return media;
    }

    return media.filter(
      (item) =>
        getMediaType(item) === filter,
    );
  }, [media, filter]);

  const filterOptions = [
    {
      label: `All (${counts.All || 0})`,
      value: "All",
    },
    {
      label: `X-Ray (${counts[MEDIA_TYPES.XRAY] || 0})`,
      value: MEDIA_TYPES.XRAY,
    },
    {
      label: `Treatment (${
        counts[MEDIA_TYPES.TREATMENT_PHOTO] || 0
      })`,
      value: MEDIA_TYPES.TREATMENT_PHOTO,
    },
    {
      label: `Clinical (${
        counts[MEDIA_TYPES.CLINICAL_PHOTO] || 0
      })`,
      value: MEDIA_TYPES.CLINICAL_PHOTO,
    },
    {
      label: `Documents (${
        counts[MEDIA_TYPES.DOCUMENT] || 0
      })`,
      value: MEDIA_TYPES.DOCUMENT,
    },
    {
      label: `Other (${
        counts[MEDIA_TYPES.OTHER] || 0
      })`,
      value: MEDIA_TYPES.OTHER,
    },
  ];

  /* ========================================================
     PREVIEW
  ======================================================== */

  const handlePreview = (item) => {
    setSelectedMedia(item);
    setPreviewOpen(true);
  };

  /* ========================================================
     DOWNLOAD
  ======================================================== */

  const handleDownload = async (item) => {
    try {
      const mediaId = getMediaId(item);

      if (!mediaId) {
        throw new Error(
          "Media ID is missing",
        );
      }

      const response =
        await downloadPatientMedia(mediaId);

      const blob = new Blob(
        [response.data],
        {
          type:
            getMediaMimeType(item) ||
            "application/octet-stream",
        },
      );

      const url =
        window.URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = url;

      anchor.download =
        getMediaFileName(item);

      document.body.appendChild(anchor);

      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Media download failed:",
        error,
      );

      messageApi.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to download media",
      );
    }
  };

  /* ========================================================
     DELETE
  ======================================================== */

  const handleDelete = (item) => {
    const mediaId = getMediaId(item);

    if (!mediaId) {
      messageApi.error(
        "Media ID is missing",
      );
      return;
    }

    Modal.confirm({
      title: "Delete patient media?",
      content:
        "This media record will be permanently removed.",
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: {
        danger: true,
      },

      onOk: async () => {
        try {
          setDeletingMediaId(mediaId);

          await deletePatientMedia(
            mediaId,
          );

          messageApi.success(
            "Patient media deleted successfully",
          );

          await loadMedia();
        } catch (error) {
          console.error(
            "Failed to delete media:",
            error,
          );

          messageApi.error(
            error?.response?.data
              ?.message ||
              error?.message ||
              "Failed to delete media",
          );
        } finally {
          setDeletingMediaId(null);
        }
      },
    });
  };

  /* ========================================================
     RENDER
  ======================================================== */

  if (!patientId) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Patient ID is unavailable"
      />
    );
  }

  return (
    <div className="patient-media-tab">
      {contextHolder}

      <div className="patient-media-tab-header">
        <div>
          <Title level={4}>
            Clinical Media
          </Title>

          <Text type="secondary">
            X-rays, treatment photographs,
            clinical photographs and patient
            documents.
          </Text>
        </div>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={loadMedia}
          >
            Refresh
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() =>
              setUploadOpen(true)
            }
          >
            Add Media
          </Button>
        </Space>
      </div>

      <div className="patient-media-tab-filter">
        <Segmented
          value={filter}
          options={filterOptions}
          onChange={setFilter}
        />
      </div>

      {loading ? (
        <div className="patient-media-tab-loading">
          <Spin size="large" />

          <Text type="secondary">
            Loading patient media...
          </Text>
        </div>
      ) : filteredMedia.length === 0 ? (
        <Empty
          image={
            Empty.PRESENTED_IMAGE_SIMPLE
          }
          description={
            filter === "All"
              ? "No media has been uploaded for this patient"
              : `No ${filter} media found`
          }
        >
          {filter === "All" && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                setUploadOpen(true)
              }
            >
              Add First Media
            </Button>
          )}
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredMedia.map((item) => {
            const mediaId =
              getMediaId(item);

            const viewUrl =
              getPatientMediaViewUrl(
                mediaId,
              );

            return (
              <Col
                key={mediaId}
                xs={24}
                sm={12}
                lg={8}
                xl={6}
              >
                <Card
                  hoverable
                  className="patient-media-item-card"
                  cover={
                    <div className="patient-media-item-preview">
                      {isImageMedia(item) ? (
                        <Image
                          src={viewUrl}
                          preview={false}
                          className="patient-media-item-image"
                        />
                      ) : isPdfMedia(item) ? (
                        <FilePdfOutlined className="patient-media-item-large-icon patient-media-item-large-icon--pdf" />
                      ) : (
                        <FileImageOutlined className="patient-media-item-large-icon" />
                      )}
                    </div>
                  }
                >
                  <div className="patient-media-item-body">
                    <Tooltip
                      title={getMediaFileName(
                        item,
                      )}
                    >
                      <Text
                        strong
                        ellipsis
                        className="patient-media-item-name"
                      >
                        {getMediaFileName(
                          item,
                        )}
                      </Text>
                    </Tooltip>

                    <Space
                      size={[5, 5]}
                      wrap
                    >
                      <Tag color="blue">
                        {getMediaType(item) ||
                          "Media"}
                      </Tag>

                      {getMediaCategory(
                        item,
                      ) && (
                        <Tag>
                          {getMediaCategory(
                            item,
                          )}
                        </Tag>
                      )}
                    </Space>

                    {getMediaDescription(
                      item,
                    ) && (
                      <Tooltip
                        title={getMediaDescription(
                          item,
                        )}
                      >
                        <Text
                          type="secondary"
                          ellipsis
                          className="patient-media-item-description"
                        >
                          {getMediaDescription(
                            item,
                          )}
                        </Text>
                      </Tooltip>
                    )}

                    {getMediaCreatedAt(
                      item,
                    ) && (
                      <Text
                        type="secondary"
                        className="patient-media-item-date"
                      >
                        {formatDate(
                          getMediaCreatedAt(
                            item,
                          ),
                        )}
                      </Text>
                    )}

                    <div className="patient-media-item-actions">
                      <Tooltip title="Preview">
                        <Button
                          icon={
                            <EyeOutlined />
                          }
                          onClick={() =>
                            handlePreview(
                              item,
                            )
                          }
                        />
                      </Tooltip>

                      <Tooltip title="Download">
                        <Button
                          icon={
                            <DownloadOutlined />
                          }
                          onClick={() =>
                            handleDownload(
                              item,
                            )
                          }
                        />
                      </Tooltip>

                      <Tooltip title="Delete">
                        <Button
                          danger
                          loading={
                            deletingMediaId ===
                            mediaId
                          }
                          icon={
                            <DeleteOutlined />
                          }
                          onClick={() =>
                            handleDelete(
                              item,
                            )
                          }
                        />
                      </Tooltip>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <PatientMediaUploadModal
        open={uploadOpen}
        patientId={patientId}
        patient={patient}
        onClose={() =>
          setUploadOpen(false)
        }
        onUploaded={async () => {
          setUploadOpen(false);
          setFilter("All");

          await loadMedia();
        }}
      />

      <PatientMediaPreviewModal
        open={previewOpen}
        media={selectedMedia}
        onClose={() => {
          setPreviewOpen(false);
          setSelectedMedia(null);
        }}
      />
    </div>
  );
};

export default PatientMediaTab;