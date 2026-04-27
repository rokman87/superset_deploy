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
/* eslint-disable theme-colors/no-literal-colors */
import { SyntheticEvent } from 'react';
import { useSelector, useStore } from 'react-redux';
import { FeatureFlag, isFeatureEnabled, logging, t } from '@superset-ui/core';
import { MenuItem } from '@superset-ui/core/components/Menu';
import { useDownloadScreenshot } from 'src/dashboard/hooks/useDownloadScreenshot';
import { MenuKeys, RootState, DashboardLayout } from 'src/dashboard/types';
import { TABS_TYPE } from 'src/dashboard/util/componentTypes';
import { DASHBOARD_ROOT_ID } from 'src/dashboard/util/constants';
import isDashboardLoading from 'src/dashboard/util/isDashboardLoading';
import downloadAsPdf from 'src/utils/downloadAsPdf';
import downloadAsImage from 'src/utils/downloadAsImage';
import {
  LOG_ACTIONS_DASHBOARD_DOWNLOAD_AS_PDF,
  LOG_ACTIONS_DASHBOARD_DOWNLOAD_AS_IMAGE,
} from 'src/logger/LogUtils';
import { useToasts } from 'src/components/MessageToasts/withToasts';
import backgroundPdfImage from 'src/assets/images/background_pdf.png';
import pdfUnicodeFont from 'src/assets/fonts/DejaVuSans.ttf';
import { DownloadScreenshotFormat } from './types';

type ExportSelection = {
  groupId: string;
  tabId: string;
  title: string;
};

type ExportState = {
  selections: ExportSelection[];
};

type ExportPdfOptions = {
  coverDateLabel: string;
  coverDescription: string;
  coverTitle: string;
  includeCoverPage: boolean;
};

type ExportDialogResult = {
  options: ExportPdfOptions;
  states: ExportState[];
};

const SCREENSHOT_NODE_SELECTOR = '.dashboard';
const EXPORT_WAIT_INTERVAL_MS = 350;
const EXPORT_WAIT_TIMEOUT_MS = 15000;

const sleep = (ms: number) =>
  new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });

const waitForNextPaint = () =>
  new Promise(resolve => {
    window.requestAnimationFrame(() => resolve(undefined));
  });

type TabGroup = {
  id: string;
  tabIds: string[];
  tabTitles: string[];
};

type ProgressOverlay = {
  update: (
    current: number,
    total: number,
    tabTitles: string[],
    dashboardTitle: string,
  ) => void;
  destroy: () => void;
};

