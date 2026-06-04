import firebase from '@/api/firebaseClient';

export async function logAction({ companyId, userEmail, userName, action, entityType, entityId, details }) {
  try {
    await firebase.entities.AuditLog.create({
      companyId: companyId || '',
      userEmail: userEmail || '',
      userName: userName || '',
      action,
      entity_type: entityType || '',
      entity_id: entityId || '',
      details: details || '',
    });
  } catch (error) {
    console.error('[auditLogger] No se pudo registrar la auditoria:', error);
  }
}
