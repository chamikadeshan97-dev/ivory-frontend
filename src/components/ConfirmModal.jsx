import React from "react";
import { Button, Modal } from "antd";

import {
  CheckCircleFilled,
  CloseOutlined,
  ExclamationCircleFilled,
  InfoCircleFilled,
  QuestionCircleFilled,
  WarningFilled,
} from "@ant-design/icons";

/* =========================================================
   IMAGES
========================================================= */

import xrayImage from "../assets/x-ray.png";
import inTreatmentImage from "../assets/intreatment.png";
import anestheticImage from "../assets/anesthetic.png";
import completeTreatmentImage from "../assets/completeTreatmentImage.png";

import "./css/ConfirmModal.css";

/* =========================================================
   TYPE CONFIG
========================================================= */

const TYPE_CONFIG = {
  info: {
    icon: <InfoCircleFilled />,
    className: "confirm-modal-info",
  },

  question: {
    icon: <QuestionCircleFilled />,
    className: "confirm-modal-question",
  },

  success: {
    icon: <CheckCircleFilled />,
    className: "confirm-modal-success",
  },

  warning: {
    icon: <WarningFilled />,
    className: "confirm-modal-warning",
  },

  danger: {
    icon: <ExclamationCircleFilled />,
    className: "confirm-modal-danger",
  },
};

/* =========================================================
   IMAGE CONFIG

   Usage:
   imageType="xray"
   imageType="anesthetic"
   imageType="intreatment"
   imageType="complete"
========================================================= */

const IMAGE_CONFIG = {
  xray: {
    src: xrayImage,
    alt: "Patient requested dental X-ray",
  },

  anesthetic: {
    src: anestheticImage,
    alt: "Patient waiting for anesthetic to take effect",
  },

  intreatment: {
    src: inTreatmentImage,
    alt: "Patient starting dental treatment",
  },

  complete: {
    src: completeTreatmentImage,
    alt: "Dental treatment completed successfully",
  },
};

/* =========================================================
   WAITING REASONS

   These are shown when:
   showWaitingReasons={true}
========================================================= */

const WAITING_REASON_OPTIONS = [
  {
    value: "xray",
    title: "X-Ray",
    description: "Patient needs a dental X-ray",
    image: xrayImage,
  },

  {
    value: "anesthetic",
    title: "Anesthetic",
    description: "Waiting for anesthetic to take effect",
    image: anestheticImage,
  },
];

/* =========================================================
   CONFIRM MODAL
========================================================= */

