export const ROLE_PERMISSIONS = {
  Admin: [
    "/",
    "/patients",
    "/dentists",
    "/patient-history",
    "/appointments",
    "/appointment-history",
    "/daily-queue",
    "/appointment-maintenance",
    "/current-treatment",
    "/cashier-payment",
    "/daily-income",
    "/follow-up-patients",
    "/users",
  ],

  Receptionist: [
    "/",
    "/patients",
    "/patient-history",
    "/appointments",
    "/appointment-history",
    "/daily-queue",
    "/appointment-maintenance",
    "/follow-up-patients",
  ],

  Dentist: [
    "/",
    "/patients",
    "/patient-history",
    "/appointments",
    "/appointment-history",
    "/current-treatment",
    "/follow-up-patients",
  ],

  Cashier: ["/", "/patient-history", "/cashier-payment", "/daily-income"],
};

export const normalizeRole = (role) => {
  return String(role || "")
    .trim()
    .toLowerCase();
};

export const hasRoutePermission = (role, route) => {
  const matchedRole = Object.keys(ROLE_PERMISSIONS).find(
    (roleName) => normalizeRole(roleName) === normalizeRole(role),
  );

  if (!matchedRole) {
    return false;
  }

  return ROLE_PERMISSIONS[matchedRole].includes(route);
};
