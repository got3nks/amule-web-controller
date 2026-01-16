/**
 * Disk Space Utility
 * Aggregates disk space across real filesystems
 * Works both natively and inside Docker
 */

const fs = require('fs').promises;

/**
 * Filesystem types to exclude
 */
const EXCLUDED_FS_TYPES = new Set(['tmpfs', 'devtmpfs', 'proc', 'sysfs', 'cgroup', 'cgroup2', 'pstore', 'securityfs', 'debugfs', 'tracefs', 'overlayfs', 'nsfs', 'ramfs', 'autofs', 'fusectl', 'configfs', 'mqueue', 'hugetlbfs', 'binfmt_misc', 'rpc_pipefs', 'shm']);

/**
 * Docker-related mount types
 */
const DOCKER_FS_TYPES = new Set(['overlay']);

/**
 * Read mount points from /proc/self/mounts
 */
async function getMounts() {
    const content = await fs.readFile('/proc/self/mounts', 'utf8');

    return content
        .trim()
        .split('\n')
        .map(line => {
            const [device, mountPoint, fsType] = line.split(' ');
            return {device, mountPoint, fsType};
        });
}

/**
 * Determine if a mount should be included
 */
function shouldIncludeMount({fsType, mountPoint}) {
    if (EXCLUDED_FS_TYPES.has(fsType)) {
        return false;
    }

    // Exclude Docker/overlay mounts
    if (DOCKER_FS_TYPES.has(fsType)) {
        return false;
    }

    // Always exclude obvious pseudo mounts
    if (mountPoint.startsWith('/proc') || mountPoint.startsWith('/sys') || mountPoint.startsWith('/dev')) {
        return false;
    }

    return true;
}

/**
 * Get disk space stats for a mount point
 */
async function statMount(mountPoint) {
    const stats = await fs.statfs(mountPoint);

    const blockSize = stats.bsize;
    const total = stats.blocks * blockSize;
    const free = stats.bavail * blockSize;
    const used = total - (stats.bfree * blockSize);

    return {total, free, used};
}

/**
 * Aggregate disk space across all relevant filesystems
 */
async function getDiskSpace() {
    try {
        const mounts = await getMounts();

        const seenDevices = new Set();

        let total = 0;
        let free = 0;
        let used = 0;

        for (const mount of mounts) {
            if (!shouldIncludeMount(mount)) {
                continue;
            }

            // Prevent double-counting the same device
            if (seenDevices.has(mount.device)) {
                continue;
            }

            seenDevices.add(mount.device);

            try {
                const stats = await statMount(mount.mountPoint);

                total += stats.total;
                free += stats.free;
                used += stats.used;
            } catch {
                // Ignore mounts we cannot stat
            }
        }

        const percentUsed = total > 0 ? Math.round((used / total) * 100) : 0;

        return {
            total, used, free, percentUsed
        };
    } catch (err) {
        return {
            total: 0, used: 0, free: 0, percentUsed: 0, error: err.message
        };
    }
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
    if (!bytes) return '0 B';

    const k = 1024;
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

module.exports = {
    getDiskSpace, formatBytes
};
