/**
 * UserManagement Component
 *
 * Admin-only user management UI for the Settings view.
 * Displays user list table with create/edit/delete actions.
 */

import React from 'https://esm.sh/react@18.2.0';
import { Button, Icon, AlertBox, LoadingSpinner } from '../common/index.js';
import UserModal from '../modals/UserModal.js';

const { createElement: h, useState, useEffect, useCallback } = React;

/**
 * Format a timestamp to a readable date string
 */
function formatDate(ts) {
  if (!ts) return 'Never';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

/**
 * UserManagement component
 * @param {string} currentUsername - The logged-in admin's username (to prevent self-delete)
 */
const UserManagement = ({ currentUsername, onApiKeyChange }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState({ show: false, mode: 'create', user: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, user: null });
  const [actionError, setActionError] = useState(null);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
      } else {
        setError(data.message || 'Failed to load users');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Create or update user
  const handleSaveUser = useCallback(async (userData) => {
    const isEdit = !!userData.id;
    const url = isEdit ? `/api/users/${userData.id}` : '/api/users';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to save user');
    }

    setModal({ show: false, mode: 'create', user: null });
    setActionError(null);
    await fetchUsers();
  }, [fetchUsers]);

  // Delete user
  const handleDeleteUser = useCallback(async (userId) => {
    try {
      setActionError(null);
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete user');
      }
      setDeleteConfirm({ show: false, user: null });
      await fetchUsers();
    } catch (err) {
      setActionError(err.message);
      setDeleteConfirm({ show: false, user: null });
    }
  }, [fetchUsers]);

  // Toggle user disabled status
  const handleToggleDisabled = useCallback(async (user) => {
    try {
      setActionError(null);
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: !user.disabled })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update user');
      }
      await fetchUsers();
    } catch (err) {
      setActionError(err.message);
    }
  }, [fetchUsers]);

  // Regenerate API key
  const handleRegenerateApiKey = useCallback(async (userId) => {
    const res = await fetch(`/api/users/${userId}/api-key`, { method: 'POST' });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to regenerate API key');
    }
    // Notify parent if the current admin's key changed (updates *arr integration info)
    const user = users.find(u => u.id === userId);
    if (user && user.username === currentUsername && onApiKeyChange) {
      onApiKeyChange(data.apiKey);
    }
    await fetchUsers();
    return data.apiKey;
  }, [fetchUsers, users, currentUsername, onApiKeyChange]);

  if (loading) {
    return h('div', { className: 'py-8 flex justify-center' },
      h(LoadingSpinner, { text: 'Loading users...' })
    );
  }

  if (error) {
    return h(AlertBox, { type: 'error' },
      h('p', {}, error),
      h('button', {
        onClick: fetchUsers,
        className: 'mt-2 text-sm underline'
      }, 'Retry')
    );
  }

  return h('div', {},
    // Action error banner
    actionError && h(AlertBox, { type: 'error', className: 'mb-4' },
      h('div', { className: 'flex items-center justify-between' },
        h('p', {}, actionError),
        h('button', { onClick: () => setActionError(null), className: 'text-sm font-medium' }, 'Dismiss')
      )
    ),

    // User table
    h('div', { className: 'overflow-x-auto' },
      h('table', { className: 'w-full text-sm' },
        h('thead', {},
          h('tr', { className: 'border-b border-gray-200 dark:border-gray-700' },
            h('th', { className: 'text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400' }, 'User'),
            h('th', { className: 'text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell' }, 'Role'),
            h('th', { className: 'text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell' }, 'Capabilities'),
            h('th', { className: 'text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell' }, 'Last Login'),
            h('th', { className: 'py-2 px-3' },
              h('div', { className: 'flex justify-end' },
                h(Button, {
                  variant: 'primary',
                  size: 'sm',
                  onClick: () => setModal({ show: true, mode: 'create', user: null })
                }, h(Icon, { name: 'plus', size: 14, className: 'mr-1' }), 'Add User')
              )
            )
          )
        ),
        h('tbody', {},
          ...users.map(user =>
            h('tr', {
              key: user.id,
              className: `border-b border-gray-100 dark:border-gray-700/50 ${user.disabled ? 'opacity-50' : ''}`
            },
              // Username + badges
              h('td', { className: 'py-2.5 px-3' },
                h('div', { className: 'flex items-center gap-2' },
                  h('span', { className: 'font-medium text-gray-900 dark:text-gray-100' }, user.username),
                  user.disabled && h('span', { className: 'text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' }, 'Disabled'),
                  !user.hasPassword && h('span', { className: 'text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' }, 'SSO'),
                  // Show admin badge on mobile (since Role column is hidden)
                  user.isAdmin && h('span', { className: 'sm:hidden text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' }, 'Admin')
                )
              ),
              // Role
              h('td', { className: 'py-2.5 px-3 hidden sm:table-cell' },
                user.isAdmin
                  ? h('span', { className: 'text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium' }, 'Admin')
                  : h('span', { className: 'text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' }, 'User')
              ),
              // Capabilities count
              h('td', { className: 'py-2.5 px-3 hidden md:table-cell' },
                user.isAdmin
                  ? h('span', { className: 'text-xs text-gray-500' }, 'All')
                  : h('span', { className: 'text-xs text-gray-500' }, `${user.capabilities?.length || 0} caps`)
              ),
              // Last login
              h('td', { className: 'py-2.5 px-3 text-xs text-gray-500 hidden md:table-cell' },
                formatDate(user.lastLoginAt)
              ),
              // Actions
              h('td', { className: 'py-2.5 px-3' },
                h('div', { className: 'flex items-center justify-end gap-1' },
                  // Edit
                  h('button', {
                    onClick: () => setModal({ show: true, mode: 'edit', user }),
                    className: 'p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors',
                    title: 'Edit user'
                  }, h(Icon, { name: 'edit', size: 14, className: 'text-gray-500' })),
                  // Toggle disabled
                  user.username !== currentUsername && h('button', {
                    onClick: () => handleToggleDisabled(user),
                    className: 'p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors',
                    title: user.disabled ? 'Enable user' : 'Disable user'
                  }, h(Icon, {
                    name: user.disabled ? 'check' : 'slash',
                    size: 14,
                    className: user.disabled ? 'text-green-500' : 'text-amber-500'
                  })),
                  // Delete
                  user.username !== currentUsername && h('button', {
                    onClick: () => setDeleteConfirm({ show: true, user }),
                    className: 'p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors',
                    title: 'Delete user'
                  }, h(Icon, { name: 'trash', size: 14, className: 'text-red-500' }))
                )
              )
            )
          )
        )
      )
    ),

    // User Modal
    h(UserModal, {
      show: modal.show,
      mode: modal.mode,
      user: modal.user,
      onSave: handleSaveUser,
      onClose: () => setModal({ show: false, mode: 'create', user: null }),
      onRegenerateApiKey: handleRegenerateApiKey
    }),

    // Delete Confirmation Modal
    deleteConfirm.show && h('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50',
      onClick: () => setDeleteConfirm({ show: false, user: null })
    },
      h('div', {
        className: 'w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden',
        onClick: (e) => e.stopPropagation()
      },
        h('div', { className: 'px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3' },
          h('div', { className: 'flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center' },
            h(Icon, { name: 'trash', size: 20, className: 'text-red-600 dark:text-red-400' })
          ),
          h('h2', { className: 'text-lg font-semibold text-gray-900 dark:text-gray-100' }, `Delete ${deleteConfirm.user?.username}?`)
        ),
        h('div', { className: 'px-6 py-4' },
          h('p', { className: 'text-sm text-gray-700 dark:text-gray-300' },
            'This will permanently delete the user account. Download history entries will be preserved but ownership records will be removed.'
          )
        ),
        h('div', { className: 'px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3' },
          h('button', {
            onClick: () => setDeleteConfirm({ show: false, user: null }),
            className: 'px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors'
          }, 'Cancel'),
          h('button', {
            onClick: () => handleDeleteUser(deleteConfirm.user.id),
            className: 'px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors'
          }, 'Delete')
        )
      )
    )
  );
};

export default UserManagement;
