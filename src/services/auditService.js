const prisma = require('../utils/prisma');

const logAction = async ({ adminId, action, entity, entityId, oldValue, newValue }) => {
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        oldValue: oldValue || null,
        newValue: newValue || null,
      }
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
    // Don't throw error to avoid breaking main business flow
  }
};

module.exports = { logAction };
