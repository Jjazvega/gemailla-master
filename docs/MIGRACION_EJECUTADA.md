# Migración ejecutada: gemailla-master

## Origen

- ZIP 1: capa visual React/Vite y módulos de negocio.
- ZIP 2: Firebase Hosting, Firestore, Storage, emuladores, assets y reglas.
- ZIP 3: descartado por duplicado exacto del ZIP 2.

## Cambios aplicados

- Repositorio final nombrado `gemailla-master`.
- Eliminada la carpeta heredada `base44/`.
- Eliminado `package-lock.json` heredado.
- Eliminado `src/api/base44Client.js`.
- Eliminado `src/lib/app-params.js`.
- Eliminadas dependencias heredadas ajenas a Firebase.
- Reescrito `package.json` para React/Vite/Firebase.
- Reescrito `vite.config.js` con alias `@` usando `path.resolve`.
- Copiados assets locales desde ZIP 2.
- Reemplazado favicon remoto por `/favicon.svg`.
- Añadido `public/manifest.json`.
- Adaptado `firebase.json` para publicar el build de Vite desde `dist`.
- Reescrito `src/api/firebaseClient.js` con cobertura de entidades.
- Implementado borrado lógico mediante `status: "archived"`.
- Prohibido borrado físico desde cliente y reglas.
- Validación de carga documental: PDF/XML hasta 15MB.
- Persistencia documental con `storagePath`.
- IA degradada sin romper la interfaz si no existe backend seguro.

## Entidades cubiertas

- User
- Company
- CompanyMember
- Document
- Transaction
- AuditLog
- CRMClient
- CRMDeal
- CRMInteraction
- Employee
- Payroll
- PerformanceReview
- KPI
- Subscription
- PredictionLog
- AIConversation
- Project
- ProjectTask
- SupportTicket

## Verificación local aplicada

```bash
node --check vite.config.js
node --check src/api/firebaseClient.js
node --check src/firebase.js
```

## Comandos siguientes

```bash
npm install
npm run build
firebase emulators:start --only hosting,auth,firestore,storage
firebase deploy
```
