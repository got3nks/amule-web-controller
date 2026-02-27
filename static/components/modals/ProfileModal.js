/**
 * ProfileModal Component
 *
 * Self-service profile update modal for all authenticated users.
 * Allows changing password.
 */

import React from 'https://esm.sh/react@18.2.0';
import Portal from '../common/Portal.js';
import { AlertBox, Icon } from '../common/index.js';
import { ConfigField, PasswordField } from '../settings/index.js';
import { validatePassword } from '../../utils/passwordValidator.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';

const { createElement: h, useState, useEffect, useCallback } = React;

/**
 * @param {boolean} show
 * @param {string} username - Current username
 * @param {function} onClose
 * @param {function} onSave - async ({ currentPassword, newPassword }) => void
 */
const ProfileModal = ({ show, username, onClose, onSave }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const debouncedNewPassword = useDebouncedValue(newPassword);

  useEffect(() => {
    if (!show) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setSaving(false);
  }, [show]);

  const handleSave = useCallback(async () => {
    setError('');
    setSuccess('');

    if (!newPassword) {
      setError('No changes to save');
      return;
    }

    const pwErrors = validatePassword(newPassword);
    if (pwErrors.length > 0) {
      setError(pwErrors.join('; '));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (!currentPassword) {
      setError('Current password is required to change password');
      return;
    }

    setSaving(true);
    try {
      await onSave({ currentPassword, newPassword });
      setSuccess('Profile updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword, onSave, onClose]);

  if (!show) return null;

  return h(Portal, null,
    h('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50',
      onClick: onClose
    },
      h('div', {
        className: 'w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden flex flex-col',
        onClick: (e) => e.stopPropagation()
      },
        // Header
        h('div', { className: 'px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between' },
          h('div', {},
            h('h2', { className: 'text-lg font-semibold text-gray-900 dark:text-gray-100' }, 'Profile'),
            h('p', { className: 'text-sm text-gray-500' }, username)
          ),
          h('button', {
            onClick: onClose,
            className: 'p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
          }, h(Icon, { name: 'x', size: 20, className: 'text-gray-500' }))
        ),

        // Body
        h('div', { className: 'flex-1 overflow-y-auto px-6 py-4 space-y-4' },
          // Password Change Section
          h('div', { className: 'space-y-3' },
              h(ConfigField, { label: 'Current Password' },
                h(PasswordField, {
                  value: currentPassword,
                  onChange: (value) => setCurrentPassword(value),
                  placeholder: 'Enter current password'
                })
              ),

              h(ConfigField, { label: 'New Password' },
                h(PasswordField, {
                  value: newPassword,
                  onChange: (value) => setNewPassword(value),
                  placeholder: 'Minimum 8 characters'
                })
              ),
              // Live password validation (debounced, full width)
              debouncedNewPassword && (() => {
                const passwordErrors = validatePassword(debouncedNewPassword);
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

              h(ConfigField, { label: 'Confirm New Password' },
                h(PasswordField, {
                  value: confirmPassword,
                  onChange: (value) => setConfirmPassword(value),
                  placeholder: 'Repeat new password'
                })
              )
          )
        ),

        // Footer
        h('div', { className: 'px-6 py-4 border-t border-gray-200 dark:border-gray-700' },
          error && h('div', { className: 'mb-3' },
            h(AlertBox, { type: 'error' }, h('p', {}, error))
          ),
          success && h('div', { className: 'mb-3' },
            h(AlertBox, { type: 'success' }, h('p', {}, success))
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
            }, saving ? 'Saving...' : 'Save')
          )
        )
      )
    )
  );
};

export default ProfileModal;
