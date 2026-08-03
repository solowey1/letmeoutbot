/**
 * Состояние редактирования тарифа админом (ожидание ввода значения).
 * Map<adminId, { planId: string, field: 'price' | 'limit' }>
 */
const adminEditState = new Map();

module.exports = adminEditState;
