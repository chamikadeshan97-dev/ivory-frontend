import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  DeleteOutlined,
  EditOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TagsOutlined,
} from "@ant-design/icons";

import {
  createDrug,
  deleteDrug,
  getDrugs,
  searchDrugs,
  updateDrug,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";

import "./css/Drugs.css";

const {
  Text,
} = Typography;

/* --------------------------------------------------------
   Helpers
-------------------------------------------------------- */

const extractResponseData = (response) => {
  const responseData = response?.data;

  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  return [];
};

const getErrorMessage = (
  error,
  fallbackMessage,
) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
};

/* --------------------------------------------------------
   Component
-------------------------------------------------------- */

const Drugs = () => {
  const [form] = Form.useForm();

  const [
    messageApi,
    messageContextHolder,
  ] = message.useMessage();

  const [drugs, setDrugs] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [searchText, setSearchText] =
    useState("");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [
    editingDrug,
    setEditingDrug,
  ] = useState(null);

  /* ------------------------------------------------------
     Load drugs
  ------------------------------------------------------ */

  const loadDrugs = useCallback(
    async (requestedSearchText = "") => {
      try {
        setLoading(true);

        const normalizedSearchText =
          String(
            requestedSearchText || "",
          ).trim();

        const response =
          normalizedSearchText
            ? await searchDrugs(
                normalizedSearchText,
              )
            : await getDrugs();

        setDrugs(
          extractResponseData(response),
        );
      } catch (error) {
        console.error(
          "Failed to load drugs:",
          error,
        );

        messageApi.error(
          getErrorMessage(
            error,
            "Failed to load drugs",
          ),
        );

        setDrugs([]);
      } finally {
        setLoading(false);
      }
    },
    [messageApi],
  );

  /* ------------------------------------------------------
     Initial loading
  ------------------------------------------------------ */

  useEffect(() => {
    loadDrugs();
  }, [loadDrugs]);

  /* ------------------------------------------------------
     Modal controls
  ------------------------------------------------------ */

  const openCreateModal = () => {
    setEditingDrug(null);

    form.resetFields();

    form.setFieldsValue({
      name: "",
    });

    setModalOpen(true);
  };

  const openEditModal = (drug) => {
    setEditingDrug(drug);

    form.setFieldsValue({
      name: drug?.name || "",
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingDrug(null);
    form.resetFields();
  };

  /* ------------------------------------------------------
     Save drug
  ------------------------------------------------------ */

  const handleSaveDrug = async () => {
    try {
      const values =
        await form.validateFields();

      const payload = {
        name: String(
          values.name || "",
        ).trim(),
      };

      setSaving(true);

      if (editingDrug?.id) {
        await updateDrug(
          editingDrug.id,
          payload,
        );

        messageApi.success(
          "Drug updated successfully",
        );
      } else {
        await createDrug(payload);

        messageApi.success(
          "Drug created successfully",
        );
      }

      setModalOpen(false);
      setEditingDrug(null);
      form.resetFields();

      await loadDrugs(searchText);
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error(
        "Failed to save drug:",
        error,
      );

      messageApi.error(
        getErrorMessage(
          error,
          editingDrug
            ? "Failed to update drug"
            : "Failed to create drug",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------
     Delete drug
  ------------------------------------------------------ */

  const handleDeleteDrug = async (
    drug,
  ) => {
    try {
      setLoading(true);

      await deleteDrug(drug.id);

      messageApi.success(
        "Drug deleted successfully",
      );

      await loadDrugs(searchText);
    } catch (error) {
      console.error(
        "Failed to delete drug:",
        error,
      );

      messageApi.error(
        getErrorMessage(
          error,
          "Failed to delete drug",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------
     Search
  ------------------------------------------------------ */

  const handleSearch = () => {
    loadDrugs(searchText);
  };

  const handleSearchInputChange = (
    event,
  ) => {
    const value = event.target.value;

    setSearchText(value);

    if (!String(value).trim()) {
      loadDrugs("");
    }
  };

  const handleClearSearch = () => {
    setSearchText("");
    loadDrugs("");
  };

  const handleRefresh = async () => {
    await loadDrugs(searchText);
  };

  /* ------------------------------------------------------
     Table columns
  ------------------------------------------------------ */

  const columns = useMemo(
    () => [
      {
        title: "Drug ID",
        dataIndex: "id",
        key: "id",
        width: 180,
        sorter: (first, second) =>
          String(
            first?.id || "",
          ).localeCompare(
            String(second?.id || ""),
          ),
        render: (value) => (
          <Tag className="drug-id-tag">
            {value || "N/A"}
          </Tag>
        ),
      },
      {
        title: "Drug Name",
        dataIndex: "name",
        key: "name",
        sorter: (first, second) =>
          String(
            first?.name || "",
          ).localeCompare(
            String(second?.name || ""),
          ),
        render: (value) => (
          <div className="drug-name-cell">
            <div className="drug-table-icon">
              <MedicineBoxOutlined />
            </div>

            <div>
              <Text strong>
                {value || "Unnamed drug"}
              </Text>

              <Text
                type="secondary"
                className="drug-name-description"
              >
                Available for prescription
                selection
              </Text>
            </div>
          </div>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        width: 150,
        align: "center",
        fixed: "right",
        render: (_, drug) => (
          <Space size={6}>
            <Tooltip title="Edit drug">
              <Button
                type="text"
                icon={<EditOutlined />}
                className="drug-edit-button"
                onClick={() =>
                  openEditModal(drug)
                }
              />
            </Tooltip>

            <Popconfirm
              title="Delete drug?"
              description={
                <div>
                  <div>
                    This will permanently
                    delete:
                  </div>

                  <strong>
                    {drug.name}
                  </strong>
                </div>
              }
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{
                danger: true,
              }}
              onConfirm={() =>
                handleDeleteDrug(drug)
              }
            >
              <Tooltip title="Delete drug">
                <Button
                  type="text"
                  danger
                  icon={
                    <DeleteOutlined />
                  }
                  className="drug-delete-button"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [],
  );

  /* ------------------------------------------------------
     Statistics
  ------------------------------------------------------ */

  const totalDrugs = drugs.length;

  /* ------------------------------------------------------
     Render
  ------------------------------------------------------ */

  return (
    <ClinicPage
      title="Drugs"
      subtitle="Manage medicines available for patient prescriptions"
      icon={<MedicineBoxOutlined />}
      actions={[
        <Button
          key="refresh-drugs"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={handleRefresh}
        >
          Refresh
        </Button>,

        <Button
          key="add-drug"
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Add Drug
        </Button>,
      ]}
    >
      {messageContextHolder}

      <div className="drugs-page">
        {/* ----------------------------------------------
            Statistics
        ---------------------------------------------- */}

        <Row
          gutter={[16, 16]}
          className="drug-statistics-row"
        >
          <Col
            xs={24}
            sm={12}
            lg={8}
            xl={6}
          >
            <Card
              bordered={false}
              className="drug-stat-card"
            >
              <Statistic
                title={
                  searchText
                    ? "Matching Drugs"
                    : "Total Drugs"
                }
                value={totalDrugs}
                prefix={
                  <TagsOutlined className="drug-statistic-prefix-icon" />
                }
              />
            </Card>
          </Col>
        </Row>

        {/* ----------------------------------------------
            Main table
        ---------------------------------------------- */}

        <Card
          bordered={false}
          className="drugs-table-card"
        >
          <div className="drugs-toolbar">
            <div>
              <Text
                strong
                className="drugs-table-title"
              >
                Drug Catalogue
              </Text>

              <Text
                type="secondary"
                className="drugs-table-description"
              >
                These medicines can be
                selected when the doctor
                prepares a patient
                prescription.
              </Text>
            </div>

            <Space.Compact className="drug-search">
              <Input
                allowClear
                value={searchText}
                placeholder="Search drug name or ID"
                prefix={
                  <SearchOutlined />
                }
                onChange={
                  handleSearchInputChange
                }
                onPressEnter={
                  handleSearch
                }
                onClear={
                  handleClearSearch
                }
              />

              <Button
                type="primary"
                icon={
                  <SearchOutlined />
                }
                onClick={handleSearch}
              >
                Search
              </Button>
            </Space.Compact>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={drugs}
            loading={loading}
            scroll={{
              x: 700,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={
                    Empty.PRESENTED_IMAGE_SIMPLE
                  }
                  description={
                    searchText
                      ? "No drugs match your search"
                      : "No drugs have been added"
                  }
                >
                  {!searchText && (
                    <Button
                      type="primary"
                      icon={
                        <PlusOutlined />
                      }
                      onClick={
                        openCreateModal
                      }
                    >
                      Add First Drug
                    </Button>
                  )}
                </Empty>
              ),
            }}
            pagination={{
              pageSize: 8,
              showSizeChanger: true,
              pageSizeOptions: [
                "8",
                "15",
                "25",
                "50",
              ],
              showTotal: (
                total,
                range,
              ) =>
                `${range[0]}-${range[1]} of ${total} drugs`,
            }}
          />
        </Card>

        {/* ----------------------------------------------
            Add/Edit modal
        ---------------------------------------------- */}

        <Modal
          title={
            <div className="drug-modal-title">
              <div className="drug-modal-icon">
                {editingDrug ? (
                  <EditOutlined />
                ) : (
                  <PlusOutlined />
                )}
              </div>

              <div>
                <div>
                  {editingDrug
                    ? "Edit Drug"
                    : "Add Drug"}
                </div>

                <Text
                  type="secondary"
                  className="drug-modal-subtitle"
                >
                  {editingDrug
                    ? "Update the medicine name"
                    : "Add a medicine to the prescription catalogue"}
                </Text>
              </div>
            </div>
          }
          open={modalOpen}
          onCancel={closeModal}
          onOk={handleSaveDrug}
          okText={
            editingDrug
              ? "Save Changes"
              : "Add Drug"
          }
          cancelText="Cancel"
          confirmLoading={saving}
          destroyOnClose
          maskClosable={!saving}
          className="drug-modal"
        >
          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
          >
            {editingDrug?.id && (
              <Form.Item label="Drug ID">
                <Input
                  disabled
                  value={
                    editingDrug.id
                  }
                />
              </Form.Item>
            )}

            <Form.Item
              name="name"
              label="Drug Name"
              extra="Include the medicine strength and form inside the name, such as Amoxicillin 500 mg Capsule."
              rules={[
                {
                  required: true,
                  message:
                    "Please enter the drug name",
                },
                {
                  whitespace: true,
                  message:
                    "Drug name cannot be empty",
                },
                {
                  min: 2,
                  message:
                    "Drug name must contain at least 2 characters",
                },
                {
                  max: 150,
                  message:
                    "Drug name cannot exceed 150 characters",
                },
              ]}
            >
              <Input
                autoFocus
                size="large"
                prefix={
                  <MedicineBoxOutlined />
                }
                placeholder="Example: Amoxicillin 500 mg Capsule"
                onPressEnter={
                  handleSaveDrug
                }
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ClinicPage>
  );
};

export default Drugs;