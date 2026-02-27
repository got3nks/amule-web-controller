/**
 * useClientManagement Hook
 *
 * Manages client instance CRUD operations: add, edit, remove, toggle,
 * test, and save. Also provides testAllClients for bulk testing.
 */

import { useState, useCallback } from 'https://esm.sh/react@18.2.0';
import { TYPE_LABELS } from '../components/settings/ClientInstanceModal.js';

/**
 * @param {Object} options
 * @param {Object} options.formData - Current form state
 * @param {Function} options.setFormData - Form state setter
 * @param {Function} options.setSaveError - Error state setter
 * @param {Function} options.setIsTesting - Testing state setter
 * @param {Function} options.clearTestResults - From useConfig
 * @param {Function} options.testConfig - From useConfig
 * @param {Function} options.saveConfig - From useConfig
 * @param {Function} options.fetchCurrent - From useConfig
 * @param {Function} options.buildFormData - Form data builder
 * @param {Function} options.getUnmaskedConfig - Password unmasking utility
 */
export const useClientManagement = ({
  formData, setFormData, setSaveError,
  setIsTesting, clearTestResults, testConfig, saveConfig,
  fetchCurrent, buildFormData, getUnmaskedConfig
}) => {
  const [clientModal, setClientModal] = useState({ open: false, client: null });
  const [removeConfirm, setRemoveConfirm] = useState({ open: false, clientIndex: null });
  const [clientTestResults, setClientTestResults] = useState({});

  // Shared: persist merged client config and reset UI state
  const saveClientConfig = useCallback(async (mergedFormData) => {
    const unmasked = getUnmaskedConfig(mergedFormData);
    await saveConfig({ version: '1.0', firstRunCompleted: true, ...unmasked });
    // Refetch config from server to get server-generated IDs and _fromEnv metadata
    const fresh = await fetchCurrent();
    setFormData(fresh ? buildFormData(fresh) : mergedFormData);
    setClientTestResults({});
    clearTestResults();
  }, [saveConfig, fetchCurrent, buildFormData, clearTestResults, getUnmaskedConfig, setFormData]);

  // Remove a client instance — show confirmation first
  const removeInstance = useCallback((clientIndex) => {
    setRemoveConfirm({ open: true, clientIndex });
  }, []);

  // Confirm and persist client removal
  const confirmRemoveInstance = useCallback(async () => {
    const clientIndex = removeConfirm.clientIndex;
    if (clientIndex == null) return;
    setRemoveConfirm({ open: false, clientIndex: null });
    const mergedClients = formData.clients.filter((_, i) => i !== clientIndex);
    setIsTesting(true);
    try {
      await saveClientConfig({ ...formData, clients: mergedClients });
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsTesting(false);
    }
  }, [removeConfirm.clientIndex, formData, saveClientConfig, setSaveError, setIsTesting]);

  // Move a client instance up or down in the list — auto-saves immediately
  const handleMoveClient = useCallback(async (clientIndex, direction) => {
    const targetIndex = clientIndex + direction;
    if (targetIndex < 0 || targetIndex >= formData.clients.length) return;
    const mergedClients = [...formData.clients];
    [mergedClients[clientIndex], mergedClients[targetIndex]] = [mergedClients[targetIndex], mergedClients[clientIndex]];
    setIsTesting(true);
    try {
      await saveClientConfig({ ...formData, clients: mergedClients });
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsTesting(false);
    }
  }, [formData, saveClientConfig, setSaveError, setIsTesting]);

  // Toggle client enable/disable directly from card — auto-saves immediately
  const handleToggleClient = useCallback(async (clientIndex, enabled) => {
    const mergedClients = formData.clients.map((c, i) =>
      i === clientIndex ? { ...c, enabled } : c
    );
    if (!mergedClients.some(c => c.enabled !== false)) {
      setSaveError('At least one download client must be enabled.');
      return;
    }
    setIsTesting(true);
    try {
      await saveClientConfig({ ...formData, clients: mergedClients });
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsTesting(false);
    }
  }, [formData, saveClientConfig, setSaveError, setIsTesting]);

  // Open edit modal for existing client
  const handleEditClient = useCallback((clientIndex) => {
    setClientModal({ open: true, client: { ...formData.clients[clientIndex], _index: clientIndex } });
  }, [formData]);

  // Open add modal (step 1: type selector)
  const handleAddClient = useCallback(() => {
    setClientModal({ open: true, client: null });
  }, []);

  // Modal test callback — tests a single client and returns the result
  const handleModalTest = useCallback(async (clientData) => {
    const idx = clientData._index ?? formData.clients.length;
    // Build unmasked config with the modal's data merged at the right index
    const mergedClients = formData.clients.map((c, i) =>
      i === clientData._index ? { ...c, ...clientData } : c
    );
    const unmasked = getUnmaskedConfig({ ...formData, clients: mergedClients });
    const config = unmasked.clients[idx] || clientData;
    const data = await testConfig({ [clientData.type]: { ...config, instanceId: clientData.id } });
    const result = data?.results?.[clientData.type];
    // Store per-index for card display after modal closes
    if (result?.success) {
      setClientTestResults(prev => ({
        ...prev,
        [idx]: { ...result, _label: `${clientData.name || TYPE_LABELS[clientData.type]} Connection` }
      }));
    }
    return result || { success: false, message: 'No test result returned' };
  }, [formData, testConfig, getUnmaskedConfig]);

  // Modal save callback — persists to config.json and triggers reconnection
  const handleClientModalSave = useCallback(async (clientData) => {
    const { _index, ...data } = clientData;
    const mergedClients = _index !== undefined
      ? formData.clients.map((c, i) => i === _index ? { ...c, ...data } : c)
      : [...formData.clients, data];
    setClientModal({ open: false, client: null });
    setIsTesting(true);
    try {
      await saveClientConfig({ ...formData, clients: mergedClients });
    } finally {
      setIsTesting(false);
    }
  }, [formData, saveClientConfig, setIsTesting]);

  // Test a specific client instance (from card Test button)
  const handleTestClient = useCallback(async (clientIndex) => {
    if (!formData) return;
    const client = formData.clients[clientIndex];
    if (!client || client.enabled === false) return;
    setIsTesting(true);
    try {
      const unmasked = getUnmaskedConfig(formData);
      const clientConfig = unmasked.clients[clientIndex];
      const data = await testConfig({
        [client.type]: { ...clientConfig, instanceId: client.id }
      });
      const result = data?.results?.[client.type];
      if (result) {
        setClientTestResults(prev => ({
          ...prev,
          [clientIndex]: { ...result, _label: `${client.name || TYPE_LABELS[client.type]} Connection` }
        }));
      }
    } catch (err) {
      // Error is handled by useConfig
    } finally {
      setIsTesting(false);
    }
  }, [formData, testConfig, getUnmaskedConfig, setIsTesting]);

  // Test all enabled client instances — returns per-index results
  const testAllClients = useCallback(async (unmasked) => {
    const results = {};
    for (let i = 0; i < formData.clients.length; i++) {
      const client = formData.clients[i];
      if (client.enabled === false) continue;
      const label = `${client.name || TYPE_LABELS[client.type]} Connection`;
      try {
        const data = await testConfig({ [client.type]: { ...unmasked.clients[i], instanceId: client.id } });
        results[i] = { ...data.results[client.type], _label: label };
      } catch {
        results[i] = { success: false, error: 'Test request failed', _label: label };
      }
    }
    setClientTestResults(results);
    return results;
  }, [formData, testConfig]);

  return {
    clientModal, setClientModal,
    removeConfirm, setRemoveConfirm,
    clientTestResults,
    saveClientConfig,
    removeInstance, confirmRemoveInstance,
    handleMoveClient, handleToggleClient, handleEditClient, handleAddClient,
    handleModalTest, handleClientModalSave, handleTestClient,
    testAllClients
  };
};
