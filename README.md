# gemailla-master

Repositorio maestro unificado de GEMAILLA AI.

## Stack

- React + Vite
- Firebase Auth
- Firestore
- Firebase Storage
- Firebase Hosting

## Comandos

```bash
npm install
npm run dev
npm run build
firebase emulators:start --only hosting,auth,firestore,storage
firebase deploy
```

## Reglas aplicadas

- Dependencias heredadas eliminadas.
- Sin URL pública persistida para documentos.
- Uso de `storagePath`.
- Borrado lógico en vez de borrado físico.
- Firebase como capa de datos principal.
- IA degradada si no hay backend seguro configurado.
