/**
 * Safe API data extraction utilities
 * Handle all possible backend response shapes consistently
 */

/**
 * Extract array data from any response shape
 * @param {any} data - axios response.data or similar
 * @param {Array} fallback - fallback if extraction fails
 * @returns {Array}
 */
export const getArray = (data, fallback = []) => {
  if (!data) return fallback;
  // Backend uses { data: [...], total, page, limit }
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.datasets)) return data.datasets;
  if (Array.isArray(data?.projects)) return data.projects;
  if (Array.isArray(data?.topics)) return data.topics;
  if (Array.isArray(data?.subtopics)) return data.subtopics;
  if (Array.isArray(data?.reviews)) return data.reviews;
  if (Array.isArray(data?.label_sets)) return data.label_sets;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.logs)) return data.logs;
  if (typeof data === 'object' && data !== null) {
    const vals = Object.values(data);
    const first = vals.find(v => Array.isArray(v));
    if (first) return first;
  }
  return fallback;
};

/**
 * Extract single object from any response shape
 * @param {any} data - axios response.data or similar
 * @returns {object|null}
 */
export const getObject = (data) => {
  if (!data) return null;
  if (typeof data === 'object' && !Array.isArray(data)) return data;
  return null;
};
