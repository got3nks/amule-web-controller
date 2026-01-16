/**
 * CPU Usage Utility
 * Reads CPU usage from /proc/stat
 * Works both natively and inside Docker
 */

const fs = require('fs').promises;

let previousCpuInfo = null;

/**
 * Parse CPU times from /proc/stat
 * @returns {Object} CPU times breakdown
 */
async function readCpuTimes() {
    try {
        const content = await fs.readFile('/proc/stat', 'utf8');
        const lines = content.split('\n');

        // First line is aggregate CPU stats
        const cpuLine = lines.find(line => line.startsWith('cpu '));
        if (!cpuLine) {
            return null;
        }

        // cpu  user nice system idle iowait irq softirq steal guest guest_nice
        const parts = cpuLine.split(/\s+/).slice(1).map(Number);

        const [user, nice, system, idle, iowait, irq, softirq, steal] = parts;

        const idleTime = idle + iowait;
        const totalTime = user + nice + system + idle + iowait + irq + softirq + steal;

        return { idleTime, totalTime };
    } catch (err) {
        return null;
    }
}

/**
 * Get CPU usage percentage
 * Compares current reading with previous to calculate usage
 * @returns {Object} CPU usage info
 */
async function getCpuUsage() {
    try {
        const currentCpuInfo = await readCpuTimes();

        if (!currentCpuInfo) {
            return { percent: 0, error: 'Could not read CPU stats' };
        }

        if (!previousCpuInfo) {
            // First call - store current and return 0
            previousCpuInfo = currentCpuInfo;
            return { percent: 0 };
        }

        const idleDelta = currentCpuInfo.idleTime - previousCpuInfo.idleTime;
        const totalDelta = currentCpuInfo.totalTime - previousCpuInfo.totalTime;

        // Store current for next call
        previousCpuInfo = currentCpuInfo;

        if (totalDelta === 0) {
            return { percent: 0 };
        }

        const usagePercent = Math.round(((totalDelta - idleDelta) / totalDelta) * 100);

        return {
            percent: Math.max(0, Math.min(100, usagePercent))
        };
    } catch (err) {
        return { percent: 0, error: err.message };
    }
}

module.exports = {
    getCpuUsage
};
