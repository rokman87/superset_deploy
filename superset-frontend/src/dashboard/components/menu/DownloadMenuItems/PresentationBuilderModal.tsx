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
import {
  type ChangeEvent,
  type Key,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { t, styled } from '@superset-ui/core';
import { Button, EmptyState, Input } from '@superset-ui/core/components';
import { Icons } from '@superset-ui/core/components/Icons';
import { ModalTrigger } from '@superset-ui/core/components/ModalTrigger';
import Tree, { type TreeDataNode } from '@superset-ui/core/components/Tree';
import backgroundPdfImage from 'src/assets/images/background_pdf.png';
import { useToasts } from 'src/components/MessageToasts/withToasts';
import {
  setActiveTabs,
  setDirectPathToChild,
} from 'src/dashboard/actions/dashboardState';
import {
  CHART_TYPE,
  DASHBOARD_ROOT_TYPE,
  TAB_TYPE,
  TABS_TYPE,
} from 'src/dashboard/util/componentTypes';
import { DashboardLayout, LayoutItem, RootState } from 'src/dashboard/types';
import { DASHBOARD_ROOT_ID } from 'src/dashboard/util/constants';

const { TextArea } = Input;

const StyledModalTrigger = styled(ModalTrigger)`
  .ant-modal-body {
    padding-top: ${({ theme }) => theme.gridUnit * 4}px;
  }
`;

const ModalLayout = styled.div`
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: ${({ theme }) => theme.gridUnit * 4}px;
  min-height: 560px;
`;

const SlidesPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.gridUnit * 3}px;
  padding-right: ${({ theme }) => theme.gridUnit * 2}px;
  border-right: 1px solid ${({ theme }) => theme.colorBorder};
`;

const SlidesHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.gridUnit * 2}px;
`;

const SlidesTitle = styled.div`
  font-weight: ${({ theme }) => theme.fontWeightStrong};
`;

const SlidesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.gridUnit * 2}px;
  overflow: auto;
`;

const SlideCard = styled.button<{ $active: boolean }>`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: stretch;
  gap: ${({ theme }) => theme.gridUnit * 2}px;
  padding: ${({ theme }) => theme.gridUnit * 3}px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colorPrimary : theme.colorBorder};
  border-radius: ${({ theme }) => theme.borderRadius}px;
  background: ${({ theme, $active }) =>
    $active ? theme.colorPrimaryBgHover : theme.colorBgContainer};
  cursor: pointer;
  text-align: left;
`;

const SlideCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.gridUnit * 2}px;
`;

const SlideCardMeta = styled.div`
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.gridUnit}px;
`;

const SlideCardActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.gridUnit}px;
`;

const SlideName = styled.div`
  font-weight: ${({ theme }) => theme.fontWeightStrong};
`;

const SlideMeta = styled.div`
  color: ${({ theme }) => theme.colorTextSecondary};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
`;

const SlideTypeTag = styled.div`
  width: fit-content;
  padding: ${({ theme }) => theme.gridUnit * 0.5}px
    ${({ theme }) => theme.gridUnit * 1.5}px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colorPrimaryBg};
  color: ${({ theme }) => theme.colorPrimary};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
  font-weight: ${({ theme }) => theme.fontWeightStrong};
`;

const ContentPanel = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.gridUnit * 3}px;
`;

const SectionCard = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.gridUnit * 2}px;
  padding: ${({ theme }) => theme.gridUnit * 3}px;
  border: 1px solid ${({ theme }) => theme.colorBorder};
  border-radius: ${({ theme }) => theme.borderRadius}px;
  background: ${({ theme }) => theme.colorBgContainer};
`;

const SectionTitle = styled.div`
  font-weight: ${({ theme }) => theme.fontWeightStrong};
`;

const SectionDescription = styled.div`
  color: ${({ theme }) => theme.colorTextSecondary};
`;

const InlineToggle = styled.label`
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: ${({ theme }) => theme.gridUnit * 2}px;
  cursor: pointer;
`;

const FieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.gridUnit * 2}px;
`;

const FullWidthField = styled.div`
  grid-column: 1 / -1;
`;

const FieldGroup = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.gridUnit}px;
`;

const FieldLabel = styled.label`
  color: ${({ theme }) => theme.colorTextSecondary};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
`;

const StyledTree = styled(Tree)`
  padding: ${({ theme }) => theme.gridUnit * 2}px;
  border: 1px solid ${({ theme }) => theme.colorBorder};
  border-radius: ${({ theme }) => theme.borderRadius}px;
  background: ${({ theme }) => theme.colorBgContainer};

  .ant-tree-list {
    overflow: auto;
  }
`;

const SelectedChartsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.gridUnit * 2}px;
`;

const ChartTag = styled.div`
  padding: ${({ theme }) => theme.gridUnit}px
    ${({ theme }) => theme.gridUnit * 2}px;
  border-radius: ${({ theme }) => theme.borderRadius}px;
  background: ${({ theme }) => theme.colorPrimaryBg};
  color: ${({ theme }) => theme.colorText};
`;

type SlideKind = 'intro' | 'content';

type Slide = {
  id: string;
  kind: SlideKind;
  name: string;
  heading: string;
  description: string;
  chartIds: number[];
};

type ChartOption = {
  chartId: number;
  title: string;
  path: string[];
  layoutId: string;
};

type CapturedChart = {
  chartId: number;
  title: string;
  dataUrl: string;
  width: number;
  height: number;
};

type PresentationBuilderModalProps = {
  triggerNode: ReactNode;
  dashboardLayout: DashboardLayout;
  dashboardTitle?: string;
};

