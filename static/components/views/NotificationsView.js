/**
 * NotificationsView Component
 *
 * Page for configuring Apprise notification services and events
 */

import React from 'https://esm.sh/react@18.2.0';
import { LoadingSpinner, AlertBox, Icon, Button } from '../common/index.js';
import { ConfigSection, EnableToggle, TestResultIndicator } from '../settings/index.js';
import { EventsTable, ServiceCard, ServiceModal } from '../notifications/index.js';
import { useNotifications } from '../../hooks/useNotifications.js';

const { createElement: h, useState, useEffect, useCallback } = React;

/**
 * NotificationsView component
 */
const NotificationsView = () => {
  // State from hook
  const {
    appriseStatus,
    config,
    services,
    loading,
    error,
    testResult,
    fetchStatus,
    fetchConfig,
    saveConfig,
    fetchServices,
    addService,
    updateService,
    deleteService,
    testServices,
    clearError,
    clearTestResult
  } = useNotifications();

  // Local UI state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [localConfig, setLocalConfig] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Load data on mount
  useEffect(() => {
    fetchStatus();
    fetchConfig();
    fetchServices();
  }, []);

  // Initialize local config when data loads
  useEffect(() => {
    if (config && !localConfig) {
      setLocalConfig({ ...config });
    }
  }, [config]);

  // Handle master toggle
  const handleEnabledChange = useCallback((enabled) => {
    setLocalConfig(prev => ({ ...prev, enabled }));
    setHasChanges(true);
    setSaveSuccess(false);
    clearTestResult();
  }, [clearTestResult]);

  // Handle event toggle
  const handleEventChange = useCallback((eventKey, enabled) => {
    setLocalConfig(prev => ({
      ...prev,
      events: { ...prev.events, [eventKey]: enabled }
    }));
    setHasChanges(true);
    setSaveSuccess(false);
    clearTestResult();
  }, [clearTestResult]);

  // Save configuration
  const handleSaveConfig = async () => {
    try {
      await saveConfig(localConfig);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      // Error is handled by hook
    }
  };

  // Open add modal
  const handleAddService = () => {
    setEditingService(null);
    setModalOpen(true);
  };

  // Open edit modal
  const handleEditService = (service) => {
    setEditingService(service);
    setModalOpen(true);
  };

  // Save service (add or update)
  const handleSaveService = async (serviceData) => {
    if (serviceData.id) {
      await updateService(serviceData.id, serviceData);
    } else {
      await addService(serviceData);
    }
    setModalOpen(false);
  };

  // Toggle service enabled state
  const handleToggleService = async (id, enabled) => {
    await updateService(id, { enabled });
  };

  // Delete service
  const handleDeleteService = async (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deleteService(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  // Test service
  const handleTestService = async (id) => {
    clearTestResult();
    await testServices(id);
  };

  // Test all services
  const handleTestAll = async () => {
    clearTestResult();
    await testServices(null);
  };

  // Show loading state
  if (!localConfig) {
    if (error) {
      return h('div', { className: 'p-4' },
        h(AlertBox, { type: 'error' },
          h('p', {}, 'Failed to load notification configuration: ', error)
        )
      );
    }
    return h('div', { className: 'flex items-center justify-center h-64' },
      h(LoadingSpinner, { text: 'Loading notifications...' })
    );
  }

  const isEnabled = localConfig.enabled;
  const hasServices = services.length > 0;
  const hasEnabledServices = services.some(s => s.enabled);
  const appriseAvailable = appriseStatus?.available === true;

  return h('div', { className: 'w-full lg:w-3/4 mx-auto px-2 py-4 sm:px-4' },
    // Master enable/disable section
    h(ConfigSection, {
      title: 'Apprise Notifications',
      description: 'Send push notifications when download events occur',
      defaultOpen: true
    },
      h(EnableToggle, {
        enabled: isEnabled && appriseAvailable,
        onChange: handleEnabledChange,
        label: 'Enable Notifications',
        description: appriseAvailable && appriseStatus?.version ? appriseStatus.version : null,
        disabled: !appriseAvailable
      }),

      // Apprise not available warning
      appriseStatus && !appriseAvailable && h(AlertBox, { type: 'error', className: 'mt-4' },
        h('p', {},
          'Apprise CLI not installed. Install with: ',
          h('code', { className: 'bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded text-xs' }, 'pipx install apprise'),
          ' or ',
          h('code', { className: 'bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded text-xs' }, 'brew install apprise')
        )
      ),

      !isEnabled && appriseAvailable && h(AlertBox, { type: 'info', className: 'mt-4' },
        h('p', {}, 'Enable notifications to configure services and events.')
      )
    ),

    // Events section (only when enabled)
    isEnabled && h(ConfigSection, {
      title: 'Events',
      description: 'Choose which events trigger notifications',
      defaultOpen: true
    },
      h(EventsTable, {
        events: localConfig.events,
        onEventChange: handleEventChange
      })
    ),

    // Services section (only when enabled)
    isEnabled && h(ConfigSection, {
      title: 'Notification Services',
      description: 'Configure where notifications are sent',
      defaultOpen: true
    },
      // Services grid
      h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4' },
        hasServices && services.map(service =>
          h(ServiceCard, {
            key: service.id,
            service,
            onEdit: handleEditService,
            onDelete: handleDeleteService,
            onTest: handleTestService,
            onToggle: handleToggleService,
            loading
          })
        ),

        // Add service card
        h('button', {
          onClick: handleAddService,
          disabled: loading,
          className: 'border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors md:min-h-[160px] disabled:opacity-50 disabled:cursor-not-allowed'
        },
          h(Icon, { name: 'plus', size: 24 }),
          h('span', { className: 'text-sm font-medium' }, 'Add Service')
        )
      ),

      !hasServices && h(AlertBox, { type: 'info', className: 'mb-4' },
        h('p', {}, 'No notification services configured. Add a service to start receiving notifications.')
      )
    ),

    // Test result
    testResult && h('div', { className: 'mt-4' },
      h(TestResultIndicator, {
        result: testResult,
        label: 'Notification Test'
      })
    ),

    // Error message
    error && h(AlertBox, { type: 'error', className: 'mt-4' },
      h('p', {}, error)
    ),

    // Success message
    saveSuccess && h(AlertBox, { type: 'success', className: 'mt-4' },
      h('p', {}, 'Configuration saved successfully!')
    ),

    // Action buttons (always visible, muted when disabled)
    h('div', { className: 'flex gap-3 mt-6 pb-4' },
      h('button', {
        onClick: handleTestAll,
        disabled: !isEnabled || !hasServices || !hasEnabledServices || loading,
        className: `flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium rounded-lg
          ${!isEnabled || !hasServices || !hasEnabledServices || loading
            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'}
          transition-colors`
      }, h('span', { className: 'flex items-center justify-center gap-1.5' },
        h(Icon, { name: 'bell', size: 15 }),
        loading ? 'Testing...' : 'Test All Notifications'
      )),
      h('button', {
        onClick: handleSaveConfig,
        disabled: !hasChanges || loading,
        className: `flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium rounded-lg
          ${!hasChanges || loading
            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 text-white'}
          transition-colors`
      }, h('span', { className: 'flex items-center justify-center gap-1.5' },
        h(Icon, { name: 'check', size: 15 }),
        loading ? 'Saving...' : 'Save Changes'
      )),
      h('button', {
        onClick: () => {
          setLocalConfig({ ...config });
          setHasChanges(false);
          clearError();
        },
        disabled: loading,
        className: 'flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors'
      }, h('span', { className: 'flex items-center justify-center gap-1.5' },
        h(Icon, { name: 'x', size: 15 }),
        'Cancel'
      ))
    ),

    // Service modal
    h(ServiceModal, {
      isOpen: modalOpen,
      onClose: () => setModalOpen(false),
      onSave: handleSaveService,
      editService: editingService
    }),

    // Delete confirmation modal
    deleteConfirm && h('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50',
      onClick: () => setDeleteConfirm(null)
    },
      h('div', {
        className: 'w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6',
        onClick: (e) => e.stopPropagation()
      },
        h('h3', { className: 'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2' },
          'Delete Service?'
        ),
        h('p', { className: 'text-gray-600 dark:text-gray-400 mb-6' },
          'This action cannot be undone.'
        ),
        h('div', { className: 'flex gap-3 justify-end' },
          h('button', {
            onClick: () => setDeleteConfirm(null),
            className: 'px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors'
          }, 'Cancel'),
          h('button', {
            onClick: confirmDelete,
            disabled: loading,
            className: 'px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors'
          }, 'Delete')
        )
      )
    )
  );
};

export default NotificationsView;
