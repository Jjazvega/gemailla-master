const assert = require('node:assert/strict');
const test = require('node:test');
const {
  MAX_DOCUMENT_BYTES,
  buildJsonSchemaFormat,
  hasDocumentInputs,
  validateDocumentAnalysisRequest,
  validateStorageFileMetadata,
} = require('./documentAi');

test('validateDocumentAnalysisRequest requires explicit company and document context', () => {
  assert.throws(
    () => validateDocumentAnalysisRequest({ storagePaths: ['companies/acme/documents/doc-1/file.pdf'] }),
    /companyId y documentId/,
  );

  assert.deepEqual(
    validateDocumentAnalysisRequest({
      companyId: 'acme',
      documentId: 'doc-1',
      storagePaths: [' companies/acme/documents/doc-1/file.pdf '],
    }),
    {
      companyId: 'acme',
      documentId: 'doc-1',
      storagePaths: ['companies/acme/documents/doc-1/file.pdf'],
    },
  );
});

test('hasDocumentInputs ignores empty or invalid storagePaths values', () => {
  assert.equal(hasDocumentInputs({ storagePaths: [] }), false);
  assert.equal(hasDocumentInputs({ storagePaths: [null, '   '] }), false);
  assert.equal(hasDocumentInputs({ storagePaths: ['companies/acme/documents/doc-1/file.xml'] }), true);
});

test('validateStorageFileMetadata accepts PDF and XML under 15MB only', () => {
  assert.deepEqual(
    validateStorageFileMetadata({
      storagePath: 'companies/acme/documents/doc-1/invoice.pdf',
      metadata: { size: String(MAX_DOCUMENT_BYTES), contentType: 'application/pdf' },
    }),
    {
      extension: '.pdf',
      contentType: 'application/pdf',
      size: MAX_DOCUMENT_BYTES,
      isXml: false,
    },
  );

  assert.equal(
    validateStorageFileMetadata({
      storagePath: 'companies/acme/documents/doc-1/invoice.xml',
      metadata: { size: '1024', contentType: 'text/xml' },
    }).isXml,
    true,
  );

  assert.throws(
    () => validateStorageFileMetadata({
      storagePath: 'companies/acme/documents/doc-1/invoice.pdf',
      metadata: { size: String(MAX_DOCUMENT_BYTES + 1), contentType: 'application/pdf' },
    }),
    /15MB/,
  );

  assert.throws(
    () => validateStorageFileMetadata({
      storagePath: 'companies/acme/documents/doc-1/invoice.exe',
      metadata: { size: '1024', contentType: 'application/octet-stream' },
    }),
    /PDF o XML/,
  );
});

test('buildJsonSchemaFormat wraps schemas for structured OpenAI responses', () => {
  const schema = { type: 'object', properties: { total: { type: 'number' } } };
  assert.deepEqual(buildJsonSchemaFormat(schema), {
    type: 'json_schema',
    name: 'document_analysis',
    schema,
    strict: false,
  });
  assert.equal(buildJsonSchemaFormat(null), undefined);
});
