import axiosInstance from "./axiosInstance";

export const getPatients = () => {
  return axiosInstance.get("/patients");
};

export const createPatient = (data) => {
  return axiosInstance.post("/patients", data);
};

export const updatePatient = (id, data) => {
  return axiosInstance.put(`/patients/${id}`, data);
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

// Health
export const getHealth = () => axiosInstance.get("/health");

// Dentists
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
// Appointments
// Appointments

export const getAppointments = () => {
  return axiosInstance.get("/appointments");
};

export const getAppointmentByTreatment = (treatmentId) => {
  return axiosInstance.get(`/appointments/treatment/${treatmentId}`);
};

export const getDailyAppointments = (date) => {
  return axiosInstance.get(`/reports/daily-appointments?date=${date}`);
};
export const getAppointmentsByDate = (date) => {
  return axiosInstance.get(`/appointments?date=${date}`);
};
export const createAppointment = (data) => {
  return axiosInstance.post("/appointments", data);
};

// Update only appointment status
export const updateAppointmentStatus = (id, status) => {
  return axiosInstance.patch(`/appointments/${id}/status`, { status });
};

// Update full appointment
export const updateAppointment = (id, data) => {
  return axiosInstance.patch(`/appointments/${id}`, data);
};
export const loginUser = (credentials) => {
  return axiosInstance.post("/auth/login", credentials);
};
export const getDailyNextAppointments = (date) =>
  axiosInstance.get(`/reports/daily-next-appointments?date=${date}`);

//æ
export const getDailyIncome = (date) => {
  return axiosInstance.get(`/reports/daily-income?date=${date}`);
};

export const getAppointmentById = (id) => {
  return axiosInstance.get(`/appointments/${id}`);
};

export const createPayment = (data) => {
  return axiosInstance.post("/payments", data);
};
export const createTreatment = (payload) => {
  return axiosInstance.post("/treatments", payload);
};

export const getDailyQueueByDate = async (date) => {
  const res = await axiosInstance.get(`/daily-queue`, {
    params: { date },
  });

  return res.data;
};

export const getNextQueuePatient = async (date) => {
  const res = await axiosInstance.get(`/daily-queue/next`, {
    params: { date },
  });

  return res.data;
};

export const getCurrentQueuePatient = async (date) => {
  const res = await axiosInstance.get(`/daily-queue/current`, {
    params: { date },
  });

  return res.data;
};

export const getPreviousQueuePatient = async (date) => {
  const res = await axiosInstance.get(`/daily-queue/previous`, {
    params: { date },
  });

  return res.data;
};

export const getQueueItemById = async (id) => {
  const res = await axiosInstance.get(`/daily-queue/${id}`);

  return res.data;
};

export const checkInAppointmentToQueue = async (payload) => {
  const res = await axiosInstance.post(`/daily-queue/check-in`, payload);

  return res.data;
};

export const addWalkInToQueue = async (payload) => {
  const res = await axiosInstance.post(`/daily-queue/walk-in`, payload);

  return res.data;
};

export const updateQueueStatus = async (id, status) => {
  const res = await axiosInstance.patch(`/daily-queue/${id}/status`, {
    status,
  });

  return res.data;
};

export const deleteQueueItem = async (id) => {
  const res = await axiosInstance.delete(`/daily-queue/${id}`);

  return res.data;
};

export const getAppointmentsByDateRange = (startDate, endDate) => {
  return axiosInstance.get("/appointments/range", {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
};
export const getAppointmentFullDetails = (appointmentId) => {
  return axiosInstance.get(`/appointments/${appointmentId}/full-details`);
};

export const getIncomeByDateRange = (startDate, endDate) => {
  return axiosInstance.get("/reports/income-range", {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
};

export const getTreatmentPaymentSummary = (treatmentId) => {
  return axiosInstance.get(`/treatments/${treatmentId}/payments`);
};
export const getFollowUpPatients = (date) => {
  return axiosInstance.get("/treatments/follow-ups", {
    params: {
      date,
    },
  });
};
export const registerUser = (data) => {
  return axiosInstance.post("/auth/register", data);
};