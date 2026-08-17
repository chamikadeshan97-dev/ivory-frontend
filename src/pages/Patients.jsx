import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  EyeOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  UserOutlined,
} from "@ant-design/icons";

import {
  createPatient,
  deletePatient,
  getLocations,
  getPatients,
  updatePatient,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";
import PatientDetailsModal from "../components/PatientDetailsModal";

import "./css/Patients.css";

const { Title, Text } = Typography;

/* --------------------------------------------------------
   Patient helpers
-------------------------------------------------------- */

const getPatientId = (patient) => {
  return patient?.id ?? patient?.patient_id ?? "";
};

const getPatientName = (patient) => {
  return patient?.name ?? patient?.patient_name ?? "";
};

const getPatientPhone = (patient) => {
  return patient?.phone ?? patient?.phone_number ?? "";
};
const getPatientLocation = (patient) => {
  return patient?.location ?? patient?.city ?? patient?.patient_location ?? "";
};

const getPatientDistance = (patient) => {
  const distance =
    patient?.distance ?? patient?.distance_km ?? patient?.location_distance;

  if (distance === undefined || distance === null || distance === "") {
    return "";
  }

  return Number(distance);
};
/* --------------------------------------------------------
   Allergy helpers
-------------------------------------------------------- */

const convertToBoolean = (value) => {
  if (value === true || value === 1) {
    return true;
  }

  return ["true", "yes", "1"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
};

const patientHasAllergies = (patient) => {
  return convertToBoolean(patient?.has_allergies ?? patient?.is_allergies);
};

const getPatientAllergyDetails = (patient) => {
  return patient?.allergy_details ?? patient?.allergies ?? "";
};

const normalizeStatus = (value) => {
  return String(value || "Active")
    .trim()
    .toLowerCase();
};

/* --------------------------------------------------------
   Summary card
-------------------------------------------------------- */

const PatientSummaryCard = ({ title, value, helper, icon, tone, onClick }) => {
  return (
    <Card
      bordered={false}
      className={`patient-summary-card patient-summary-card--${tone}`}
      onClick={onClick}
    >
      <div className="patient-summary-card__content">
        <div>
          <Text className="patient-summary-card__title">{title}</Text>

          <div className="patient-summary-card__value">{value}</div>

          <Text className="patient-summary-card__helper">{helper}</Text>
        </div>

        <div className="patient-summary-card__icon">{icon}</div>
      </div>
    </Card>
  );
};

/* --------------------------------------------------------
   Patients page
-------------------------------------------------------- */

const Patients = () => {
  const [form] = Form.useForm();
  const [patientLocations, setPatientLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const loadPatientLocations = useCallback(async () => {
    try {
      setLocationsLoading(true);

      const response = await getLocations();

      const locationData =
        response?.data?.data ??
        response?.data?.locations ??
        response?.data ??
        [];

      const normalizedLocations = Array.isArray(locationData)
        ? locationData
            .map((location) => {
              const city =
                location?.location ?? location?.city ?? location?.name ?? "";

              const rawDistance =
                location?.distance_km ??
                location?.distance ??
                location?.location_distance;

              return {
                id: location?.id ?? location?.location_id ?? city,
                city: String(city).trim(),
                distance:
                  rawDistance === undefined ||
                  rawDistance === null ||
                  rawDistance === ""
                    ? ""
                    : Number(rawDistance),
              };
            })
            .filter((location) => location.city)
            .sort((firstLocation, secondLocation) => {
              const firstDistance =
                firstLocation.distance === ""
                  ? Number.MAX_SAFE_INTEGER
                  : firstLocation.distance;

              const secondDistance =
                secondLocation.distance === ""
                  ? Number.MAX_SAFE_INTEGER
                  : secondLocation.distance;

              return firstDistance - secondDistance;
            })
        : [];

      setPatientLocations(normalizedLocations);
    } catch (error) {
      console.error("Failed to load patient locations:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load locations",
      );

      setPatientLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [patients, setPatients] = useState([]);
  const normalizePhoneNumber = (phone) => {
    let number = String(phone || "").replace(/\D/g, "");

    // 0094 70 427 9279 → 0704279279
    if (number.startsWith("0094")) {
      number = `0${number.slice(4)}`;
    }

    // 94 70 427 9279 → 0704279279
    else if (number.startsWith("94") && number.length === 11) {
      number = `0${number.slice(2)}`;
    }

    // 704279279 → 0704279279
    else if (number.length === 9) {
      number = `0${number}`;
    }

    return number;
  };
  const [search, setSearch] = useState("");

  const [allergyFilter, setAllergyFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);

  const [editingPatient, setEditingPatient] = useState(null);

  const locationOptions = useMemo(() => {
    return patientLocations.map((location) => ({
      label: `${location.city} • ${location.distance} km`,
      value: location.city,
    }));
  }, [patientLocations]);

  useEffect(() => {
    if (!modalOpen || editingPatient) {
      return;
    }

    if (locationOptions.length === 0) {
      return;
    }

    const currentLocation = form.getFieldValue("location");

    if (currentLocation) {
      return;
    }

    const firstLocation = patientLocations[0];

    if (!firstLocation) {
      return;
    }

    form.setFieldsValue({
      location: locationOptions[0].value,
      distance: firstLocation.distance,
    });
  }, [modalOpen, editingPatient, locationOptions, patientLocations, form]);
  useEffect(() => {
    loadPatientLocations();
  }, [loadPatientLocations]);

  const [showMoreOptions, setShowMoreOptions] = useState(false);

  /* ------------------------------------------------------
     Patient details modal
  ------------------------------------------------------ */

  const [viewModalOpen, setViewModalOpen] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState(null);

  const hasAllergies = Form.useWatch("has_allergies", form);

  /* ------------------------------------------------------
     Extract response data
  ------------------------------------------------------ */

  const extractArray = (response) => {
    const data = response?.data?.data || response?.data || [];

    return Array.isArray(data) ? data : [];
  };

  /* ------------------------------------------------------
     Load patients
  ------------------------------------------------------ */

  const loadPatients = async () => {
    setLoading(true);

    try {
      const response = await getPatients();

      setPatients(extractArray(response));
    } catch (error) {
      console.error("Failed to load patients:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load patients",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  /* ------------------------------------------------------
     Patient counts
  ------------------------------------------------------ */

  const patientCounts = useMemo(() => {
    const allergyPatients = patients.filter((patient) =>
      patientHasAllergies(patient),
    ).length;

    const activePatients = patients.filter(
      (patient) => normalizeStatus(patient?.status) !== "inactive",
    ).length;

    const inactivePatients = patients.length - activePatients;

    return {
      total: patients.length,
      allergy: allergyPatients,
      noAllergy: patients.length - allergyPatients,
      active: activePatients,
      inactive: inactivePatients,
    };
  }, [patients]);

  /* ------------------------------------------------------
     Search and filtering
  ------------------------------------------------------ */

  const filteredPatients = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    const filtered = patients.filter((patient) => {
      const hasAllergy = patientHasAllergies(patient);

      const allergyDetails = getPatientAllergyDetails(patient);

      const searchableValues = [
        getPatientId(patient),
        getPatientName(patient),
        getPatientPhone(patient),
        patient?.gender,
        patient?.address,
        patient?.status,
        getPatientLocation(patient),
        getPatientDistance(patient),
        allergyDetails,
      ];

      const matchesSearch =
        !keyword ||
        searchableValues.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(keyword),
        );

      const matchesFilter =
        allergyFilter === "all" ||
        (allergyFilter === "allergy" && hasAllergy) ||
        (allergyFilter === "no-allergy" && !hasAllergy);

      return matchesSearch && matchesFilter;
    });

    return [...filtered].sort((first, second) => {
      const firstHasAllergy = patientHasAllergies(first);

      const secondHasAllergy = patientHasAllergies(second);

      if (firstHasAllergy !== secondHasAllergy) {
        return firstHasAllergy ? -1 : 1;
      }

      return getPatientName(first).localeCompare(getPatientName(second));
    });
  }, [patients, search, allergyFilter]);

  /* ------------------------------------------------------
     Add patient
  ------------------------------------------------------ */

  const openAddModal = () => {
    setEditingPatient(null);
    setShowMoreOptions(false);

    form.resetFields();

    const firstLocation = patientLocations[0];

    form.setFieldsValue({
      name: "",
      phone: "",
      gender: "Male",
      address: "",

      location: "New",
      distance: 0,

      status: "Active",
      has_allergies: false,
      allergy_details: "",
    });

    setModalOpen(true);
  };

  /* ------------------------------------------------------
     Edit patient
  ------------------------------------------------------ */

  const openEditModal = (patient) => {
    if (!patient) {
      return;
    }

    const hasAllergy = patientHasAllergies(patient);

    setEditingPatient(patient);
    setShowMoreOptions(false);

    form.resetFields();

    form.setFieldsValue({
      name: getPatientName(patient),
      phone: getPatientPhone(patient),

      gender: patient?.gender || undefined,

      address: patient?.address || "",

      location: getPatientLocation(patient) || undefined,

      distance: getPatientDistance(patient) || undefined,

      status: patient?.status || "Active",

      has_allergies: hasAllergy,

      allergy_details: hasAllergy ? getPatientAllergyDetails(patient) : "",
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPatient(null);
    setShowMoreOptions(false);

    form.resetFields();
  };

  /* ------------------------------------------------------
     View patient details
  ------------------------------------------------------ */

  const openViewModal = (patient) => {
    setSelectedPatient(patient);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedPatient(null);
  };

  const handleEditFromDetails = (fullPatient) => {
    closeViewModal();

    if (fullPatient) {
      openEditModal(fullPatient);
    }
  };

  /* ------------------------------------------------------
     Add or update patient
  ------------------------------------------------------ */

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      setSaving(true);

      /* ========================================================
       Normalize entered phone number
    ======================================================== */

      const normalizedPhone = normalizePhoneNumber(values.phone);

      /* ========================================================
       Check duplicate phone number
    ======================================================== */

      const duplicatePatient = patients.find((patient) => {
        const existingPhone = normalizePhoneNumber(patient.phone);

        if (!existingPhone || existingPhone !== normalizedPhone) {
          return false;
        }

        // Editing patient
        if (editingPatient) {
          const currentPatientId = String(
            getPatientId(editingPatient) || "",
          ).trim();

          const existingPatientId = String(getPatientId(patient) || "").trim();

          // Ignore the patient's own record
          if (currentPatientId === existingPatientId) {
            return false;
          }
        }

        return true;
      });

      if (duplicatePatient) {
        message.error(
          `Phone number ${normalizedPhone} is already registered to ${
            duplicatePatient.name || "another patient"
          }`,
        );

        form.resetFields();
        return;
      }

      /* ========================================================
       Location
    ======================================================== */

      const selectedLocation = patientLocations.find(
        (location) => location.city === values.location,
      );

      /* ========================================================
       Allergy
    ======================================================== */

      const hasPatientAllergy = values.has_allergies === true;

      /* ========================================================
       Payload
    ======================================================== */

      const payload = {
        name: values.name?.trim() || "",

        // Save standardized number
        phone: normalizedPhone,

        gender: values.gender || "",

        address: values.address?.trim() || "",

        status: values.status || "Active",

        location: selectedLocation?.city || values.location || "",

        distance: selectedLocation?.distance ?? values.distance ?? "",

        has_allergies: hasPatientAllergy,

        allergy_details: hasPatientAllergy
          ? values.allergy_details?.trim() || ""
          : "",
      };

      console.log("Patient payload:", payload);

      /* ========================================================
       Update / Create Patient
    ======================================================== */

      if (editingPatient) {
        const patientId = getPatientId(editingPatient);

        if (!patientId) {
          throw new Error("Patient ID is missing");
        }

        await updatePatient(patientId, payload);

        message.success("Patient updated successfully");
      } else {
        await createPatient(payload);

        message.success("Patient added successfully");
      }

      closeModal();

      await loadPatients();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error("Failed to save patient:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save patient",
      );
    } finally {
      setSaving(false);
    }
  };
  /* ------------------------------------------------------
     Delete patient
  ------------------------------------------------------ */

  const handleDelete = async (patient) => {
    try {
      const patientId = getPatientId(patient);

      if (!patientId) {
        throw new Error("Patient ID is missing");
      }

      await deletePatient(patientId);

      message.success("Patient deleted successfully");

      await loadPatients();
    } catch (error) {
      console.error("Failed to delete patient:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete patient",
      );
    }
  };

  /* ------------------------------------------------------
     Table columns
  ------------------------------------------------------ */

  const columns = [
    {
      title: "Patient ID",
      key: "patient_id",
      width: 150,
      render: (_, record) => (
        <div className="patient-id-badge">{getPatientId(record) || "-"}</div>
      ),
    },
    {
      title: "Patient",
      key: "patient",
      width: 300,
      render: (_, record) => {
        const hasAllergy = patientHasAllergies(record);

        const allergyDetails = getPatientAllergyDetails(record);

        return (
          <Space size={11} align="start">
            <Avatar
              size={42}
              icon={<UserOutlined />}
              className={
                hasAllergy
                  ? "patient-avatar patient-avatar--allergy"
                  : "patient-avatar"
              }
            />

            <div className="patient-name-cell">
              <Space size={6} wrap>
                <Text strong>{getPatientName(record) || "-"}</Text>

                {hasAllergy && (
                  <Tag
                    color="red"
                    icon={<ExclamationCircleFilled />}
                    className="allergy-alert-tag"
                  >
                    Allergy
                  </Tag>
                )}
              </Space>

              {hasAllergy && allergyDetails && (
                <Tooltip title={allergyDetails}>
                  <Text type="danger" className="patient-allergy-preview">
                    {allergyDetails}
                  </Text>
                </Tooltip>
              )}
            </div>
          </Space>
        );
      },
    },
    {
      title: "Phone",
      key: "phone",
      width: 170,
      render: (_, record) => (
        <Space size={7}>
          <PhoneOutlined className="patient-phone-icon" />

          <Text>{getPatientPhone(record) || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Location From the Clinic",
      key: "location",
      width: 190,
      render: (_, record) => {
        const location = getPatientLocation(record);

        const distance = getPatientDistance(record);

        return (
          <div className="patient-location-cell">
            <Text strong>{location || "-"}</Text>

            {distance !== "" && (
              <Text type="secondary">
                {" "}
                {"- ("}
                {distance} km
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: "Gender",
      dataIndex: "gender",
      key: "gender",
      width: 110,
      render: (value) => <Text>{value || "-"}</Text>,
    },
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
      width: 250,
      ellipsis: true,
      render: (value) => (
        <Tooltip title={value || ""}>
          <Text type="secondary">{value || "-"}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 115,
      render: (status) => {
        const isInactive = normalizeStatus(status) === "inactive";

        return (
          <Tag color={isInactive ? "default" : "green"}>
            {status || "Active"}
          </Tag>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 255,
      fixed: "right",
      render: (_, record) => (
        <Space size={7}>
          <Tooltip title="View complete patient details">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openViewModal(record)}
            >
              View
            </Button>
          </Tooltip>

          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Edit
          </Button>

          <Popconfirm
            title="Delete Patient"
            description={`Are you sure you want to delete ${
              getPatientName(record) || "this patient"
            }?`}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{
              danger: true,
            }}
            onConfirm={() => handleDelete(record)}
          >
            <Tooltip title="Delete patient">
              <Button danger size="small" icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ClinicPage
      title="Patients"
      subtitle="Manage registered patients, allergy information, treatment history and payments."
      icon={<TeamOutlined />}
      actions={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={loadPatients}
        >
          Refresh
        </Button>,

        <Button
          key="add-patient"
          type="primary"
          icon={<PlusOutlined />}
          onClick={openAddModal}
        >
          Add Patient
        </Button>,
      ]}
    >
      {/* Patient summary */}

      <Row gutter={[16, 16]} className="patient-summary-row">
        <Col xs={24} sm={12} xl={6}>
          <PatientSummaryCard
            title="Total Patients"
            value={patientCounts.total}
            helper="Registered patients"
            tone="blue"
            icon={<TeamOutlined />}
            onClick={() => setAllergyFilter("all")}
          />
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <PatientSummaryCard
            title="Allergy Alerts"
            value={patientCounts.allergy}
            helper="Require extra attention"
            tone="red"
            icon={<ExclamationCircleFilled />}
            onClick={() => setAllergyFilter("allergy")}
          />
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <PatientSummaryCard
            title="Active Patients"
            value={patientCounts.active}
            helper="Currently active"
            tone="green"
            icon={<UserAddOutlined />}
          />
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <PatientSummaryCard
            title="Inactive Patients"
            value={patientCounts.inactive}
            helper="Inactive records"
            tone="orange"
            icon={<UserDeleteOutlined />}
          />
        </Col>
      </Row>

      {/* Patient directory */}

      <Card bordered={false} className="patient-directory-card">
        <div className="patient-directory-header">
          <div>
            <Title level={4}>Patient Directory</Title>

            <Text type="secondary">
              Search, review and manage patient records.
            </Text>
          </div>

          <Tag color="blue" className="patient-result-count">
            {filteredPatients.length} result
            {filteredPatients.length !== 1 ? "s" : ""}
          </Tag>
        </div>

        <div className="patient-table-toolbar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search ID, name, phone, address or allergy"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="patient-search-input"
          />

          <Segmented
            value={allergyFilter}
            onChange={setAllergyFilter}
            className="patient-allergy-filter"
            options={[
              {
                label: `All (${patientCounts.total})`,
                value: "all",
              },
              {
                label: `Allergies (${patientCounts.allergy})`,
                value: "allergy",
              },
              {
                label: `No Allergies (${patientCounts.noAllergy})`,
                value: "no-allergy",
              },
            ]}
          />
        </div>

        <Table
          rowKey={(record) => getPatientId(record)}
          loading={loading}
          columns={columns}
          dataSource={filteredPatients}
          rowClassName={(record) =>
            patientHasAllergies(record) ? "allergy-patient-row" : ""
          }
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            showTotal: (total) => `${total} patient${total !== 1 ? "s" : ""}`,
          }}
          scroll={{
            x: 1540,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  search || allergyFilter !== "all"
                    ? "No matching patients found"
                    : "No patients have been registered"
                }
              >
                {!search && allergyFilter === "all" && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAddModal}
                  >
                    Add First Patient
                  </Button>
                )}
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Add/Edit patient modal */}

      <Modal
        title={
          <div className="patient-modal-title">
            <div className="patient-modal-title__icon">
              {editingPatient ? <EditOutlined /> : <UserAddOutlined />}
            </div>

            <div>
              <Text strong>
                {editingPatient ? "Edit Patient" : "Add New Patient"}
              </Text>

              <Text type="secondary">
                {editingPatient
                  ? "Update the patient's personal and medical information."
                  : "Register a new patient in the clinic system."}
              </Text>
            </div>
          </div>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={editingPatient ? "Update Patient" : "Add Patient"}
        cancelText="Cancel"
        width={showMoreOptions ? 920 : 560}
        centered
        destroyOnHidden
        className="patient-form-modal"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            has_allergies: false,
            status: "Active",
          }}
        >
          <Row gutter={[22, 0]}>
            <Col xs={24} md={showMoreOptions ? 12 : 24}>
              <div className="patient-form-section">
                <div className="patient-form-section__header">
                  <div className="patient-form-section__icon">
                    <UserOutlined />
                  </div>

                  <div>
                    <Text strong>Basic Information</Text>

                    <Text type="secondary">Required patient details</Text>
                  </div>
                </div>

                <Form.Item
                  label="Patient Name"
                  name="name"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Please enter patient name",
                    },
                  ]}
                >
                  <Input
                    placeholder="Example: Nimal Perera"
                    prefix={<UserOutlined />}
                  />
                </Form.Item>

                <Form.Item
                  label="Phone Number"
                  name="phone"
                  rules={[
                    {
                      required: true,
                      message: "Please enter phone number",
                    },
                    {
                      pattern: /^[0-9]{10}$/,
                      message: "Please enter a valid 10-digit phone number",
                    },
                  ]}
                >
                  <Input
                    placeholder="Example: 0771234567"
                    prefix={<PhoneOutlined />}
                    maxLength={10}
                  />
                </Form.Item>
                <Form.Item
                  label="Patient Location"
                  name="location"
                  rules={[
                    {
                      required: true,
                      message: "Please select the patient's location",
                    },
                  ]}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="Search and select city"
                    options={locationOptions}
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      String(option?.label || "")
                        .toLowerCase()
                        .includes(input.trim().toLowerCase())
                    }
                    onChange={(city) => {
                      const selectedLocation = patientLocations.find(
                        (location) => location.city === city,
                      );

                      form.setFieldValue(
                        "distance",
                        selectedLocation?.distance,
                      );
                    }}
                  />
                </Form.Item>

                <Form.Item label="Distance from Clinic" name="distance">
                  <Input
                    disabled
                    suffix="km"
                    placeholder="Automatically calculated"
                  />
                </Form.Item>
              </div>

              <div className="patient-form-section patient-allergy-section">
                <div className="patient-form-section__header">
                  <div className="patient-form-section__icon patient-form-section__icon--allergy">
                    <ExclamationCircleFilled />
                  </div>

                  <div>
                    <Text strong>Allergy Information</Text>

                    <Text type="secondary">Important for patient safety</Text>
                  </div>
                </div>

                <Form.Item
                  label="Does the patient have any allergies?"
                  required
                >
                  <div className="allergy-choice-group">
                    <Button
                      htmlType="button"
                      className={
                        hasAllergies === false
                          ? "allergy-choice allergy-choice--selected-no"
                          : "allergy-choice"
                      }
                      onClick={() => {
                        form.setFieldsValue({
                          has_allergies: false,

                          allergy_details: "",
                        });
                      }}
                    >
                      No Allergies
                    </Button>

                    <Button
                      htmlType="button"
                      danger
                      className={
                        hasAllergies === true
                          ? "allergy-choice allergy-choice--selected-yes"
                          : "allergy-choice"
                      }
                      onClick={() => {
                        form.setFieldValue("has_allergies", true);
                      }}
                    >
                      Has Allergies
                    </Button>
                  </div>
                </Form.Item>

                <Form.Item name="has_allergies" hidden>
                  <Input type="hidden" />
                </Form.Item>

                {hasAllergies === true && (
                  <Alert
                    type="error"
                    showIcon
                    className="allergy-form-alert"
                    message="Important Allergy Information"
                    description={
                      <Form.Item
                        label="Allergy Details"
                        name="allergy_details"
                        className="allergy-details-form-item"
                        rules={[
                          {
                            required: true,
                            whitespace: true,
                            message:
                              "Please enter the patient's allergy details",
                          },
                        ]}
                      >
                        <Input.TextArea
                          rows={3}
                          maxLength={500}
                          showCount
                          placeholder="Example: Penicillin, latex, peanuts or local anaesthetic"
                        />
                      </Form.Item>
                    }
                  />
                )}
              </div>

              <div className="patient-more-options">
                <Button
                  htmlType="button"
                  type="link"
                  onClick={() => setShowMoreOptions((previous) => !previous)}
                >
                  {showMoreOptions
                    ? "Hide additional information"
                    : "+ Add more information"}
                </Button>
              </div>
            </Col>

            {showMoreOptions && (
              <Col xs={24} md={12}>
                <div className="patient-form-section patient-form-section--additional">
                  <div className="patient-form-section__header">
                    <div className="patient-form-section__icon patient-form-section__icon--additional">
                      <PlusOutlined />
                    </div>

                    <div>
                      <Text strong>Additional Information</Text>

                      <Text type="secondary">Optional patient details</Text>
                    </div>
                  </div>

                  <Form.Item label="Gender" name="gender">
                    <Select
                      allowClear
                      placeholder="Select gender"
                      options={[
                        {
                          label: "Male",
                          value: "Male",
                        },
                        {
                          label: "Female",
                          value: "Female",
                        },
                        {
                          label: "Other",
                          value: "Other",
                        },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item label="Address" name="address">
                    <Input.TextArea
                      rows={4}
                      maxLength={500}
                      showCount
                      placeholder="Enter patient address"
                    />
                  </Form.Item>

                  <Form.Item label="Patient Status" name="status">
                    <Select
                      placeholder="Select patient status"
                      options={[
                        {
                          label: "Active",
                          value: "Active",
                        },
                        {
                          label: "Inactive",
                          value: "Inactive",
                        },
                      ]}
                    />
                  </Form.Item>
                </div>
              </Col>
            )}
          </Row>
        </Form>
      </Modal>

      {/* Full patient details modal */}

      <PatientDetailsModal
        open={viewModalOpen}
        patientId={getPatientId(selectedPatient) || null}
        initialPatient={selectedPatient}
        onClose={closeViewModal}
        onEdit={handleEditFromDetails}
        showEdit
      />
    </ClinicPage>
  );
};

export default Patients;