const createContentSlide = (index: number): Slide => ({
  id: `content-slide-${index}`,
  kind: 'content',
  name: t('Слайд %s', index),
  heading: '',
  description: '',
  chartIds: [],
});

const createIntroSlide = (dashboardTitle?: string): Slide => ({
  id: 'intro-slide',
  kind: 'intro',
  name: t('Стартовый слайд'),
  heading: dashboardTitle || '',
  description: '',
  chartIds: [],
});

const chartKey = (chartId: number) => `chart-${chartId}`;
const SCREENSHOT_BACKGROUND = '#ffffff';
const EMU_PER_INCH = 914400;
const SLIDE_WIDTH = 13.333;
const SLIDE_HEIGHT = 7.5;
const PPTX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const toEmu = (inches: number) => Math.round(inches * EMU_PER_INCH);

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const getTabLabel = (item: LayoutItem) =>
  item.meta?.text || item.meta?.defaultText || t('Tab');

const buildTreeData = (
  dashboardLayout: DashboardLayout,
  currentId = DASHBOARD_ROOT_ID,
  path: string[] = [],
  chartOptions: ChartOption[] = [],
): TreeDataNode[] => {
  const currentNode = dashboardLayout[currentId];

  if (!currentNode) {
    return [];
  }

  if (currentNode.type === CHART_TYPE && currentNode.meta?.chartId) {
    const title =
      currentNode.meta.sliceNameOverride ||
      currentNode.meta.sliceName ||
      t('Chart %s', currentNode.meta.chartId);
    chartOptions.push({
      chartId: currentNode.meta.chartId,
      title,
      path,
      layoutId: currentNode.id,
    });

    return [
      {
        key: chartKey(currentNode.meta.chartId),
        title,
        isLeaf: true,
      },
    ];
  }

  const children = (currentNode.children || []).flatMap(childId =>
    buildTreeData(
      dashboardLayout,
      childId,
      currentNode.type === TAB_TYPE
        ? [...path, getTabLabel(currentNode)]
        : path,
      chartOptions,
    ),
  );

  if (currentNode.type === DASHBOARD_ROOT_TYPE) {
    return [
      {
        key: currentNode.id,
        title: t('Dashboard'),
        disableCheckbox: true,
        children,
      },
    ];
  }

  if (currentNode.type === TABS_TYPE) {
    return children;
  }

  if (currentNode.type === TAB_TYPE) {
    return [
      {
        key: currentNode.id,
        title: getTabLabel(currentNode),
        disableCheckbox: true,
        children,
      },
    ];
  }

  return children;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getSlideLayout = (count: number) => {
  if (count <= 1) {
    return { cols: 1, rows: 1 };
  }
  if (count === 2) {
    return { cols: 2, rows: 1 };
  }
  if (count <= 4) {
    return { cols: 2, rows: Math.ceil(count / 2) };
  }
  return { cols: 3, rows: Math.ceil(count / 3) };
};

const fitImage = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
) => {
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight);
  return {
    width: safeWidth * scale,
    height: safeHeight * scale,
  };
};

const createTextShapeXml = ({
  id,
  name,
  text,
  x,
  y,
  w,
  h,
  fontSize,
  bold = false,
  color = '1F2937',
  center = false,
}: {
  id: number;
  name: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  bold?: boolean;
  color?: string;
  center?: boolean;
}) => {
  const paragraphs = (text || '')
    .split(/\n+/)
    .filter(Boolean)
    .map(
      line => `
      <a:p>
        <a:pPr algn="${center ? 'ctr' : 'l'}"/>
        <a:r>
          <a:rPr lang="ru-RU" sz="${fontSize}"${bold ? ' b="1"' : ''} dirty="0">
            <a:solidFill><a:srgbClr val="${color}"/></a:solidFill>
          </a:rPr>
          <a:t>${escapeXml(line)}</a:t>
        </a:r>
      </a:p>`,
    )
    .join('');

  return `
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${id}" name="${escapeXml(name)}"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm>
          <a:off x="${x}" y="${y}"/>
          <a:ext cx="${w}" cy="${h}"/>
        </a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
        <a:ln><a:noFill/></a:ln>
      </p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square" rtlCol="0" anchor="${center ? 'ctr' : 't'}"/>
        <a:lstStyle/>
        ${paragraphs || '<a:p/>'}
      </p:txBody>
    </p:sp>`;
};

const createImageShapeXml = ({
  id,
  name,
  relId,
  x,
  y,
  w,
  h,
}: {
  id: number;
  name: string;
  relId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}) => `
  <p:pic>
    <p:nvPicPr>
      <p:cNvPr id="${id}" name="${escapeXml(name)}"/>
      <p:cNvPicPr/>
      <p:nvPr/>
    </p:nvPicPr>
    <p:blipFill>
      <a:blip r:embed="${relId}"/>
      <a:stretch><a:fillRect/></a:stretch>
    </p:blipFill>
    <p:spPr>
      <a:xfrm>
        <a:off x="${x}" y="${y}"/>
        <a:ext cx="${w}" cy="${h}"/>
      </a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      <a:ln>
        <a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill>
      </a:ln>
    </p:spPr>
  </p:pic>`;

const createRectShapeXml = ({
  id,
  name,
  x,
  y,
  w,
  h,
  fill,
}: {
  id: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}) => `
  <p:sp>
    <p:nvSpPr>
      <p:cNvPr id="${id}" name="${escapeXml(name)}"/>
      <p:cNvSpPr/>
      <p:nvPr/>
    </p:nvSpPr>
    <p:spPr>
      <a:xfrm>
        <a:off x="${x}" y="${y}"/>
        <a:ext cx="${w}" cy="${h}"/>
      </a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      <a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>
      <a:ln><a:noFill/></a:ln>
    </p:spPr>
    <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
  </p:sp>`;

