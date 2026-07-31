import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
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
  DollarOutlined,
  EditOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TagsOutlined,
} from "@ant-design/icons";

import {
  createCommonTreatment,
  deleteCommonTreatment,
  getCommonTreatments,
  getCommonTreatmentStatistics,
  searchCommonTreatments,
  updateCommonTreatment,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";

import "./css/CommonTreatments.css";

const { Text, Title } = Typography;

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

const extractStatisticsData = (response) => {
  return response?.data?.data || response?.data || {};
};

const getErrorMessage = (error, fallbackMessage) => {
  return error?.response?.data?.message || error?.message || fallbackMessage;
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return `Rs. ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/* --------------------------------------------------------
   Component
-------------------------------------------------------- */

const CommonTreatments = () => {
  const [form] = Form.useForm();
  const [messageApi, messageContextHolder] = message.useMessage();

  const [treatments, setTreatments] = useState([]);
  const [statistics, setStatistics] = useState({});

  const [loading, setLoading] = useState(false);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchText, setSearchText] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState(null);

  /* ------------------------------------------------------
     Load treatments
  ------------------------------------------------------ */

  const loadTreatments = useCallback(
    async (requestedSearchText = "") => {
      try {
        setLoading(true);

        const normalizedSearchText = String(requestedSearchText || "").trim();

        const response = normalizedSearchText
          ? await searchCommonTreatments(normalizedSearchText)
          : await getCommonTreatments();

        setTreatments(extractResponseData(response));
      } catch (error) {
        console.error("Failed to load common treatments:", error);

        messageApi.error(
          getErrorMessage(error, "Failed to load common treatments"),
        );

        setTreatments([]);
      } finally {
        setLoading(false);
      }
    },
    [messageApi],
  );

  /* ------------------------------------------------------
     Load statistics
  ------------------------------------------------------ */

  const loadStatistics = useCallback(async () => {
    try {
      setStatisticsLoading(true);

      const response = await getCommonTreatmentStatistics();

      setStatistics(extractStatisticsData(response));
    } catch (error) {
      console.error("Failed to load common treatment statistics:", error);

      setStatistics({});
    } finally {
      setStatisticsLoading(false);
    }
  }, []);

  /* ------------------------------------------------------
     Initial loading
  ------------------------------------------------------ */

  useEffect(() => {
    loadTreatments();
    loadStatistics();
  }, [loadTreatments, loadStatistics]);

  /* ------------------------------------------------------
     Modal controls
  ------------------------------------------------------ */

  const openCreateModal = () => {
    setEditingTreatment(null);

    form.resetFields();

    form.setFieldsValue({
      treatment_name: "",
      fee: null,
    });

    setModalOpen(true);
  };

  const openEditModal = (treatment) => {
    setEditingTreatment(treatment);

    form.setFieldsValue({
      treatment_name: treatment?.treatment_name || "",
      fee: Number(treatment?.fee || 0),
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingTreatment(null);
    form.resetFields();
  };

  /* ------------------------------------------------------
     Save treatment
  ------------------------------------------------------ */

  const handleSaveTreatment = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        treatment_name: String(values.treatment_name || "").trim(),
        fee: Number(values.fee),
      };

      setSaving(true);

      if (editingTreatment?.id) {
        await updateCommonTreatment(editingTreatment.id, payload);

        messageApi.success("Common treatment updated successfully");
      } else {
        await createCommonTreatment(payload);

        messageApi.success("Common treatment created successfully");
      }

      setModalOpen(false);
      setEditingTreatment(null);
      form.resetFields();

      await Promise.all([loadTreatments(searchText), loadStatistics()]);
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error("Failed to save common treatment:", error);

      messageApi.error(
        getErrorMessage(
          error,
          editingTreatment
            ? "Failed to update common treatment"
            : "Failed to create common treatment",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------
     Delete treatment
  ------------------------------------------------------ */

  const handleDeleteTreatment = async (treatment) => {
    try {
      setLoading(true);

      await deleteCommonTreatment(treatment.id);

      messageApi.success("Common treatment deleted successfully");

      await Promise.all([loadTreatments(searchText), loadStatistics()]);
    } catch (error) {
      console.error("Failed to delete common treatment:", error);

      messageApi.error(
        getErrorMessage(error, "Failed to delete common treatment"),
      );
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------
     Search
  ------------------------------------------------------ */

  const handleSearch = () => {
    loadTreatments(searchText);
  };

  const handleSearchInputChange = (event) => {
    const value = event.target.value;

    setSearchText(value);

    if (!String(value).trim()) {
      loadTreatments("");
    }
  };

  const handleClearSearch = () => {
    setSearchText("");
    loadTreatments("");
  };

  const handleRefresh = async () => {
    await Promise.all([loadTreatments(searchText), loadStatistics()]);
  };

  /* ------------------------------------------------------
     Table columns
  ------------------------------------------------------ */

  const columns = useMemo(
    () => [
      {
        title: "Treatment ID",
        dataIndex: "id",
        key: "id",
        width: 170,
        render: (value) => (
          <Tag className="common-treatment-id-tag">{value || "N/A"}</Tag>
        ),
      },
      {
        title: "Treatment Name",
        dataIndex: "treatment_name",
        key: "treatment_name",
        sorter: (first, second) =>
          String(first?.treatment_name || "").localeCompare(
            String(second?.treatment_name || ""),
          ),
        render: (value) => (
          <div className="common-treatment-name-cell">
            <div className="common-treatment-table-icon">
              <MedicineBoxOutlined />
            </div>

            <Text strong>{value || "Unnamed treatment"}</Text>
          </div>
        ),
      },
      {
        title: "Standard Fee",
        dataIndex: "fee",
        key: "fee",
        width: 190,
        align: "right",
        sorter: (first, second) =>
          Number(first?.fee || 0) - Number(second?.fee || 0),
        render: (value) => (
          <Text className="common-treatment-fee">{formatCurrency(value)}</Text>
        ),
      },
      {
        title: "Last Updated",
        dataIndex: "updated_at",
        key: "updated_at",
        width: 210,
        responsive: ["lg"],
        render: (value) => {
          if (!value) {
            return <Text type="secondary">Not available</Text>;
          }

          const parsedDate = new Date(value);

          if (Number.isNaN(parsedDate.getTime())) {
            return <Text type="secondary">{value}</Text>;
          }

          return <Text type="secondary">{parsedDate.toLocaleString()}</Text>;
        },
      },
      {
        title: "Actions",
        key: "actions",
        width: 140,
        align: "center",
        fixed: "right",
        render: (_, treatment) => (
          <Space size={6}>
            <Tooltip title="Edit treatment">
              <Button
                type="text"
                icon={<EditOutlined />}
                className="common-treatment-edit-button"
                onClick={() => openEditModal(treatment)}
              />
            </Tooltip>

            <Popconfirm
              title="Delete common treatment?"
              description={
                <div>
                  <div>This will permanently delete:</div>

                  <strong>{treatment.treatment_name}</strong>
                </div>
              }
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{
                danger: true,
              }}
              onConfirm={() => handleDeleteTreatment(treatment)}
            >
              <Tooltip title="Delete treatment">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  className="common-treatment-delete-button"
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
     Statistics values
  ------------------------------------------------------ */

  const totalTreatments = Number(
    statistics?.total_treatments ?? treatments.length ?? 0,
  );

  const averageFee = Number(statistics?.average_fee || 0);

  const lowestFee = Number(statistics?.lowest_fee || 0);

  const highestFee = Number(statistics?.highest_fee || 0);

  /* ------------------------------------------------------
     Render
  ------------------------------------------------------ */

  return (
    <ClinicPage
      title="Common Treatments"
      subtitle=" Manage the clinic's standard
                  treatments and default fees"
      icon={<MedicineBoxOutlined />}
      actions={[
        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
          Refresh
        </Button>,

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
       
          
        >
          Add Treatment
        </Button>,
      ]}
    >
      {messageContextHolder}

      <div className="common-treatments-page">
      
      

        <Row gutter={[16, 16]} className="common-treatment-statistics-row">
          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              className="common-treatment-stat-card"
              loading={statisticsLoading}
            >
              <Statistic
                title="Total Treatments"
                value={totalTreatments}
                prefix={<TagsOutlined className="statistic-prefix-icon" />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              className="common-treatment-stat-card"
              loading={statisticsLoading}
            >
              <Statistic
                title="Average Fee"
                value={averageFee}
                precision={2}
                prefix="Rs."
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              className="common-treatment-stat-card"
              loading={statisticsLoading}
            >
              <Statistic
                title="Lowest Fee"
                value={lowestFee}
                precision={2}
                prefix="Rs."
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              className="common-treatment-stat-card"
              loading={statisticsLoading}
            >
              <Statistic
                title="Highest Fee"
                value={highestFee}
                precision={2}
                prefix="Rs."
              />
            </Card>
          </Col>
        </Row>

        {/* ------------------------------------------------
            Main table card
        ------------------------------------------------ */}

        <Card bordered={false} className="common-treatments-table-card">
          <div className="common-treatments-toolbar">
            <div>
              <Text strong className="common-treatments-table-title">
                Treatment Catalogue
              </Text>

              <Text
                type="secondary"
                className="common-treatments-table-description"
              >
                These fees can automatically fill the treatment charge when
                adding a patient treatment.
              </Text>
            </div>

            <Space.Compact className="common-treatment-search">
              <Input
                allowClear
                value={searchText}
                placeholder="Search treatment name or ID"
                prefix={<SearchOutlined />}
                onChange={handleSearchInputChange}
                onPressEnter={handleSearch}
                onClear={handleClearSearch}
              />

              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                Search
              </Button>
            </Space.Compact>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={treatments}
            loading={loading}
            scroll={{
              x: 900,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    searchText
                      ? "No treatments match your search"
                      : "No common treatments have been added"
                  }
                >
                  {!searchText && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={openCreateModal}
                    >
                      Add First Treatment
                    </Button>
                  )}
                </Empty>
              ),
            }}
            pagination={{
              pageSize: 8,
              showSizeChanger: true,
              pageSizeOptions: ["8", "15", "25", "50"],
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} treatments`,
            }}
          />
        </Card>

        {/* ------------------------------------------------
            Add/Edit modal
        ------------------------------------------------ */}

        <Modal
          title={
            <div className="common-treatment-modal-title">
              <div className="common-treatment-modal-icon">
                {editingTreatment ? <EditOutlined /> : <PlusOutlined />}
              </div>

              <div>
                <div>
                  {editingTreatment
                    ? "Edit Common Treatment"
                    : "Add Common Treatment"}
                </div>

                <Text
                  type="secondary"
                  className="common-treatment-modal-subtitle"
                >
                  {editingTreatment
                    ? "Update the treatment name or standard fee"
                    : "Create a reusable treatment and default fee"}
                </Text>
              </div>
            </div>
          }
          open={modalOpen}
          onCancel={closeModal}
          onOk={handleSaveTreatment}
          okText={editingTreatment ? "Save Changes" : "Add Treatment"}
          cancelText="Cancel"
          confirmLoading={saving}
          destroyOnClose
          maskClosable={!saving}
          className="common-treatment-modal"
        >
          <Form form={form} layout="vertical" requiredMark="optional">
            {editingTreatment?.id && (
              <Form.Item label="Treatment ID">
                <Input disabled value={editingTreatment.id} />
              </Form.Item>
            )}

            <Form.Item
              name="treatment_name"
              label="Treatment Name"
              rules={[
                {
                  required: true,
                  message: "Please enter the treatment name",
                },
                {
                  whitespace: true,
                  message: "Treatment name cannot be empty",
                },
                {
                  max: 150,
                  message: "Treatment name cannot exceed 150 characters",
                },
              ]}
            >
              <Input
                autoFocus
                size="large"
                prefix={<MedicineBoxOutlined />}
                placeholder="Example: Dental Check-up"
              />
            </Form.Item>

            <Form.Item
              name="fee"
              label="Standard Treatment Fee"
              extra="This fee will be used as the default charge and can still be adjusted for an individual patient."
              rules={[
                {
                  required: true,
                  message: "Please enter the treatment fee",
                },
                {
                  validator: (_, value) => {
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }

                    if (Number(value) < 0) {
                      return Promise.reject(
                        new Error("Treatment fee cannot be negative"),
                      );
                    }

                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                min={0}
                precision={2}
                size="large"
                controls
                className="common-treatment-fee-input"
                prefix={<DollarOutlined />}
                placeholder="Enter treatment fee"
                formatter={(value) => {
                  if (value === undefined || value === null || value === "") {
                    return "";
                  }

                  return `Rs. ${String(value).replace(
                    /\B(?=(\d{3})+(?!\d))/g,
                    ",",
                  )}`;
                }}
                parser={(value) =>
                  String(value || "").replace(/Rs\.?\s?|,/g, "")
                }
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ClinicPage>
  );
};

export default CommonTreatments;
