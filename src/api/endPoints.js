import dayjs from "dayjs";
import axiosInstance from "./axiosInstance";


export const loginSmsApi = () =>
  axiosInstance.post("/sms/login");

export const sendTemplateSMS = async (payload) => {
   axiosInstance.post("/sms/send-template", payload);
};
export const sendSMS = (payload) =>
  axiosInstance.post("/sms/send", payload);


export const sendBulkSms = (payload) =>
  axiosInstance.post("/sms/bulk", payload);


export const normalizeSmsNumber = (number) =>
  axiosInstance.post("/sms/normalize", {
    number,
  });

export const getSmsTokenStatus = () =>
  axiosInstance.get("/sms/token-status");


export const clearSmsToken = () =>
  axiosInstance.delete("/sms/token");

/* ========================================================
   Patients
======================================================== */

export const getPatients = () => {
  return axiosInstance.get("/patients");
};

export const createPatient = (data) => {
  return axiosInstance.post("/patients", data);
};

export const updatePatient = (id, data) => {
  return axiosInstance.put(`/patients/${id}`, data);
};
export const getAllPatients = () => {
  return axiosInstance.get("/patients");
};
export const uploadPatientMedia = async (formData, onUploadProgress) => {
  return axiosInstance.post(
    "/patient-media/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },

      onUploadProgress,
    },
  );
};
export const deletePatient = (id) => {
  return axiosInstance.delete(`/patients/${id}`);
};

export const getPatientHistory = (patientId) => {
  return axiosInstance.get(`/patients/${patientId}/history`);
};

export const getPatientFullDetails = (patientId) => {
  return axiosInstance.get(`/patients/${patientId}/full-details`);
};

/* ========================================================
   Health
======================================================== */

export const getHealth = () => {
  return axiosInstance.get("/health");
};

/* ========================================================
   Dentists
======================================================== */

export const getDentists = () => {
  return axiosInstance.get("/dentists");
};

export const createDentist = (data) => {
  return axiosInstance.post("/dentists", data);
};

export const updateDentist = (id, data) => {
  return axiosInstance.put(`/dentists/${id}`, data);
};

export const deleteDentist = (id) => {
  return axiosInstance.delete(`/dentists/${id}`);
};

/* ========================================================
   Appointments
======================================================== */

export const getAppointments = () => {
  return axiosInstance.get("/appointments");
};

export const getAppointmentByTreatment = (treatmentId) => {
  return axiosInstance.get(`/appointments/treatment/${treatmentId}`);
};

export const getDailyAppointments = (date) => {
  return axiosInstance.get("/reports/daily-appointments", {
    params: {
      date,
    },
  });
};

export const getAppointmentsByDate = (date) => {
  return axiosInstance.get("/appointments", {
    params: {
      date,
    },
  });
};

export const createAppointment = (data) => {
  return axiosInstance.post("/appointments", data);
};

export const updateAppointmentStatus = (id, status) => {
  return axiosInstance.patch(`/appointments/${id}/status`, {
    status,
  });
};

export const updateAppointment = (id, data) => {
  return axiosInstance.patch(`/appointments/${id}`, data);
};

export const getAppointmentById = (id) => {
  return axiosInstance.get(`/appointments/${id}`);
};

export const getAppointmentFullDetails = (appointmentId) => {
  return axiosInstance.get(`/appointments/${appointmentId}/full-details`);
};

