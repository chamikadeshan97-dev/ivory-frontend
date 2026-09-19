import React from "react";

import {
  Empty,
  Image,
  Modal,
  Space,
  Tag,
  Typography,
} from "antd";

import {
  FilePdfOutlined,
} from "@ant-design/icons";

import {
  getPatientMediaViewUrl,
} from "../../api/endPoints";

const { Text } = Typography;

const getMediaId = (item) =>
  item?.media_id ||
  item?.mediaId ||
  item?.id ||
  "";

const getMediaFileName = (item) =>
  item?.file_name ||
  item?.filename ||
  item?.name ||
  "Patient Media";

const getMediaMimeType = (item) =>
  item?.mime_type ||
  item?.mimeType ||
  "";

const getMediaType = (item) =>
  item?.media_type ||
  item?.mediaType ||
  "";

const getMediaCategory = (item) =>
  item?.category ||
  item?.media_category ||
  "";

const isImage = (item) => {
  const mime = String(
    getMediaMimeType(item),
  ).toLowerCase();

  const fileName = String(
    getMediaFileName(item),
  ).toLowerCase();

  return (
    mime.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|heic|heif)$/.test(
      fileName,
    )
  );
};

const isPdf = (item) => {
  const mime = String(
    getMediaMimeType(item),
  ).toLowerCase();

  return (
    mime === "application/pdf" ||
    String(
      getMediaFileName(item),
    )
      .toLowerCase()
      .endsWith(".pdf")
  );
};

const PatientMediaPreviewModal = ({
  open,
  media,
  onClose,
}) => {
  if (!media) {
    return null;
  }

  const mediaId =
    getMediaId(media);

  const viewUrl =
    getPatientMediaViewUrl(
      mediaId,
    );

  return (
    <Modal
      open={open}
      width={900}
      centered
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      title={
        <div>
          <Text strong>
            {getMediaFileName(
              media,
            )}
          </Text>

          <div>
            <Space
              size={5}
              wrap
            >
              {getMediaType(
                media,
              ) && (
                <Tag color="blue">
                  {getMediaType(
                    media,
                  )}
                </Tag>
              )}

              {getMediaCategory(
                media,
              ) && (
                <Tag>
                  {getMediaCategory(
                    media,
                  )}
                </Tag>
              )}
            </Space>
          </div>
        </div>
      }
    >
      {isImage(media) ? (
        <div
          style={{
            textAlign: "center",
          }}
        >
          <Image
            src={viewUrl}
            style={{
              maxHeight: "70vh",
              objectFit: "contain",
            }}
          />
        </div>
      ) : isPdf(media) ? (
        <iframe
          title="Patient PDF"
          src={viewUrl}
          style={{
            width: "100%",
            height: "70vh",
            border: 0,
            borderRadius: 8,
          }}
        />
      ) : (
        <Empty
          image={
            <FilePdfOutlined
              style={{
                fontSize: 50,
              }}
            />
          }
          description="Preview is not available for this file type"
        />
      )}
    </Modal>
  );
};

export default PatientMediaPreviewModal;