const createIntroSlideXml = (slide: Slide) => {
  const title = slide.heading || slide.name;
  const description = slide.description || '';
  const dateLabel = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  let shapeId = 2;
  const nextShapeId = () => {
    const currentId = shapeId;
    shapeId += 1;
    return currentId;
  };

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
    <p:cSld name="${escapeXml(slide.name)}">
      <p:spTree>
        <p:nvGrpSpPr>
          <p:cNvPr id="1" name=""/>
          <p:cNvGrpSpPr/>
          <p:nvPr/>
        </p:nvGrpSpPr>
        <p:grpSpPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="0" cy="0"/>
            <a:chOff x="0" y="0"/>
            <a:chExt cx="0" cy="0"/>
          </a:xfrm>
        </p:grpSpPr>
        ${createImageShapeXml({
          id: nextShapeId(),
          name: 'Cover background',
          relId: 'rId2',
          x: 0,
          y: 0,
          w: toEmu(SLIDE_WIDTH),
          h: toEmu(SLIDE_HEIGHT),
        })}
        ${createTextShapeXml({
          id: nextShapeId(),
          name: 'Intro title',
          text: title,
          x: toEmu(1.05),
          y: toEmu(1.5),
          w: toEmu(5.8),
          h: toEmu(1.4),
          fontSize: 3200,
          bold: true,
          color: 'FFFFFF',
        })}
        ${createTextShapeXml({
          id: nextShapeId(),
          name: 'Intro description',
          text: description,
          x: toEmu(1.08),
          y: toEmu(3.15),
          w: toEmu(5.5),
          h: toEmu(1.25),
          fontSize: 1200,
          color: 'F3F4F6',
        })}
        ${createTextShapeXml({
          id: nextShapeId(),
          name: 'Intro date',
          text: dateLabel,
          x: toEmu(1.08),
          y: toEmu(5.95),
          w: toEmu(3.8),
          h: toEmu(0.4),
          fontSize: 1000,
          color: 'FCA5A5',
        })}
      </p:spTree>
    </p:cSld>
    <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
  </p:sld>`;
};

const createContentSlideXml = (slide: Slide, charts: CapturedChart[]) => {
  const title = slide.heading || slide.name;
  const description = slide.description || '';
  const { cols, rows } = getSlideLayout(charts.length);
  const marginX = 0.45;
  const top = 0.45;
  const titleHeight = 0.45;
  const descHeight = description ? 0.45 : 0.18;
  const startY = top + titleHeight + descHeight + 0.22;
  const gap = 0.18;
  const availableWidth = SLIDE_WIDTH - marginX * 2;
  const availableHeight = SLIDE_HEIGHT - startY - 0.38;
  const cellWidth = (availableWidth - gap * (cols - 1)) / cols;
  const cellHeight = (availableHeight - gap * (rows - 1)) / rows;
  const captionHeight = 0.28;

  let shapeId = 2;
  let imageIndex = 0;
  const nextShapeId = () => {
    const currentId = shapeId;
    shapeId += 1;
    return currentId;
  };

  const imageShapes = charts
    .map(chart => {
      const col = imageIndex % cols;
      const row = Math.floor(imageIndex / cols);
      const cellX = marginX + col * (cellWidth + gap);
      const cellY = startY + row * (cellHeight + gap);
      const imageBoxHeight = cellHeight - captionHeight;
      const fitted = fitImage(
        chart.width,
        chart.height,
        cellWidth,
        imageBoxHeight,
      );
      const imageX = cellX + (cellWidth - fitted.width) / 2;
      const imageY = cellY;
      const relId = `rId${imageIndex + 2}`;
      const imageShape = createImageShapeXml({
        id: nextShapeId(),
        name: `Chart ${chart.chartId}`,
        relId,
        x: toEmu(imageX),
        y: toEmu(imageY),
        w: toEmu(fitted.width),
        h: toEmu(fitted.height),
      });
      const captionShape = createTextShapeXml({
        id: nextShapeId(),
        name: `Chart ${chart.chartId} caption`,
        text: chart.title,
        x: toEmu(cellX),
        y: toEmu(cellY + imageBoxHeight + 0.02),
        w: toEmu(cellWidth),
        h: toEmu(captionHeight),
        fontSize: 900,
        color: '475569',
        center: true,
      });
      imageIndex += 1;
      return `${imageShape}${captionShape}`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
    <p:cSld name="${escapeXml(slide.name)}">
      <p:spTree>
        <p:nvGrpSpPr>
          <p:cNvPr id="1" name=""/>
          <p:cNvGrpSpPr/>
          <p:nvPr/>
        </p:nvGrpSpPr>
        <p:grpSpPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
        </p:grpSpPr>
        ${createRectShapeXml({
          id: nextShapeId(),
          name: 'Background',
          x: 0,
          y: 0,
          w: toEmu(SLIDE_WIDTH),
          h: toEmu(SLIDE_HEIGHT),
          fill: 'F6F0F1',
        })}
        ${createRectShapeXml({
          id: nextShapeId(),
          name: 'Top accent',
          x: 0,
          y: 0,
          w: toEmu(SLIDE_WIDTH),
          h: toEmu(0.28),
          fill: '8B1E2D',
        })}
        ${createRectShapeXml({
          id: nextShapeId(),
          name: 'Left accent',
          x: 0,
          y: toEmu(0.28),
          w: toEmu(0.18),
          h: toEmu(SLIDE_HEIGHT - 0.28),
          fill: '2A2A2A',
        })}
        ${createTextShapeXml({
          id: nextShapeId(),
          name: 'Slide title',
          text: title,
          x: toEmu(0.72),
          y: toEmu(top + 0.05),
          w: toEmu(12.05),
          h: toEmu(titleHeight),
          fontSize: 2000,
          bold: true,
          color: '2A2A2A',
        })}
        ${createTextShapeXml({
          id: nextShapeId(),
          name: 'Slide description',
          text: description,
          x: toEmu(0.72),
          y: toEmu(top + titleHeight),
          w: toEmu(12.05),
          h: toEmu(descHeight),
          fontSize: 1000,
          color: '6B2A33',
        })}
        ${imageShapes}
      </p:spTree>
    </p:cSld>
    <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
  </p:sld>`;
};

