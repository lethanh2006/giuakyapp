// Cross-service MongoDB index benchmark. Run only inside a disposable MongoDB
// container, never against an application URI or production data.
const { MongoClient, ObjectId } = require('mongodb');

const URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'cross_service_index_benchmark';
const DOCUMENTS_PER_CASE = 30_000;
const BATCH_SIZE = 1_500;
const USERS = 500;
const VIRTUAL_USERS = 4;
const QUERIES_PER_USER = 5;
const SAMPLES = VIRTUAL_USERS * QUERIES_PER_USER;
const WARMUPS_PER_USER = 2;
const PAGE_SIZE = 20;
const NOW = new Date('2026-09-24T00:00:00.000Z');
const BASE_DATE = new Date('2026-01-01T00:00:00.000Z');
const DAY_MS = 86_400_000;

const client = new MongoClient(URI, { maxPoolSize: 8 });
const database = client.db(DB_NAME);
const users = Array.from({ length: USERS }, () => new ObjectId());
const userStrings = users.map((id) => id.toString());
const chats = Array.from({ length: USERS }, () => new ObjectId());
const requests = Array.from({ length: DOCUMENTS_PER_CASE / 10 }, () => new ObjectId());
const categories = Array.from({ length: 500 }, () => new ObjectId());
const targetUser = users[42];
const targetUserString = userStrings[42];
const targetChat = chats[42];
const targetRequest = requests[requests.length - 1];
const targetCategory = categories[42];
const targetTable = users[USERS - 1];
const targetEmail = `user-${DOCUMENTS_PER_CASE - 1}@bench.example`;
const targetToken = `token-${DOCUMENTS_PER_CASE - 1}`;
const timestamp = (n) => new Date(BASE_DATE.getTime() + n * 60_000);