const dedupeExportStates = (states: ExportState[]) => {
  const seen = new Set<string>();
  return states.filter(state => {
    const key = state.selections.map(selection => selection.tabId).join('|');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const combineExportStates = (groups: ExportState[][]): ExportState[] =>
  groups.reduce<ExportState[]>(
    (acc, group) =>
      acc.flatMap(base =>
        group.map(item => ({
          selections: [...base.selections, ...item.selections],
        })),
      ),
    [{ selections: [] }],
  );

const getTabLabel = (layout: DashboardLayout, tabId: string) => {
  const tabMeta = layout[tabId]?.meta;
  return (
    tabMeta?.text ||
    tabMeta?.sliceNameOverride ||
    tabMeta?.sliceName ||
    t('Tab')
  );
};

const collectTabGroups = (
  layout: DashboardLayout,
  nodeId = DASHBOARD_ROOT_ID,
): TabGroup[] => {
  const node = layout[nodeId];
  if (!node) {
    return [];
  }

  if (node.type === TABS_TYPE) {
    return [
      {
        id: nodeId,
        tabIds: node.children,
        tabTitles: node.children.map(tabId => getTabLabel(layout, tabId)),
      },
      ...node.children.flatMap(tabId => collectTabGroups(layout, tabId)),
    ];
  }

  if (!node.children?.length) {
    return [];
  }

  return node.children.flatMap(childId => collectTabGroups(layout, childId));
};

const collectExportStates = (
  layout: DashboardLayout,
  nodeId = DASHBOARD_ROOT_ID,
): ExportState[] => {
  const node = layout[nodeId];

  if (!node) {
    return [{ selections: [] }];
  }

  if (node.type === TABS_TYPE) {
    const tabStates = node.children.flatMap(tabId =>
      collectExportStates(layout, tabId).map(state => ({
        selections: [
          {
            groupId: nodeId,
            tabId,
            title: getTabLabel(layout, tabId),
          },
          ...state.selections,
        ],
      })),
    );

    return tabStates.length > 0
      ? dedupeExportStates(tabStates)
      : [{ selections: [] }];
  }

  if (!node.children?.length) {
    return [{ selections: [] }];
  }

  return dedupeExportStates(
    combineExportStates(
      node.children.map(childId => collectExportStates(layout, childId)),
    ),
  );
};

const getTabTitles = (state: ExportState) =>
  state.selections.map(selection => selection.title);

const getExportStateSearchText = (state: ExportState) =>
  state.selections
    .map(selection => selection.title.toLocaleLowerCase())
    .join(' ');

const isSameExportState = (left: ExportState, right: ExportState) =>
  left.selections.length === right.selections.length &&
  left.selections.every((selection, index) => {
    const other = right.selections[index];
    return (
      selection.groupId === other?.groupId &&
      selection.tabId === other?.tabId &&
      selection.title === other?.title
    );
  });

const getProgressSubtitle = (tabTitles: string[]) =>
  tabTitles.length ? tabTitles.join(' / ') : t('Current dashboard view');

const showExportSelectionDialog = (
  exportStates: ExportState[],
  dashboardTitle: string,
  activeState: ExportState,
) =>
  new Promise<ExportDialogResult | null>(resolve => {
    type TreeNode = {
      children: Map<string, TreeNode>;
      key: string;
      leafIndexes: number[];
      level: number;
      matchesActivePath: boolean;
      parent: TreeNode | null;
      searchText: string;
      stateIndex: number | null;
      title: string;
      visibleLeafIndexes: number[];
    };

    const createNode = (
      key: string,
      title: string,
      level: number,
      parent: TreeNode | null,
    ): TreeNode => ({
      children: new Map<string, TreeNode>(),
      key,
      leafIndexes: [],
      level,
      matchesActivePath: false,
      parent,
      searchText: title.toLocaleLowerCase(),
      stateIndex: null,
      title,
      visibleLeafIndexes: [],
    });

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.zIndex = '2200';
    container.style.background = 'rgba(15, 23, 42, 0.36)';
    container.style.backdropFilter = 'blur(6px)';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.padding = '24px';

    const card = document.createElement('div');
    card.style.width = 'min(760px, 100%)';
    card.style.maxHeight = 'min(82vh, 820px)';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.borderRadius = '20px';
    card.style.background = '#ffffff';
    card.style.boxShadow = '0 32px 80px rgba(15, 23, 42, 0.22)';
    card.style.overflow = 'hidden';

    const header = document.createElement('div');
    header.style.padding = '22px 24px 18px';
    header.style.borderBottom = '1px solid rgba(148, 163, 184, 0.22)';
    header.style.display = 'grid';
    header.style.gap = '6px';

    const titleNode = document.createElement('div');
    titleNode.style.fontSize = '18px';
    titleNode.style.fontWeight = '600';
    titleNode.textContent = t('Choose pages for PDF export');

    const subtitleNode = document.createElement('div');
    subtitleNode.style.color = 'rgba(0, 0, 0, 0.55)';
    subtitleNode.style.lineHeight = '1.5';
    subtitleNode.textContent = dashboardTitle;

    const toolbar = document.createElement('div');
    toolbar.style.padding = '16px 24px 0';
    toolbar.style.display = 'grid';
    toolbar.style.gap = '12px';

    const settingsCard = document.createElement('div');
    settingsCard.style.display = 'grid';
    settingsCard.style.gap = '12px';
    settingsCard.style.padding = '14px 16px';
    settingsCard.style.borderRadius = '14px';
    settingsCard.style.background = 'rgba(248, 250, 252, 0.96)';
    settingsCard.style.border = '1px solid rgba(148, 163, 184, 0.18)';

    const toolbarTop = document.createElement('div');
    toolbarTop.style.display = 'flex';
    toolbarTop.style.justifyContent = 'space-between';
    toolbarTop.style.alignItems = 'center';
    toolbarTop.style.gap = '12px';

    const summaryNode = document.createElement('div');
    summaryNode.style.color = 'rgba(0, 0, 0, 0.55)';
    summaryNode.style.fontSize = '13px';

    const actionButtons = document.createElement('div');
    actionButtons.style.display = 'flex';
    actionButtons.style.flexWrap = 'wrap';
    actionButtons.style.justifyContent = 'flex-end';
    actionButtons.style.gap = '10px';

    const makeToolbarButton = (label: string) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.style.border = 'none';
      button.style.background = 'transparent';
      button.style.color = 'rgb(8, 145, 178)';
      button.style.fontWeight = '600';
      button.style.cursor = 'pointer';
      button.style.padding = '0';
      return button;
    };

    const toggleAllButton = makeToolbarButton(t('Select all'));
    const onlyActivePathButton = makeToolbarButton(t('Only active path'));

    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = t('Search by tab name');
    searchInput.style.height = '42px';
    searchInput.style.width = '100%';
    searchInput.style.borderRadius = '12px';
    searchInput.style.border = '1px solid rgba(148, 163, 184, 0.28)';
    searchInput.style.padding = '0 14px';
    searchInput.style.fontSize = '14px';
    searchInput.style.outline = 'none';
    searchInput.style.background = '#ffffff';

    const settingsHeader = document.createElement('div');
    settingsHeader.style.display = 'flex';
    settingsHeader.style.justifyContent = 'space-between';
    settingsHeader.style.alignItems = 'center';
    settingsHeader.style.gap = '12px';

    const settingsTitle = document.createElement('div');
    settingsTitle.textContent = t('PDF settings');
    settingsTitle.style.fontSize = '13px';
    settingsTitle.style.fontWeight = '600';
    settingsTitle.style.color = 'rgb(15, 23, 42)';

    const coverToggleLabel = document.createElement('label');
    coverToggleLabel.style.display = 'flex';
    coverToggleLabel.style.alignItems = 'center';
    coverToggleLabel.style.gap = '8px';
    coverToggleLabel.style.fontSize = '13px';
    coverToggleLabel.style.color = 'rgb(15, 23, 42)';
    coverToggleLabel.style.cursor = 'pointer';

    const coverToggle = document.createElement('input');
    coverToggle.type = 'checkbox';
    coverToggle.checked = false;
    coverToggle.style.accentColor = 'rgb(8, 145, 178)';

    const coverToggleText = document.createElement('span');
    coverToggleText.textContent = t('Title page');

    const coverFields = document.createElement('div');
    coverFields.style.display = 'none';
    coverFields.style.gridTemplateColumns = '1fr 1fr';
    coverFields.style.gap = '10px';

    const makeField = (
      label: string,
      element: HTMLInputElement | HTMLTextAreaElement,
    ) => {
      const fieldWrap = document.createElement('label');
      fieldWrap.style.display = 'grid';
      fieldWrap.style.gap = '6px';
      fieldWrap.style.fontSize = '12px';
      fieldWrap.style.color = 'rgba(15, 23, 42, 0.72)';
      fieldWrap.textContent = label;
      fieldWrap.appendChild(element);
      return fieldWrap;
    };

    const makeTextInput = (placeholder: string) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = placeholder;
      input.style.height = '38px';
      input.style.borderRadius = '10px';
      input.style.border = '1px solid rgba(148, 163, 184, 0.24)';
      input.style.padding = '0 12px';
      input.style.fontSize = '13px';
      input.style.background = '#ffffff';
      input.style.outline = 'none';
      return input;
    };

    const coverTitleInput = makeTextInput(t('Report title'));
    coverTitleInput.value = dashboardTitle;

    const coverDateInput = makeTextInput(t('Date label'));
    coverDateInput.value = new Intl.DateTimeFormat('ru-RU', {
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    const coverDescriptionInput = document.createElement('textarea');
    coverDescriptionInput.placeholder = t('Short description');
    coverDescriptionInput.style.minHeight = '72px';
    coverDescriptionInput.style.resize = 'vertical';
    coverDescriptionInput.style.borderRadius = '10px';
    coverDescriptionInput.style.border = '1px solid rgba(148, 163, 184, 0.24)';
    coverDescriptionInput.style.padding = '10px 12px';
    coverDescriptionInput.style.fontSize = '13px';
    coverDescriptionInput.style.background = '#ffffff';
    coverDescriptionInput.style.outline = 'none';
    coverDescriptionInput.style.gridColumn = '1 / -1';

    const list = document.createElement('div');
    list.style.padding = '16px 24px 24px';
    list.style.display = 'grid';
    list.style.gap = '4px';
    list.style.overflow = 'auto';

    const footer = document.createElement('div');
    footer.style.padding = '18px 24px 24px';
    footer.style.display = 'flex';
    footer.style.justifyContent = 'flex-end';
    footer.style.gap = '12px';
    footer.style.borderTop = '1px solid rgba(148, 163, 184, 0.18)';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = t('Cancel');
    cancelButton.style.height = '40px';
    cancelButton.style.padding = '0 18px';
    cancelButton.style.borderRadius = '10px';
    cancelButton.style.border = '1px solid rgba(148, 163, 184, 0.35)';
    cancelButton.style.background = '#ffffff';
    cancelButton.style.cursor = 'pointer';

    const submitButton = document.createElement('button');
    submitButton.type = 'button';
    submitButton.textContent = t('Export selected');
    submitButton.style.height = '40px';
    submitButton.style.padding = '0 18px';
    submitButton.style.borderRadius = '10px';
    submitButton.style.border = 'none';
    submitButton.style.background = 'rgb(8, 145, 178)';
    submitButton.style.color = '#ffffff';
    submitButton.style.fontWeight = '600';
    submitButton.style.cursor = 'pointer';

    const rootNode = createNode('root', t('All panels'), 0, null);
    const activeKeys = new Set(
      activeState.selections.map(
        selection => `${selection.groupId}:${selection.tabId}`,
      ),
    );
    const selected = new Set(exportStates.map((_, index) => index));
    const expandedKeys = new Set<string>();
    const topLevelKeys: string[] = [];
    let settled = false;
    let searchQuery = '';

    exportStates.forEach((state, stateIndex) => {
      let currentNode = rootNode;
      rootNode.leafIndexes.push(stateIndex);

      state.selections.forEach((selection, levelIndex) => {
        const nodeKey = `${selection.groupId}:${selection.tabId}`;
        let nextNode = currentNode.children.get(nodeKey);

        if (!nextNode) {
          nextNode = createNode(
            nodeKey,
            selection.title,
            levelIndex + 1,
            currentNode,
          );
          currentNode.children.set(nodeKey, nextNode);
          if (currentNode === rootNode) {
            topLevelKeys.push(nodeKey);
          }
        }

        nextNode.leafIndexes.push(stateIndex);
        nextNode.searchText = `${nextNode.searchText} ${selection.title.toLocaleLowerCase()}`;
        if (activeKeys.has(nodeKey)) {
          nextNode.matchesActivePath = true;
        }
        currentNode = nextNode;
      });

      currentNode.stateIndex = stateIndex;
    });

    topLevelKeys.forEach(key => expandedKeys.add(key));
    rootNode.matchesActivePath = activeState.selections.length === 0;

    const finish = (value: ExportDialogResult | null) => {
      if (settled) {
        return;
      }
      settled = true;
      container.remove();
      resolve(value);
    };

    const setSelectionForIndexes = (indexes: number[], checked: boolean) => {
      indexes.forEach(index => {
        if (checked) {
          selected.add(index);
        } else {
          selected.delete(index);
        }
      });
    };

    function applySearchToNode(
      node: TreeNode,
      normalizedQuery: string,
    ): boolean {
      const currentNode = node;

      if (currentNode.stateIndex !== null) {
        const state = exportStates[currentNode.stateIndex];
        const matches =
          normalizedQuery.length === 0 ||
          getExportStateSearchText(state).includes(normalizedQuery);
        currentNode.visibleLeafIndexes = matches
          ? [...currentNode.leafIndexes]
          : [];
        return matches;
      }

      let hasVisibleChild = false;
      currentNode.visibleLeafIndexes = [];

      currentNode.children.forEach(child => {
        const childVisible = applySearchToNode(child, normalizedQuery);
        if (childVisible) {
          hasVisibleChild = true;
          currentNode.visibleLeafIndexes.push(...child.visibleLeafIndexes);
          if (normalizedQuery.length > 0) {
            expandedKeys.add(child.key);
          }
        }
      });

      const matchesSelf =
        normalizedQuery.length === 0 ||
        currentNode.searchText.includes(normalizedQuery);

      if (!currentNode.parent) {
        return hasVisibleChild;
      }

      return matchesSelf || hasVisibleChild;
    }

    const makeChevron = (expanded: boolean) => {
      const chevron = document.createElement('span');
      chevron.textContent = expanded ? '▾' : '▸';
      chevron.style.fontSize = '12px';
      chevron.style.color = 'rgba(15, 23, 42, 0.72)';
      chevron.style.width = '16px';
      chevron.style.display = 'inline-flex';
      chevron.style.justifyContent = 'center';
      return chevron;
    };

    let drawTree = () => undefined;

    function renderNode(node: TreeNode, parentEl: HTMLElement) {
      const indexes =
        node.visibleLeafIndexes.length > 0
          ? node.visibleLeafIndexes
          : node.leafIndexes;
      if (node.parent && indexes.length === 0) {
        return;
      }

      const isGroup = node.children.size > 0;
      const checkedCount = indexes.filter(index => selected.has(index)).length;
      const isChecked = checkedCount === indexes.length && indexes.length > 0;
      const isIndeterminate = checkedCount > 0 && checkedCount < indexes.length;
      const isExpanded =
        searchQuery.trim().length > 0 ||
        node.level === 0 ||
        expandedKeys.has(node.key);
      const isCurrentLeaf =
        node.stateIndex !== null &&
        isSameExportState(exportStates[node.stateIndex], activeState);

      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gap = '2px';

      const rowButton = document.createElement('label');
      rowButton.style.display = 'flex';
      rowButton.style.alignItems = 'center';
      rowButton.style.gap = '10px';
      rowButton.style.minHeight = '34px';
      rowButton.style.padding = '4px 8px';
      rowButton.style.paddingLeft = `${Math.max(6, node.level * 24)}px`;
      rowButton.style.borderRadius = '8px';
      rowButton.style.cursor = 'pointer';
      rowButton.style.transition = 'background 0.18s ease';
      rowButton.style.background = 'transparent';
      rowButton.style.borderLeft = node.matchesActivePath
        ? '2px solid rgba(8, 145, 178, 0.55)'
        : '2px solid transparent';

      const toggleButton = document.createElement('button');
      toggleButton.type = 'button';
      toggleButton.style.border = 'none';
      toggleButton.style.background = 'transparent';
      toggleButton.style.padding = '0';
      toggleButton.style.width = '16px';
      toggleButton.style.cursor = isGroup ? 'pointer' : 'default';
      toggleButton.style.visibility = isGroup ? 'visible' : 'hidden';
      toggleButton.appendChild(makeChevron(isExpanded));

      if (isGroup) {
        toggleButton.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          if (expandedKeys.has(node.key)) {
            expandedKeys.delete(node.key);
          } else {
            expandedKeys.add(node.key);
          }
          drawTree();
        });
      }

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isChecked;
      checkbox.indeterminate = isIndeterminate;
      checkbox.style.accentColor = 'rgb(8, 145, 178)';

      checkbox.addEventListener('change', () => {
        setSelectionForIndexes(indexes, checkbox.checked);
        drawTree();
      });

      const titleWrap = document.createElement('div');
      titleWrap.style.display = 'flex';
      titleWrap.style.alignItems = 'center';
      titleWrap.style.gap = '8px';
      titleWrap.style.flexWrap = 'wrap';
      titleWrap.style.flex = '1';

      const title = document.createElement('span');
      title.textContent = node.title;
      title.style.fontSize = node.stateIndex === null ? '14px' : '13px';
      title.style.fontWeight = node.level <= 1 ? '600' : '500';
      title.style.color = 'rgb(15, 23, 42)';

      const meta = document.createElement('span');
      meta.style.marginLeft = 'auto';
      meta.style.fontSize = '10px';
      meta.style.color = 'rgba(0, 0, 0, 0.45)';
      meta.textContent =
        node.stateIndex === null
          ? node.level <= 1
            ? t('%(count)s pages', { count: node.leafIndexes.length })
            : t('Subsection')
          : t('PDF page %(page)s', { page: (node.stateIndex || 0) + 1 });

      titleWrap.appendChild(title);

      if (isCurrentLeaf) {
        const currentBadge = document.createElement('span');
        currentBadge.textContent = 'Current';
        currentBadge.style.fontSize = '10px';
        currentBadge.style.fontWeight = '600';
        currentBadge.style.color = 'rgb(8, 145, 178)';
        currentBadge.style.background = 'rgba(8, 145, 178, 0.08)';
        currentBadge.style.borderRadius = '999px';
        currentBadge.style.padding = '2px 6px';
        titleWrap.appendChild(currentBadge);
      } else if (node.matchesActivePath && node.stateIndex === null) {
        const pathBadge = document.createElement('span');
        pathBadge.textContent = t('Current');
        pathBadge.style.fontSize = '10px';
        pathBadge.style.fontWeight = '600';
        pathBadge.style.color = 'rgb(8, 145, 178)';
        pathBadge.style.background = 'rgba(8, 145, 178, 0.08)';
        pathBadge.style.borderRadius = '999px';
        pathBadge.style.padding = '2px 6px';
        titleWrap.appendChild(pathBadge);
      }

      rowButton.appendChild(toggleButton);
      rowButton.appendChild(checkbox);
      rowButton.appendChild(titleWrap);
      rowButton.appendChild(meta);
      parentEl.appendChild(row);
      row.appendChild(rowButton);

      if (isGroup && isExpanded) {
        const childrenWrap = document.createElement('div');
        childrenWrap.style.display = 'grid';
        childrenWrap.style.gap = '2px';
        row.appendChild(childrenWrap);
        Array.from(node.children.values()).forEach(child =>
          renderNode(child, childrenWrap),
        );
      }
    }

    drawTree = () => {
      list.innerHTML = '';
      const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
      applySearchToNode(rootNode, normalizedQuery);

      const visibleLeafIndexes = Array.from(
        new Set(rootNode.visibleLeafIndexes),
      );
      const visibleSelected = visibleLeafIndexes.filter(index =>
        selected.has(index),
      );
      Array.from(rootNode.children.values()).forEach(child =>
        renderNode(child, list),
      );

      summaryNode.textContent = t('%(selected)s selected • %(found)s found', {
        selected: selected.size,
        found: visibleLeafIndexes.length,
      });
      toggleAllButton.textContent =
        visibleSelected.length === visibleLeafIndexes.length &&
        visibleLeafIndexes.length > 0
          ? t('Clear all')
          : t('Select all');
      submitButton.disabled = selected.size === 0;
      submitButton.style.opacity = selected.size === 0 ? '0.5' : '1';
      submitButton.style.cursor =
        selected.size === 0 ? 'not-allowed' : 'pointer';
    };

    toggleAllButton.addEventListener('click', () => {
      const { visibleLeafIndexes } = rootNode;
      const shouldSelectAll = visibleLeafIndexes.some(
        index => !selected.has(index),
      );
      setSelectionForIndexes(visibleLeafIndexes, shouldSelectAll);
      drawTree();
    });

    onlyActivePathButton.addEventListener('click', () => {
      selected.clear();
      exportStates.forEach((state, index) => {
        if (isSameExportState(state, activeState)) {
          selected.add(index);
        }
      });
      drawTree();
    });

    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      drawTree();
    });

    coverToggle.addEventListener('change', () => {
      coverFields.style.display = coverToggle.checked ? 'grid' : 'none';
    });

    cancelButton.addEventListener('click', () => finish(null));
    submitButton.addEventListener('click', () => {
      if (selected.size === 0) {
        return;
      }
      finish({
        options: {
          coverDateLabel: coverDateInput.value.trim(),
          coverDescription: coverDescriptionInput.value.trim(),
          coverTitle: coverTitleInput.value.trim() || dashboardTitle,
          includeCoverPage: coverToggle.checked,
        },
        states: exportStates.filter((_, index) => selected.has(index)),
      });
    });
    container.addEventListener('click', event => {
      if (event.target === container) {
        finish(null);
      }
    });

    header.appendChild(titleNode);
    header.appendChild(subtitleNode);
    coverToggleLabel.appendChild(coverToggle);
    coverToggleLabel.appendChild(coverToggleText);
    settingsHeader.appendChild(settingsTitle);
    settingsHeader.appendChild(coverToggleLabel);
    coverFields.appendChild(makeField(t('Title'), coverTitleInput));
    coverFields.appendChild(makeField(t('Date label'), coverDateInput));
    coverFields.appendChild(makeField(t('Description'), coverDescriptionInput));
    settingsCard.appendChild(settingsHeader);
    settingsCard.appendChild(coverFields);
    actionButtons.appendChild(onlyActivePathButton);
    actionButtons.appendChild(toggleAllButton);
    toolbarTop.appendChild(summaryNode);
    toolbarTop.appendChild(actionButtons);
    toolbar.appendChild(settingsCard);
    toolbar.appendChild(toolbarTop);
    toolbar.appendChild(searchInput);
    footer.appendChild(cancelButton);
    footer.appendChild(submitButton);
    card.appendChild(header);
    card.appendChild(toolbar);
    card.appendChild(list);
    card.appendChild(footer);
    container.appendChild(card);
    document.body.appendChild(container);

    drawTree();
  });

