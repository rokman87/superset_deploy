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

type Option = {
  label: string;
  value: string;
};

type SummarySqlMetricControlProps = {
  metric?: string;
  subtotalSql?: string;
  totalSql?: string;
  metricOptions?: Option[];
  onChange: (value: {
    metric?: string;
    subtotalSql?: string;
    totalSql?: string;
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

export default function SummarySqlMetricControl({
  metric,
  subtotalSql,
  totalSql,
  metricOptions = [],
  onChange,
}: SummarySqlMetricControlProps) {
  return (
    <Root>
      <Row>
        <Label>{t('Метрика')}</Label>
        <Select
          value={metric}
          options={metricOptions}
          onChange={(value: any) =>
            onChange({
              metric: value?.value ?? value,
              subtotalSql,
              totalSql,
            })
          }
          placeholder={t('Выберите метрику')}
        />
        <Hint>
          {t('Выберите метрику, для которой хотите переопределить расчет итогов.')}
        </Hint>
      </Row>

      <Row>
        <Label>{t('Формула подытога')}</Label>
        <Input
          value={subtotalSql}
          onChange={event =>
            onChange({
              metric,
              subtotalSql: event.currentTarget.value,
              totalSql,
            })
          }
          placeholder={t('Например: SUM(sales). Используется для промежуточных итогов по уровням')}
        />
        <Hint>
          {t('Эта формула применяется к подытогам при сворачивании и раскрытии иерархии.')}
        </Hint>
      </Row>

      <Row>
        <Label>{t('Формула общего итога')}</Label>
        <Input
          value={totalSql}
          onChange={event =>
            onChange({
              metric,
              subtotalSql,
              totalSql: event.currentTarget.value,
            })
          }
          placeholder={t('Например: AVG(margin). Используется для итоговой строки всей таблицы')}
        />
        <Hint>
          {t('Эта формула применяется только к финальной строке общего итога таблицы.')}
        </Hint>
      </Row>
    </Root>
  );
}
