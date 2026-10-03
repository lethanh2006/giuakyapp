// Four concurrent synthetic users querying order history against a disposable
// MongoDB instance. Never point this benchmark at the application database.
const { MongoClient, ObjectId } = require('mongodb');

const URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'index_concurrent_benchmark';
const DOCUMENT_COUNT = 100_000;
const USER_COUNT = 1_000;
const VIRTUAL_USERS = 4;
const QUERIES_PER_USER = 25;
const WARMUPS_PER_USER = 2;
const LIMIT = 20;
const INDEX_NAME = 'userId_createdAt_id_history';
const INDEX = { userId: 1, createdAt: -1, _id: -1 };
const SORT = { createdAt: -1, _id: -1 };

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
    stages: [...stages],
    indexes: [...indexes],
  };
}

async function main() {
  const client = new MongoClient(URI, { maxPoolSize: 16 });
  const database = client.db(DB_NAME);
  const collection = database.collection('orders');

  try {
    await client.connect();
    await collection.drop().catch((error) => {
      if (error.codeName !== 'NamespaceNotFound' && error.code !== 26) throw error;
    });

    const users = Array.from({ length: USER_COUNT }, () => new ObjectId());
    const batchSize = 2_000;
    for (let offset = 0; offset < DOCUMENT_COUNT; offset += batchSize) {
      const batch = Array.from(
        { length: Math.min(batchSize, DOCUMENT_COUNT - offset) },
        (_, position) => {
          const index = offset + position;
          const createdAt = new Date(1_700_000_000_000 + index * 1_000);
          return {
            userId: users[index % USER_COUNT],
            tableId: users[(index * 7) % USER_COUNT],
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
        },
      );
      await collection.insertMany(batch, { ordered: false });
    }
    await collection.createIndex(INDEX, { name: INDEX_NAME });

    const targetUser = users[42];
    const filter = { userId: targetUser };
    const runQuery = async (hint) => {
      const rows = await collection
        .find(filter)
        .sort(SORT)
        .limit(LIMIT)
        .hint(hint)
        .toArray();
      if (rows.length !== LIMIT) throw new Error(`Expected ${LIMIT} rows, got ${rows.length}`);
    };

    async function runLoad(hint) {
      await Promise.all(
        Array.from({ length: VIRTUAL_USERS }, async () => {
          for (let i = 0; i < WARMUPS_PER_USER; i += 1) await runQuery(hint);
        }),
      );

      const startedAt = performance.now();
      const workerSamples = await Promise.all(
        Array.from({ length: VIRTUAL_USERS }, async () => {
          const latencies = [];
          for (let i = 0; i < QUERIES_PER_USER; i += 1) {
            const queryStartedAt = performance.now();
            await runQuery(hint);
            latencies.push(performance.now() - queryStartedAt);
          }
          return latencies;
        }),
      );
      const elapsedMs = performance.now() - startedAt;
      const samples = workerSamples.flat();
      const meanMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      return {
        virtualUsers: VIRTUAL_USERS,
        queriesPerUser: QUERIES_PER_USER,
        samples: samples.length,
        elapsedMs: Number(elapsedMs.toFixed(1)),
        meanMs: Number(meanMs.toFixed(3)),
        medianMs: Number(percentile(samples, 0.5).toFixed(3)),
        p95Ms: Number(percentile(samples, 0.95).toFixed(3)),
        throughputQueriesPerSecond: Number((samples.length * 1000 / elapsedMs).toFixed(1)),
      };
    }

    const noIndexPlan = summarizePlan(
      await collection.find(filter).sort(SORT).limit(LIMIT).hint({ $natural: 1 }).explain('executionStats'),
    );
    const indexedPlan = summarizePlan(
      await collection.find(filter).sort(SORT).limit(LIMIT).hint(INDEX_NAME).explain('executionStats'),
    );
    // Same data and query, forced plans. The natural scan runs first so its
    // collection pages are warm before both measured phases.
    const noIndex = await runLoad({ $natural: 1 });
    const indexed = await runLoad(INDEX_NAME);

    console.log(JSON.stringify({
      benchmark: 'four_concurrent_order_history_users',
      mongodbVersion: (await client.db('admin').command({ buildInfo: 1 })).version,
      generatedAtUtc: new Date().toISOString(),
      datasetDocuments: DOCUMENT_COUNT,
      targetUserMatchingDocuments: DOCUMENT_COUNT / USER_COUNT,
      returnedPerQuery: LIMIT,
      index: INDEX,
      noIndexPlan,
      indexedPlan,
      noIndex,
      indexed,
      throughputSpeedup: Number((indexed.throughputQueriesPerSecond / noIndex.throughputQueriesPerSecond).toFixed(2)),
      meanLatencyReductionPercent: Number(((1 - indexed.meanMs / noIndex.meanMs) * 100).toFixed(1)),
    }, null, 2));
  } finally {
    await database.dropDatabase().catch(() => {});
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