const createProgressOverlay = (): ProgressOverlay => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.zIndex = '2100';
  container.style.background = 'rgba(15, 23, 42, 0.32)';
  container.style.backdropFilter = 'blur(6px)';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.padding = '24px';

  const card = document.createElement('div');
  card.style.width = 'min(540px, 100%)';
  card.style.borderRadius = '20px';
  card.style.background = '#ffffff';
  card.style.boxShadow = '0 32px 80px rgba(15, 23, 42, 0.22)';
  card.style.overflow = 'hidden';

  const topBar = document.createElement('div');
  topBar.style.height = '6px';
  topBar.style.background =
    'linear-gradient(90deg, rgb(8, 145, 178), rgb(14, 165, 233))';

  const body = document.createElement('div');
  body.style.padding = '24px';
  body.style.display = 'grid';
  body.style.gap = '16px';
  body.style.minWidth = '420px';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.gap = '12px';
  header.style.alignItems = 'flex-start';

  const iconWrap = document.createElement('div');
  iconWrap.style.width = '40px';
  iconWrap.style.height = '40px';
  iconWrap.style.borderRadius = '12px';
  iconWrap.style.background =
    'linear-gradient(135deg, rgba(8,145,178,0.16), rgba(14,165,233,0.08))';
  iconWrap.style.display = 'flex';
  iconWrap.style.alignItems = 'center';
  iconWrap.style.justifyContent = 'center';
  iconWrap.style.flexShrink = '0';
  iconWrap.innerHTML =
    '<div style="width:18px;height:18px;border:2px solid rgba(8,145,178,0.25);border-top-color:rgb(8,145,178);border-radius:999px;animation:superset-pdf-spin 0.8s linear infinite"></div>';

  const textWrap = document.createElement('div');
  textWrap.style.display = 'grid';
  textWrap.style.gap = '4px';

  const titleNode = document.createElement('div');
  titleNode.style.fontSize = '16px';
  titleNode.style.fontWeight = '600';
  titleNode.textContent = t('Preparing PDF export');

  const dashboardTitleNode = document.createElement('div');
  dashboardTitleNode.style.color = 'rgba(0, 0, 0, 0.65)';
  dashboardTitleNode.style.lineHeight = '1.5';

  const subtitleNode = document.createElement('div');
  subtitleNode.style.color = 'rgba(0, 0, 0, 0.45)';
  subtitleNode.style.lineHeight = '1.5';

  const progressWrap = document.createElement('div');
  progressWrap.style.display = 'grid';
  progressWrap.style.gap = '8px';

  const progressTrack = document.createElement('div');
  progressTrack.style.height = '8px';
  progressTrack.style.borderRadius = '999px';
  progressTrack.style.background = 'rgba(8, 145, 178, 0.12)';
  progressTrack.style.overflow = 'hidden';

  const progressBar = document.createElement('div');
  progressBar.style.width = '0%';
  progressBar.style.height = '100%';
  progressBar.style.borderRadius = '999px';
  progressBar.style.background =
    'linear-gradient(90deg, rgb(8, 145, 178), rgb(14, 165, 233))';
  progressBar.style.transition = 'width 220ms ease';

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.style.color = 'rgba(0, 0, 0, 0.65)';
  footer.style.fontSize = '12px';

  const pageNode = document.createElement('span');
  const percentNode = document.createElement('span');

  const styleTag = document.createElement('style');
  styleTag.dataset.testid = 'pdf-export-progress-style';
  styleTag.textContent =
    '@keyframes superset-pdf-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';

  textWrap.appendChild(titleNode);
  textWrap.appendChild(dashboardTitleNode);
  textWrap.appendChild(subtitleNode);
  header.appendChild(iconWrap);
  header.appendChild(textWrap);
  progressTrack.appendChild(progressBar);
  footer.appendChild(pageNode);
  footer.appendChild(percentNode);
  progressWrap.appendChild(progressTrack);
  progressWrap.appendChild(footer);
  body.appendChild(header);
  body.appendChild(progressWrap);
  card.appendChild(topBar);
  card.appendChild(body);
  container.appendChild(card);

  if (!document.querySelector('[data-testid="pdf-export-progress-style"]')) {
    document.head.appendChild(styleTag);
  }
  document.body.appendChild(container);

  const render = (
    current: number,
    total: number,
    tabTitles: string[],
    dashboardTitle: string,
  ) => {
    const percent = Math.min(
      100,
      Math.round((current / Math.max(total, 1)) * 100),
    );
    dashboardTitleNode.textContent = dashboardTitle;
    subtitleNode.textContent = getProgressSubtitle(tabTitles);
    pageNode.textContent = t('Page %(current)s of %(total)s', {
      current,
      total,
    });
    percentNode.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;
  };

  render(0, 1, [], '');

  return {
    update: render,
    destroy: () => {
      container.remove();
    },
  };
};

