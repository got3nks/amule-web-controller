/**
 * CategoryModal Component
 *
 * Modal for creating and editing categories
 */

import React from 'https://esm.sh/react@18.2.0';
import { categoryColorToHex, hexToCategoryColor } from '../../utils/index.js';
import Portal from '../common/Portal.js';
import { Button, Input, Select, AlertBox, IconButton } from '../common/index.js';
import { ConfigField } from '../settings/index.js';
import { useStaticData } from '../../contexts/StaticDataContext.js';
import { useModal } from '../../hooks/useModal.js';
import DirectoryBrowserModal from './DirectoryBrowserModal.js';
import { CLIENT_NAMES } from '../../utils/constants.js';

const { createElement: h, useState, useEffect, useCallback, useRef, useMemo } = React;

// Debounce delay for path validation (ms)
const PATH_CHECK_DEBOUNCE = 500;

/**
 * Category create/edit modal
 * @param {boolean} show - Whether to show the modal
 * @param {string} mode - 'create' or 'edit'
 * @param {object} category - Category object (for edit mode)
 * @param {object} formData - Form data state
 * @param {function} onFormDataChange - Form data change handler
 * @param {function} onCreate - Create handler
 * @param {function} onUpdate - Update handler
 * @param {function} onClose - Close handler
 * @param {function} setError - Error setter function
 * @param {boolean} isDocker - Whether running in Docker
 */
