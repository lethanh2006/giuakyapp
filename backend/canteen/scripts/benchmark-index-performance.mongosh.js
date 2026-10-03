// Synthetic, isolated benchmark for the Order history compound index.
// Run only against a disposable MongoDB instance, never the application URI.
const benchmarkDb = db.getSiblingDB('index_performance_benchmark');
const readCollection = benchmarkDb.getCollection('read_orders');
const writeNoIndex = benchmarkDb.getCollection('write_no_secondary_index');
const writeWithIndex = benchmarkDb.getCollection('write_with_secondary_index');

const DOCUMENT_COUNT = 100_000;
const USER_COUNT = 1_000;
const READ_SAMPLES = 100;
const READ_WARMUPS = 5;
const WRITE_DOCUMENT_COUNT = 15_000;
const WRITE_ROUNDS = 7;
const LIMIT = 20;
const orderHistoryIndex = { userId: 1, createdAt: -1, _id: -1 };
const targetUsers = Array.from({ length: USER_COUNT }, () => new ObjectId());
const targetUser = targetUsers[42];
const query = { userId: targetUser };
const sort = { createdAt: -1, _id: -1 };

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)];
}

function summarizePlan(explain) {
  const stages = new Set();
  const indexes = new Set();
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.stage) stages.add(node.stage);
    if (node.indexName) indexes.add(node.indexName);
    for (const value of Object.values(node)) visit(value);
  }
  visit(explain.queryPlanner.winningPlan);
  return {
    returned: explain.executionStats.nReturned,
    docsExamined: explain.executionStats.totalDocsExamined,
    keysExamined: explain.executionStats.totalKeysExamined,
    executionTimeMs: explain.executionStats.executionTimeMillis,
    stages: [...stages],
    indexes: [...indexes],
  };
}

async function measure(queryFunction) {
  const startedAt = performance.now();
  const result = await queryFunction();
  const elapsedMs = performance.now() - startedAt;
  if (result.length !== LIMIT) throw new Error(`Expected ${LIMIT} rows, got ${result.length}`);
  return elapsedMs;
}

function summarizeSamples(values) {
  const meanMs = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    samples: values.length,
    meanMs: Number(meanMs.toFixed(3)),
    medianMs: Number(percentile(values, 0.5).toFixed(3)),
    p95Ms: Number(percentile(values, 0.95).toFixed(3)),
    operationsPerSecond: Number((1000 / meanMs).toFixed(1)),
  };
}

function makeOrder(index) {
  const createdAt = new Date(1_700_000_000_000 + index * 1_000);
  return {
    userId: targetUsers[index % USER_COUNT],
    tableId: targetUsers[(index * 7) % USER_COUNT],
    orderNumber: `#${index + 1}`,
    createdAt,
    updatedAt: createdAt,
    status: index % 100 < 4 ? 'CREATED' : 'COMPLETED',
    paymentStatus: index % 100 < 4 ? 'PENDING' : 'PAID',
    paymentMethod: 'CASH',
    totalAmount: 30_000,
    finalAmount: 30_000,
    items: [{ name: 'Cơm', quantity: 1, unitPrice: 30_000, selectedOptions: [] }],
  };
}

async function dropCollectionIfPresent(name) {
  const collections = await benchmarkDb.getCollectionInfos({ name });
  if (collections.length > 0) await benchmarkDb.getCollection(name).drop();
}

async function seedReadCollection() {
  await dropCollectionIfPresent('read_orders');
  const batchSize = 2_000;
  for (let offset = 0; offset < DOCUMENT_COUNT; offset += batchSize) {
    const batch = Array.from(
      { length: Math.min(batchSize, DOCUMENT_COUNT - offset) },
      (_, position) => makeOrder(offset + position),
    );
    await readCollection.insertMany(batch, { ordered: false });
  }
}