const PDF_PAGE_LAYOUT = {
  landscape: {
    height: 595.28,
    width: 841.89,
  },
  portrait: {
    height: 841.89,
    width: 595.28,
  },
} as const;

type PdfOrientation = keyof typeof PDF_PAGE_LAYOUT;
const PDF_UNICODE_FONT_FAMILY = 'DashboardPdfUnicode';
let pdfFontBase64Promise: Promise<string> | null = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
};

const ensurePdfUnicodeFont = async (
  pdf: InstanceType<(typeof import('jspdf'))['jsPDF']>,
) => {
  if (!pdfFontBase64Promise) {
    pdfFontBase64Promise = fetch(pdfUnicodeFont)
      .then(response => response.arrayBuffer())
      .then(arrayBufferToBase64);
  }

  if (!pdf.getFontList()[PDF_UNICODE_FONT_FAMILY]) {
    const base64 = await pdfFontBase64Promise;
    pdf.addFileToVFS('DejaVuSans.ttf', base64);
    pdf.addFont('DejaVuSans.ttf', PDF_UNICODE_FONT_FAMILY, 'normal');
  }
};

const getPdfImageRenderSize = (
  imageWidth: number,
  imageHeight: number,
  orientation: PdfOrientation,
) => {
  const pageLayout = PDF_PAGE_LAYOUT[orientation];
  const margin = 18;
  const headerHeight = 46;
  const footerHeight = 14;
  const availableWidth = pageLayout.width - margin * 2;
  const availableHeight =
    pageLayout.height - headerHeight - footerHeight - margin;
  let renderWidth = availableWidth;
  let renderHeight = (imageHeight / imageWidth) * renderWidth;

  if (renderHeight > availableHeight) {
    renderHeight = availableHeight;
    renderWidth = (imageWidth / imageHeight) * renderHeight;
  }

  return {
    availableHeight,
    availableWidth,
    footerHeight,
    headerHeight,
    margin,
    renderHeight,
    renderWidth,
  };
};