const cases = [
  {
    name: 'auth.credentials.login_email',
    index: { email: 1 },
    indexName: 'email_unique',
    indexOptions: { unique: true },
    filter: { email: targetEmail },
    limit: 1,
    makeDoc: (i) => ({
      email: i === DOCUMENTS_PER_CASE - 1 ? targetEmail : `user-${i}@bench.example`,
      passwordHash: 'synthetic-hash',
      role: 'user',
    }),
  },
  {
    name: 'auth.outbox.pending_publish',
    index: { publishedAt: 1, nextAttemptAt: 1 },
    indexName: 'publishedAt_nextAttemptAt',
    filter: { publishedAt: null, nextAttemptAt: { $lte: NOW } },
    sort: { createdAt: 1, _id: 1 },
    limit: 1,
    makeDoc: (i) => {
      const due = i >= DOCUMENTS_PER_CASE - 1_000;
      return {
        eventId: `event-${i}`,
        publishedAt: due ? null : new Date('2026-08-01T00:00:00Z'),
        nextAttemptAt: due ? new Date('2026-09-01T00:00:00Z') : new Date('2026-10-01T00:00:00Z'),
        createdAt: timestamp(i),
        payload: { userId: userStrings[i % USERS] },
      };
    },
  },
  {
    name: 'chat.user_conversations',
    index: { users: 1, updatedAt: -1 },
    indexName: 'users_updatedAt',
    filter: { users: targetUserString },
    sort: { updatedAt: -1 },
    limit: PAGE_SIZE,
    makeDoc: (i) => ({
      users: [userStrings[i % USERS], userStrings[(i + 1) % USERS]],
      updatedAt: timestamp(i),
    }),
  },
  {
    name: 'chat.message_history',
    index: { chatId: 1, createdAt: 1 },
    indexName: 'chatId_createdAt',
    filter: { chatId: targetChat },
    sort: { createdAt: 1 },
    limit: 50,
    makeDoc: (i) => ({ chatId: chats[i % USERS], sender: userStrings[i % USERS], createdAt: timestamp(i) }),
  },
  {
    name: 'chat.unread_count',
    index: { chatId: 1, seen: 1, sender: 1 },
    indexName: 'chatId_seen_sender',
    pipeline: [
      { $match: { chatId: targetChat, sender: { $ne: targetUserString }, seen: false } },
      { $group: { _id: '$chatId', count: { $sum: 1 } } },
    ],
    makeDoc: (i) => {
      const group = Math.floor(i / USERS);
      return {
        chatId: chats[i % USERS],
        sender: group % 3 === 0 ? targetUserString : userStrings[43],
        seen: group % 2 === 0,
        createdAt: timestamp(i),
      };
    },
  },
  {
    name: 'todo.assigned_tasks',
    index: { assignedTo: 1, createdAt: -1, _id: -1 },
    indexName: 'assignedTo_createdAt_id',
    filter: { assignedTo: targetUser },
    sort: { createdAt: -1, _id: -1 },
    limit: PAGE_SIZE,
    makeDoc: (i) => ({ assignedTo: users[i % USERS], createdBy: users[(i + 1) % USERS], createdAt: timestamp(i) }),
  },
  {
    name: 'todo.created_tasks',
    index: { createdBy: 1, createdAt: -1, _id: -1 },
    indexName: 'createdBy_createdAt_id',
    filter: { createdBy: targetUser },
    sort: { createdAt: -1, _id: -1 },
    limit: PAGE_SIZE,
    makeDoc: (i) => ({ assignedTo: users[(i + 1) % USERS], createdBy: users[i % USERS], createdAt: timestamp(i) }),
  },
  {
    name: 'workschedule.requests.mine_by_week',
    index: { employee_id: 1, week_start: -1 },
    indexName: 'employee_week_start',
    filter: { employee_id: targetUser },
    sort: { week_start: -1 },
    limit: PAGE_SIZE,
    makeDoc: (i) => ({ employee_id: users[i % USERS], week_start: timestamp(i) }),
  },
  {
    name: 'workschedule.requests.pending',
    index: { status: 1, submitted_at: 1 },
    indexName: 'status_submitted_at',
    filter: { status: 'pending' },
    sort: { submitted_at: 1 },
    limit: PAGE_SIZE,
    makeDoc: (i) => ({ status: i % 10 === 0 ? 'pending' : 'approved', submitted_at: timestamp(i) }),
  },
  {
    name: 'workschedule.monthly_request_unique_lookup',
    index: { employee_id: 1, month: 1 },
    indexName: 'employee_month_partial_unique',
    indexOptions: { unique: true, partialFilterExpression: { month: { $type: 'string' } } },
    filter: { employee_id: targetUser, month: '2026-12' },
    limit: 1,
    makeDoc: (i) => {
      const doc = { employee_id: users[i % USERS], week_start: timestamp(i) };
      if (i < USERS * 12) doc.month = `2026-${String(Math.floor(i / USERS) + 1).padStart(2, '0')}`;
      return doc;
    },
  },
  {
    name: 'workschedule.work_requests.mine',
    index: { employee_id: 1, createdAt: -1 },
    indexName: 'employee_createdAt',
    filter: { employee_id: targetUser },
    sort: { createdAt: -1 },
    limit: PAGE_SIZE,
    makeDoc: (i) => ({ employee_id: users[i % USERS], createdAt: timestamp(i), type: 'leave', status: 'pending' }),
  },
  {
    name: 'workschedule.work_requests.duplicate_check',
    index: { employee_id: 1, start_at: -1 },
    indexName: 'employee_start_at',
    filter: {
      employee_id: targetUser,
      type: 'remote',
      start_at: new Date(BASE_DATE.getTime() + 59 * DAY_MS),
      status: { $in: ['pending', 'approved'] },
    },
    limit: 1,
    makeDoc: (i) => {
      const segment = Math.floor(i / USERS);
      return {
        employee_id: i === DOCUMENTS_PER_CASE - 1 ? targetUser : users[i % USERS],
        type: ['leave', 'late', 'early', 'overtime', 'business_trip', 'remote'][segment % 6],
        start_at: new Date(BASE_DATE.getTime() + segment * DAY_MS),
        status: i === DOCUMENTS_PER_CASE - 1 ? 'pending' : ['pending', 'approved', 'rejected', 'cancelled'][i % 4],
        createdAt: timestamp(i),
      };
    },
  },
  {
    name: 'workschedule.work_requests.by_status',
    index: { status: 1, createdAt: -1 },
    indexName: 'status_createdAt',
    filter: { status: 'pending' },
    sort: { createdAt: -1 },
    limit: PAGE_SIZE,
    makeDoc: (i) => ({ status: i % 10 === 0 ? 'pending' : 'approved', createdAt: timestamp(i) }),
  },
  {
    name: 'workschedule.entries.by_request',
    index: { request_id: 1, date: 1 },
    indexName: 'request_date_unique',
    indexOptions: { unique: true },
    filter: { request_id: targetRequest },
    sort: { date: 1 },
    limit: 50,
    makeDoc: (i) => ({ request_id: requests[Math.floor(i / 10)], date: new Date(BASE_DATE.getTime() + (i % 10) * DAY_MS), type: 'office' }),
  },
  {
    name: 'workschedule.attendance.mine',
    index: { employee_id: 1, date: 1, source: 1 },
    indexName: 'employee_date_source_unique',
    indexOptions: { unique: true },
    filter: {
      employee_id: targetUser,
      date: { $gte: new Date(BASE_DATE.getTime() + 30 * DAY_MS), $lte: new Date(BASE_DATE.getTime() + 59 * DAY_MS) },
    },
    sort: { date: -1 },
    limit: PAGE_SIZE,
    makeDoc: (i) => ({ employee_id: users[i % USERS], date: new Date(BASE_DATE.getTime() + Math.floor(i / USERS) * DAY_MS), source: i % 2 ? 'schedule' : 'qr' }),
  },
  {
    name: 'workschedule.attendance.scan_token',
    index: { token: 1 },
    indexName: 'token_unique',
    indexOptions: { unique: true },
    filter: { token: targetToken, date: NOW, expires_at: { $gt: NOW } },
    limit: 1,
    makeDoc: (i) => ({ token: i === DOCUMENTS_PER_CASE - 1 ? targetToken : `token-${i}`, date: NOW, expires_at: new Date(NOW.getTime() + 30_000) }),
  },
  {
    name: 'canteen.orders.all_latest',
    index: { createdAt: -1, _id: -1 },
    indexName: 'createdAt_id',
    filter: {},
    sort: { createdAt: -1, _id: -1 },
    limit: PAGE_SIZE,
    makeDoc: (i) => makeOrder(i),
  },
  {
    name: 'canteen.orders.by_status',
    index: { status: 1, createdAt: -1, _id: -1 },
    indexName: 'status_createdAt_id',
    filter: { status: 'CREATED' },
    sort: { createdAt: -1, _id: -1 },
    limit: PAGE_SIZE,
    makeDoc: (i) => makeOrder(i),
  },
  {
    name: 'canteen.orders.user_history',
    index: { userId: 1, createdAt: -1, _id: -1 },
    indexName: 'userId_createdAt_id',
    filter: { userId: targetUser },
    sort: { createdAt: -1, _id: -1 },
    limit: PAGE_SIZE,
    makeDoc: (i) => makeOrder(i),
  },
  {
    name: 'canteen.orders.active_table_check',
    index: { tableId: 1 },
    indexName: 'tableId',
    filter: { tableId: targetTable, status: { $ne: 'CANCELLED' }, paymentStatus: { $ne: 'PAID' } },
    projection: { _id: 1 },
    limit: 1,
    makeDoc: (i) => {
      const isTargetTable = i % USERS === USERS - 1;
      const isLastTargetTableRow = i === DOCUMENTS_PER_CASE - 1;
      return {
        ...makeOrder(i),
        tableId: users[i % USERS],
        status: isTargetTable && !isLastTargetTableRow ? 'CANCELLED' : 'CREATED',
        paymentStatus: isTargetTable && !isLastTargetTableRow ? 'PAID' : 'PENDING',
      };
    },
  },
  {
    name: 'canteen.menu.public_category',
    index: { categoryId: 1, isAvailable: 1 },
    indexName: 'categoryId_isAvailable',
    filter: { categoryId: targetCategory, isAvailable: true },
    makeDoc: (i) => ({ categoryId: categories[i % categories.length], isAvailable: i % 4 !== 0, name: `Dish ${String(i).padStart(6, '0')}` }),
  },
  {
    name: 'canteen.categories.public_sort',
    index: { displayOrder: 1, name: 1 },
    indexName: 'displayOrder_name',
    filter: {},
    sort: { displayOrder: 1, name: 1 },
    limit: PAGE_SIZE,
    makeDoc: (i) => ({ displayOrder: i % 10, name: `Category ${String(i).padStart(6, '0')}`, isActive: i % 5 !== 0 }),
  },
];

