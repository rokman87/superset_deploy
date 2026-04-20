/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { css, styled, t } from '@superset-ui/core';
import { Input, Select } from '@superset-ui/core/components';
import { D3_FORMAT_OPTIONS } from '@superset-ui/chart-controls';

type RowSqlFormatControlProps = {
  sqlExpression?: string;
  d3Format?: string;
  onChange: (value: {
    sqlExpression?: string;
    d3Format?: string;
  }) => void;
};

const Root = styled.div`
  display: grid;
  gap: 8px;
`;

const Row = styled.div`
  display: grid;
  gap: 4px;
`;

const Label = styled.div`
  ${({ theme }) => css`
    font-size: ${theme.fontSizeSM}px;
    font-weight: ${theme.fontWeightMedium};
    color: ${theme.colorText};
  `}
`;

const Hint = styled.div`
  ${({ theme }) => css`
    font-size: ${theme.fontSizeXS}px;
    color: ${theme.colorTextLabel};
    line-height: 1.4;
  `}
`;

const FORMAT_OPTIONS = D3_FORMAT_OPTIONS.map(([value, label]) => ({
  value,
  label,
}));

export default function RowSqlFormatControl({
  sqlExpression,
  d3Format,
  onChange,
}: RowSqlFormatControlProps) {
  return (
    <Root>
      <Row>
        <Label>{t('SQL-условие для строки')}</Label>
        <Input
          value={sqlExpression}
          onChange={event =>
            onChange({
              sqlExpression: event.currentTarget.value,
              d3Format,
            })
          }
          placeholder={t("Например: country = 'RU' AND year >= 2024")}
        />
        <Hint>
          {t(
            'Условие работает как WHERE для строки. Используйте технические имена полей из строк, а также служебные поля row_total, __level и __is_leaf.',
          )}
        </Hint>
      </Row>

      <Row>
        <Label>{t('D3 формат')}</Label>
        <Select
          value={d3Format}
          options={FORMAT_OPTIONS}
          onChange={(value: any) =>
            onChange({
              sqlExpression,
              d3Format: value?.value ?? value,
            })
          }
          placeholder={t('Выберите формат')}
          allowClear
          showSearch
        />
        <Hint>
          {t(
            'Если строка попадает под условие, формат будет применен ко всем числовым ячейкам этой строки.',
          )}
        </Hint>
      </Row>
    </Root>
  );
}
