/**
 * Qdrant Vector Store — Stub for Linux CI compatibility
 *
 * Full implementation requires Qdrant Docker container.
 * On CI/Linux without Qdrant, this falls back to SQLite via vector_store.js
 */

export async function upsertDocument(docId, metadata, chunks, embeddings) {
  throw new Error('Qdrant not available — fallback to SQLite');
}

export async function search(queryEmbedding, topK = 5) {
  throw new Error('Qdrant not available — fallback to SQLite');
}