export const getAppointmentsByDateRange = (startDate, endDate) => {
  return axiosInstance.get("/appointments/range", {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
};

/* ========================================================
   Authentication
======================================================== */

export const loginUser = (credentials) => {
  return axiosInstance.post("/auth/login", credentials);
};

export const registerUser = (data) => {
  return axiosInstance.post("/auth/register", data);
};
export const getUsers = () => {
  return axiosInstance.get("/auth/users");
};

export const updateUser = (userId, payload) => {
  return axiosInstance.put(`/auth/users/${userId}`, payload);
};

export const deleteUser = (userId) => {
  return axiosInstance.delete(`/auth/users/${userId}`);
};
/* ========================================================
   Reports
======================================================== */

export const getDailyNextAppointments = (date) => {
  return axiosInstance.get("/reports/daily-next-appointments", {
    params: {
      date,
    },
  });
};

export const getDailyIncome = (date) => {
  return axiosInstance.get("/reports/daily-income", {
    params: {
      date,
    },
  });
};

export const getIncomeByDateRange = (startDate, endDate) => {
  return axiosInstance.get("/reports/income-range", {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
};

export const getAppointmentsTreatmentsByDateRange = (startDate, endDate) => {
  return axiosInstance.get("/reports/appointments-treatments-range", {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
};

/* ========================================================
   Payments
======================================================== */

export const createPayment = (data) => {
  return axiosInstance.post("/payments", data);
};

export const getTreatmentPaymentSummary = (treatmentId) => {
  return axiosInstance.get(`/treatments/${treatmentId}/payments`);
};

/* ========================================================
   Treatments
======================================================== */

export const createTreatment = (payload) => {
  return axiosInstance.post("/treatments", payload);
};

export const getFollowUpPatients = (date) => {
  return axiosInstance.get("/treatments/follow-ups", {
    params: {
      date,
    },
  });
};

/* ========================================================
   Daily Queue
======================================================== */

export const getDailyQueueByDate = async (date) => {
  const response = await axiosInstance.get("/daily-queue", {
    params: {
      date,
    },
  });

  return response.data;
};

export const getNextQueuePatient = async (date) => {
  const response = await axiosInstance.get("/daily-queue/next", {
    params: {
      date,
    },
  });

  return response.data;
};

export const getCurrentQueuePatient = async (date) => {
  const response = await axiosInstance.get("/daily-queue/current", {
    params: {
      date,
    },
  });

  return response.data;
};

export const getPreviousQueuePatient = async (date) => {
  const response = await axiosInstance.get("/daily-queue/previous", {
    params: {
      date,
    },
  });

  return response.data;
};

export const getQueueItemById = async (id) => {
  const response = await axiosInstance.get(`/daily-queue/${id}`);

  return response.data;
};

export const checkInAppointmentToQueue = async (payload) => {
  const response = await axiosInstance.post("/daily-queue/check-in", payload);

  return response.data;
};

export const addWalkInToQueue = async (payload) => {
  const response = await axiosInstance.post("/daily-queue/walk-in", payload);

  return response.data;
};

export const updateQueueStatus = async (id, status) => {
  const response = await axiosInstance.patch(`/daily-queue/${id}/status`, {
    status,
  });

  return response.data;
};

export const deleteQueueItem = async (id) => {
  const response = await axiosInstance.delete(`/daily-queue/${id}`);

  return response.data;
};

/* ========================================================
   Common Treatments
======================================================== */

/**
 * Get all common treatments.
 *
 * GET /common-treatments
 */
export const getCommonTreatments = () => {
  return axiosInstance.get("/common-treatments");
};

/**
 * Create a new common treatment.
 *
 * POST /common-treatments
 *
 * Payload:
 * {
 *   treatment_name: "Dental Check-up",
 *   fee: 1500
 * }
 */
export const createCommonTreatment = (data) => {
  return axiosInstance.post("/common-treatments", data);
};

/**
 * Search common treatments.
 *
 * GET /common-treatments/search?q=tooth
 */
export const searchCommonTreatments = (searchText = "") => {
  return axiosInstance.get("/common-treatments/search", {
    params: {
      q: String(searchText ?? "").trim(),
    },
  });
};

/**
 * Get one common treatment by ID.
 *
 * GET /common-treatments/:id
 */
export const getCommonTreatmentById = (id) => {
  return axiosInstance.get(`/common-treatments/${encodeURIComponent(id)}`);
};

/**
 * Update a common treatment using PUT.
 *
 * PUT /common-treatments/:id
 *
 * Payload:
 * {
 *   treatment_name: "Dental Check-up",
 *   fee: 2000
 * }
 */
export const updateCommonTreatment = (id, data) => {
  return axiosInstance.put(
    `/common-treatments/${encodeURIComponent(id)}`,
    data,
  );
};

/**
 * Partially update a common treatment.
 *
 * PATCH /common-treatments/:id
 *
 * Example:
 * {
 *   fee: 2500
 * }
 */
export const patchCommonTreatment = (id, data) => {
  return axiosInstance.patch(
    `/common-treatments/${encodeURIComponent(id)}`,
    data,
  );
};

/**
 * Delete a common treatment.
 *
 * DELETE /common-treatments/:id
 */
export const deleteCommonTreatment = (id) => {
  return axiosInstance.delete(`/common-treatments/${encodeURIComponent(id)}`);
};

/**
 * Get common treatment statistics.
 *
 * GET /common-treatments/statistics
 */
export const getCommonTreatmentStatistics = () => {
  return axiosInstance.get("/common-treatments/statistics");
};

/* ========================================================
   Drugs
======================================================== */

/**
 * Get all drugs.
 *
 * GET /drugs
 *
 * Optional params:
 * {
 *   search: "amoxicillin",
 *   sort: "asc"
 * }
 */
export const getDrugs = (params = {}) => {
  return axiosInstance.get("/drugs", {
    params,
  });
};

/**
 * Search drugs.
 *
 * GET /drugs/search?query=amoxicillin
 */
export const searchDrugs = (searchText = "") => {
  return axiosInstance.get("/drugs/search", {
    params: {
      query: String(searchText ?? "").trim(),
    },
  });
};

/**
 * Get one drug by ID.
 *
 * GET /drugs/:id
 */
export const getDrugById = (id) => {
  return axiosInstance.get(`/drugs/${encodeURIComponent(id)}`);
};

/**
 * Create a new drug.
 *
 * POST /drugs
 *
 * Payload:
 * {
 *   name: "Amoxicillin 500 mg Capsule"
 * }
 */
export const createDrug = (data) => {
  return axiosInstance.post("/drugs", data);
};

/**
 * Create multiple drugs.
 *
 * POST /drugs/bulk
 *
 * Payload:
 * {
 *   drugs: [
 *     {
 *       name: "Amoxicillin 500 mg Capsule"
 *     },
 *     {
 *       name: "Paracetamol 500 mg Tablet"
 *     }
 *   ]
 * }
 */
export const createDrugsBulk = (drugs) => {
  return axiosInstance.post("/drugs/bulk", {
    drugs,
  });
};

/**
 * Fully update a drug.
 *
 * PUT /drugs/:id
 *
 * Payload:
 * {
 *   name: "Amoxicillin 250 mg Capsule"
 * }
 */
export const updateDrug = (id, data) => {
  return axiosInstance.put(`/drugs/${encodeURIComponent(id)}`, data);
};

/**
 * Partially update a drug.
 *
 * PATCH /drugs/:id
 *
 * Payload:
 * {
 *   name: "Amoxicillin 500 mg Capsule"
 * }
 */
export const patchDrug = (id, data) => {
  return axiosInstance.patch(`/drugs/${encodeURIComponent(id)}`, data);
};

/**
 * Delete a drug.
 *
 * DELETE /drugs/:id
 */
export const deleteDrug = (id) => {
  return axiosInstance.delete(`/drugs/${encodeURIComponent(id)}`);
};

export const startAppointmentWaiting = (appointmentId) => {
  return axiosInstance.post(
    `/in-waiting/start/${encodeURIComponent(appointmentId)}`,
  );
};

export const endAppointmentWaiting = (appointmentId) => {
  return axiosInstance.patch(
    `/in-waiting/end/${encodeURIComponent(appointmentId)}`,
  );
};

export const getAllWaitingRecords = () => {
  return axiosInstance.get("/in-waiting");
};

export const getActiveWaitingRecords = () => {
  return axiosInstance.get("/in-waiting/active");
};

export const getWaitingByAppointmentId = (appointmentId) => {
  return axiosInstance.get(
    `/in-waiting/appointment/${encodeURIComponent(appointmentId)}`,
  );
};
export const getLocations = () => {
  return axiosInstance.get("/locations");
};

export const createLocation = (payload) => {
  return axiosInstance.post("/locations", payload);
};

export const updateLocation = (locationId, payload) => {
  return axiosInstance.put(
    `/locations/${encodeURIComponent(locationId)}`,
    payload,
  );
};

export const deleteLocation = (locationId) => {
  return axiosInstance.delete(`/locations/${encodeURIComponent(locationId)}`);
};


export const getDoctorArrivalStatus = (date) =>
  axiosInstance.get(
    `/dentists/arrival/${date || dayjs().format("YYYY-MM-DD")}`,
  );

export const markDoctorArrived = (date) =>
  axiosInstance.post("/dentists/arrival", {
    date: date || dayjs().format("YYYY-MM-DD"),
    send_sms: true,
  });

export const reassignAppointmentNumber = (
  sourceAppointmentId,
  targetAppointmentId,
) =>
  axiosInstance.patch(
    `/appointments/${sourceAppointmentId}/reassign-number`,
    {
      target_appointment_id: targetAppointmentId,
    },
  );
  /* ========================================================
   Queue Order
======================================================== */

export const getQueueOrderByDate = (date) =>
  axiosInstance.get("/queue-order", {
    params: { date },
  });

export const addAppointmentToQueueOrder = (data) =>
  axiosInstance.post("/queue-order", data);

export const reorderQueueOrder = (data) =>
  axiosInstance.put("/queue-order/reorder", data);

export const updateQueueOrderStatus = (
  appointmentId,
  data
) =>
  axiosInstance.patch(
    `/queue-order/${appointmentId}/status`,
    data
  );

export const removeAppointmentFromQueueOrder = (
  appointmentId,
  date
) =>
  axiosInstance.delete(
    `/queue-order/${appointmentId}`,
    {
      data: { date },
    }
  );


export const saveQueueOrder = (data) =>
  axiosInstance.put(
    "/queue-order",
    data
  );

export const clearQueueOrder = (date) =>
  axiosInstance.delete(
    "/queue-order",
    {
      params: { date },
    }
  );


  /* ========================================================
   PATIENT MEDIA
======================================================== */

export const getPatientMedia = (patientId) => {
  return axiosInstance.get(
    `/patient-media/patient/${encodeURIComponent(patientId)}`,
  );
};

export const getPatientMediaViewUrl = (mediaId) => {
  return `${axiosInstance.defaults.baseURL}/patient-media/${encodeURIComponent(
    mediaId,
  )}/view`;
};

export const downloadPatientMedia = (mediaId) => {
  return axiosInstance.get(
    `/patient-media/${encodeURIComponent(mediaId)}/download`,
    {
      responseType: "blob",
    },
  );
};

export const deletePatientMedia = (mediaId) => {
  return axiosInstance.delete(
    `/patient-media/${encodeURIComponent(mediaId)}`,
  );
};