const getPreferredPdfOrientation = (
  imageWidth: number,
  imageHeight: number,
): PdfOrientation => {
  const landscape = getPdfImageRenderSize(imageWidth, imageHeight, 'landscape');
  const portrait = getPdfImageRenderSize(imageWidth, imageHeight, 'portrait');
  const landscapeArea = landscape.renderWidth * landscape.renderHeight;
  const portraitArea = portrait.renderWidth * portrait.renderHeight;

  return portraitArea > landscapeArea * 1.08 ? 'portrait' : 'landscape';
};

const normalizePdfText = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0);
      return !(code <= 31 || (code >= 127 && code <= 159));
    })
    .join('')
    .trim();

const splitPdfTextLines = (
  pdf: InstanceType<(typeof import('jspdf'))['jsPDF']>,
  text: string,
  maxWidth: number,
  maxLines: number,
) =>
  pdf
    .splitTextToSize(normalizePdfText(text), maxWidth)
    .slice(0, maxLines)
    .map(line => `${line}`);

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });

const renderCoverPage = async (
  pdf: InstanceType<(typeof import('jspdf'))['jsPDF']>,
  options: ExportPdfOptions,
) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const scale = Math.max(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return;
  }

  canvas.width = Math.round(pageWidth * scale);
  canvas.height = Math.round(pageHeight * scale);
  context.scale(scale, scale);
  const backgroundImage = await loadImage(backgroundPdfImage);
  context.drawImage(backgroundImage, 0, 0, pageWidth, pageHeight);

  const wrapText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
  ) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;
      if (context.measureText(nextLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = nextLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    lines.slice(0, maxLines).forEach((line, index) => {
      context.fillText(line, x, y + index * lineHeight);
    });
  };

  context.fillStyle = '#ffffff';
  context.textBaseline = 'top';
  const contentMaxWidth = pageWidth * 0.75 - 44;

  context.font = "700 32px Calibri, 'Segoe UI', Arial, sans-serif";
  wrapText(options.coverTitle, 44, 74, contentMaxWidth, 38, 4);

  if (options.coverDescription) {
    context.font = "600 18px 'Segoe UI', Arial, sans-serif";
    wrapText(options.coverDescription, 44, 250, contentMaxWidth, 24, 4);
  }

  if (options.coverDateLabel) {
    context.font = "700 16px 'Segoe UI', Arial, sans-serif";
    context.fillText(
      options.coverDateLabel.toLocaleUpperCase(),
      44,
      pageHeight - 90,
    );
  }

  pdf.addImage(
    canvas.toDataURL('image/png', 1),
    'PNG',
    0,
    0,
    pageWidth,
    pageHeight,
    undefined,
    'FAST',
  );
};