async function benchmarkReads() {
  const noIndexQuery = () =>
    readCollection.find(query).sort(sort).limit(LIMIT).hint({ $natural: 1 }).toArray();

  await readCollection.createIndex(orderHistoryIndex, { name: 'userId_createdAt_id_history' });
  const indexedQuery = () =>
    readCollection
      .find(query)
      .sort(sort)
      .limit(LIMIT)
      .hint('userId_createdAt_id_history')
      .toArray();

  const noIndexPlan = summarizePlan(
    await readCollection
      .find(query)
      .sort(sort)
      .limit(LIMIT)
      .hint({ $natural: 1 })
      .explain('executionStats'),
  );
  const indexedPlan = summarizePlan(
    await readCollection
      .find(query)
      .sort(sort)
      .limit(LIMIT)
      .hint('userId_createdAt_id_history')
      .explain('executionStats'),
  );

  for (let i = 0; i < READ_WARMUPS; i += 1) {
    await noIndexQuery();
    await indexedQuery();
  }

  const noIndexSamples = [];
  const indexedSamples = [];
  for (let i = 0; i < READ_SAMPLES; i += 1) {
    // Alternate order so one plan does not always benefit from running second.
    if (i % 2 === 0) {
      noIndexSamples.push(await measure(noIndexQuery));
      indexedSamples.push(await measure(indexedQuery));
    } else {
      indexedSamples.push(await measure(indexedQuery));
      noIndexSamples.push(await measure(noIndexQuery));
    }
  }

  const noIndex = summarizeSamples(noIndexSamples);
  const indexed = summarizeSamples(indexedSamples);
  return {
    collectionDocuments: DOCUMENT_COUNT,
    targetUserMatchingDocuments: DOCUMENT_COUNT / USER_COUNT,
    returnedPerQuery: LIMIT,
    noIndexPlan,
    indexedPlan,
    noIndex,
    indexed,
    meanLatencyReductionPercent: Number(((1 - indexed.meanMs / noIndex.meanMs) * 100).toFixed(1)),
    meanSpeedup: Number((noIndex.meanMs / indexed.meanMs).toFixed(2)),
    indexBytes: benchmarkDb.runCommand({ collStats: 'read_orders' }).totalIndexSize,
  };
}

async function resetWriteCollections() {
  await dropCollectionIfPresent('write_no_secondary_index');
  await dropCollectionIfPresent('write_with_secondary_index');
  await benchmarkDb.createCollection('write_no_secondary_index');
  await benchmarkDb.createCollection('write_with_secondary_index');
  await writeWithIndex.createIndex(orderHistoryIndex, { name: 'userId_createdAt_id_history' });
}

async function benchmarkWrites() {
  await resetWriteCollections();
  const writeDocuments = Array.from({ length: WRITE_DOCUMENT_COUNT }, (_, index) =>
    makeOrder(DOCUMENT_COUNT + index),
  );
  const noIndexTimes = [];
  const indexedTimes = [];

  for (let round = 0; round < WRITE_ROUNDS; round += 1) {
    await writeNoIndex.deleteMany({});
    await writeWithIndex.deleteMany({});
    const insertNoIndex = async () => {
      const startedAt = performance.now();
      await writeNoIndex.insertMany(writeDocuments, { ordered: false });
      return performance.now() - startedAt;
    };
    const insertWithIndex = async () => {
      const startedAt = performance.now();
      await writeWithIndex.insertMany(writeDocuments, { ordered: false });
      return performance.now() - startedAt;
    };

    if (round % 2 === 0) {
      noIndexTimes.push(await insertNoIndex());
      indexedTimes.push(await insertWithIndex());
    } else {
      indexedTimes.push(await insertWithIndex());
      noIndexTimes.push(await insertNoIndex());
    }
  }

  const noIndex = summarizeSamples(noIndexTimes);
  const indexed = summarizeSamples(indexedTimes);
  const noIndexStats = benchmarkDb.runCommand({ collStats: 'write_no_secondary_index' });
  const indexedStats = benchmarkDb.runCommand({ collStats: 'write_with_secondary_index' });
  return {
    documentsPerRound: WRITE_DOCUMENT_COUNT,
    rounds: WRITE_ROUNDS,
    noIndex,
    indexed,
    indexedWriteOverheadPercentMean: Number(((indexed.meanMs / noIndex.meanMs - 1) * 100).toFixed(1)),
    indexedWriteOverheadPercentMedian: Number(((indexed.medianMs / noIndex.medianMs - 1) * 100).toFixed(1)),
    noIndexMedianDocumentsPerSecond: Number((WRITE_DOCUMENT_COUNT * 1000 / noIndex.medianMs).toFixed(0)),
    indexedMedianDocumentsPerSecond: Number((WRITE_DOCUMENT_COUNT * 1000 / indexed.medianMs).toFixed(0)),
    noSecondaryIndexBytes: noIndexStats.totalIndexSize,
    withSecondaryIndexBytes: indexedStats.totalIndexSize,
    extraIndexBytes: indexedStats.totalIndexSize - noIndexStats.totalIndexSize,
  };
}

async function runBenchmark() {
  try {
    await seedReadCollection();
    const reads = await benchmarkReads();
    const writes = await benchmarkWrites();
    print(JSON.stringify({
      benchmark: 'order_history_compound_index',
      mongodbVersion: (await benchmarkDb.adminCommand({ buildInfo: 1 })).version,
      generatedAtUtc: new Date().toISOString(),
      index: orderHistoryIndex,
      reads,
      writes,
    }, null, 2));
  } finally {
    await benchmarkDb.dropDatabase();
  }
}

runBenchmark().catch((error) => {
  print(error.stack || error);
  quit(1);
});
