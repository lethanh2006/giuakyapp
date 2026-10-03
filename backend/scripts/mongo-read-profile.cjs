// Read-only probe inside Auth container: node - USER_ID < this file.
const mongoose = require('mongoose');
const { performance } = require('node:perf_hooks');

async function main() {
  const userId = process.argv[2];
  if (!mongoose.isValidObjectId(userId)) throw new Error('invalid-user-id');
  const connection = await mongoose.createConnection(process.env.MONGO_URL, {
    dbName: process.env.MONGO_DB_NAME || 'nrapp',
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 2,
  }).asPromise();
  try {
    const db = connection.db;
    const queries = [
      ['credentials', { _id: new mongoose.Types.ObjectId(userId) }, null, 1],
      ['tasks', { assignedTo: new mongoose.Types.ObjectId(userId) }, { createdAt: -1, _id: -1 }, 20],
      ['chats', { users: userId }, { updatedAt: -1 }, 0],
    ];
    for (const [name, filter, sort, limit] of queries) {
      const collection = db.collection(name);
      const cursor = collection.find(filter);
      if (sort) cursor.sort(sort);
      if (limit) cursor.limit(limit);
      const explain = await cursor.explain('executionStats');
      const stages = new Set();
      function walk(value) {
        if (!value || typeof value !== 'object') return;
        if (typeof value.stage === 'string') stages.add(value.stage);
        for (const nested of Object.values(value)) walk(nested);
      }
      walk(explain.queryPlanner.winningPlan);
      const stats = explain.executionStats;
      const indexes = (await collection.listIndexes().toArray()).map(index => index.name);
      console.log(JSON.stringify({
        collection: name, indexes, stages: [...stages], returned: stats.nReturned,
        documents_examined: stats.totalDocsExamined, keys_examined: stats.totalKeysExamined,
        execution_ms: stats.executionTimeMillis,
      }));
    }
    const timings = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      await db.command({ ping: 1 });
      timings.push(performance.now() - start);
    }
    timings.sort((a, b) => a - b);
    console.log(`MongoDB ping wall time median (5 samples): ${timings[2].toFixed(2)}ms`);
  } finally {
    await connection.close();
  }
}
main().catch(error => {
  console.error(`MongoDB profile failed: ${error.name}`);
  process.exitCode = 1;
});
