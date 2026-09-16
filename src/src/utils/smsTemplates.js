// utils/smsTemplates.js

/* =========================================================
   SMS TEMPLATES
========================================================= */

/**
 * Doctor Arrival SMS
 */
export const doctorArrivalSMS = ({
  patientName,
  appointmentNumber,
}) => {
  return (
    `Dear ${patientName}, ` +
    `the doctor has arrived at Dental CAD/CAM Laboratory. ` +
    `Your queue number is #${appointmentNumber}. ` +
    `Please remain available at the clinic. Thank you.`
  );
};

/**
 * Appointment Details / Confirmation SMS
 */
export const appointmentDetailsSMS = ({
  patientName,
  date,
  time,
  appointmentNumber,
  reason,
}) => {
  return (
    `Dear ${patientName}, ` +
    `your appointment at Dental CAD/CAM Laboratory is confirmed for ` +
    `${date} at ${time}. ` +
    `Appointment No: #${appointmentNumber}. ` +
    `Treatment: ${reason}. Thank you.`
  );
};

/**
 * E-Bill / Payment SMS
 */
export const eBillSMS = ({
  patientName,
  total,
  paid,
  balance,
  billLink,
}) => {
  return (
    `Dear ${patientName}, ` +
    `payment received for your treatment at Dental CAD/CAM Laboratory. ` +
    `Total: Rs.${total}. ` +
    `Paid: Rs.${paid}. ` +
    `Balance: Rs.${balance}. ` +
    `E-Bill: ${billLink}. Thank you.`
  );
};

/* =========================================================
   CENTRAL TEMPLATE OBJECT
========================================================= */

const SMS_TEMPLATES = {
  doctorArrival: doctorArrivalSMS,
  appointmentDetails: appointmentDetailsSMS,
  eBill: eBillSMS,
};

export default SMS_TEMPLATES;