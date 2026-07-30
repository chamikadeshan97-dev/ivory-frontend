import React from "react";

import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Dentists from "./pages/Dentists";
import DailyIncome from "./pages/DailyIncome";
import PatientHistory from "./pages/PatientHistory";
import Appointments from "./pages/Appointments";
import DailyQueue from "./pages/DailyQueue";
import AppointmentHistory from "./pages/DailyAppointments";
import AppointmentMaintenance from "./pages/AppointmentMaintenance";
import CurrentTreatment from "./pages/CurrentTreatment";
import CashierPayment from "./pages/CashierPayment";
import FollowUpPatients from "./pages/FollowUpPatients";
import UserRegistration from "./pages/UserRegistration";
import QueueDisplay from "./pages/QueueDisplay";
import PaymentDashboard from "./pages/PaymentDashboard";
/* --------------------------------------------------------
   Layout wrapper
-------------------------------------------------------- */

const LayoutPage = ({ children }) => {
  return <AppLayout>{children}</AppLayout>;
};

/* --------------------------------------------------------
   Application routes
-------------------------------------------------------- */

const App = () => {
  return (
    <Routes>
      {/* Public route */}

      <Route path="/login" element={<Login />} />
      <Route path="/queue-display" element={<QueueDisplay />} />
      {/* Protected routes */}

      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={
            <LayoutPage>
              <Dashboard />
            </LayoutPage>
          }
        />

        <Route
          path="/patients"
          element={
            <RoleRoute allowedRoles={["Admin", "Receptionist", "Dentist"]}>
              <LayoutPage>
                <Patients />
              </LayoutPage>
            </RoleRoute>
          }
        />

        <Route
          path="/dentists"
          element={
            <RoleRoute allowedRoles={["Admin"]}>
              <LayoutPage>
                <Dentists />
              </LayoutPage>
            </RoleRoute>
          }
        />

        <Route
          path="/appointments"
          element={
            <RoleRoute allowedRoles={["Admin", "Receptionist", "Dentist"]}>
              <LayoutPage>
                <Appointments />
              </LayoutPage>
            </RoleRoute>
          }
        />

        <Route
          path="/appointment-history"
          element={
            <RoleRoute allowedRoles={["Admin", "Receptionist", "Dentist"]}>
              <LayoutPage>
                <AppointmentHistory />
              </LayoutPage>
            </RoleRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <RoleRoute allowedRoles={["Admin", "Cashier" ,  "Dentist"]}>
              <LayoutPage>
                <PaymentDashboard />
              </LayoutPage>
            </RoleRoute>
          }
        />
        <Route
          path="/daily-income"
          element={
            <RoleRoute allowedRoles={["Admin", "Dentist"]}>
              <LayoutPage>
                <DailyIncome />
              </LayoutPage>
            </RoleRoute>
          }
        />

        <Route
          path="/patient-history"
          element={
            <RoleRoute
              allowedRoles={["Admin", "Receptionist", "Dentist", "Cashier"]}
            >
              <LayoutPage>
                <PatientHistory />
              </LayoutPage>
            </RoleRoute>
          }
        />

        <Route
          path="/daily-queue"
          element={
            <RoleRoute allowedRoles={["Admin", "Receptionist"]}>
              <LayoutPage>
                <DailyQueue />
              </LayoutPage>
            </RoleRoute>
          }
        />

        <Route
          path="/appointment-maintenance"
          element={
            <RoleRoute allowedRoles={["Admin", "Receptionist", "Dentist"]}>
              <LayoutPage>
                <AppointmentMaintenance />
              </LayoutPage>
            </RoleRoute>
          }
        />

        <Route
          path="/current-treatment"
          element={
            <RoleRoute allowedRoles={["Admin", "Dentist"]}>
              <LayoutPage>
                <CurrentTreatment />
              </LayoutPage>
            </RoleRoute>
          }
        />

        <Route
          path="/cashier-payment"
          element={
            <RoleRoute allowedRoles={["Admin", "Cashier", "Dentist"]}>
              <LayoutPage>
                <CashierPayment />
              </LayoutPage>
            </RoleRoute>
          }
        />

        <Route
          path="/follow-up-patients"
          element={
            <RoleRoute allowedRoles={["Admin", "Receptionist", "Dentist"]}>
              <LayoutPage>
                <FollowUpPatients />
              </LayoutPage>
            </RoleRoute>
          }
        />
      </Route>
      <Route
        path="/user-registration"
        element={
          <RoleRoute allowedRoles={["Admin"]}>
            <LayoutPage>
              <UserRegistration />
            </LayoutPage>
          </RoleRoute>
        }
      />
      {/* Unknown routes */}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
