/**
 * Синглтон для хранения состояния рассылки.
 * Map<adminId, { audience: 'all' | 'active' | 'buyers' | 'non_buyers' }>
 */
const broadcastState = new Map();

module.exports = broadcastState;