const renderDashboardPage = (
  pdf: InstanceType<(typeof import('jspdf'))['jsPDF']>,
  imageDataUrl: string,
  imageWidth: number,
  imageHeight: number,
  dashboardTitle: string,
  tabTitles: string[],
  pageNumber: number,
  totalPages: number,
) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const orientation: PdfOrientation =
    pageHeight > pageWidth ? 'portrait' : 'landscape';
  const { availableHeight, renderHeight, renderWidth } = getPdfImageRenderSize(
    imageWidth,
    imageHeight,
    orientation,
  );
  const headerHeight = 68;
  const subtitle = normalizePdfText(
    tabTitles.length ? tabTitles.join(' / ') : t('Current dashboard view'),
  );

  const imageX = (pageWidth - renderWidth) / 2;
  const imageY = headerHeight + 20 + (availableHeight - renderHeight) / 2;

  pdf.setFillColor(7, 9, 15);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  pdf.setFillColor(28, 30, 39);
  pdf.rect(0, 0, pageWidth, headerHeight, 'F');
  pdf.setFillColor(225, 24, 44);
  pdf.rect(0, 0, pageWidth, 4, 'F');
  pdf.setFillColor(59, 15, 24);
  pdf.circle(pageWidth * 0.87, pageHeight * 0.12, 98, 'F');
  pdf.setFillColor(41, 12, 18);
  pdf.circle(pageWidth * 0.92, pageHeight * 0.18, 70, 'F');
  pdf.setDrawColor(255, 28, 28);
  pdf.setLineWidth(0.9);
  pdf.roundedRect(
    pageWidth * 0.7,
    pageHeight * 0.2,
    pageWidth * 0.42,
    pageHeight * 0.78,
    72,
    72,
    'S',
  );
  pdf.setDrawColor(255, 28, 28);
  pdf.setLineWidth(0.7);
  pdf.roundedRect(
    pageWidth * 0.79,
    pageHeight * 0.42,
    pageWidth * 0.28,
    pageHeight * 0.44,
    46,
    46,
    'S',
  );

  pdf.setTextColor(255, 255, 255);
  pdf.setFont(PDF_UNICODE_FONT_FAMILY, 'normal');
  pdf.setFontSize(14);
  pdf.text(normalizePdfText(dashboardTitle), 20, 20, {
    baseline: 'top',
  });

  pdf.setTextColor(214, 214, 220);
  pdf.setFontSize(8.5);
  const subtitleLines = splitPdfTextLines(pdf, subtitle, pageWidth * 0.7, 2);
  pdf.text(subtitleLines, 20, 36, {
    baseline: 'top',
  });

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.text(
    t('Page %(current)s of %(total)s', {
      current: pageNumber,
      total: totalPages,
    }),
    pageWidth - 20,
    18,
    {
      align: 'right',
      baseline: 'top',
    },
  );

  pdf.setDrawColor(255, 40, 40);
  pdf.setLineWidth(1.1);
  pdf.roundedRect(
    imageX - 12,
    imageY - 12,
    renderWidth + 24,
    renderHeight + 24,
    14,
    14,
    'S',
  );
  pdf.setDrawColor(255, 255, 255);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(
    imageX - 5,
    imageY - 5,
    renderWidth + 10,
    renderHeight + 10,
    10,
    10,
    'FD',
  );
  pdf.addImage(
    imageDataUrl,
    'PNG',
    imageX,
    imageY,
    renderWidth,
    renderHeight,
    undefined,
    'FAST',
  );
};

