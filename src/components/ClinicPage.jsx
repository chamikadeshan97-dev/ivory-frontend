import React from "react";

import {
  Space,
  Typography,
} from "antd";

import "./ClinicPage.css";

const {
  Title,
  Text,
} = Typography;

const ClinicPage = ({
  title,
  subtitle,
  icon,
  actions,
  children,
}) => {
  return (
    <div className="clinic-page">
      <div className="clinic-page__header">
        <div className="clinic-page__heading">
          {icon && (
            <div className="clinic-page__icon">
              {icon}
            </div>
          )}

          <div>
            <Title
              level={2}
              className="clinic-page__title"
            >
              {title}
            </Title>

            {subtitle && (
              <Text className="clinic-page__subtitle">
                {subtitle}
              </Text>
            )}
          </div>
        </div>

        {actions && (
          <Space
            wrap
            className="clinic-page__actions"
          >
            {actions}
          </Space>
        )}
      </div>

      <div className="clinic-page__content">
        {children}
      </div>
    </div>
  );
};

export default ClinicPage;