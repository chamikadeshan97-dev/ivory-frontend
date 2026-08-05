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
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
} from "../api/endPoints";

import ClinicPage from "../components/ClinicPage";

import "./css/Locations.css";

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

const normalizeLocation = (location) => ({
  ...location,

  id: String(
    location?.id || "",
  ).trim(),

  location: String(
    location?.location || "",
  ).trim(),

  distance_km:
    Number(
      location?.distance_km,
    ) || 0,
});

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

const getDistanceZone = (distanceValue) => {
  const distance =
    Number(distanceValue) || 0;

  if (distance > 20) {
    return {
      label: "Long Distance",
      className:
        "location-zone-tag--long-distance",
    };
  }

  if (distance > 10) {
    return {
      label: "Far",
      className:
        "location-zone-tag--far",
    };
  }

  if (distance > 5) {
    return {
      label: "Medium",
      className:
        "location-zone-tag--medium",
    };
  }

  return {
    label: "Nearby",
    className:
      "location-zone-tag--nearby",
  };
};

/* --------------------------------------------------------
   Component
-------------------------------------------------------- */

const Locations = () => {
  const [form] = Form.useForm();

  const [
    messageApi,
    messageContextHolder,
  ] = message.useMessage();

  const [
    locations,
    setLocations,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [
    editingLocation,
    setEditingLocation,
  ] = useState(null);

  /* ------------------------------------------------------
     Load locations
  ------------------------------------------------------ */

  const loadLocations =
    useCallback(async () => {
      try {
        setLoading(true);

        const response =
          await getLocations();

        const locationRows =
          extractResponseData(response)
            .map(normalizeLocation)
            .filter(
              (location) =>
                location.id ||
                location.location,
            );

        setLocations(locationRows);
      } catch (error) {
        console.error(
          "Failed to load locations:",
          error,
        );

        messageApi.error(
          getErrorMessage(
            error,
            "Failed to load locations",
          ),
        );

        setLocations([]);
      } finally {
        setLoading(false);
      }
    }, [messageApi]);

  /* ------------------------------------------------------
     Initial loading
  ------------------------------------------------------ */

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  /* ------------------------------------------------------
     Filtered locations
  ------------------------------------------------------ */

  const filteredLocations =
    useMemo(() => {
      const normalizedSearchText =
        String(searchText || "")
          .trim()
          .toLowerCase();

      return [...locations]
        .filter((location) => {
          if (!normalizedSearchText) {
            return true;
          }

          return (
            String(location.id || "")
              .toLowerCase()
              .includes(
                normalizedSearchText,
              ) ||
            String(
              location.location || "",
            )
              .toLowerCase()
              .includes(
                normalizedSearchText,
              ) ||
            String(
              location.distance_km ?? "",
            )
              .toLowerCase()
              .includes(
                normalizedSearchText,
              )
          );
        })
        .sort(
          (
            firstLocation,
            secondLocation,
          ) =>
            Number(
              firstLocation.distance_km,
            ) -
              Number(
                secondLocation.distance_km,
              ) ||
            String(
              firstLocation.location ||
                "",
            ).localeCompare(
              String(
                secondLocation.location ||
                  "",
              ),
            ),
        );
    }, [
      locations,
      searchText,
    ]);

  /* ------------------------------------------------------
     Statistics
  ------------------------------------------------------ */

  const statistics = useMemo(() => {
    if (!locations.length) {
      return {
        total: 0,
        nearest: 0,
        farthest: 0,
        average: 0,
      };
    }

    const distances =
      locations.map(
        (location) =>
          Number(
            location.distance_km,
          ) || 0,
      );

    const totalDistance =
      distances.reduce(
        (total, distance) =>
          total + distance,
        0,
      );

    return {
      total: locations.length,

      nearest: Math.min(
        ...distances,
      ),

      farthest: Math.max(
        ...distances,
      ),

      average:
        totalDistance /
        locations.length,
    };
  }, [locations]);

  /* ------------------------------------------------------
     Modal controls
  ------------------------------------------------------ */

  const openCreateModal = () => {
    setEditingLocation(null);

    form.resetFields();

    form.setFieldsValue({
      location: "",
      distance_km: undefined,
    });

    setModalOpen(true);
  };

  const openEditModal = (
    location,
  ) => {
    setEditingLocation(location);

    form.resetFields();

    form.setFieldsValue({
      location:
        location?.location || "",

      distance_km:
        Number(
          location?.distance_km,
        ) || 0,
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingLocation(null);
    form.resetFields();
  };

  /* ------------------------------------------------------
     Save location
  ------------------------------------------------------ */

  const handleSaveLocation =
    async () => {
      try {
        const values =
          await form.validateFields();

        const payload = {
          location: String(
            values.location || "",
          ).trim(),

          distance_km: Number(
            values.distance_km,
          ),
        };

        setSaving(true);

        if (editingLocation?.id) {
          await updateLocation(
            editingLocation.id,
            payload,
          );

          messageApi.success(
            "Location updated successfully",
          );
        } else {
          await createLocation(
            payload,
          );

          messageApi.success(
            "Location created successfully",
          );
        }

        setModalOpen(false);
        setEditingLocation(null);
        form.resetFields();

        await loadLocations();
      } catch (error) {
        if (error?.errorFields) {
          return;
        }

        console.error(
          "Failed to save location:",
          error,
        );

        messageApi.error(
          getErrorMessage(
            error,
            editingLocation
              ? "Failed to update location"
              : "Failed to create location",
          ),
        );
      } finally {
        setSaving(false);
      }
    };

  /* ------------------------------------------------------
     Delete location
  ------------------------------------------------------ */

  const handleDeleteLocation =
    async (location) => {
      try {
        setDeletingId(location.id);

        await deleteLocation(
          location.id,
        );

        messageApi.success(
          "Location deleted successfully",
        );

        await loadLocations();
      } catch (error) {
        console.error(
          "Failed to delete location:",
          error,
        );

        messageApi.error(
          getErrorMessage(
            error,
            "Failed to delete location",
          ),
        );
      } finally {
        setDeletingId(null);
      }
    };

  /* ------------------------------------------------------
     Search and refresh
  ------------------------------------------------------ */

  const handleSearchInputChange = (
    event,
  ) => {
    setSearchText(
      event.target.value,
    );
  };

  const handleClearSearch = () => {
    setSearchText("");
  };

  const handleRefresh = async () => {
    await loadLocations();
  };

  /* ------------------------------------------------------
     Table columns
  ------------------------------------------------------ */

  const columns = useMemo(
    () => [
      {
        title: "Location ID",
        dataIndex: "id",
        key: "id",
        width: 180,

        sorter: (
          first,
          second,
        ) =>
          String(
            first?.id || "",
          ).localeCompare(
            String(
              second?.id || "",
            ),
          ),

        render: (value) => (
          <Tag className="location-id-tag">
            {value || "N/A"}
          </Tag>
        ),
      },

      {
        title: "Location",
        dataIndex: "location",
        key: "location",

        sorter: (
          first,
          second,
        ) =>
          String(
            first?.location || "",
          ).localeCompare(
            String(
              second?.location || "",
            ),
          ),

        render: (value) => (
          <div className="location-name-cell">
            <div className="location-table-icon">
              <EnvironmentOutlined />
            </div>

            <div>
              <Text strong>
                {value ||
                  "Unnamed location"}
              </Text>

              <Text
                type="secondary"
                className="location-name-description"
              >
                Available for patient
                address selection
              </Text>
            </div>
          </div>
        ),
      },

      {
        title: "Distance",
        dataIndex: "distance_km",
        key: "distance_km",
        width: 160,
        align: "center",

        sorter: (
          first,
          second,
        ) =>
          Number(
            first?.distance_km || 0,
          ) -
          Number(
            second?.distance_km || 0,
          ),

        render: (value) => (
          <div className="location-distance-cell">
            <strong>
              {Number(
                value || 0,
              ).toFixed(1)}
            </strong>

            <span>km</span>
          </div>
        ),
      },

      {
        title: "Distance Zone",
        key: "distance_zone",
        width: 180,
        align: "center",

        render: (_, location) => {
          const zone =
            getDistanceZone(
              location.distance_km,
            );

          return (
            <Tag
              className={`location-zone-tag ${zone.className}`}
            >
              {zone.label}
            </Tag>
          );
        },
      },

      {
        title: "Actions",
        key: "actions",
        width: 150,
        align: "center",
        fixed: "right",

        render: (_, location) => (
          <Space size={6}>
            <Tooltip title="Edit location">
              <Button
                type="text"
                icon={
                  <EditOutlined />
                }
                className="location-edit-button"
                onClick={() =>
                  openEditModal(
                    location,
                  )
                }
              />
            </Tooltip>

            <Popconfirm
              title="Delete location?"
              description={
                <div>
                  <div>
                    This will
                    permanently delete:
                  </div>

                  <strong>
                    {
                      location.location
                    }
                  </strong>
                </div>
              }
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{
                danger: true,

                loading:
                  deletingId ===
                  location.id,
              }}
              onConfirm={() =>
                handleDeleteLocation(
                  location,
                )
              }
            >
              <Tooltip title="Delete location">
                <Button
                  type="text"
                  danger
                  icon={
                    <DeleteOutlined />
                  }
                  loading={
                    deletingId ===
                    location.id
                  }
                  className="location-delete-button"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deletingId],
  );

  /* ------------------------------------------------------
     Render
  ------------------------------------------------------ */

  return (
    <ClinicPage
      title="Locations"
      subtitle="Manage patient locations and their distance from the clinic"
      icon={
        <EnvironmentOutlined />
      }
      actions={[
        <Button
          key="refresh-locations"
          icon={
            <ReloadOutlined />
          }
          loading={loading}
          onClick={handleRefresh}
        >
          Refresh
        </Button>,

        <Button
          key="add-location"
          type="primary"
          icon={<PlusOutlined />}
          onClick={
            openCreateModal
          }
        >
          Add Location
        </Button>,
      ]}
    >
      {messageContextHolder}

      <div className="locations-page">
        {/* ----------------------------------------------
            Statistics
        ---------------------------------------------- */}

        <Row
          gutter={[16, 16]}
          className="location-statistics-row"
        >
          <Col
            xs={24}
            sm={12}
            lg={6}
          >
            <Card
              bordered={false}
              className="location-stat-card"
            >
              <Statistic
                title={
                  searchText
                    ? "Matching Locations"
                    : "Total Locations"
                }
                value={
                  searchText
                    ? filteredLocations.length
                    : statistics.total
                }
                prefix={
                  <EnvironmentOutlined className="location-statistic-prefix-icon" />
                }
              />
            </Card>
          </Col>

          <Col
            xs={24}
            sm={12}
            lg={6}
          >
            <Card
              bordered={false}
              className="location-stat-card"
            >
              <Statistic
                title="Nearest Distance"
                value={
                  statistics.nearest
                }
                precision={1}
                suffix="km"
              />
            </Card>
          </Col>

          <Col
            xs={24}
            sm={12}
            lg={6}
          >
            <Card
              bordered={false}
              className="location-stat-card"
            >
              <Statistic
                title="Farthest Distance"
                value={
                  statistics.farthest
                }
                precision={1}
                suffix="km"
              />
            </Card>
          </Col>

          <Col
            xs={24}
            sm={12}
            lg={6}
          >
            <Card
              bordered={false}
              className="location-stat-card"
            >
              <Statistic
                title="Average Distance"
                value={
                  statistics.average
                }
                precision={1}
                suffix="km"
              />
            </Card>
          </Col>
        </Row>

        {/* ----------------------------------------------
            Main table
        ---------------------------------------------- */}

        <Card
          bordered={false}
          className="locations-table-card"
        >
          <div className="locations-toolbar">
            <div>
              <Text
                strong
                className="locations-table-title"
              >
                Location Catalogue
              </Text>

              <Text
                type="secondary"
                className="locations-table-description"
              >
                These locations can be
                selected when registering
                or updating a patient.
              </Text>
            </div>

            <Space.Compact className="location-search">
              <Input
                allowClear
                value={searchText}
                placeholder="Search location, ID or distance"
                prefix={
                  <SearchOutlined />
                }
                onChange={
                  handleSearchInputChange
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
              >
                Search
              </Button>
            </Space.Compact>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={
              filteredLocations
            }
            loading={loading}
            scroll={{
              x: 900,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={
                    Empty.PRESENTED_IMAGE_SIMPLE
                  }
                  description={
                    searchText
                      ? "No locations match your search"
                      : "No locations have been added"
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
                      Add First
                      Location
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
                `${range[0]}-${range[1]} of ${total} locations`,
            }}
          />
        </Card>

        {/* ----------------------------------------------
            Add/Edit modal
        ---------------------------------------------- */}

        <Modal
          title={
            <div className="location-modal-title">
              <div className="location-modal-icon">
                {editingLocation ? (
                  <EditOutlined />
                ) : (
                  <PlusOutlined />
                )}
              </div>

              <div>
                <div>
                  {editingLocation
                    ? "Edit Location"
                    : "Add Location"}
                </div>

                <Text
                  type="secondary"
                  className="location-modal-subtitle"
                >
                  {editingLocation
                    ? "Update the location name and distance"
                    : "Add a patient location and its distance from the clinic"}
                </Text>
              </div>
            </div>
          }
          open={modalOpen}
          onCancel={closeModal}
          onOk={
            handleSaveLocation
          }
          okText={
            editingLocation
              ? "Save Changes"
              : "Add Location"
          }
          cancelText="Cancel"
          confirmLoading={saving}
          destroyOnClose
          maskClosable={!saving}
          width={560}
          className="location-modal"
        >
          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
          >
            {editingLocation?.id && (
              <Form.Item label="Location ID">
                <Input
                  disabled
                  value={
                    editingLocation.id
                  }
                />
              </Form.Item>
            )}

            <Form.Item
              name="location"
              label="Location Name"
              extra="Enter the town, village or area name used for the patient address."
              rules={[
                {
                  required: true,
                  message:
                    "Please enter the location name",
                },
                {
                  whitespace: true,
                  message:
                    "Location name cannot be empty",
                },
                {
                  min: 2,
                  message:
                    "Location name must contain at least 2 characters",
                },
                {
                  max: 100,
                  message:
                    "Location name cannot exceed 100 characters",
                },
              ]}
            >
              <Input
                autoFocus
                size="large"
                prefix={
                  <EnvironmentOutlined />
                }
                placeholder="Example: Palatuwa"
                onPressEnter={() => {
                  form
                    .getFieldInstance(
                      "distance_km",
                    )
                    ?.focus?.();
                }}
              />
            </Form.Item>

            <Form.Item
              name="distance_km"
              label="Distance from Clinic"
              extra="Enter the approximate one-way distance from the clinic."
              rules={[
                {
                  required: true,
                  message:
                    "Please enter the distance",
                },
                {
                  type: "number",
                  min: 0,
                  message:
                    "Distance cannot be negative",
                },
                {
                  type: "number",
                  max: 1000,
                  message:
                    "Distance cannot exceed 1000 km",
                },
              ]}
            >
              <InputNumber
                size="large"
                min={0}
                max={1000}
                step={0.1}
                precision={1}
                addonAfter="km"
                placeholder="Example: 5.0"
                className="location-distance-input"
                onPressEnter={
                  handleSaveLocation
                }
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ClinicPage>
  );
};

export default Locations;