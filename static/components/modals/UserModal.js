/**
 * UserModal Component
 *
 * Modal for creating and editing user accounts.
 * Includes capability checkboxes with presets and admin toggle.
 */

import React from 'https://esm.sh/react@18.2.0';
import Portal from '../common/Portal.js';
import { Button, Input, AlertBox, Icon } from '../common/index.js';
import { ConfigField, PasswordField, EnableToggle } from '../settings/index.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { validatePassword } from '../../utils/passwordValidator.js';
import { ALL_CAPABILITIES, CAPABILITY_LABELS, CAPABILITY_GROUPS, PRESETS, detectPreset } from '../../utils/capabilities.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';

const { createElement: h, useState, useEffect, useCallback } = React;

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,32}$/;

/**
 * @param {boolean} show
 * @param {'create'|'edit'} mode
 * @param {object} user - User object (edit mode)
 * @param {function} onSave - async (userData) => void
 * @param {function} onClose
 * @param {function} onRegenerateApiKey - async (userId) => newKey
 */
const UserModal = ({ show, mode = 'create', user, onSave, onClose, onRegenerateApiKey }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [capabilities, setCapabilities] = useState([]);
  const [preset, setPreset] = useState('full');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const debouncedPassword = useDebouncedValue(password);

  // Initialize form when modal opens or user changes
  useEffect(() => {
    if (!show) return;
    if (mode === 'edit' && user) {
      setUsername(user.username);
      setPassword('');
      setIsAdmin(!!user.isAdmin);
      setEnabled(!user.disabled);
      const caps = user.isAdmin ? PRESETS.full.slice() : (user.capabilities || []);
      setCapabilities(caps);
      setPreset(user.isAdmin ? 'full' : detectPreset(caps));
      setApiKey(user.apiKey || null);
    } else {
      setUsername('');
      setPassword('');
      setIsAdmin(false);
      setEnabled(true);
      setCapabilities(PRESETS.full.slice());
      setPreset('full');
      setApiKey(null);
    }
    setError('');
    setSaving(false);
    setApiKeyCopied(false);
    setRegenerating(false);
  }, [show, mode, user]);

  const handlePresetChange = useCallback((newPreset) => {
    setPreset(newPreset);
    if (newPreset === 'full') setCapabilities(PRESETS.full.slice());
    else if (newPreset === 'readonly') setCapabilities(PRESETS.readonly.slice());
    // 'custom' keeps current caps
  }, []);

  const toggleCapability = useCallback((cap) => {
    setCapabilities(prev => {
      let next;
      if (prev.includes(cap)) {
        next = prev.filter(c => c !== cap);
        // Remove edit_all_downloads if view_all_downloads removed
        if (cap === 'view_all_downloads') {
          next = next.filter(c => c !== 'edit_all_downloads');
        }
      } else {
        next = [...prev, cap];
        // Auto-add view_all_downloads when adding edit_all_downloads
        if (cap === 'edit_all_downloads' && !next.includes('view_all_downloads')) {
          next.push('view_all_downloads');
        }
      }
      setPreset(detectPreset(next));
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setError('');

    if (!USERNAME_REGEX.test(username)) {
      setError('Username must be 3-32 alphanumeric or underscore characters');
      return;
    }

    if (mode === 'create') {
      if (!password) {
        setError('Password is required');
        return;
      }
      const pwErrors = validatePassword(password);
      if (pwErrors.length > 0) {
        setError(pwErrors.join('; '));
        return;
      }
    }

    if (mode === 'edit' && password) {
      const pwErrors = validatePassword(password);
      if (pwErrors.length > 0) {
        setError(pwErrors.join('; '));
        return;
      }
    }

    setSaving(true);
    try {
      const data = {
        username,
        ...(mode === 'edit' ? { id: user.id } : {}),
        ...(password ? { password } : {}),
        isAdmin,
        disabled: !enabled,
        capabilities: isAdmin ? [] : capabilities
      };
      await onSave(data);
    } catch (err) {
      setError(err.message || 'Failed to save user');
      setSaving(false);
    }
  }, [mode, username, password, isAdmin, enabled, capabilities, user, onSave]);

  const handleCopyApiKey = useCallback(async () => {
    if (apiKey) {
      const ok = await copyToClipboard(apiKey);
      if (ok) {
        setApiKeyCopied(true);
        setTimeout(() => setApiKeyCopied(false), 2000);
      }
    }
  }, [apiKey]);

  const handleRegenerateApiKey = useCallback(async () => {
    if (!onRegenerateApiKey || !user) return;
    setRegenerating(true);
    try {
      const newKey = await onRegenerateApiKey(user.id);
      setApiKey(newKey);
    } catch (err) {
      setError(err.message || 'Failed to regenerate API key');
    } finally {
      setRegenerating(false);
    }
  }, [onRegenerateApiKey, user]);

  if (!show) return null;

  const isEdit = mode === 'edit';
  const title = isEdit ? `Edit User: ${user?.username}` : 'Create User';

  return h(Portal, null,
    h('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50',
      onClick: onClose
    },
      h('div', {
        className: 'modal-full w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden flex flex-col',
        onClick: (e) => e.stopPropagation()
      },
        // Header
        h('div', { className: 'px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between' },
          h('h2', { className: 'text-lg font-semibold text-gray-900 dark:text-gray-100' }, title),
          h('button', {
            onClick: onClose,
            className: 'p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
          }, h(Icon, { name: 'x', size: 20, className: 'text-gray-500' }))
        ),

        // Body
        h('div', { className: 'px-6 py-4 space-y-4 flex-1 overflow-y-auto' },
          // Enabled toggle (edit mode only, shown at top)
          isEdit && h(EnableToggle, {
            enabled,
            onChange: setEnabled,
            label: 'Enabled',
            description: 'Disabled users cannot log in'
          }),

          // Username
          h(ConfigField, {
            label: 'Username',
            description: '3-32 characters, letters/numbers/underscores only',
            value: username,
            onChange: (value) => setUsername(value),
            placeholder: 'username',
            required: true
          }),

          // Password
          h(ConfigField, {
            label: isEdit ? 'New Password' : 'Password',
            description: isEdit && user && !user.hasPassword
              ? 'SSO-only user — set a password to allow form login'
              : undefined,
            required: !isEdit
          },
            h(PasswordField, {
              value: password,
              onChange: (value) => setPassword(value),
              placeholder: isEdit ? 'Leave empty to keep current' : 'Minimum 8 characters'
            })
          ),

          // Live password validation (debounced, full width)
          debouncedPassword && (() => {
            const passwordErrors = validatePassword(debouncedPassword);
            return h('div', { className: '-mt-2 mb-4' },
              passwordErrors.length > 0
                ? h(AlertBox, { type: 'error' },
                    h('div', {},
                      h('p', { className: 'font-medium mb-1' }, 'Password requirements not met:'),
                      h('ul', { className: 'list-disc list-inside space-y-1' },
                        passwordErrors.map(err => h('li', { key: err }, err))
                      )
                    )
                  )
                : h(AlertBox, { type: 'success' },
                    h('p', {}, 'Password meets all requirements')
                  )
            );
          })(),

          // Admin toggle
          h(EnableToggle, {
            enabled: isAdmin,
            onChange: setIsAdmin,
            label: 'Administrator',
            description: 'Admins have all capabilities and can manage users/settings',
            color: 'blue'
          }),

          // Capabilities (hidden when admin)
          !isAdmin && h('div', {},
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300' }, 'Capabilities'),
              h('div', { className: 'flex gap-1' },
                h('button', {
                  onClick: () => handlePresetChange('full'),
                  className: `px-2 py-0.5 text-xs rounded font-medium transition-colors ${preset === 'full' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`
                }, 'Full'),
                h('button', {
                  onClick: () => handlePresetChange('readonly'),
                  className: `px-2 py-0.5 text-xs rounded font-medium transition-colors ${preset === 'readonly' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`
                }, 'Read-only'),
                h('span', {
                  className: `px-2 py-0.5 text-xs rounded font-medium ${preset === 'custom' ? 'bg-blue-600 text-white' : 'text-gray-400'}`
                }, 'Custom')
              )
            ),

            // Capability groups
            h('div', { className: 'space-y-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3' },
              ...CAPABILITY_GROUPS.map(group =>
                h('div', { key: group.label },
                  h('p', { className: 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1' }, group.label),
                  h('div', { className: 'grid grid-cols-2 gap-x-4 gap-y-1' },
                    ...group.caps.map(cap =>
                      h('label', {
                        key: cap,
                        className: 'flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer'
                      },
                        h('input', {
                          type: 'checkbox',
                          checked: capabilities.includes(cap),
                          onChange: () => toggleCapability(cap),
                          className: 'rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500'
                        }),
                        CAPABILITY_LABELS[cap] || cap
                      )
                    )
                  )
                )
              )
            )
          ),

          isAdmin && h(AlertBox, { type: 'info' },
            h('p', { className: 'text-sm' }, 'Administrators have all capabilities implicitly. Individual capability selection is not needed.')
          ),

          // API Key section (edit mode, admin users only)
          isEdit && isAdmin && h('div', { className: 'pt-2' },
            h('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1' }, 'API Key'),
            h('p', { className: 'text-xs text-gray-500 mb-2' }, 'Used for Torznab and qBittorrent-compatible API authentication'),
            apiKey
              ? h('div', { className: 'flex items-center gap-2' },
                  h('code', { className: 'flex-1 text-xs bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded font-mono break-all select-all' }, apiKey),
                  h('button', {
                    onClick: handleCopyApiKey,
                    className: 'p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0',
                    title: 'Copy API key'
                  }, h(Icon, { name: apiKeyCopied ? 'check' : 'copy', size: 16, className: apiKeyCopied ? 'text-green-500' : 'text-gray-500' })),
                  h('button', {
                    onClick: handleRegenerateApiKey,
                    disabled: regenerating,
                    className: 'p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0',
                    title: 'Regenerate API key'
                  }, h(Icon, { name: 'refresh', size: 16, className: regenerating ? 'text-gray-400 animate-spin' : 'text-gray-500' }))
                )
              : h('div', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-sm text-gray-500 italic' }, 'No API key generated yet'),
                  h(Button, {
                    variant: 'secondary',
                    size: 'sm',
                    onClick: handleRegenerateApiKey,
                    disabled: regenerating
                  }, regenerating ? 'Generating...' : 'Generate')
                )
          ),

        ),

        // Footer
        h('div', { className: 'px-6 py-4 border-t border-gray-200 dark:border-gray-700' },
          error && h('div', { className: 'mb-3' },
            h(AlertBox, { type: 'error' }, h('p', {}, error))
          ),
          h('div', { className: 'flex justify-end gap-3' },
          h('button', {
            onClick: onClose,
            className: 'px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors'
          }, 'Cancel'),
          h('button', {
            onClick: handleSave,
            disabled: saving,
            className: `px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors ${saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`
          }, saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create User'))
          )
        )
      )
    )
  );
};

export default UserModal;