const waitForDashboardToRender = async (store: ReturnType<typeof useStore>) => {
  const startedAt = Date.now();
  let stablePasses = 0;

  /* eslint-disable no-await-in-loop */
  while (Date.now() - startedAt < EXPORT_WAIT_TIMEOUT_MS) {
    const { charts } = store.getState() as RootState;

    if (!isDashboardLoading(charts)) {
      stablePasses += 1;
      if (stablePasses >= 2) {
        break;
      }
    } else {
      stablePasses = 0;
    }

    await sleep(EXPORT_WAIT_INTERVAL_MS);
  }
  /* eslint-enable no-await-in-loop */

  await waitForNextPaint();
  await waitForNextPaint();
};

const getScrollableAncestors = (element: HTMLElement) => {
  const scrollables: Array<HTMLElement | Window> = [window];
  let current = element.parentElement;

  while (current) {
    const styles = window.getComputedStyle(current);
    const overflowY = styles.overflowY || styles.overflow;
    const isScrollable =
      /(auto|scroll|overlay)/.test(overflowY) &&
      current.scrollHeight > current.clientHeight;

    if (isScrollable) {
      scrollables.push(current);
    }

    current = current.parentElement;
  }

  return scrollables;
};

const getScrollTop = (target: HTMLElement | Window) =>
  target === window ? window.scrollY : target.scrollTop;

const setScrollTop = (target: HTMLElement | Window, top: number) => {
  if (target === window) {
    window.scrollTo({
      top,
      behavior: 'auto',
    });
    return;
  }

  const scrollTarget = target;
  scrollTarget.scrollTop = top;
};

const getScrollMetrics = (target: HTMLElement | Window) => {
  if (target === window) {
    const doc = document.documentElement;
    return {
      clientHeight: window.innerHeight,
      maxScrollTop: Math.max(0, doc.scrollHeight - window.innerHeight),
    };
  }

  return {
    clientHeight: target.clientHeight,
    maxScrollTop: Math.max(0, target.scrollHeight - target.clientHeight),
  };
};

const preloadDashboardByScrolling = async (
  element: HTMLElement,
  store: ReturnType<typeof useStore>,
) => {
  const scrollTargets = getScrollableAncestors(element);
  const originalPositions = scrollTargets.map(target => ({
    target,
    top: getScrollTop(target),
  }));

  const stepThroughTarget = async (target: HTMLElement | Window) => {
    const { clientHeight, maxScrollTop } = getScrollMetrics(target);
    const step = Math.max(320, Math.floor(clientHeight * 0.85));

    if (maxScrollTop <= 0) {
      return;
    }

    /* eslint-disable no-await-in-loop */
    for (let top = 0; top <= maxScrollTop; top += step) {
      setScrollTop(target, Math.min(top, maxScrollTop));
      await waitForNextPaint();
      await waitForDashboardToRender(store);
    }
    /* eslint-enable no-await-in-loop */
  };

  /* eslint-disable no-await-in-loop */
  for (const target of scrollTargets) {
    await stepThroughTarget(target);
  }
  /* eslint-enable no-await-in-loop */

  await waitForDashboardToRender(store);

  originalPositions.forEach(({ target, top }) => {
    setScrollTop(target, top);
  });

  await waitForNextPaint();
  await waitForNextPaint();
  await waitForDashboardToRender(store);
};

const waitForTabSelection = async (groupId: string, tabIndex: number) => {
  const startedAt = Date.now();

  /* eslint-disable no-await-in-loop */
  while (Date.now() - startedAt < EXPORT_WAIT_TIMEOUT_MS) {
    const groupElement = document.getElementById(groupId);
    const tabElements = Array.from(
      groupElement?.querySelectorAll('[role="tab"]') || [],
    ) as HTMLElement[];
    const targetTab = tabIndex > -1 ? tabElements[tabIndex] : null;

    if (targetTab?.getAttribute('aria-selected') === 'true') {
      break;
    }

    await sleep(EXPORT_WAIT_INTERVAL_MS);
  }
  /* eslint-enable no-await-in-loop */

  await waitForNextPaint();
};

const activateExportState = async (
  state: ExportState,
  tabGroups: TabGroup[],
  store: ReturnType<typeof useStore>,
) => {
  /* eslint-disable no-await-in-loop */
  for (const selection of state.selections) {
    const group = tabGroups.find(item => item.id === selection.groupId);
    const groupElement = document.getElementById(selection.groupId);
    const tabIndex = group?.tabIds.indexOf(selection.tabId) ?? -1;
    const tabElements = Array.from(
      groupElement?.querySelectorAll('[role="tab"]') || [],
    ) as HTMLElement[];
    const targetTab = tabIndex > -1 ? tabElements[tabIndex] : null;

    if (!targetTab) {
      throw new Error(`Dashboard tab "${selection.tabId}" was not found`);
    }

    if (targetTab.getAttribute('aria-selected') !== 'true') {
      targetTab.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );
      await waitForTabSelection(selection.groupId, tabIndex);
    }

    await waitForNextPaint();
  }
  /* eslint-enable no-await-in-loop */

  await waitForDashboardToRender(store);
};

export interface UseDownloadMenuItemsProps {
  pdfMenuItemTitle: string;
  imageMenuItemTitle: string;
  dashboardTitle: string;
  logEvent?: Function;
  dashboardId: number;
  title: string;
  disabled?: boolean;
}

