const path = require('node:path');

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
const SUPPORTED_DOCUMENT_EXTENSIONS = new Set(['.pdf', '.xml']);
const SUPPORTED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/xml',
  'text/xml',
]);

function createHttpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeStoragePaths(storagePaths) {
  if (!Array.isArray(storagePaths)) return [];

  return storagePaths
    .filter((storagePath) => typeof storagePath === 'string')
    .map((storagePath) => storagePath.trim())
    .filter(Boolean);
}

function hasDocumentInputs(body = {}) {
  return normalizeStoragePaths(body.storagePaths).length > 0;
}

function validateDocumentAnalysisRequest(body = {}) {
  const storagePaths = normalizeStoragePaths(body.storagePaths);
  if (storagePaths.length === 0) {
    throw createHttpError('Debes enviar al menos un archivo en storagePaths para análisis documental.', 400);
  }

  if (storagePaths.length > 3) {
    throw createHttpError('El análisis documental acepta máximo 3 archivos por solicitud.', 413);
  }

  const companyId = typeof body.companyId === 'string' ? body.companyId.trim() : '';
  const documentId = typeof body.documentId === 'string' ? body.documentId.trim() : '';
  if (!companyId || !documentId) {
    throw createHttpError('companyId y documentId son obligatorios para analizar documentos.', 400);
  }

  return { companyId, documentId, storagePaths };
}

async function verifyDocumentAccess({ firestore, companyId, documentId, storagePaths, user }) {
  const documentSnapshot = await firestore.collection('documents').doc(documentId).get();
  if (!documentSnapshot.exists) {
    throw createHttpError('Documento no encontrado.', 404);
  }

  const documentData = documentSnapshot.data() || {};
  if (documentData.companyId !== companyId) {
    throw createHttpError('El documento no pertenece a la empresa indicada.', 403);
  }

  if (!storagePaths.includes(documentData.storagePath)) {
    throw createHttpError('El storagePath no coincide con la metadata del documento.', 400);
  }

  const companySnapshot = await firestore.collection('companies').doc(companyId).get();
  const companyData = companySnapshot.exists ? companySnapshot.data() || {} : {};
  const userUid = user.uid || '';
  const isOwner = companyData.ownerUid === userUid;

  if (!isOwner) {
    const membershipId = `${companyId}_${userUid}`;
    const membershipSnapshot = await firestore.collection('companyMembers').doc(membershipId).get();
    const membershipData = membershipSnapshot.exists ? membershipSnapshot.data() || {} : {};
    if (membershipData.status !== 'active') {
      throw createHttpError('No tienes permisos para analizar documentos de esta empresa.', 403);
    }
  }

  return { id: documentId, ...documentData };
}

function validateStorageFileMetadata({ storagePath, metadata = {} }) {
  const size = Number(metadata.size || 0);
  if (!Number.isFinite(size) || size <= 0) {
    throw createHttpError(`No se pudo validar el tamaño de ${storagePath}.`, 400);
  }

  if (size > MAX_DOCUMENT_BYTES) {
    throw createHttpError('Archivo muy grande. El límite para análisis documental es 15MB.', 413);
  }

  const contentType = String(metadata.contentType || '').toLowerCase();
  const extension = path.extname(storagePath).toLowerCase();
  if (!SUPPORTED_DOCUMENT_EXTENSIONS.has(extension) && !SUPPORTED_DOCUMENT_MIME_TYPES.has(contentType)) {
    throw createHttpError('Formato no soportado. El análisis documental solo acepta PDF o XML.', 415);
  }

  return {
    extension,
    contentType,
    size,
    isXml: extension === '.xml' || contentType.includes('xml'),
  };
}

function buildJsonSchemaFormat(schema) {
  if (!schema || typeof schema !== 'object') return undefined;

  return {
    type: 'json_schema',
    name: 'document_analysis',
    schema,
    strict: false,
  };
}

async function uploadOpenAIFile({ apiKey, buffer, filename, contentType }) {
  const formData = new FormData();
  formData.append('purpose', 'user_data');
  formData.append('file', new Blob([buffer], { type: contentType || 'application/octet-stream' }), filename);

  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createHttpError(payload?.error?.message || `No se pudo preparar el archivo para IA (${response.status}).`, 502);
  }

  return payload.id;
}

async function deleteOpenAIFile({ apiKey, fileId }) {
  await fetch(`https://api.openai.com/v1/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  }).catch(() => {});
}

async function buildDocumentOpenAIContent({ apiKey, bucket, prompt, storagePaths }) {
  const content = [{ type: 'input_text', text: prompt }];
  const uploadedFileIds = [];

  for (const storagePath of storagePaths) {
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) throw createHttpError(`Archivo no encontrado en Storage: ${storagePath}.`, 404);

    const [metadata] = await file.getMetadata();
    const fileInfo = validateStorageFileMetadata({ storagePath, metadata });
    const [buffer] = await file.download();

    const fileId = await uploadOpenAIFile({
      apiKey,
      buffer,
      filename: path.basename(storagePath),
      contentType: fileInfo.contentType || (fileInfo.isXml ? 'application/xml' : 'application/pdf'),
    });
    uploadedFileIds.push(fileId);
    content.push({ type: 'input_file', file_id: fileId });
  }

  return { content, uploadedFileIds };
}

module.exports = {
  MAX_DOCUMENT_BYTES,
  buildDocumentOpenAIContent,
  buildJsonSchemaFormat,
  deleteOpenAIFile,
  hasDocumentInputs,
  validateDocumentAnalysisRequest,
  validateStorageFileMetadata,
  verifyDocumentAccess,
};