const ConfirmModal = ({
  open,

  /* -------------------------------------------------------
     Content
  ------------------------------------------------------- */

  title = "Are you sure?",
  description,

  /* -------------------------------------------------------
     Image

     imageType uses IMAGE_CONFIG.
     image can override imageType with a custom image.
  ------------------------------------------------------- */

  imageType,
  image,

  /* -------------------------------------------------------
     Modal Type
  ------------------------------------------------------- */

  type = "question",

  /* -------------------------------------------------------
     Buttons
  ------------------------------------------------------- */

  confirmText = "Confirm",
  cancelText = "Cancel",

  confirmIcon,
  cancelIcon = <CloseOutlined />,

  /* -------------------------------------------------------
     State
  ------------------------------------------------------- */

  loading = false,
  disabled = false,

  /* -------------------------------------------------------
     Waiting Reason Selector
  ------------------------------------------------------- */

  showWaitingReasons = false,

  waitingReason = "",

  onWaitingReasonChange,

  /* -------------------------------------------------------
     Actions
  ------------------------------------------------------- */

  onConfirm,
  onCancel,
}) => {
  /* =======================================================
     CONFIG
  ======================================================= */

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.question;

  /* =======================================================
     IMAGE
  ======================================================= */

  const configuredImage = imageType ? IMAGE_CONFIG[imageType] : null;

  /*
   * Custom image takes priority.
   *
   * Example:
   *
   * <ConfirmModal image="/something.png" />
   *
   * otherwise:
   *
   * <ConfirmModal imageType="intreatment" />
   */

  const displayImage = image || configuredImage?.src;

  const imageAlt = configuredImage?.alt || title || "";

  /* =======================================================
     CONFIRM BUTTON STATE
  ======================================================= */

  const waitingReasonRequired = showWaitingReasons && !waitingReason;

  const confirmDisabled =
    disabled ||
    loading ||
    waitingReasonRequired;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <Modal
      open={open}
      centered
      footer={null}
      closable={!loading}
      maskClosable={!loading}
      keyboard={!loading}
      destroyOnClose={false}
      width={showWaitingReasons ? 620 : 460}
      className={[
        "common-confirm-modal",
        config.className,
        showWaitingReasons ? "confirm-modal-waiting-mode" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onCancel={onCancel}
    >
      <div className="confirm-modal-content">

        {/* =================================================
            NORMAL IMAGE / ICON
        ================================================= */}

        {!showWaitingReasons && (
          <>
            {displayImage ? (
              <div className="confirm-modal-image-wrapper">
                <img
                  src={displayImage}
                  alt={imageAlt}
                  className="confirm-modal-image"
                  draggable={false}
                />
              </div>
            ) : (
              <div className="confirm-modal-icon">
                {config.icon}
              </div>
            )}
          </>
        )}

        {/* =================================================
            TITLE
        ================================================= */}

        <h2 className="confirm-modal-title">
          {title}
        </h2>

        {/* =================================================
            DESCRIPTION
        ================================================= */}

        {description && (
          <div className="confirm-modal-description">
            {description}
          </div>
        )}

        {/* =================================================
            WAITING REASON SELECTOR
        ================================================= */}

        {showWaitingReasons && (
          <div className="confirm-waiting-section">

            <div className="confirm-waiting-label">
              Why is the patient waiting?
            </div>

            <div className="confirm-waiting-options">
              {WAITING_REASON_OPTIONS.map((option) => {
                const selected =
                  waitingReason === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={loading}
                    aria-pressed={selected}
                    className={[
                      "confirm-waiting-option",
                      selected
                        ? "confirm-waiting-option-selected"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      onWaitingReasonChange?.(
                        option.value,
                      )
                    }
                  >

                    {/* IMAGE */}

                    <div className="confirm-waiting-option-image-wrapper">

                      <img
                        src={option.image}
                        alt={option.title}
                        className="confirm-waiting-option-image"
                        draggable={false}
                      />

                      {/* SELECTED CHECK */}

                      {selected && (
                        <div className="confirm-waiting-selected-badge">
                          <CheckCircleFilled />
                        </div>
                      )}
                    </div>

                    {/* TITLE */}

                    <div className="confirm-waiting-option-title">
                      {option.title}
                    </div>

                    {/* DESCRIPTION */}

                    <div className="confirm-waiting-option-description">
                      {option.description}
                    </div>

                  </button>
                );
              })}
            </div>

            {/* SELECTED REASON */}

            {waitingReason && (
              <div className="confirm-waiting-selected-text">
                <CheckCircleFilled />

                <span>
                  Selected:{" "}
                  <strong>
                    {
                      WAITING_REASON_OPTIONS.find(
                        (option) =>
                          option.value ===
                          waitingReason,
                      )?.title
                    }
                  </strong>
                </span>
              </div>
            )}

            {/* HELP MESSAGE */}

            {!waitingReason && (
              <div className="confirm-waiting-help">
                Select X-Ray or Anesthetic to continue.
              </div>
            )}
          </div>
        )}

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="confirm-modal-actions">

          {/* CANCEL */}

          <Button
            size="large"
            icon={cancelIcon}
            disabled={loading}
            className="confirm-modal-cancel-button"
            onClick={onCancel}
          >
            {cancelText}
          </Button>

          {/* CONFIRM */}

          <Button
            type="primary"
            size="large"
            icon={confirmIcon}
            loading={loading}
            disabled={confirmDisabled}
            className="confirm-modal-confirm-button"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>

        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;