const createThemeXml =
  () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="2A2A2A"/></a:dk2>
      <a:lt2><a:srgbClr val="F6F0F1"/></a:lt2>
      <a:accent1><a:srgbClr val="8B1E2D"/></a:accent1>
      <a:accent2><a:srgbClr val="2A2A2A"/></a:accent2>
      <a:accent3><a:srgbClr val="B23A48"/></a:accent3>
      <a:accent4><a:srgbClr val="6B2A33"/></a:accent4>
      <a:accent5><a:srgbClr val="D9777F"/></a:accent5>
      <a:accent6><a:srgbClr val="4B5563"/></a:accent6>
      <a:hlink><a:srgbClr val="8B1E2D"/></a:hlink>
      <a:folHlink><a:srgbClr val="6B2A33"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont>
        <a:latin typeface="Arial"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Arial"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/><a:satMod val="300000"/></a:schemeClr></a:gs>
            <a:gs pos="35000"><a:schemeClr val="phClr"><a:tint val="37000"/><a:satMod val="300000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="15000"/><a:satMod val="350000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:lin ang="16200000" scaled="1"/>
        </a:gradFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
  <a:objectDefaults/>
  <a:extraClrSchemeLst/>
</a:theme>`;

const createSlideMasterXml =
  () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld name="Slide Master">
    <p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`;

const createSlideLayoutXml =
  () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;

