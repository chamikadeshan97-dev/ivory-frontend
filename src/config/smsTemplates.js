export const SMS_TEMPLATE_TYPES = {
  DOCTOR_ARRIVAL: "doctorArrival",
  APPOINTMENT_DETAILS: "appointmentDetails",
  E_BILL: "eBill",
};

export const SMS_TEMPLATE_OPTIONS = [
  {
    value: SMS_TEMPLATE_TYPES.DOCTOR_ARRIVAL,
    label: "Doctor Arrival",
    description: "Notify patient that the doctor has arrived.",
  },
  {
    value: SMS_TEMPLATE_TYPES.APPOINTMENT_DETAILS,
    label: "Appointment Confirmation",
    description: "Send appointment date, time and queue number.",
  },
  {
    value: SMS_TEMPLATE_TYPES.E_BILL,
    label: "E-Bill / Payment",
    description: "Send payment details and e-bill link.",
  },
];

export const SMS_TEMPLATE_FIELDS = {
  doctorArrival: [
    "patientName",
    "appointmentNumber",
  ],

  appointmentDetails: [
    "patientName",
    "date",
    "time",
    "appointmentNumber",
    "reason",
  ],

  eBill: [
    "patientName",
    "total",
    "paid",
    "balance",
    "billLink",
  ],
};