function makeOrder(i) {
  const createdAt = timestamp(i);
  return {
    userId: users[i % USERS],
    tableId: users[(i * 7) % USERS],
    orderNumber: `#${i + 1}`,
    createdAt,
    updatedAt: createdAt,
    status: i % 10 === 0 ? 'CREATED' : 'COMPLETED',
    paymentStatus: i % 10 === 0 ? 'PENDING' : 'PAID',
    paymentMethod: 'CASH',
    totalAmount: 30_000,
    finalAmount: 30_000,
    items: [{ name: 'Cơm', quantity: 1, unitPrice: 30_000 }],
  };
}

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

function resultKeys(rows) {
  return rows.map((row) => JSON.stringify(row, (_key, value) => {
    if (value && typeof value === 'object' && value._bsontype === 'ObjectId') return value.toString();
    return value;
  })).sort();
}

function buildCursor(testCase, collection, hint) {
  if (testCase.pipeline) return collection.aggregate(testCase.pipeline, { hint });
  let cursor = collection.find(testCase.filter, { hint, projection: testCase.projection });
  if (testCase.sort) cursor = cursor.sort(testCase.sort);
  if (testCase.limit) cursor = cursor.limit(testCase.limit);
  return cursor;
}

async function execute(testCase, collection, hint) {
  return buildCursor(testCase, collection, hint).toArray();
}

