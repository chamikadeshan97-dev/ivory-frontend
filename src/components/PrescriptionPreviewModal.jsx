
import React, {
  forwardRef,
  useMemo,
} from "react";

import {
  Button,
  Modal,
  Space,
} from "antd";

import {
  PrinterOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import "./css/PrescriptionPreviewModal.css";

/* --------------------------------------------------------
   Prescription helpers
-------------------------------------------------------- */

const getPrescriptionLines = (prescription) => {
  if (Array.isArray(prescription)) {
    return prescription
      .map((line) => String(line || "").trim())
      .filter(Boolean);
  }

  return String(prescription || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const cleanPrescriptionLine = (line) => {
  return String(line || "")
    .replace(/\bDose\s*:\s*/gi, "")
    .replace(/\bDuration\s*:\s*/gi, "")
    .replace(/\s*\|\s*/g, "     ")
    .trim();
};

const getBooleanValue = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = String(
    value ?? "",
  )
    .trim()
    .toLowerCase();

  return [
    "true",
    "1",
    "yes",
  ].includes(normalizedValue);
};

const getPatientTitle = (
  patient,
  treatment,
) => {
  const gender = String(
    patient?.gender ||
      treatment?.patient_gender ||
      treatment?.gender ||
      "",
  )
    .trim()
    .toLowerCase();

  const maritalStatus = String(
    patient?.marital_status ||
      treatment?.marital_status ||
      "",
  )
    .trim()
    .toLowerCase();

  if (gender === "male") {
    return "Mr.";
  }

  if (gender === "female") {
    return maritalStatus === "married"
      ? "Mrs."
      : "Ms.";
  }

  return "";
};

/* --------------------------------------------------------
   Component
-------------------------------------------------------- */

const PrescriptionPreviewModal = forwardRef(
  (
    {
      open,
      onClose,
      onPrint,

      treatment,
      patient,
      appointmentDate,

      prescriptionLines,

      printButtonText = "Print A6 Prescription",
      modalTitle = "Prescription Preview",

      loading = false,
    },
    ref,
  ) => {
    const selectedPrescriptionLines =
      useMemo(() => {
        const sourceLines = Array.isArray(
          prescriptionLines,
        )
          ? prescriptionLines
          : getPrescriptionLines(
              treatment?.prescription,
            );

        return sourceLines
          .map(cleanPrescriptionLine)
          .filter(Boolean);
      }, [
        prescriptionLines,
        treatment?.prescription,
      ]);

    const patientName =
      patient?.name ||
      patient?.patient_name ||
      treatment?.patient_name ||
      "Unknown Patient";

    const patientTitle = getPatientTitle(
      patient,
      treatment,
    );

    const hasAllergies =
      getBooleanValue(
        patient?.has_allergies,
      ) ||
      getBooleanValue(
        patient?.is_allergies,
      ) ||
      getBooleanValue(
        treatment?.has_allergies,
      ) ||
      getBooleanValue(
        treatment?.is_allergies,
      );

    const allergyDetails =
      patient?.allergy_details ||
      patient?.allergies ||
      treatment?.allergy_details ||
      treatment?.allergies ||
      "Allergy details not specified.";

    const prescriptionDate =
      treatment?.treatment_date ||
      appointmentDate ||
      new Date();

    const canPrint =
      Boolean(treatment) &&
      selectedPrescriptionLines.length > 0;

    return (
      <Modal
        title={
          <Space size={9}>
            <PrinterOutlined />

            <span>{modalTitle}</span>
          </Space>
        }
        open={open}
        onCancel={onClose}
        centered
        width={540}
        destroyOnHidden={false}
        className="ivory-prescription-preview-modal"
        footer={[
          <Button
            key="close"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </Button>,

          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            loading={loading}
            disabled={!canPrint}
            onClick={onPrint}
          >
            {printButtonText}
          </Button>,
        ]}
      >
        {treatment ? (
          <div
            ref={ref}
            className="ivory-prescription-sheet"
          >
            <div className="ivory-prescription-content">
              <section className="ivory-prescription-meta">
                <div className="ivory-prescription-patient-line">
                  <strong>
                    {patientTitle
                      ? `${patientTitle} `
                      : ""}

                    {patientName}
                  </strong>
                </div>

                <div className="ivory-prescription-date">
                  <strong>
                    {dayjs(
                      prescriptionDate,
                    ).format(
                      "DD / MM / YYYY",
                    )}
                  </strong>
                </div>
              </section>

         
         

              <main className="ivory-prescription-body">
                <div className="ivory-prescription-medicines">
                  {selectedPrescriptionLines.map(
                    (line, index) => (
                      <div
                        key={`${line}-${index}`}
                        className="ivory-prescription-medicine-row"
                      >
                        {line}
                      </div>
                    ),
                  )}
                </div>
              </main>
            </div>
          </div>
        ) : (
          <div className="ivory-prescription-empty">
            Select a treatment containing a
            prescription to preview it.
          </div>
        )}
      </Modal>
    );
  },
);

PrescriptionPreviewModal.displayName =
  "PrescriptionPreviewModal";

export default PrescriptionPreviewModal;

