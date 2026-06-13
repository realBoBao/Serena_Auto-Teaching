#!/usr/bin/env node
/**
 * scripts/setup_bigquery.js — Setup BigQuery dataset + table
 *
 * Usage: node scripts/setup_bigquery.js
 * Requires: GOOGLE_APPLICATION_CREDENTIALS=./vertex-key.json
 */

import { BigQuery } from '@google-cloud/bigquery';
import 'dotenv/config';

const PROJECT_ID = process.env.GCP_PROJECT_ID || JSON.parse(
  await (await import('fs')).promises.readFile(
    process.env.GOOGLE_APPLICATION_CREDENTIALS || './vertex-key.json', 'utf8'
  )
).project_id;

const DATASET_ID = process.env.BQ_DATASET_ID || 'agent_memory';
const TABLE_ID = process.env.BQ_TABLE_ID || 'rag_knowledge';

const bq = new BigQuery({ projectId: PROJECT_ID });

async function main() {
  console.log(`[BigQuery] Setting up ${PROJECT_ID}.${DATASET_ID}.${TABLE_ID}...`);

  // 1. Create dataset
  const [dataset] = await bq.dataset(DATASET_ID).get({ autoCreate: true });
  console.log(`[BigQuery] Dataset: ${dataset.id}`);

  // 2. Create table
  const schema = [
    { name: 'id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'content', type: 'STRING', mode: 'NULLABLE' },
    { name: 'embedding', type: 'FLOAT64', mode: 'REPEATED' },
    { name: 'source', type: 'STRING', mode: 'NULLABLE' },
    { name: 'category', type: 'STRING', mode: 'NULLABLE' },
    { name: 'metadata', type: 'STRING', mode: 'NULLABLE' },
    { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
  ];

  const [table] = await dataset.table(TABLE_ID).get({
    autoCreate: true,
    schema,
  });
  console.log(`[BigQuery] Table: ${table.id}`);

  // 3. Create vector index
  try {
    await bq.query(`
      CREATE VECTOR INDEX IF NOT EXISTS idx_embedding
      ON \`${PROJECT_ID}.${DATASET_ID}.${TABLE_ID}\`(embedding)
      OPTIONS (index_type = 'IVF', distance_type = 'COSINE')
    `);
    console.log('[BigQuery] Vector index created');
  } catch (err) {
    console.warn('[BigQuery] Vector index skipped (may already exist):', err.message);
  }

  // 4. Test insert
  await table.insert([{
    id: 'test::1',
    content: 'Test document for BigQuery vector search',
    embedding: Array(768).fill(0).map((_, i) => i * 0.001),
    source: 'test',
    category: 'Test',
    metadata: '{}',
    created_at: new Date().toISOString(),
  }]);
  console.log('[BigQuery] Test insert OK');

  // 5. Test search
  const [rows] = await bq.query(`
    SELECT base.id, base.content, distance
    FROM VECTOR_SEARCH(
      TABLE \`${PROJECT_ID}.${DATASET_ID}.${TABLE_ID}\`,
      'embedding',
      (SELECT [${Array(768).fill(0).map((_, i) => i * 0.001).join(', ')}] AS embedding),
      top_k => 3,
      distance_type => 'COSINE'
    )
  `);
  console.log(`[BigQuery] Test search OK: ${rows.length} results`);

  console.log('\n✅ BigQuery setup complete!');
  console.log(`   Dataset: ${DATASET_ID}`);
  console.log(`   Table: ${TABLE_ID}`);
  console.log(`   Vector Index: idx_embedding`);
}

main().catch(err => {
  console.error('[BigQuery] Setup failed:', err.message);
  process.exit(1);
});