async function runConcurrentPlan(testCase, collection, hint) {
  await Promise.all(Array.from({ length: VIRTUAL_USERS }, async () => {
    for (let i = 0; i < WARMUPS_PER_USER; i += 1) await execute(testCase, collection, hint);
  }));
  const startedAt = performance.now();
  const workers = await Promise.all(Array.from({ length: VIRTUAL_USERS }, async () => {
    const samples = [];
    let lastRows = [];
    for (let i = 0; i < QUERIES_PER_USER; i += 1) {
      const queryStartedAt = performance.now();
      lastRows = await execute(testCase, collection, hint);
      samples.push(performance.now() - queryStartedAt);
    }
    return { samples, lastRows };
  }));
  const elapsedMs = performance.now() - startedAt;
  return {
    ...summarizeSamples(workers.flatMap((worker) => worker.samples)),
    elapsedMs: Number(elapsedMs.toFixed(1)),
    throughputQueriesPerSecond: Number((SAMPLES * 1000 / elapsedMs).toFixed(1)),
    lastRows: workers[0].lastRows,
  };
}

function summarizeSamples(samples) {
  const meanMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return {
    samples: samples.length,
    meanMs: Number(meanMs.toFixed(3)),
    medianMs: Number(percentile(samples, 0.5).toFixed(3)),
    p95Ms: Number(percentile(samples, 0.95).toFixed(3)),
    operationsPerSecond: Number((1000 / meanMs).toFixed(1)),
  };
}

