# Correcciones aplicadas — Prioridades 1 a 4

## Prioridad 1 — Seguridad
- `firestore.rules` ahora valida acceso multiempresa por `ownerUid`, membresía activa en `companyMembers` y roles.
- `companyMembers` ya no tiene lectura abierta para cualquier usuario autenticado.
- `subscriptions`, `predictionLogs` y `aiConversations` quedaron protegidas por `companyId` o `ownerUid`.
- Se conserva bloqueo de hard delete.

## Prioridad 2 — Funcionalidad
- `UploadFile` ahora rechaza subidas sin `companyId`; ya no genera `companies/unassigned/...`.
- `ClientImporter`, `ProjectImporter` e `ImportTransactions` pasan `companyId` explícito.

## Prioridad 3 — Limpieza
- Se eliminaron datos demo de `ProcessOptimizer.jsx`, `ProjectTracker.jsx` y `StrategicKPIs.jsx`.
- Se reemplazaron imágenes externas `https://media.firebase.com/...` por `/assets/logo-emblem.png`.

## Prioridad 4 — Verificación
- `node --check src/api/firebaseClient.js` pasó correctamente.
- `npm install` no pudo completarse dentro del entorno actual por timeout de instalación.
- `npm run build` no pudo ejecutarse porque `vite` no está instalado sin `node_modules`.