export const useDownloadMenuItems = (
  props: UseDownloadMenuItemsProps,
): MenuItem => {
  const {
    pdfMenuItemTitle,
    imageMenuItemTitle,
    logEvent,
    dashboardId,
    dashboardTitle,
    disabled,
    title,
  } = props;

  const store = useStore();
  const { addDangerToast } = useToasts();
  const dashboardLayout = useSelector(
    (state: RootState) => state.dashboardLayout.present,
  );
  const activeTabs = useSelector(
    (state: RootState) => state.dashboardState.activeTabs || [],
  );

  const isWebDriverScreenshotEnabled =
    isFeatureEnabled(FeatureFlag.EnableDashboardScreenshotEndpoints) &&
    isFeatureEnabled(FeatureFlag.EnableDashboardDownloadWebDriverScreenshot);

  const downloadScreenshot = useDownloadScreenshot(dashboardId, logEvent);

  const onDownloadCurrentPdf = async (e: SyntheticEvent) => {
    try {
      if (isWebDriverScreenshotEnabled) {
        downloadScreenshot(DownloadScreenshotFormat.PDF);
      } else {
        downloadAsPdf(SCREENSHOT_NODE_SELECTOR, dashboardTitle, true)(e);
      }
    } catch (error) {
      logging.error(error);
      addDangerToast(t('Sorry, something went wrong. Try again later.'));
    }
    logEvent?.(LOG_ACTIONS_DASHBOARD_DOWNLOAD_AS_PDF);
  };

  const onDownloadFullPdf = async (e: SyntheticEvent) => {
    const tabGroups = collectTabGroups(dashboardLayout);
    let overlay: ProgressOverlay | null = null;
    const originalState: ExportState = {
      selections: tabGroups.map(group => {
        const activeTabId =
          group.tabIds.find(tabId => activeTabs.includes(tabId)) ||
          group.tabIds[0];
        const activeTabIndex = group.tabIds.indexOf(activeTabId);
        return {
          groupId: group.id,
          tabId: activeTabId,
          title: group.tabTitles[Math.max(activeTabIndex, 0)] || t('Tab'),
        };
      }),
    };

    try {
      overlay = createProgressOverlay();
      overlay.update(0, 1, [], dashboardTitle);

      const elementToPrint = document.querySelector(
        SCREENSHOT_NODE_SELECTOR,
      ) as HTMLElement | null;

      if (!elementToPrint) {
        throw new Error('Dashboard element was not found');
      }

      const exportStates = collectExportStates(dashboardLayout);
      const availableStates =
        exportStates.length > 0 ? exportStates : [{ selections: [] }];
      const dialogResult = await showExportSelectionDialog(
        availableStates,
        dashboardTitle,
        originalState,
      );

      if (!dialogResult?.states.length) {
        return;
      }
      const { options: exportOptions, states: statesToExport } = dialogResult;
      // eslint-disable-next-line import/no-extraneous-dependencies
      const { default: html2canvas } = await import('html2canvas');
      // eslint-disable-next-line import/no-extraneous-dependencies
      const { jsPDF } = await import('jspdf');
      let pdf: InstanceType<typeof jsPDF> | null = null;

      if (exportOptions.includeCoverPage) {
        pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'pt',
          format: 'a4',
          compress: true,
        });
        await renderCoverPage(pdf, exportOptions);
      }

      /* eslint-disable no-await-in-loop */
      for (let index = 0; index < statesToExport.length; index += 1) {
        const state = statesToExport[index];

        overlay.update(
          index + 1,
          statesToExport.length,
          getTabTitles(state),
          dashboardTitle,
        );

        await activateExportState(state, tabGroups, store);
        await preloadDashboardByScrolling(elementToPrint, store);

        const canvas = await html2canvas(elementToPrint, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          ignoreElements: element =>
            element.classList?.contains('header-controls') ||
            element.classList?.contains('hover-menu') ||
            element.classList?.contains('dragdroppable-label') ||
            false,
        });

        const pageOrientation = getPreferredPdfOrientation(
          canvas.width,
          canvas.height,
        );

        if (!pdf) {
          pdf = new jsPDF({
            orientation: pageOrientation,
            unit: 'pt',
            format: 'a4',
            compress: true,
          });
        } else {
          pdf.addPage('a4', pageOrientation);
        }

        await ensurePdfUnicodeFont(pdf);

        renderDashboardPage(
          pdf,
          canvas.toDataURL('image/png', 1),
          canvas.width,
          canvas.height,
          dashboardTitle,
          getTabTitles(state),
          index + 1,
          statesToExport.length,
        );
      }
      /* eslint-enable no-await-in-loop */

      pdf?.save(`${dashboardTitle || 'dashboard'}.pdf`);
    } catch (error) {
      logging.error(error);
      addDangerToast(t('Sorry, something went wrong. Try again later.'));
      try {
        downloadAsPdf(SCREENSHOT_NODE_SELECTOR, dashboardTitle, true)(e);
      } catch (fallbackError) {
        logging.error(fallbackError);
      }
    } finally {
      try {
        await activateExportState(originalState, tabGroups, store);
      } catch (restoreError) {
        logging.error(restoreError);
      }
      overlay?.destroy();
    }
    logEvent?.(LOG_ACTIONS_DASHBOARD_DOWNLOAD_AS_PDF);
  };

  const onDownloadImage = async (e: SyntheticEvent) => {
    try {
      downloadAsImage(SCREENSHOT_NODE_SELECTOR, dashboardTitle, true)(e);
    } catch (error) {
      logging.error(error);
      addDangerToast(t('Sorry, something went wrong. Try again later.'));
    }
    logEvent?.(LOG_ACTIONS_DASHBOARD_DOWNLOAD_AS_IMAGE);
  };

  const children: MenuItem[] = [
    {
      key: 'download-pdf',
      label: pdfMenuItemTitle,
      onClick: (e: any) => onDownloadCurrentPdf(e.domEvent),
    },
    {
      key: 'download-full-pdf',
      label: t('Save full dashboard as PDF'),
      onClick: (e: any) => onDownloadFullPdf(e.domEvent),
    },
    isWebDriverScreenshotEnabled
      ? {
          key: DownloadScreenshotFormat.PNG,
          label: imageMenuItemTitle,
          onClick: () => downloadScreenshot(DownloadScreenshotFormat.PNG),
        }
      : {
          key: 'download-image',
          label: imageMenuItemTitle,
          onClick: (e: any) => onDownloadImage(e.domEvent),
        },
  ];

  return {
    key: MenuKeys.Download,
    type: 'submenu',
    label: title,
    disabled,
    children,
  };
};