const createPresentationXml = (slideCount: number) => {
  const slideIds = Array.from({ length: slideCount }, (_, index) => {
    const relId = `rId${index + 5}`;
    return `<p:sldId id="${256 + index}" r:id="${relId}"/>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
    <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
    <p:sldIdLst>${slideIds}</p:sldIdLst>
    <p:sldSz cx="${toEmu(SLIDE_WIDTH)}" cy="${toEmu(SLIDE_HEIGHT)}" type="screen16x9"/>
    <p:notesSz cx="6858000" cy="9144000"/>
    <p:defaultTextStyle/>
  </p:presentation>`;
};

const createPresentationRelsXml = (slideCount: number) => {
  const slideRels = Array.from({ length: slideCount }, (_, index) => {
    const relId = `rId${index + 5}`;
    return `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${
      index + 1
    }.xml"/>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>
    <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/>
    <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml"/>
    ${slideRels}
  </Relationships>`;
};

const createContentTypesXml = (
  slideCount: number,
  imageCount: number,
) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>
  <Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>
  <Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${Array.from(
    { length: slideCount },
    (_, index) =>
      `<Override PartName="/ppt/slides/slide${
        index + 1
      }.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
  ).join('')}
  ${Array.from(
    { length: imageCount },
    (_, index) =>
      `<Override PartName="/ppt/media/image${
        index + 1
      }.png" ContentType="image/png"/>`,
  ).join('')}
</Types>`;

const createRootRelsXml =
  () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const createCorePropsXml = (dashboardTitle: string) => {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:dcterms="http://purl.org/dc/terms/"
    xmlns:dcmitype="http://purl.org/dc/dcmitype/"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:title>${escapeXml(dashboardTitle)}</dc:title>
    <dc:creator>Superset</dc:creator>
    <cp:lastModifiedBy>Superset</cp:lastModifiedBy>
    <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
    <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
  </cp:coreProperties>`;
};

const createAppPropsXml = (
  slideCount: number,
) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Superset</Application>
  <PresentationFormat>Widescreen</PresentationFormat>
  <Slides>${slideCount}</Slides>
  <Notes>0</Notes>
  <HiddenSlides>0</HiddenSlides>
  <MMClips>0</MMClips>
  <ScaleCrop>false</ScaleCrop>
  <Company>Apache Superset</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>1.0</AppVersion>
</Properties>`;

const createPresPropsXml =
  () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`;

const createViewPropsXml =
  () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`;

const createTableStylesXml =
  () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="TableStyleMedium2"/>`;

const createSlideRelsXml = (
  imageTargets: string[],
) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  ${Array.from(
    imageTargets,
    (target, index) =>
      `<Relationship Id="rId${
        index + 2
      }" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${target}"/>`,
  ).join('')}
</Relationships>`;

const fetchImageBase64 = async (src: string) => {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(t('Failed to load image: %s', src));
  }
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const waitForNextPaint = () =>
  new Promise(resolve => {
    requestAnimationFrame(() => resolve(undefined));
  });

const waitForTimeout = (timeout: number) =>
  new Promise(resolve => {
    window.setTimeout(resolve, timeout);
  });

const isElementVisible = (element: Element | null): element is HTMLElement => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    rect.width > 24 &&
    rect.height > 24
  );
};

const getChartScreenshotTarget = (chartHostNode: HTMLElement) => {
  const target =
    chartHostNode.querySelector('.chart-container') ||
    chartHostNode.querySelector('.slice_container') ||
    chartHostNode.querySelector('.dashboard-chart');

  return isElementVisible(target) ? target : chartHostNode;
};

const findChartHostNode = (chartId: number, chartLayoutId?: string) => {
  const selectors = [
    `.dashboard-chart-id-${chartId}`,
    chartLayoutId ? `[data-test-chart-id="${chartLayoutId}"]` : '',
  ].filter(Boolean);

  for (const selector of selectors) {
    const candidates = Array.from(document.querySelectorAll(selector));
    const visibleCandidate = candidates.find(candidate =>
      isElementVisible(candidate),
    );

    if (visibleCandidate && visibleCandidate instanceof HTMLElement) {
      return visibleCandidate;
    }
  }

  return null;
};

const waitForChartNode = async (
  chartId: number,
  chartLayoutId?: string,
  attempts = 20,
): Promise<HTMLElement | null> => {
  for (let index = 0; index < attempts; index += 1) {
    const chartNode = findChartHostNode(chartId, chartLayoutId);
    if (chartNode) {
      return chartNode;
    }
    // eslint-disable-next-line no-await-in-loop
    await waitForNextPaint();
    // eslint-disable-next-line no-await-in-loop
    await waitForTimeout(40);
  }
  return null;
};

const waitForChartReady = async (
  chartId: number,
  chartLayoutId: string | undefined,
  getChartStatus: (chartId: number) => string | null | undefined,
  attempts = 60,
) => {
  for (let index = 0; index < attempts; index += 1) {
    const chartNode = findChartHostNode(chartId, chartLayoutId);
    const chartStatus = getChartStatus(chartId);

    if (chartStatus === 'failed') {
      throw new Error(t('Chart %s failed to render.', chartId));
    }

    const screenshotTarget = chartNode
      ? getChartScreenshotTarget(chartNode)
      : null;
    const hasLoadingIndicator = Boolean(
      screenshotTarget?.querySelector(
        '[aria-label="Loading"], .loading, .loading-container',
      ),
    );
    const hasMissingChart = Boolean(
      chartNode?.querySelector('.missing-chart-container'),
    );
    const hasRenderableContent = Boolean(
      screenshotTarget?.querySelector(
        'canvas, svg, table, img, [data-test="chart-container"] > *',
      ) || screenshotTarget?.textContent?.trim(),
    );

    if (
      chartNode &&
      ['rendered', 'success'].includes(chartStatus || '') &&
      !hasLoadingIndicator &&
      !hasMissingChart &&
      hasRenderableContent &&
      isElementVisible(screenshotTarget)
    ) {
      // Give the browser a moment after render status flips so the final pixels settle.
      // eslint-disable-next-line no-await-in-loop
      await waitForNextPaint();
      // eslint-disable-next-line no-await-in-loop
      await waitForTimeout(120);
      return chartNode;
    }

    // eslint-disable-next-line no-await-in-loop
    await waitForNextPaint();
    // eslint-disable-next-line no-await-in-loop
    await waitForTimeout(120);
  }

  return null;
};

const buildPresentation = async (
  dashboardTitle: string,
  slides: Slide[],
  chartOptions: ChartOption[],
  activateChart: (chartId: number) => Promise<void>,
  getChartStatus: (chartId: number) => string | null | undefined,
) => {
  const [{ default: html2canvas }, { default: JSZip }] = await Promise.all([
    // eslint-disable-next-line import/no-extraneous-dependencies
    import('html2canvas'),
    // eslint-disable-next-line import/no-extraneous-dependencies
    import('jszip'),
  ]);

  const chartMap = new Map(chartOptions.map(chart => [chart.chartId, chart]));
  const slidesWithImages = await Promise.all(
    slides.map(async slide => {
      if (slide.kind === 'intro') {
        return { slide, charts: [] as CapturedChart[] };
      }

      const charts = await Promise.all(
        slide.chartIds.map(async chartId => {
          const chartLayoutId = chartMap.get(chartId)?.layoutId;
          await activateChart(chartId);
          await waitForChartNode(chartId, chartLayoutId);
          const chartNode = await waitForChartReady(
            chartId,
            chartLayoutId,
            getChartStatus,
          );

          if (!chartNode) {
            throw new Error(t('Chart %s was not found on the page.', chartId));
          }

          const screenshotTarget = getChartScreenshotTarget(chartNode);
          screenshotTarget.scrollIntoView({
            behavior: 'auto',
            block: 'center',
            inline: 'center',
          });
          await waitForNextPaint();
          await waitForTimeout(120);

          const canvas = await html2canvas(screenshotTarget, {
            scale: 2,
            backgroundColor: SCREENSHOT_BACKGROUND,
            useCORS: true,
            ignoreElements: element =>
              element.classList?.contains('header-controls') ||
              element.classList?.contains('hover-menu') ||
              false,
          });

          const chartMeta = chartMap.get(chartId);
          return {
            chartId,
            title: chartMeta
              ? [...chartMeta.path, chartMeta.title].join(' > ')
              : t('Chart %s', chartId),
            dataUrl: canvas.toDataURL('image/png', 1),
            width: canvas.width,
            height: canvas.height,
          };
        }),
      );

      return { slide, charts };
    }),
  );

  const shouldIncludeIntroImage = slides.some(slide => slide.kind === 'intro');
  const coverBackgroundBase64 = shouldIncludeIntroImage
    ? await fetchImageBase64(backgroundPdfImage)
    : null;

  const zip = new JSZip();
  const ppt = zip.folder('ppt');
  const slidesFolder = ppt?.folder('slides');
  const slidesRelsFolder = slidesFolder?.folder('_rels');
  const mediaFolder = ppt?.folder('media');
  const slideMastersFolder = ppt?.folder('slideMasters');
  const slideMasterRelsFolder = slideMastersFolder?.folder('_rels');
  const slideLayoutsFolder = ppt?.folder('slideLayouts');
  const slideLayoutRelsFolder = slideLayoutsFolder?.folder('_rels');
  const themeFolder = ppt?.folder('theme');
  const docProps = zip.folder('docProps');
  const rootRels = zip.folder('_rels');
  const pptRels = ppt?.folder('_rels');

  let globalImageIndex = 0;

  slidesWithImages.forEach(({ slide, charts }, slideIndex) => {
    const imageTargets: string[] = [];
    const slideXml =
      slide.kind === 'intro'
        ? createIntroSlideXml(slide)
        : createContentSlideXml(slide, charts);

    if (slide.kind === 'intro' && coverBackgroundBase64) {
      globalImageIndex += 1;
      const filename = `image${globalImageIndex}.png`;
      mediaFolder?.file(filename, coverBackgroundBase64, { base64: true });
      imageTargets.push(filename);
    }

    if (slide.kind === 'content') {
      charts.forEach(chart => {
        globalImageIndex += 1;
        const filename = `image${globalImageIndex}.png`;
        mediaFolder?.file(filename, chart.dataUrl.split(',')[1], {
          base64: true,
        });
        imageTargets.push(filename);
      });
    }

    slidesFolder?.file(`slide${slideIndex + 1}.xml`, slideXml);
    slidesRelsFolder?.file(
      `slide${slideIndex + 1}.xml.rels`,
      createSlideRelsXml(imageTargets),
    );
  });

  zip.file(
    '[Content_Types].xml',
    createContentTypesXml(slides.length, globalImageIndex),
  );
  rootRels?.file('.rels', createRootRelsXml());
  docProps?.file('core.xml', createCorePropsXml(dashboardTitle));
  docProps?.file('app.xml', createAppPropsXml(slides.length));

  ppt?.file('presentation.xml', createPresentationXml(slides.length));
  ppt?.file('presProps.xml', createPresPropsXml());
  ppt?.file('viewProps.xml', createViewPropsXml());
  ppt?.file('tableStyles.xml', createTableStylesXml());
  pptRels?.file(
    'presentation.xml.rels',
    createPresentationRelsXml(slides.length),
  );
  slideMastersFolder?.file('slideMaster1.xml', createSlideMasterXml());
  slideMasterRelsFolder?.file(
    'slideMaster1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
    </Relationships>`,
  );
  slideLayoutsFolder?.file('slideLayout1.xml', createSlideLayoutXml());
  slideLayoutRelsFolder?.file(
    'slideLayout1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
    </Relationships>`,
  );
  themeFolder?.file('theme1.xml', createThemeXml());

  return zip.generateAsync({ type: 'blob', mimeType: PPTX_MIME_TYPE });
};

export const PresentationBuilderModal = ({
  triggerNode,
  dashboardLayout,
  dashboardTitle = '',
}: PresentationBuilderModalProps) => {
  const dispatch = useDispatch();
  const modalRef = useRef<any>(null);
  const { addSuccessToast, addDangerToast } = useToasts();
  const charts = useSelector((state: RootState) => state.charts || {});
  const activeTabs = useSelector(
    (state: RootState) => state.dashboardState.activeTabs || [],
  );
  const directPathToChild = useSelector(
    (state: RootState) => state.dashboardState.directPathToChild || [],
  );
  const [includeIntroSlide, setIncludeIntroSlide] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([
    createIntroSlide(dashboardTitle),
    createContentSlide(1),
  ]);
  const [activeSlideId, setActiveSlideId] = useState('intro-slide');

  const { treeData, chartOptions } = useMemo(() => {
    const collectedChartOptions: ChartOption[] = [];
    const tree = buildTreeData(
      dashboardLayout,
      DASHBOARD_ROOT_ID,
      [],
      collectedChartOptions,
    );

    return {
      treeData: tree,
      chartOptions: collectedChartOptions,
    };
  }, [dashboardLayout]);

  const chartsRef = useRef(charts);
  chartsRef.current = charts;

  const chartLayoutMap = useMemo(
    () =>
      Object.values(dashboardLayout).reduce<Record<number, LayoutItem>>(
        (acc, item) => {
          if (item?.type === CHART_TYPE && item.meta?.chartId) {
            acc[item.meta.chartId] = item;
          }
          return acc;
        },
        {},
      ),
    [dashboardLayout],
  );

  const visibleSlides = useMemo(
    () => slides.filter(slide => slide.kind !== 'intro' || includeIntroSlide),
    [includeIntroSlide, slides],
  );

  const activeSlide = useMemo(() => {
    const matched = visibleSlides.find(slide => slide.id === activeSlideId);
    return matched || visibleSlides[0] || null;
  }, [activeSlideId, visibleSlides]);

  const checkedKeys = useMemo(
    () =>
      activeSlide?.kind === 'content'
        ? activeSlide.chartIds.map(chartId => chartKey(chartId))
        : [],
    [activeSlide],
  );

  const selectedCharts = useMemo(() => {
    const selectedIds = new Set(activeSlide?.chartIds || []);
    return chartOptions.filter(option => selectedIds.has(option.chartId));
  }, [activeSlide, chartOptions]);

  const updateSlide = (slideId: string, updater: (slide: Slide) => Slide) => {
    setSlides(currentSlides =>
      currentSlides.map(slide =>
        slide.id === slideId ? updater(slide) : slide,
      ),
    );
  };

  const handleAddSlide = () => {
    const nextIndex =
      slides.filter(slide => slide.kind === 'content').length + 1;
    const nextSlide = createContentSlide(nextIndex);
    setSlides(currentSlides => [...currentSlides, nextSlide]);
    setActiveSlideId(nextSlide.id);
  };

  const handleDeleteSlide = (slideId: string) => {
    const slideToDelete = slides.find(slide => slide.id === slideId);
    if (!slideToDelete || slideToDelete.kind === 'intro') {
      return;
    }

    const remainingSlides = visibleSlides.filter(slide => slide.id !== slideId);
    setSlides(currentSlides =>
      currentSlides.filter(slide => slide.id !== slideId),
    );
    setActiveSlideId(remainingSlides[0]?.id || 'intro-slide');
  };

  const handleCheck = (
    nextCheckedKeys:
      | Key[]
      | {
          checked: Key[];
          halfChecked: Key[];
        },
  ) => {
    if (!activeSlide || activeSlide.kind !== 'content') {
      return;
    }

    const keys = Array.isArray(nextCheckedKeys)
      ? nextCheckedKeys
      : nextCheckedKeys.checked;

    const chartIds = keys
      .map(key => String(key))
      .filter(key => key.startsWith('chart-'))
      .map(key => Number(key.replace('chart-', '')))
      .filter(Number.isFinite);

    updateSlide(activeSlide.id, slide => ({ ...slide, chartIds }));
  };

  const handleToggleIntro = (event: ChangeEvent<HTMLInputElement>) => {
    const shouldInclude = event.target.checked;
    setIncludeIntroSlide(shouldInclude);
    if (shouldInclude) {
      setActiveSlideId('intro-slide');
    } else if (activeSlideId === 'intro-slide') {
      const firstContentSlide = slides.find(slide => slide.kind === 'content');
      setActiveSlideId(firstContentSlide?.id || 'intro-slide');
    }
  };

  const closeModal = useCallback(() => {
    modalRef.current?.close?.();
    modalRef.current?.current?.close?.();
  }, []);

  const activateChart = useCallback(
    async (chartId: number) => {
      const chartLayoutItem = chartLayoutMap[chartId];
      if (!chartLayoutItem) {
        return;
      }

      const tabPath = (chartLayoutItem.parents || []).filter(parentId =>
        parentId.startsWith('TAB-'),
      );

      dispatch(setActiveTabs(tabPath));
      dispatch(
        setDirectPathToChild([
          ...(chartLayoutItem.parents || []),
          chartLayoutItem.id,
        ]),
      );

      await waitForNextPaint();
      await waitForNextPaint();
      await waitForTimeout(120);
    },
    [chartLayoutMap, dispatch],
  );

  const getChartStatus = useCallback(
    (chartId: number) => chartsRef.current?.[chartId]?.chartStatus,
    [],
  );

  const handleApply = useCallback(async () => {
    const contentSlides = slides.filter(slide => slide.kind === 'content');

    if (!contentSlides.length) {
      addDangerToast(t('Добавьте хотя бы один обычный слайд.'));
      return;
    }

    if (contentSlides.some(slide => slide.chartIds.length === 0)) {
      addDangerToast(
        t('У каждого обычного слайда должен быть выбран хотя бы один чарт.'),
      );
      return;
    }

    const slidesToExport = slides.filter(
      slide => slide.kind !== 'intro' || includeIntroSlide,
    );

    try {
      setIsExporting(true);
      const blob = await buildPresentation(
        dashboardTitle || 'dashboard',
        slidesToExport,
        chartOptions,
        activateChart,
        getChartStatus,
      );
      downloadBlob(blob, `${dashboardTitle || 'dashboard'}-presentation.pptx`);
      addSuccessToast(t('Презентация подготовлена.'));
      closeModal();
    } catch (error) {
      addDangerToast(
        error instanceof Error
          ? error.message
          : t('Не удалось собрать презентацию.'),
      );
    } finally {
      dispatch(setActiveTabs(activeTabs));
      dispatch(setDirectPathToChild(directPathToChild));
      setIsExporting(false);
    }
  }, [
    activeTabs,
    activateChart,
    addDangerToast,
    addSuccessToast,
    chartOptions,
    closeModal,
    dashboardTitle,
    directPathToChild,
    dispatch,
    getChartStatus,
    includeIntroSlide,
    slides,
  ]);

  const handleClose = useCallback(() => {
    if (!isExporting) {
      closeModal();
    }
  }, [closeModal, isExporting]);

  const footer = (
    <>
      <Button
        buttonStyle="tertiary"
        disabled={isExporting}
        onClick={handleClose}
      >
        {t('Close')}
      </Button>
      <Button disabled={isExporting} onClick={handleApply}>
        {isExporting ? t('Создаю презентацию...') : t('Apply')}
      </Button>
    </>
  );

  return (
    <StyledModalTrigger
      ref={modalRef}
      triggerNode={triggerNode}
      modalTitle={t('Сделать презентацию')}
      modalFooter={footer}
      width="1100px"
      responsive
      destroyOnHidden={false}
      modalBody={
        <ModalLayout>
          <SlidesPanel>
            <SlidesHeader>
              <SlidesTitle>{t('Слайды')}</SlidesTitle>
              <Button
                buttonStyle="tertiary"
                onClick={handleAddSlide}
                icon={<Icons.PlusOutlined />}
              >
                {t('Добавить')}
              </Button>
            </SlidesHeader>

            <SectionCard>
              <SectionTitle>{t('Стартовый слайд')}</SectionTitle>
              <InlineToggle>
                <input
                  checked={includeIntroSlide}
                  onChange={handleToggleIntro}
                  type="checkbox"
                />
                <span>{t('Добавить титульный лист')}</span>
              </InlineToggle>
            </SectionCard>

            <SlidesList>
              {visibleSlides.map(slide => (
                <SlideCard
                  key={slide.id}
                  $active={slide.id === activeSlide?.id}
                  onClick={() => setActiveSlideId(slide.id)}
                  type="button"
                >
                  <SlideCardHeader>
                    <SlideCardMeta>
                      <SlideName>{slide.name}</SlideName>
                      <SlideTypeTag>
                        {slide.kind === 'intro' ? t('Стартовый') : t('Обычный')}
                      </SlideTypeTag>
                    </SlideCardMeta>
                    {slide.kind === 'content' && (
                      <SlideCardActions>
                        <Button
                          buttonStyle="tertiary"
                          icon={<Icons.DeleteOutlined />}
                          onClick={event => {
                            event.stopPropagation();
                            handleDeleteSlide(slide.id);
                          }}
                        />
                      </SlideCardActions>
                    )}
                  </SlideCardHeader>
                  <SlideMeta>
                    {slide.kind === 'intro'
                      ? t('Титульный слайд презентации')
                      : slide.chartIds.length
                        ? t('%s charts selected', slide.chartIds.length)
                        : t('No charts selected')}
                  </SlideMeta>
                </SlideCard>
              ))}
            </SlidesList>
          </SlidesPanel>

          <ContentPanel>
            {activeSlide && (
              <>
                <SectionCard>
                  <SectionTitle>{t('Параметры слайда')}</SectionTitle>
                  <SectionDescription>
                    {activeSlide.kind === 'intro'
                      ? t(
                          'Настройте стартовый слайд, который будет открывать презентацию.',
                        )
                      : t(
                          'Для каждого слайда можно задать имя в списке, заголовок и короткое описание сверху.',
                        )}
                  </SectionDescription>

                  <FieldsGrid>
                    <FieldGroup>
                      <FieldLabel htmlFor="slide-name">
                        {t('Название в левой панели')}
                      </FieldLabel>
                      <Input
                        id="slide-name"
                        onChange={event =>
                          updateSlide(activeSlide.id, slide => ({
                            ...slide,
                            name: event.target.value,
                          }))
                        }
                        placeholder={t('Например: Введение')}
                        value={activeSlide.name}
                      />
                    </FieldGroup>

                    <FieldGroup>
                      <FieldLabel htmlFor="slide-heading">
                        {t('Заголовок слайда')}
                      </FieldLabel>
                      <Input
                        id="slide-heading"
                        onChange={event =>
                          updateSlide(activeSlide.id, slide => ({
                            ...slide,
                            heading: event.target.value,
                          }))
                        }
                        placeholder={t('Например: Обзор KPI')}
                        value={activeSlide.heading}
                      />
                    </FieldGroup>

                    <FullWidthField>
                      <FieldGroup>
                        <FieldLabel htmlFor="slide-description">
                          {t('Короткое описание')}
                        </FieldLabel>
                        <TextArea
                          id="slide-description"
                          autoSize={{ minRows: 3, maxRows: 6 }}
                          onChange={event =>
                            updateSlide(activeSlide.id, slide => ({
                              ...slide,
                              description: event.target.value,
                            }))
                          }
                          placeholder={t(
                            'Текст, который будет отображаться сверху на слайде.',
                          )}
                          value={activeSlide.description}
                        />
                      </FieldGroup>
                    </FullWidthField>
                  </FieldsGrid>
                </SectionCard>

                {activeSlide.kind === 'content' ? (
                  <>
                    <SectionCard>
                      <SectionTitle>{t('Чарты для слайда')}</SectionTitle>
                      <SectionDescription>
                        {t(
                          'Выберите чарты дашборда, которые попадут на этот слайд как скриншоты.',
                        )}
                      </SectionDescription>
                      {treeData.length ? (
                        <StyledTree
                          checkable
                          checkStrictly
                          defaultExpandAll
                          selectable={false}
                          checkedKeys={checkedKeys}
                          onCheck={handleCheck}
                          treeData={treeData}
                        />
                      ) : (
                        <EmptyState
                          title={t('Нет доступных чартов')}
                          description={t(
                            'Нет доступных чартов для добавления в слайд',
                          )}
                        />
                      )}
                    </SectionCard>

                    <SectionCard>
                      <SectionTitle>{t('Выбранные чарты')}</SectionTitle>
                      {selectedCharts.length ? (
                        <SelectedChartsList>
                          {selectedCharts.map(chart => (
                            <ChartTag key={chart.chartId}>
                              {[...chart.path, chart.title].join(' > ')}
                            </ChartTag>
                          ))}
                        </SelectedChartsList>
                      ) : (
                        <SectionDescription>
                          {t('Для этого слайда пока ничего не выбрано.')}
                        </SectionDescription>
                      )}
                    </SectionCard>
                  </>
                ) : (
                  <SectionCard>
                    <SectionTitle>{t('Начальный слайд')}</SectionTitle>
                    <SectionDescription>
                      {t(
                        'Этот слайд используется как титульный экран презентации и не содержит чарты дашборда.',
                      )}
                    </SectionDescription>
                  </SectionCard>
                )}
              </>
            )}
          </ContentPanel>
        </ModalLayout>
      }
    />
  );
};

export default PresentationBuilderModal;