async function runCase(testCase) {
  const collectionName = testCase.name.replace(/[^a-zA-Z0-9_]/g, '_');
  const collection = database.collection(collectionName);
  await collection.drop().catch((error) => {
    if (error.codeName !== 'NamespaceNotFound' && error.code !== 26) throw error;
  });

  for (let offset = 0; offset < DOCUMENTS_PER_CASE; offset += BATCH_SIZE) {
    const batch = Array.from(
      { length: Math.min(BATCH_SIZE, DOCUMENTS_PER_CASE - offset) },
      (_, position) => testCase.makeDoc(offset + position),
    );
    await collection.insertMany(batch, { ordered: false });
  }
  const indexName = await collection.createIndex(testCase.index, {
    name: testCase.indexName,
    ...testCase.indexOptions,
  });

  const noIndexHint = { $natural: 1 };
  const noIndexPlan = summarizePlan(await buildCursor(testCase, collection, noIndexHint).explain('executionStats'));
  const indexedPlan = summarizePlan(await buildCursor(testCase, collection, indexName).explain('executionStats'));
  const noIndex = await runConcurrentPlan(testCase, collection, noIndexHint);
  const indexed = await runConcurrentPlan(testCase, collection, indexName);
  const left = resultKeys(noIndex.lastRows);
  const right = resultKeys(indexed.lastRows);
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${testCase.name}: indexed and scan queries returned different rows`);
  }

  delete noIndex.lastRows;
  delete indexed.lastRows;
  const result = {
    name: testCase.name,
    index: testCase.index,
    documents: DOCUMENTS_PER_CASE,
    virtualUsers: VIRTUAL_USERS,
    queriesPerUser: QUERIES_PER_USER,
    noIndexPlan,
    indexedPlan,
    noIndex,
    indexed,
    medianLatencyReductionPercent: Number(((1 - indexed.medianMs / noIndex.medianMs) * 100).toFixed(1)),
    medianSpeedup: Number((noIndex.medianMs / indexed.medianMs).toFixed(2)),
  };
  await collection.drop();
  return result;
}

async function main() {
  try {
    await client.connect();
    const results = [];
    for (const testCase of cases) {
      results.push(await runCase(testCase));
    }

    const noIndexAverageMedianMs = results.reduce((sum, row) => sum + row.noIndex.medianMs, 0) / results.length;
    const indexedAverageMedianMs = results.reduce((sum, row) => sum + row.indexed.medianMs, 0) / results.length;
    const averagePerCaseReductionPercent = results.reduce((sum, row) => sum + row.medianLatencyReductionPercent, 0) / results.length;
    const docsExaminedReductionPercent = results.reduce((sum, row) => {
      const before = row.noIndexPlan.docsExamined;
      const after = row.indexedPlan.docsExamined;
      return sum + (before > 0 ? (1 - after / before) * 100 : 0);
    }, 0) / results.length;

    console.log(JSON.stringify({
      benchmark: 'cross_service_existing_mongo_read_indexes',
      mongodbVersion: (await client.db('admin').command({ buildInfo: 1 })).version,
      generatedAtUtc: new Date().toISOString(),
      datasetDocumentsPerCase: DOCUMENTS_PER_CASE,
      samplesPerPlan: SAMPLES,
      virtualUsers: VIRTUAL_USERS,
      queriesPerUser: QUERIES_PER_USER,
      warmupsPerUserPerPlan: WARMUPS_PER_USER,
      indexCases: results.length,
      averaging: 'unweighted arithmetic average across all query cases; not traffic-weighted',
      average: {
        noIndexMedianMs: Number(noIndexAverageMedianMs.toFixed(3)),
        indexedMedianMs: Number(indexedAverageMedianMs.toFixed(3)),
        reductionOfAverageMedianPercent: Number(((1 - indexedAverageMedianMs / noIndexAverageMedianMs) * 100).toFixed(1)),
        averagePerCaseMedianReductionPercent: Number(averagePerCaseReductionPercent.toFixed(1)),
        averagePerCaseMedianLatencyReductionPercent: Number(averagePerCaseReductionPercent.toFixed(1)),
        averageDocsExaminedReductionPercent: Number(docsExaminedReductionPercent.toFixed(2)),
        casesFasterWithIndex: results.filter((row) => row.medianLatencyReductionPercent > 0).length,
      },
      cases: results,
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
