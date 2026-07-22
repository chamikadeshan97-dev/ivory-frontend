import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  IdcardOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";

import {
  createDentist,
  deleteDentist,
  getDentists,
  updateDentist,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";

import "./css/Dentists.css";

const {
  Title,
  Text,
} = Typography;

/* --------------------------------------------------------
   Options
-------------------------------------------------------- */

const specializationOptions = [
  {
    label: "General Dentistry",
    value: "General Dentistry",
  },
  {
    label: "Orthodontics",
    value: "Orthodontics",
  },
  {
    label: "Endodontics",
    value: "Endodontics",
  },
  {
    label: "Periodontics",
    value: "Periodontics",
  },
  {
    label: "Oral Surgery",
    value: "Oral Surgery",
  },
  {
    label: "Pediatric Dentistry",
    value: "Pediatric Dentistry",
  },
];

const statusOptions = [
  {
    label: "Active",
    value: "Active",
  },
  {
    label: "Inactive",
    value: "Inactive",
  },
];

/* --------------------------------------------------------
   Dentist helpers
-------------------------------------------------------- */

const getDentistId = (dentist) => {
  return (
    dentist?.id ??
    dentist?.dentist_id ??
    ""
  );
};

const getDentistName = (dentist) => {
  return (
    dentist?.name ??
    dentist?.dentist_name ??
    ""
  );
};

const getDentistPhone = (dentist) => {
  return (
    dentist?.phone ??
    dentist?.phone_number ??
    ""
  );
};

const getDentistSpecialization = (
  dentist,
) => {
  return (
    dentist?.specialization ||
    "General Dentistry"
  );
};

const getDentistStatus = (dentist) => {
  return dentist?.status || "Active";
};

const normalizeStatus = (value) => {
  return String(value || "Active")
    .trim()
    .toLowerCase();
};

const isDentistActive = (dentist) => {
  return (
    normalizeStatus(
      getDentistStatus(dentist),
    ) !== "inactive"
  );
};

/* --------------------------------------------------------
   Summary card
-------------------------------------------------------- */

const DentistSummaryCard = ({
  title,
  value,
  helper,
  icon,
  tone,
}) => {
  return (
    <Card
      bordered={false}
      className={`dentist-summary-card dentist-summary-card--${tone}`}
    >
      <div className="dentist-summary-card__content">
        <div>
          <Text className="dentist-summary-card__title">
            {title}
          </Text>

          <div className="dentist-summary-card__value">
            {value}
          </div>

          <Text className="dentist-summary-card__helper">
            {helper}
          </Text>
        </div>

        <div className="dentist-summary-card__icon">
          {icon}
        </div>
      </div>
    </Card>
  );
};

/* --------------------------------------------------------
   Dentists page
-------------------------------------------------------- */

const Dentists = () => {
  const [form] = Form.useForm();

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [dentists, setDentists] =
    useState([]);

  const [search, setSearch] =
    useState("");

  /* ------------------------------------------------------
     Add/Edit modal
  ------------------------------------------------------ */

  const [modalOpen, setModalOpen] =
    useState(false);

  const [
    editingDentist,
    setEditingDentist,
  ] = useState(null);

  /* ------------------------------------------------------
     View modal
  ------------------------------------------------------ */

  const [
    viewModalOpen,
    setViewModalOpen,
  ] = useState(false);

  const [
    selectedDentist,
    setSelectedDentist,
  ] = useState(null);

  /* ------------------------------------------------------
     Extract response
  ------------------------------------------------------ */

  const extractArray = (response) => {
    const data =
      response?.data?.data ||
      response?.data ||
      [];

    return Array.isArray(data)
      ? data
      : [];
  };

  /* ------------------------------------------------------
     Load dentists
  ------------------------------------------------------ */

  const loadDentists = async () => {
    setLoading(true);

    try {
      const response =
        await getDentists();

      setDentists(
        extractArray(response),
      );
    } catch (error) {
      console.error(
        "Failed to load dentists:",
        error,
      );

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load dentists",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDentists();
  }, []);

  /* ------------------------------------------------------
     Summary values
  ------------------------------------------------------ */

  const dentistSummary = useMemo(() => {
    const activeDentists =
      dentists.filter(
        isDentistActive,
      ).length;

    const inactiveDentists =
      dentists.length -
      activeDentists;

    const specializations =
      new Set(
        dentists
          .map((dentist) =>
            getDentistSpecialization(
              dentist,
            ),
          )
          .filter(Boolean),
      ).size;

    return {
      total: dentists.length,
      active: activeDentists,
      inactive: inactiveDentists,
      specializations,
    };
  }, [dentists]);

  /* ------------------------------------------------------
     Search and sorting
  ------------------------------------------------------ */

  const filteredDentists = useMemo(() => {
    const keyword = search
      .toLowerCase()
      .trim();

    const filtered = dentists.filter(
      (dentist) => {
        const searchableValues = [
          getDentistId(dentist),
          getDentistName(dentist),
          getDentistPhone(dentist),
          getDentistSpecialization(
            dentist,
          ),
          getDentistStatus(dentist),
        ];

        return (
          !keyword ||
          searchableValues.some(
            (value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(keyword),
          )
        );
      },
    );

    return [...filtered].sort(
      (first, second) => {
        const firstActive =
          isDentistActive(first);

        const secondActive =
          isDentistActive(second);

        if (
          firstActive !==
          secondActive
        ) {
          return firstActive
            ? -1
            : 1;
        }

        return getDentistName(
          first,
        ).localeCompare(
          getDentistName(second),
        );
      },
    );
  }, [
    dentists,
    search,
  ]);

  /* ------------------------------------------------------
     Add dentist
  ------------------------------------------------------ */

  const openAddModal = () => {
    setEditingDentist(null);

    form.resetFields();

    form.setFieldsValue({
      name: "",
      phone: "",
      specialization:
        "General Dentistry",
      status: "Active",
    });

    setModalOpen(true);
  };

  /* ------------------------------------------------------
     Edit dentist
  ------------------------------------------------------ */

  const openEditModal = (dentist) => {
    if (!dentist) {
      return;
    }

    setEditingDentist(dentist);

    form.resetFields();

    form.setFieldsValue({
      name:
        getDentistName(dentist),

      phone:
        getDentistPhone(dentist),

      specialization:
        getDentistSpecialization(
          dentist,
        ),

      status:
        getDentistStatus(dentist),
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDentist(null);

    form.resetFields();
  };

  /* ------------------------------------------------------
     View dentist
  ------------------------------------------------------ */

  const openViewModal = (dentist) => {
    setSelectedDentist(dentist);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedDentist(null);
  };

  const handleEditFromView = () => {
    const dentist =
      selectedDentist;

    closeViewModal();

    if (dentist) {
      openEditModal(dentist);
    }
  };

  /* ------------------------------------------------------
     Submit
  ------------------------------------------------------ */

  const handleSubmit = async () => {
    try {
      const values =
        await form.validateFields();

      setSaving(true);

      const payload = {
        name:
          values.name?.trim() || "",

        phone:
          values.phone?.trim() || "",

        specialization:
          values.specialization ||
          "General Dentistry",

        status:
          values.status ||
          "Active",
      };

      if (editingDentist) {
        const dentistId =
          getDentistId(
            editingDentist,
          );

        if (!dentistId) {
          throw new Error(
            "Dentist ID is missing",
          );
        }

        await updateDentist(
          dentistId,
          payload,
        );

        message.success(
          "Dentist updated successfully",
        );
      } else {
        await createDentist(payload);

        message.success(
          "Dentist added successfully",
        );
      }

      closeModal();

      await loadDentists();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error(
        "Failed to save dentist:",
        error,
      );

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save dentist",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------
     Delete dentist
  ------------------------------------------------------ */

  const handleDelete = async (
    dentist,
  ) => {
    try {
      const dentistId =
        getDentistId(dentist);

      if (!dentistId) {
        throw new Error(
          "Dentist ID is missing",
        );
      }

      await deleteDentist(
        dentistId,
      );

      message.success(
        "Dentist deleted successfully",
      );

      await loadDentists();
    } catch (error) {
      console.error(
        "Failed to delete dentist:",
        error,
      );

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete dentist",
      );
    }
  };

  /* ------------------------------------------------------
     Table columns
  ------------------------------------------------------ */

  const columns = [
  {
    title: "Dentist ID",
    key: "dentist_id",
    width: 155,

    render: (_, record) => (
      <div className="dentist-id-badge">
        {getDentistId(record) || "-"}
      </div>
    ),
  },

  {
    title: "Dentist",
    key: "dentist",
    width: 290,

    render: (_, record) => {
      const active =
        isDentistActive(record);

      return (
        <Space
          size={11}
          align="center"
        >
          <Avatar
            size={43}
            icon={<UserOutlined />}
            className={
              active
                ? "dentist-avatar"
                : "dentist-avatar dentist-avatar--inactive"
            }
          />

          <div className="dentist-name-cell">
            <Text strong>
              {getDentistName(record) ||
                "-"}
            </Text>

            <Text type="secondary">
              {getDentistSpecialization(
                record,
              )}
            </Text>
          </div>
        </Space>
      );
    },
  },

  {
    title: "Phone",
    key: "phone",
    width: 175,

    render: (_, record) => (
      <Space size={7}>
        <PhoneOutlined className="dentist-phone-icon" />

        <Text>
          {getDentistPhone(record) ||
            "-"}
        </Text>
      </Space>
    ),
  },

  {
    title: "Specialization",
    key: "specialization",
    width: 220,

    render: (_, record) => (
      <Tag
        color="blue"
        icon={
          <MedicineBoxOutlined />
        }
        className="dentist-specialization-tag"
      >
        {getDentistSpecialization(
          record,
        )}
      </Tag>
    ),
  },

  {
    title: "Status",
    key: "status",
    width: 125,

    filters: [
      {
        text: "Active",
        value: "Active",
      },
      {
        text: "Inactive",
        value: "Inactive",
      },
    ],

    onFilter: (value, record) =>
      getDentistStatus(record) ===
      value,

    render: (_, record) => {
      const active =
        isDentistActive(record);

      return (
        <Tag
          color={
            active
              ? "green"
              : "default"
          }
          icon={
            active ? (
              <CheckCircleOutlined />
            ) : (
              <StopOutlined />
            )
          }
          className="dentist-status-tag"
        >
          {getDentistStatus(record)}
        </Tag>
      );
    },
  },

  {
    title: "Actions",
    key: "actions",
    width: 250,
    fixed: "right",

    render: (_, record) => (
      <Space size={7}>
        <Tooltip title="View dentist details">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() =>
              openViewModal(record)
            }
          >
            View
          </Button>
        </Tooltip>

        <Button
          type="primary"
          size="small"
          icon={<EditOutlined />}
          onClick={() =>
            openEditModal(record)
          }
        >
          Edit
        </Button>

        <Popconfirm
          title="Delete Dentist"
          description={`Are you sure you want to delete ${
            getDentistName(record) ||
            "this dentist"
          }?`}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{
            danger: true,
          }}
          onConfirm={() =>
            handleDelete(record)
          }
        >
          <Tooltip title="Delete dentist">
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
            />
          </Tooltip>
        </Popconfirm>
      </Space>
    ),
  },
];
  

  


  
  
const selectedDentistActive =
    selectedDentist
      ? isDentistActive(
          selectedDentist,
        )
      : true;

  return (
    <ClinicPage
      title="Dentists"
      subtitle="Manage clinic dentists, contact information, specializations and availability status."
      icon={
        <MedicineBoxOutlined />
      }
      actions={[
        <Button
          key="refresh"
          icon={
            <ReloadOutlined />
          }
          loading={loading}
          onClick={loadDentists}
        >
          Refresh
        </Button>,

        <Button
          key="add-dentist"
          type="primary"
          icon={<PlusOutlined />}
          onClick={openAddModal}
        >
          Add Dentist
        </Button>,
      ]}
    >
      {/* Summary cards */}

      <Row
        gutter={[16, 16]}
        className="dentist-summary-row"
      >
        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <DentistSummaryCard
            title="Total Dentists"
            value={
              dentistSummary.total
            }
            helper="Registered dentists"
            tone="blue"
            icon={<TeamOutlined />}
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <DentistSummaryCard
            title="Active Dentists"
            value={
              dentistSummary.active
            }
            helper="Available clinic records"
            tone="green"
            icon={
              <CheckCircleOutlined />
            }
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <DentistSummaryCard
            title="Inactive Dentists"
            value={
              dentistSummary.inactive
            }
            helper="Currently inactive"
            tone="orange"
            icon={<StopOutlined />}
          />
        </Col>

        <Col
          xs={24}
          sm={12}
          xl={6}
        >
          <DentistSummaryCard
            title="Specializations"
            value={
              dentistSummary.specializations
            }
            helper="Professional categories"
            tone="purple"
            icon={
              <MedicineBoxOutlined />
            }
          />
        </Col>
      </Row>

      {/* Dentist directory */}

      <Card
        bordered={false}
        className="dentist-directory-card"
      >
        <div className="dentist-directory-header">
          <div>
            <Title level={4}>
              Dentist Directory
            </Title>

            <Text type="secondary">
              Search, review and manage
              clinic dentist records.
            </Text>
          </div>

          <Tag
            color="blue"
            className="dentist-result-count"
          >
            {filteredDentists.length}{" "}
            result
            {filteredDentists.length !==
            1
              ? "s"
              : ""}
          </Tag>
        </div>

        <div className="dentist-table-toolbar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search ID, name, phone, specialization or status"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            className="dentist-search-input"
          />
        </div>

        <Table
          rowKey={(record) =>
            getDentistId(record)
          }
          loading={loading}
          columns={columns}
          dataSource={
            filteredDentists
          }
          rowClassName={(record) =>
            isDentistActive(record)
              ? ""
              : "inactive-dentist-row"
          }
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            showTotal: (total) =>
              `${total} dentist${
                total !== 1
                  ? "s"
                  : ""
              }`,
          }}
          scroll={{
            x: 1220,
          }}
          locale={{
            emptyText: (
              <Empty
                image={
                  Empty.PRESENTED_IMAGE_SIMPLE
                }
                description={
                  search
                    ? "No matching dentists found"
                    : "No dentists have been registered"
                }
              >
                {!search && (
                  <Button
                    type="primary"
                    icon={
                      <PlusOutlined />
                    }
                    onClick={
                      openAddModal
                    }
                  >
                    Add First Dentist
                  </Button>
                )}
              </Empty>
            ),
          }}
        />
      </Card>

      {/* View dentist modal */}

      <Modal
        title={null}
        open={viewModalOpen}
        onCancel={closeViewModal}
        width={760}
        centered
        destroyOnHidden
        className={
          selectedDentistActive
            ? "dentist-details-modal"
            : "dentist-details-modal dentist-details-modal--inactive"
        }
        footer={[
          <Button
            key="close"
            onClick={
              closeViewModal
            }
          >
            Close
          </Button>,

          <Button
            key="edit"
            type="primary"
            icon={
              <EditOutlined />
            }
            disabled={
              !selectedDentist
            }
            onClick={
              handleEditFromView
            }
          >
            Edit Dentist
          </Button>,
        ]}
      >
        {selectedDentist ? (
          <>
            <div className="dentist-details-header">
              <Avatar
                size={72}
                icon={
                  <UserOutlined />
                }
                className="dentist-details-header__avatar"
              />

              <div className="dentist-details-header__identity">
                <Title level={3}>
                  {getDentistName(
                    selectedDentist,
                  ) ||
                    "Unnamed Dentist"}
                </Title>

                <Space wrap size={8}>
                  <Tag
                    icon={
                      <IdcardOutlined />
                    }
                    className="dentist-details-header__id"
                  >
                    {getDentistId(
                      selectedDentist,
                    ) ||
                      "No Dentist ID"}
                  </Tag>

                  <Tag
                    color={
                      selectedDentistActive
                        ? "green"
                        : "default"
                    }
                    icon={
                      selectedDentistActive ? (
                        <CheckCircleOutlined />
                      ) : (
                        <StopOutlined />
                      )
                    }
                  >
                    {getDentistStatus(
                      selectedDentist,
                    )}
                  </Tag>
                </Space>
              </div>
            </div>

            <div className="dentist-details-content">
              <Card
                bordered={false}
                className="dentist-information-card"
              >
                <div className="dentist-section-heading">
                  <div>
                    <Title level={4}>
                      Dentist Information
                    </Title>

                    <Text type="secondary">
                      Personal and clinic
                      contact information.
                    </Text>
                  </div>
                </div>

                <Descriptions
                  bordered
                  size="middle"
                  column={{
                    xs: 1,
                    md: 2,
                  }}
                  className="dentist-descriptions"
                >
                  <Descriptions.Item label="Dentist ID">
                    <Text strong>
                      {getDentistId(
                        selectedDentist,
                      ) || "-"}
                    </Text>
                  </Descriptions.Item>

                  <Descriptions.Item label="Dentist Name">
                    <Text strong>
                      {getDentistName(
                        selectedDentist,
                      ) || "-"}
                    </Text>
                  </Descriptions.Item>

                  <Descriptions.Item label="Phone Number">
                    <Space size={7}>
                      <PhoneOutlined />

                      <Text>
                        {getDentistPhone(
                          selectedDentist,
                        ) || "-"}
                      </Text>
                    </Space>
                  </Descriptions.Item>

                  <Descriptions.Item label="Status">
                    <Tag
                      color={
                        selectedDentistActive
                          ? "green"
                          : "default"
                      }
                    >
                      {getDentistStatus(
                        selectedDentist,
                      )}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card
                bordered={false}
                className="dentist-professional-card"
              >
                <div className="dentist-professional-card__icon">
                  <MedicineBoxOutlined />
                </div>

                <div className="dentist-professional-card__content">
                  <Text type="secondary">
                    Professional
                    Specialization
                  </Text>

                  <Title level={4}>
                    {getDentistSpecialization(
                      selectedDentist,
                    )}
                  </Title>

                  <Text type="secondary">
                    Primary dental service
                    category assigned to
                    this dentist.
                  </Text>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <div className="dentist-details-empty">
            <Empty description="Dentist details are unavailable" />
          </div>
        )}
      </Modal>

      {/* Add/Edit dentist modal */}

      <Modal
        title={
          <div className="dentist-form-modal-title">
            <div className="dentist-form-modal-title__icon">
              {editingDentist ? (
                <EditOutlined />
              ) : (
                <UserAddOutlined />
              )}
            </div>

            <div>
              <Text strong>
                {editingDentist
                  ? "Edit Dentist"
                  : "Add New Dentist"}
              </Text>

              <Text type="secondary">
                {editingDentist
                  ? "Update dentist information and clinic status."
                  : "Register a new dentist in the clinic system."}
              </Text>
            </div>
          </div>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={
          editingDentist
            ? "Update Dentist"
            : "Add Dentist"
        }
        cancelText="Cancel"
        width={580}
        centered
        destroyOnHidden
        className="dentist-form-modal"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            specialization:
              "General Dentistry",
            status: "Active",
          }}
        >
          <div className="dentist-form-section">
            <div className="dentist-form-section__header">
              <div className="dentist-form-section__icon">
                <UserOutlined />
              </div>

              <div>
                <Text strong>
                  Basic Information
                </Text>

                <Text type="secondary">
                  Required dentist
                  information
                </Text>
              </div>
            </div>

            <Form.Item
              label="Dentist Name"
              name="name"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message:
                    "Please enter dentist name",
                },
              ]}
            >
              <Input
                placeholder="Example: Dr. Nimal Perera"
                prefix={
                  <UserOutlined />
                }
              />
            </Form.Item>

            <Form.Item
              label="Phone Number"
              name="phone"
              rules={[
                {
                  required: true,
                  message:
                    "Please enter phone number",
                },
                {
                  pattern:
                    /^[0-9]{10}$/,
                  message:
                    "Please enter a valid 10-digit phone number",
                },
              ]}
            >
              <Input
                placeholder="Example: 0771234567"
                prefix={
                  <PhoneOutlined />
                }
                maxLength={10}
              />
            </Form.Item>
          </div>

          <div className="dentist-form-section dentist-form-section--professional">
            <div className="dentist-form-section__header">
              <div className="dentist-form-section__icon dentist-form-section__icon--professional">
                <MedicineBoxOutlined />
              </div>

              <div>
                <Text strong>
                  Professional Information
                </Text>

                <Text type="secondary">
                  Specialization and clinic
                  status
                </Text>
              </div>
            </div>

            <Form.Item
              label="Specialization"
              name="specialization"
              rules={[
                {
                  required: true,
                  message:
                    "Please select specialization",
                },
              ]}
            >
              <Select
                showSearch
                placeholder="Select specialization"
                options={
                  specializationOptions
                }
                optionFilterProp="label"
              />
            </Form.Item>

            <Form.Item
              label="Dentist Status"
              name="status"
            >
              <Select
                options={statusOptions}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </ClinicPage>
    
  );
};

export default Dentists;