const CategoryModal = ({
  show,
  mode,
  category,
  formData,
  onFormDataChange,
  onCreate,
  onUpdate,
  onClose,
  setError,
  isDocker = false
}) => {
  // Get default paths and instance metadata from StaticData
  const { clientDefaultPaths, instances } = useStaticData();

  // Build dynamic mapping entries from connected instances
  // Single-instance types use clientType as key (backward compat), multi-instance use instanceId
  const mappingEntries = useMemo(() => {
    const entries = [];
    const typeInstances = {};

    for (const [id, inst] of Object.entries(instances)) {
      if (!inst.connected) continue;
      if (!typeInstances[inst.type]) typeInstances[inst.type] = [];
      typeInstances[inst.type].push({ instanceId: id, name: inst.name, color: inst.color, capabilities: inst.capabilities });
    }

    for (const [type, insts] of Object.entries(typeInstances)) {
      if (insts.length === 1) {
        entries.push({
          key: type,
          instanceId: insts[0].instanceId,
          type,
          label: insts[0].name || CLIENT_NAMES[type]?.name || type,
          isMulti: false,
          hasNativeMove: !!insts[0].capabilities?.nativeMove
        });
      } else {
        for (const inst of insts) {
          entries.push({
            key: inst.instanceId,
            instanceId: inst.instanceId,
            type,
            label: inst.name,
            color: inst.color,
            isMulti: true,
            hasNativeMove: !!inst.capabilities?.nativeMove
          });
        }
      }
    }

    return entries;
  }, [instances]);

  const hasAnyClient = mappingEntries.length > 0;
  const nonNativeMoveEntries = useMemo(() => mappingEntries.filter(e => !e.hasNativeMove), [mappingEntries]);
  const hasNativeMoveEntries = mappingEntries.some(e => e.hasNativeMove);

  // Local state for path mapping
  const [enablePathMapping, setEnablePathMapping] = useState(false);
  const [pathMappings, setPathMappings] = useState({});

  // Path permission warning state
  const [pathWarning, setPathWarning] = useState(null);
  const [mappingWarnings, setMappingWarnings] = useState({});

  // Track if we're in the initialization phase (to prevent clearing warnings on init)
  const isInitializingRef = useRef(false);

  // Debounce timers for path validation
  const pathDebounceRef = useRef(null);
  const mappingDebounceRefs = useRef({});

  // Directory browser modal state
  const {
    modal: browserModal,
    open: openBrowserModal,
    close: closeBrowserModal
  } = useModal({ target: null, initialPath: '' });

  // Handle path mapping changes
  const handleMappingChange = useCallback((key, value) => {
    setPathMappings(prev => ({ ...prev, [key]: value }));
    // Clear warning immediately when value changes
    setMappingWarnings(prev => {
      if (prev[key] === null || prev[key] === undefined) return prev;
      return { ...prev, [key]: null };
    });
  }, []);

  // Check path permissions (called on blur or after debounce)
  const checkPathPermissionsImmediate = useCallback(async (pathToCheck, warningKey = null) => {
    const setWarning = warningKey
      ? (msg) => setMappingWarnings(prev => ({ ...prev, [warningKey]: msg }))
      : setPathWarning;

    if (!pathToCheck?.trim()) {
      setWarning(null);
      return;
    }

    try {
      const res = await fetch('/api/config/check-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathToCheck.trim() })
      });

      if (res.ok) {
        const result = await res.json();
        if (!result.exists) {
          const dockerHint = result.isDocker
            ? ' When running in Docker, ensure the path is mounted as a volume or enable path mapping below.'
            : '';
          setWarning(`Directory not found. The app won't be able to manage files in this location.${dockerHint}`);
        } else if (!result.readable || !result.writable) {
          const missing = [];
          if (!result.readable) missing.push('read');
          if (!result.writable) missing.push('write');
          const dockerHint = result.isDocker
            ? ' When running in Docker, check the volume mount permissions.'
            : '';
          setWarning(`Missing ${missing.join(' and ')} permission. The app won't be able to manage files in this location.${dockerHint}`);
        } else {
          setWarning(null);
        }
      }
    } catch (err) {
      // Silently fail - don't block the user
      console.error('Failed to check path:', err);
    }
  }, []);

  // Debounced path permission check - waits until user stops typing
  const checkPathPermissionsDebounced = useCallback((pathToCheck, warningKey = null) => {
    if (warningKey) {
      if (mappingDebounceRefs.current[warningKey]) {
        clearTimeout(mappingDebounceRefs.current[warningKey]);
      }
      mappingDebounceRefs.current[warningKey] = setTimeout(() => {
        checkPathPermissionsImmediate(pathToCheck, warningKey);
        delete mappingDebounceRefs.current[warningKey];
      }, PATH_CHECK_DEBOUNCE);
    } else {
      if (pathDebounceRef.current) {
        clearTimeout(pathDebounceRef.current);
      }
      pathDebounceRef.current = setTimeout(() => {
        checkPathPermissionsImmediate(pathToCheck, warningKey);
        pathDebounceRef.current = null;
      }, PATH_CHECK_DEBOUNCE);
    }
  }, [checkPathPermissionsImmediate]);

  // Immediate check (for blur and browser selection)
  const checkPathPermissions = useCallback((pathToCheck, warningKey = null) => {
    // Cancel any pending debounced check
    if (warningKey) {
      if (mappingDebounceRefs.current[warningKey]) {
        clearTimeout(mappingDebounceRefs.current[warningKey]);
        delete mappingDebounceRefs.current[warningKey];
      }
    } else {
      if (pathDebounceRef.current) {
        clearTimeout(pathDebounceRef.current);
        pathDebounceRef.current = null;
      }
    }

    // Check immediately
    checkPathPermissionsImmediate(pathToCheck, warningKey);
  }, [checkPathPermissionsImmediate]);

  // Handle path selection from browser
  const handlePathSelected = useCallback((selectedPath) => {
    if (browserModal.target === 'path') {
      onFormDataChange({ ...formData, path: selectedPath });
      // Check path permissions immediately after selection
      checkPathPermissions(selectedPath);
    } else {
      // Target is a mapping entry key (clientType or instanceId)
      handleMappingChange(browserModal.target, selectedPath);
      checkPathPermissions(selectedPath, browserModal.target);
    }
  }, [browserModal.target, formData, onFormDataChange, handleMappingChange, checkPathPermissions]);

  // Cleanup debounce timers when modal closes
  useEffect(() => {
    if (!show) {
      if (pathDebounceRef.current) clearTimeout(pathDebounceRef.current);
      for (const timer of Object.values(mappingDebounceRefs.current)) {
        clearTimeout(timer);
      }
      mappingDebounceRefs.current = {};
    }
  }, [show]);

  // Initialize path mapping state and warnings when modal opens or category changes
  useEffect(() => {
    if (show) {
      // Mark as initializing to prevent clear effects from wiping warnings
      isInitializingRef.current = true;

      if (category?.pathMappings) {
        setEnablePathMapping(true);
        const initial = {};
        const usedTypeFallbacks = new Set();
        for (const entry of mappingEntries) {
          if (entry.hasNativeMove) continue;
          // Try exact key first
          let val = category.pathMappings[entry.key];
          // Migration fallback: if entry uses instanceId key and not found, try clientType key
          // Only give the fallback to the first instance of that type
          if (!val && entry.isMulti && !usedTypeFallbacks.has(entry.type)) {
            val = category.pathMappings[entry.type];
            if (val) usedTypeFallbacks.add(entry.type);
          }
          initial[entry.key] = val || '';
        }
        setPathMappings(initial);
      } else {
        setEnablePathMapping(false);
        const empty = {};
        for (const entry of mappingEntries) {
          if (entry.hasNativeMove) continue;
          empty[entry.key] = '';
        }
        setPathMappings(empty);
      }

      // Reset warnings - will be re-checked via API below
      setPathWarning(null);
      setMappingWarnings({});

      // Clear initialization flag after a tick (after clear effects have run)
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 0);
    }
  }, [show, category, mappingEntries]);

  // Re-check path permissions when modal opens (to get fresh warnings with Docker hints)
  // Note: Only runs on modal open, not on every path keystroke
  useEffect(() => {
    if (show && mode === 'edit' && category) {
      const isDefaultCategory = category.name === 'Default' || category.title === 'Default';
      // Build set of keys for native-move clients (no path mapping needed)
      const nativeMoveKeys = new Set(mappingEntries.filter(e => e.hasNativeMove).map(e => e.key));
      // Check for any non-native-move path mapping
      const hasPathMappings = category.pathMappings &&
        Object.entries(category.pathMappings).some(([k, v]) => v && !nativeMoveKeys.has(k));

      // Check main path (only for non-Default categories without path mapping)
      // Use category.path (original value) not formData.path to avoid re-running on every keystroke
      if (!isDefaultCategory && category.path?.trim() && !hasPathMappings) {
        checkPathPermissions(category.path);
      }

      // Check path mappings if enabled (native-move clients excluded)
      if (hasPathMappings) {
        for (const [key, val] of Object.entries(category.pathMappings)) {
          if (val && !nativeMoveKeys.has(key)) {
            checkPathPermissions(val, key);
          }
        }
      }
    }
  }, [show, mode, category, checkPathPermissions]);

  // Reset path mapping when path is cleared (for non-Default categories)
  useEffect(() => {
    const isDefaultCategory = category?.name === 'Default' || category?.title === 'Default';
    if (!isDefaultCategory && !formData.path?.trim()) {
      setEnablePathMapping(false);
      const empty = {};
      for (const entry of mappingEntries) {
        if (!entry.hasNativeMove) empty[entry.key] = '';
      }
      setPathMappings(empty);
    }
  }, [formData.path, category, mappingEntries]);

  // Clear main path warning when path changes or path mapping is toggled (but not during initialization)
  useEffect(() => {
    if (!isInitializingRef.current) {
      setPathWarning(null);
    }
  }, [formData.path, enablePathMapping]);

  if (!show) return null;

  const isEdit = mode === 'edit';
  const isDefault = isEdit && (category?.name === 'Default' || category?.title === 'Default');
  // Show path mapping section only for Default category or when a custom path is specified
  const showPathMapping = isDefault || !!formData.path?.trim();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Category title is required');
      return;
    }

    // Build pathMappings object if enabled (and path mapping section is visible)
    let finalPathMappings = null;
    const canHavePathMapping = isDefault || !!formData.path?.trim();
    if (enablePathMapping && canHavePathMapping) {
      const mappings = {};
      for (const entry of nonNativeMoveEntries) {
        const val = pathMappings[entry.key]?.trim();
        if (val) {
          mappings[entry.key] = val;
        }
      }
      if (Object.keys(mappings).length > 0) {
        finalPathMappings = mappings;
      }
    }

    if (isEdit) {
      onUpdate(
        category.name,
        formData.title,
        formData.path,
        formData.comment,
        formData.color,
        formData.priority,
        finalPathMappings
      );
    } else {
      onCreate(
        formData.title,
        formData.path,
        formData.comment,
        formData.color,
        formData.priority,
        finalPathMappings
      );
    }
  };

  return h(Portal, null,
    h('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-2 sm:p-4',
      onClick: onClose
    },
      h('div', {
        className: 'modal-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden',
        onClick: (e) => e.stopPropagation()
      },
      // Header
      h('div', { className: 'p-3 sm:p-4 pb-0' },
        h('h3', { className: 'text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100' },
          isEdit ? 'Edit Category' : 'Create New Category'
        )
      ),
      // Scrollable content
      h('div', { className: 'flex-1 overflow-y-auto p-3 sm:p-4' },
      h('form', { onSubmit: handleSubmit, className: 'space-y-3 sm:space-y-4' },
        // Title (not editable for Default category)
        h(ConfigField, {
          label: 'Title',
          description: isDefault ? 'The Default category cannot be renamed' : undefined,
          value: formData.title,
          onChange: (value) => onFormDataChange({ ...formData, title: value }),
          placeholder: 'e.g., Movies, Music, Software',
          required: true,
          disabled: isDefault
        }),

        // Comment
        h(ConfigField, {
          label: 'Comment',
          value: formData.comment,
          onChange: (value) => onFormDataChange({ ...formData, comment: value }),
          placeholder: 'Optional description'
        }),

        // Color
        h(ConfigField, { label: 'Color' },
          h('div', { className: 'flex items-center' },
            h('input', {
              type: 'color',
              value: categoryColorToHex(formData.color),
              onChange: (e) => {
                onFormDataChange({ ...formData, color: hexToCategoryColor(e.target.value) });
              },
              className: 'w-10 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600'
            })
          )
        ),

        // Priority (not editable for Default category)
        h(ConfigField, {
          label: 'Priority',
          description: isDefault ? 'Priority is managed by each client for the Default category' : undefined,
          disabled: isDefault
        },
          h(Select, {
            value: formData.priority,
            onChange: (e) => onFormDataChange({ ...formData, priority: parseInt(e.target.value) }),
            options: [
              { value: 0, label: 'Normal' },
              { value: 1, label: 'High' },
              { value: 2, label: 'Low' },
              { value: 3, label: 'Auto' }
            ],
            className: 'w-full',
            disabled: isDefault
          })
        ),

        // Separator before paths
        h('div', { className: 'border-t border-gray-200 dark:border-gray-700' }),

        // Download Path (not editable for Default category)
        h('div', null,
          h('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1' },
            'Download Path'
          ),
          isDefault
            ? h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm text-gray-600 dark:text-gray-400 italic' },
                  'Each client uses its own configured default path:'
                ),
                mappingEntries.map(entry =>
                  h('div', { key: entry.key, className: 'flex items-center gap-2 text-sm' },
                    entry.isMulti && entry.color && h('span', {
                      className: 'w-2 h-2 rounded-full flex-shrink-0',
                      style: { backgroundColor: entry.color }
                    }),
                    h('span', { className: 'font-medium text-gray-500 dark:text-gray-400' },
                      `${entry.label}:`
                    ),
                    h('span', { className: 'font-mono text-gray-600 dark:text-gray-400' },
                      clientDefaultPaths?.[entry.instanceId] || '(not available)'
                    )
                  )
                )
              )
            : h('div', null,
                h('div', { className: 'flex gap-2' },
                  h(Input, {
                    type: 'text',
                    value: formData.path,
                    onChange: (e) => {
                      onFormDataChange({ ...formData, path: e.target.value });
                      // Debounced validation while typing (only when path mapping is disabled)
                      if (!enablePathMapping) {
                        checkPathPermissionsDebounced(e.target.value);
                      }
                    },
                    onBlur: enablePathMapping ? undefined : (e) => checkPathPermissions(e.target.value),
                    placeholder: '/path/to/downloads (leave empty for default)',
                    className: 'flex-1 font-mono'
                  }),
                  // Only show browse button when not in Docker (path is for download clients, not this app)
                  !isDocker && h(IconButton, {
                    type: 'button',
                    icon: 'folder',
                    variant: 'secondary',
                    onClick: () => openBrowserModal({ target: 'path', initialPath: formData.path || '/' }),
                    title: 'Browse directories'
                  })
                ),
                h('p', { className: 'text-xs text-gray-500 dark:text-gray-400 mt-1' },
                  'This is the path as seen by the download clients'
                ),
                !enablePathMapping && pathWarning && h(AlertBox, { type: 'warning', className: 'mt-2' }, pathWarning)
              )
        ),

        // Path Mapping Section (only show for Default category or when path is specified)
        showPathMapping && h('div', {},
          // Path mapping checkbox
          h('label', { className: 'flex items-center gap-2 cursor-pointer' },
            h('input', {
              type: 'checkbox',
              checked: enablePathMapping,
              onChange: (e) => setEnablePathMapping(e.target.checked),
              className: 'w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 ' +
                'dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600'
            }),
            h('span', { className: 'text-sm font-medium text-gray-700 dark:text-gray-300' },
              'Enable path mapping (for Docker/container environments)'
            )
          ),

          // Info box (show when checkbox is checked)
          enablePathMapping && h(AlertBox, { type: 'info', className: 'mt-3 mb-0' },
            h('p', { className: 'font-medium mb-1' }, 'Path Mapping'),
            h('p', { className: 'text-sm' },
              isDefault
                ? 'For Default category files, specify where this app can find each client\'s default download directory. ' +
                  'The app will use these paths when checking file permissions or deleting files.'
                : 'Use this if your download clients and this app see different paths to the same files. ' +
                  'This is common when running in Docker containers with different volume mounts. ' +
                  'Each client can have its own mapping if they use different mount points.'
            )
          ),

          // Per-client path inputs (shown when checkbox enabled)
          enablePathMapping && h('div', { className: 'mt-3 space-y-3' },
            // Non-qBittorrent entries: show path input fields
            nonNativeMoveEntries.map(entry =>
              h('div', { key: entry.key },
                h('label', { className: 'flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1' },
                  entry.isMulti && entry.color && h('span', {
                    className: 'w-2 h-2 rounded-full flex-shrink-0',
                    style: { backgroundColor: entry.color }
                  }),
                  `${entry.label} \u2192 App path`
                ),
                h('div', { className: 'flex gap-2' },
                  h(Input, {
                    type: 'text',
                    value: pathMappings[entry.key] || '',
                    onChange: (e) => {
                      handleMappingChange(entry.key, e.target.value);
                      checkPathPermissionsDebounced(e.target.value, entry.key);
                    },
                    onBlur: (e) => checkPathPermissions(e.target.value, entry.key),
                    placeholder: isDefault
                      ? `/mnt/${entry.type}-incoming`
                      : `/mnt/${entry.type}-data/category-path`,
                    className: 'flex-1 font-mono'
                  }),
                  h(IconButton, {
                    type: 'button',
                    icon: 'folder',
                    variant: 'secondary',
                    onClick: () => openBrowserModal({ target: entry.key, initialPath: pathMappings[entry.key] || '/' }),
                    title: 'Browse directories'
                  })
                ),
                h('p', { className: 'text-xs text-gray-500 dark:text-gray-400 mt-1' },
                  isDefault
                    ? `Path where this app can access ${entry.label}'s default download directory`
                    : `Path as this app sees ${entry.label} files for this category`
                ),
                mappingWarnings[entry.key] && h(AlertBox, { type: 'warning', className: 'mt-2' }, mappingWarnings[entry.key])
              )
            ),

            // Native-move clients info (shown when any client with nativeMove capability is connected)
            hasNativeMoveEntries && h('div', null,
              h('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1' },
                mappingEntries.filter(e => e.hasNativeMove).map(e => e.label).join(', '),
                ' \u2192 App path'
              ),
              h('p', { className: 'text-sm text-gray-600 dark:text-gray-400 italic' },
                'Not required \u2014 file operations use the client\'s native API.'
              )
            ),

            // Message if no clients need path mapping
            !hasAnyClient && h('p', {
              className: 'text-sm text-gray-500 dark:text-gray-400 italic'
            }, 'No download clients connected. Connect clients to configure path mappings.')
          )
        ),

      )
      ), // Close scrollable content div

      // Footer
      h('div', { className: 'p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end' },
        h(Button, {
          type: 'button',
          variant: 'secondary',
          onClick: onClose
        }, 'Cancel'),
        h(Button, {
          type: 'button',
          variant: 'primary',
          onClick: handleSubmit
        }, isEdit ? 'Update Category' : 'Create Category')
      ),

      // Directory browser modal
      h(DirectoryBrowserModal, {
        show: browserModal.show,
        initialPath: browserModal.initialPath,
        onSelect: handlePathSelected,
        onClose: closeBrowserModal,
        title: 'Select Directory'
      })
    )
  ));
};

export default CategoryModal;
