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
  Empty,
  Image,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";

import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";

import {
  deletePatientMedia,
  downloadPatientMedia,
  getAllPatients,
  getPatientMedia,
  getPatientMediaViewUrl,
} from "../api/endPoints";

import "./css/PatientMediaLibrary.css";

const { Title, Text, Paragraph } = Typography;

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

const MEDIA_FILTER_OPTIONS = [
  {
    label: "All Media",
    value: "All",
  },
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

const getPatientName = (patient) =>
  patient?.patient_name ||
  patient?.full_name ||
  patient?.name ||
  [patient?.first_name, patient?.last_name]
    .filter(Boolean)
    .join(" ");

const getPatientMobile = (patient) =>
  patient?.mobile ||
  patient?.mobile_number ||
  patient?.phone ||
  patient?.telephone ||
  "";

/* ========================================================
   MEDIA HELPERS
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
  item?.description ||
  "";

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
  item?.created_at ||
  item?.createdAt ||
  item?.created_time ||
  item?.createdTime ||
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

/* ========================================================
   PAGE
======================================================== */

const PatientMediaLibrary = () => {
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

  const [media, setMedia] =
    useState([]);

  const [loadingMedia, setLoadingMedia] =
    useState(false);

  const [mediaFilter, setMediaFilter] =
    useState("All");

  const [
    selectedMedia,
    setSelectedMedia,
  ] = useState(null);

  const [
    previewOpen,
    setPreviewOpen,
  ] = useState(false);

  const [
    deletingMediaId,
    setDeletingMediaId,
  ] = useState(null);

  /* ========================================================
     SELECTED PATIENT
  ======================================================== */

  const selectedPatient =
    useMemo(() => {
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

      const data =
        response?.data?.data ??
        response?.data?.patients ??
        response?.data ??
        [];

      setPatients(
        Array.isArray(data)
          ? data
          : [],
      );
    } catch (error) {
      console.error(error);

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

  const patientOptions =
    useMemo(() => {
      return patients.map(
        (patient) => {
          const id =
            getPatientId(patient);

          const name =
            getPatientName(patient);

          const mobile =
            getPatientMobile(patient);

          return {
            value: id,

            searchText: [
              id,
              name,
              mobile,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase(),

            label: (
              <div className="patient-media-library-patient-option">
                <strong>
                  {id}
                </strong>

                <span>
                  {name ||
                    "Unnamed Patient"}
                </span>

                {mobile && (
                  <small>
                    {mobile}
                  </small>
                )}
              </div>
            ),
          };
        },
      );
    }, [patients]);

  /* ========================================================
     LOAD MEDIA
  ======================================================== */

  const loadMedia = async (
    patientId = selectedPatientId,
  ) => {
    if (!patientId) {
      setMedia([]);
      return;
    }

    try {
      setLoadingMedia(true);

      const response =
        await getPatientMedia(
          patientId,
        );

      const data =
        response?.data?.data ??
        response?.data?.media ??
        response?.data ??
        [];

      setMedia(
        Array.isArray(data)
          ? data
          : [],
      );
    } catch (error) {
      console.error(
        "Failed to load patient media:",
        error,
      );

      setMedia([]);

      messageApi.error(
        error?.response?.data
          ?.message ||
          error?.message ||
          "Failed to load patient media",
      );
    } finally {
      setLoadingMedia(false);
    }
  };

  /* ========================================================
     PATIENT CHANGE
  ======================================================== */

  const handlePatientChange = async (
    value,
  ) => {
    const patientId =
      value || null;

    setSelectedPatientId(
      patientId,
    );

    setMedia([]);

    setMediaFilter("All");

    setSelectedMedia(null);

    setPreviewOpen(false);

    if (patientId) {
      await loadMedia(patientId);
    }
  };

  /* ========================================================
     FILTER MEDIA
  ======================================================== */

  const filteredMedia =
    useMemo(() => {
      if (
        mediaFilter === "All"
      ) {
        return media;
      }

      return media.filter(
        (item) =>
          getMediaType(item) ===
          mediaFilter,
      );
    }, [media, mediaFilter]);

  /* ========================================================
     MEDIA COUNTS
  ======================================================== */

  const mediaCounts =
    useMemo(() => {
      const counts = {
        All: media.length,
      };

      Object.values(
        MEDIA_TYPES,
      ).forEach((type) => {
        counts[type] =
          media.filter(
            (item) =>
              getMediaType(item) ===
              type,
          ).length;
      });

      return counts;
    }, [media]);

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

  const handleDownload = async (
    item,
  ) => {
    try {
      const mediaId =
        getMediaId(item);

      const response =
        await downloadPatientMedia(
          mediaId,
        );

      const blob = new Blob(
        [response.data],
        {
          type:
            getMediaMimeType(
              item,
            ) ||
            "application/octet-stream",
        },
      );

      const url =
        window.URL.createObjectURL(
          blob,
        );

      const anchor =
        document.createElement("a");

      anchor.href = url;

      anchor.download =
        getMediaFileName(item);

      document.body.appendChild(
        anchor,
      );

      anchor.click();

      anchor.remove();

      window.URL.revokeObjectURL(
        url,
      );
    } catch (error) {
      console.error(
        "Download failed:",
        error,
      );

      messageApi.error(
        "Failed to download file",
      );
    }
  };

  /* ========================================================
     DELETE
  ======================================================== */

  const handleDelete = (item) => {
    const mediaId =
      getMediaId(item);

    Modal.confirm({
      title:
        "Delete patient media?",

      content:
        "This media record will be removed.",

      okText: "Delete",

      okButtonProps: {
        danger: true,
      },

      cancelText: "Cancel",

      onOk: async () => {
        try {
          setDeletingMediaId(
            mediaId,
          );

          await deletePatientMedia(
            mediaId,
          );

          messageApi.success(
            "Patient media deleted successfully",
          );

          await loadMedia();
        } catch (error) {
          console.error(
            "Delete failed:",
            error,
          );

          messageApi.error(
            error?.response?.data
              ?.message ||
              error?.message ||
              "Failed to delete media",
          );
        } finally {
          setDeletingMediaId(
            null,
          );
        }
      },
    });
  };

  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <div className="patient-media-library-page">
      {contextHolder}

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="patient-media-library-header">
        <div>
          <div className="patient-media-library-header-icon">
            <FolderOpenOutlined />
          </div>

          <div>
            <Title
              level={2}
              className="patient-media-library-title"
            >
              Patient Media Library
            </Title>

            <Paragraph className="patient-media-library-subtitle">
              View, download and manage
              patient X-rays, treatment
              photos and clinical files.
            </Paragraph>
          </div>
        </div>

        <Button
          icon={<ReloadOutlined />}
          disabled={
            !selectedPatientId ||
            loadingMedia
          }
          onClick={() =>
            loadMedia()
          }
        >
          Refresh
        </Button>
      </div>

      {/* ====================================================
          PATIENT SELECT
      ==================================================== */}

      <Card className="patient-media-library-card">
        <Row gutter={[20, 16]}>
          <Col
            xs={24}
            lg={16}
          >
            <Text strong>
              Patient
            </Text>

            <Select
              showSearch
              allowClear
              size="large"
              style={{
                width: "100%",
                marginTop: 8,
              }}
              loading={
                loadingPatients
              }
              placeholder="Search patient by ID, name or mobile"
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
              onChange={
                handlePatientChange
              }
            />
          </Col>

          <Col
            xs={24}
            lg={8}
          >
            <Text strong>
              Media Type
            </Text>

            <Select
              size="large"
              value={mediaFilter}
              style={{
                width: "100%",
                marginTop: 8,
              }}
              disabled={
                !selectedPatientId
              }
              options={MEDIA_FILTER_OPTIONS.map(
                (option) => ({
                  ...option,

                  label: `${option.label} (${mediaCounts[option.value] || 0})`,
                }),
              )}
              onChange={
                setMediaFilter
              }
            />
          </Col>
        </Row>

        {selectedPatient && (
          <div className="patient-media-library-patient-summary">
            <UserOutlined />

            <Text strong>
              {getPatientName(
                selectedPatient,
              )}
            </Text>

            <Tag color="blue">
              {getPatientId(
                selectedPatient,
              )}
            </Tag>

            {getPatientMobile(
              selectedPatient,
            ) && (
              <Text type="secondary">
                {getPatientMobile(
                  selectedPatient,
                )}
              </Text>
            )}
          </div>
        )}
      </Card>

      {/* ====================================================
          MEDIA
      ==================================================== */}

      <Card
        className="patient-media-library-card"
        title={
          selectedPatientId
            ? `Patient Media (${filteredMedia.length})`
            : "Patient Media"
        }
      >
        {!selectedPatientId && (
          <Alert
            showIcon
            type="info"
            message="Select a patient"
            description="Select a patient above to view their uploaded media."
          />
        )}

        {selectedPatientId &&
          loadingMedia && (
            <div className="patient-media-library-loading">
              <Spin size="large" />

              <Text type="secondary">
                Loading patient
                media...
              </Text>
            </div>
          )}

        {selectedPatientId &&
          !loadingMedia &&
          filteredMedia.length ===
            0 && (
            <Empty description="No media found for this patient" />
          )}

        {selectedPatientId &&
          !loadingMedia &&
          filteredMedia.length >
            0 && (
            <Row gutter={[18, 18]}>
              {filteredMedia.map(
                (item) => {
                  const mediaId =
                    getMediaId(
                      item,
                    );

                  const viewUrl =
                    getPatientMediaViewUrl(
                      mediaId,
                    );

                  return (
                    <Col
                      key={
                        mediaId
                      }
                      xs={24}
                      sm={12}
                      lg={8}
                      xl={6}
                    >
                      <Card
                        hoverable
                        className="patient-media-library-item"
                        cover={
                          <div className="patient-media-library-preview">
                            {isImageMedia(
                              item,
                            ) ? (
                              <Image
                                src={
                                  viewUrl
                                }
                                preview={
                                  false
                                }
                                className="patient-media-library-image"
                              />
                            ) : isPdfMedia(
                                item,
                              ) ? (
                              <FilePdfOutlined className="patient-media-library-large-icon patient-media-library-pdf" />
                            ) : (
                              <FileImageOutlined className="patient-media-library-large-icon" />
                            )}
                          </div>
                        }
                        actions={[
                          <EyeOutlined
                            key="view"
                            onClick={() =>
                              handlePreview(
                                item,
                              )
                            }
                          />,

                          <DownloadOutlined
                            key="download"
                            onClick={() =>
                              handleDownload(
                                item,
                              )
                            }
                          />,

                          <DeleteOutlined
                            key="delete"
                            spin={
                              deletingMediaId ===
                              mediaId
                            }
                            onClick={() =>
                              handleDelete(
                                item,
                              )
                            }
                          />,
                        ]}
                      >
                        <Card.Meta
                          title={
                            <Text
                              strong
                              ellipsis
                            >
                              {getMediaFileName(
                                item,
                              )}
                            </Text>
                          }
                          description={
                            <Space
                              direction="vertical"
                              size={6}
                              style={{
                                width:
                                  "100%",
                              }}
                            >
                              <Space
                                wrap
                              >
                                <Tag color="blue">
                                  {getMediaType(
                                    item,
                                  ) ||
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
                                <Text
                                  type="secondary"
                                  ellipsis
                                >
                                  {getMediaDescription(
                                    item,
                                  )}
                                </Text>
                              )}

                              {getMediaCreatedAt(
                                item,
                              ) && (
                                <Text
                                  type="secondary"
                                  className="patient-media-library-date"
                                >
                                  {getMediaCreatedAt(
                                    item,
                                  )}
                                </Text>
                              )}
                            </Space>
                          }
                        />
                      </Card>
                    </Col>
                  );
                },
              )}
            </Row>
          )}
      </Card>

      {/* ====================================================
          PREVIEW MODAL
      ==================================================== */}

      <Modal
        open={previewOpen}
        width={900}
        footer={null}
        destroyOnClose
        title={
          selectedMedia
            ? getMediaFileName(
                selectedMedia,
              )
            : "Media Preview"
        }
        onCancel={() => {
          setPreviewOpen(false);
          setSelectedMedia(null);
        }}
      >
        {selectedMedia &&
          isImageMedia(
            selectedMedia,
          ) && (
            <div className="patient-media-library-modal-image-wrap">
              <Image
                src={getPatientMediaViewUrl(
                  getMediaId(
                    selectedMedia,
                  ),
                )}
                className="patient-media-library-modal-image"
              />
            </div>
          )}

        {selectedMedia &&
          isPdfMedia(
            selectedMedia,
          ) && (
            <iframe
              title="Patient PDF"
              src={getPatientMediaViewUrl(
                getMediaId(
                  selectedMedia,
                ),
              )}
              className="patient-media-library-pdf-frame"
            />
          )}

        {selectedMedia &&
          !isImageMedia(
            selectedMedia,
          ) &&
          !isPdfMedia(
            selectedMedia,
          ) && (
            <Empty description="Preview is not available for this file type" />
          )}
      </Modal>
    </div>
  );
};

export default PatientMediaLibrary;