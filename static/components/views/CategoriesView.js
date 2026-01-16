/**
 * CategoriesView Component
 *
 * Displays category management interface
 * Manages its own modals: categoryEditModal, categoryDeleteModal
 * Uses contexts directly for all data and actions
 */

import React from 'https://esm.sh/react@18.2.0';
import { Table, MobileOptionsPopover, Button, IconButton } from '../common/index.js';
import { categoryColorToHex } from '../../utils/index.js';
import { useModal, useTableState } from '../../hooks/index.js';
import { useStaticData } from '../../contexts/StaticDataContext.js';
import { useDataFetch } from '../../contexts/DataFetchContext.js';
import { useActions } from '../../contexts/ActionsContext.js';
import CategoryModal from '../modals/CategoryModal.js';
import DeleteCategoryModal from '../modals/DeleteCategoryModal.js';

const { createElement: h, useState, useEffect, useCallback } = React;

/**
 * Categories view component - now uses contexts directly
 */
const CategoriesView = () => {
  // Get data from contexts
  const { dataCategories, dataLoaded } = useStaticData();
  const { fetchCategories } = useDataFetch();
  const actions = useActions();

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Use table state hook for sorting and pagination (no text filtering)
  const {
    sortedData: sortedCategories,
    paginatedData,
    sortConfig,
    onSortChange,
    page,
    pageSize,
    pagesCount,
    onPageChange,
    onPageSizeChange
  } = useTableState({
    data: dataCategories,
    viewKey: 'categories',
    defaultSort: { sortBy: 'id', sortDirection: 'asc' }
  });

  // Local state (was in CategoryContext, but only used by this view)
  const [categoryFormData, setCategoryFormData] = useState({
    title: '',
    path: '',
    color: 0xCCCCCC,
    comment: '',
    priority: 0
  });

  // Aliases for readability
  const categories = dataCategories;
  const categoryState = { formData: categoryFormData }; // For modal compatibility

  const [error, setError] = useState(null);

  // Modal state management
  const { modal: categoryEditModal, open: openCategoryEditModal, close: closeCategoryEditModal } = useModal({
    mode: 'create',
    category: null
  });

  const { modal: categoryDeleteModal, open: openCategoryDeleteModal, close: closeCategoryDeleteModal } = useModal({
    categoryId: null,
    categoryName: ''
  });

  // Modal handlers
  const handleCreateCategory = () => {
    // Reset form data for new category
    setCategoryFormData({
      title: '',
      path: '',
      color: 0xCCCCCC,
      comment: '',
      priority: 0
    });
    openCategoryEditModal({ mode: 'create', category: null });
  };

  const handleEditCategory = (category) => {
    // Set form data from existing category
    setCategoryFormData({
      title: category.title,
      path: category.path || '',
      color: category.color,
      comment: category.comment || '',
      priority: category.priority
    });
    openCategoryEditModal({ mode: 'edit', category });
  };

  const handleDeleteCategory = (categoryId, categoryName) => {
    openCategoryDeleteModal({ categoryId, categoryName });
  };

  const handleCategoryCreate = (...args) => {
    actions.categories.create(...args);
    closeCategoryEditModal();
  };

  const handleCategoryUpdate = (...args) => {
    actions.categories.update(...args);
    closeCategoryEditModal();
  };

  const handleCategoryDeleteConfirm = () => {
    actions.categories.delete(categoryDeleteModal.categoryId);
    closeCategoryDeleteModal();
  };
  const priorityMap = {
    0: { label: 'Normal', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' },
    1: { label: 'High', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
    2: { label: 'Low', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    3: { label: 'Auto', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' }
  };

  const columns = [
    {
      label: 'ID',
      key: 'id',
      sortable: true,
      width: '80px',
      render: (item) => h('span', { className: 'font-mono text-sm' }, item.id.toString())
    },
    {
      label: 'Title',
      key: 'title',
      sortable: true,
      width: 'auto',
      render: (item) => h('div', { className: 'font-medium flex items-center gap-2' },
        h('div', {
          className: 'w-4 h-4 rounded border border-gray-300 dark:border-gray-600',
          style: { backgroundColor: categoryColorToHex(item.color) }
        }),
        item.title
      )
    },
    {
      label: 'Path',
      key: 'path',
      sortable: true,
      width: '250px',
      render: (item) => h('div', {
        className: 'text-sm text-gray-600 dark:text-gray-400 truncate font-mono',
        title: item.path
      }, item.path || '(default path)')
    },
    {
      label: 'Comment',
      key: 'comment',
      sortable: true,
      width: '200px',
      render: (item) => h('div', { className: 'text-sm truncate', title: item.comment },
        item.comment || '-'
      )
    },
    {
      label: 'Priority',
      key: 'priority',
      sortable: true,
      width: '100px',
      render: (item) => {
        const p = priorityMap[item.priority] || priorityMap[0];
        return h('span', {
          className: `px-2 py-1 rounded text-xs font-medium ${p.color}`
        }, p.label);
      }
    },
    {
      label: 'Actions',
      key: 'actions',
      sortable: false,
      width: '150px',
      render: (item) => h('div', { className: 'flex gap-2' },
          item.id !== 0 && h(Button, {
          variant: 'primary',
          icon: 'edit',
          iconSize: 14,
          onClick: () => handleEditCategory(item),
          className: 'h-8 text-sm'
        }, 'Edit'),
        item.id !== 0 && h(Button, {
          variant: 'danger',
          icon: 'trash',
          iconSize: 14,
          onClick: () => handleDeleteCategory(item.id, item.title),
          className: 'h-8 text-sm'
        }, 'Delete')
      )
    }
  ];

  // Mobile card renderer
  const renderMobileCard = useCallback((item) => {
    return h('div', {
      className: 'rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700'
    },
      // Header with title, color indicator, and action buttons
      h('div', { className: 'flex items-center justify-between gap-2 p-2 bg-gray-100 dark:bg-gray-700/70' },
        h('div', { className: 'flex items-center gap-2 flex-1 min-w-0' },
          h('div', {
            className: 'w-4 h-4 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0',
            style: { backgroundColor: categoryColorToHex(item.color) }
          }),
          h('div', { className: 'flex-1 min-w-0' },
            h('div', { className: 'font-medium text-base text-gray-900 dark:text-gray-100 truncate' },
              item.title
            ),
            h('div', { className: 'text-xs text-gray-500 dark:text-gray-400' },
              `ID: ${item.id}`
            )
          )
        ),
        // Action buttons on the right
        h('div', { className: 'flex gap-1 flex-shrink-0' },
          h(IconButton, {
            variant: 'primary',
            icon: 'edit',
            iconSize: 16,
            onClick: () => handleEditCategory(item),
            title: 'Edit category',
            className: 'w-8 h-8'
          }),
          item.id !== 0 && h(IconButton, {
            variant: 'danger',
            icon: 'trash',
            iconSize: 16,
            onClick: () => handleDeleteCategory(item.id, item.title),
            title: 'Delete category',
            className: 'w-8 h-8'
          })
        )
      ),
      // Body with details
      h('div', { className: 'p-2 space-y-1 text-xs bg-white dark:bg-gray-800' },
        // Path
        h('div', { className: 'text-gray-700 dark:text-gray-300' },
          h('span', { className: 'font-medium text-gray-600 dark:text-gray-400' }, 'Path: '),
          h('span', { className: 'font-mono' }, item.path || '(default path)')
        ),
        // Comment (only show if present)
        item.comment && h('div', { className: 'text-gray-700 dark:text-gray-300' },
          h('span', { className: 'font-medium text-gray-600 dark:text-gray-400' }, 'Comment: '),
          h('span', null, item.comment)
        ),
        // Priority
        h('div', { className: 'text-gray-700 dark:text-gray-300' },
          h('span', { className: 'font-medium text-gray-600 dark:text-gray-400' }, 'Priority: '),
          h('span', {
            className: `px-2 py-0.5 rounded text-xs font-medium ${(priorityMap[item.priority] || priorityMap[0]).color}`
          }, (priorityMap[item.priority] || priorityMap[0]).label)
        )
      )
    );
  }, [handleEditCategory, handleDeleteCategory, priorityMap]);

  return h('div', { className: 'space-y-2 sm:space-y-3' },
    // Header with title + compact controls
    h('div', { className: 'flex items-center gap-2 pl-1 lg:pl-2' },
      h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' },
        `Categories (${categories.length})`
      ),
      h('div', { className: 'flex-1' }), // Spacer
      categories.length > 0 && h('div', { className: 'lg:hidden' },
        h(MobileOptionsPopover, {
          columns,
          sortBy: sortConfig.sortBy,
          sortDirection: sortConfig.sortDirection,
          onSortChange
        })
      ),
      h(Button, {
        variant: 'success',
        onClick: handleCreateCategory,
        icon: 'plus'
      }, 'New Category')
    ),

    categories.length === 0
      ? h('div', { className: 'text-center py-8 text-gray-500 dark:text-gray-400' },
          !dataLoaded.categories ? 'Loading categories...' : 'No categories found. Create one to get started!'
        )
      : h(Table, {
          data: sortedCategories,
          columns,
          actions: null,
          currentSortBy: sortConfig.sortBy,
          currentSortDirection: sortConfig.sortDirection,
          onSortChange,
          page,
          onPageChange,
          pageSize,
          onPageSizeChange,
          getRowKey: (item) => `cat-${item.id}`,
          breakpoint: 'lg',
          mobileCardRender: renderMobileCard
        }),

    // Modals
    h(CategoryModal, {
      show: categoryEditModal.show,
      mode: categoryEditModal.mode,
      category: categoryEditModal.category,
      formData: categoryState.formData,
      onFormDataChange: setCategoryFormData,
      onCreate: handleCategoryCreate,
      onUpdate: handleCategoryUpdate,
      onClose: closeCategoryEditModal,
      setError
    }),

    h(DeleteCategoryModal, {
      show: categoryDeleteModal.show,
      categoryId: categoryDeleteModal.categoryId,
      categoryName: categoryDeleteModal.categoryName,
      onConfirm: handleCategoryDeleteConfirm,
      onClose: closeCategoryDeleteModal
    })
  );
};

export default CategoriesView;
