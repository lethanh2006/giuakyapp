// Execute inside the built Chat container. Uses isolated collections and cleans up.
const assert = require('node:assert/strict');
const serviceRequire = require('node:module').createRequire('/workspace/service/package.json');
const mongoose = serviceRequire('mongoose');
const { ChatSchema } = require('/workspace/service/dist/schemas/chat.schema');
const { MessageSchema } = require('/workspace/service/dist/schemas/message.schema');
const { ChatService } = require('/workspace/service/dist/modules/chat/chat.service');

async function main() {
  const prefix = 'nrapp_perf_check_' + Date.now();
  const connection = await mongoose.createConnection(process.env.MONGO_URL, {
    dbName: 'nrapp', maxPoolSize: 2, serverSelectionTimeoutMS: 10000,
  }).asPromise();
  const Chat = connection.model('CheckChat', ChatSchema, prefix + '_chats');
  const Message = connection.model('CheckMessage', MessageSchema, prefix + '_messages');
  try {
    await Promise.all([Chat.init(), Message.init()]);
    const viewer = String(new mongoose.Types.ObjectId());
    const peer = String(new mongoose.Types.ObjectId());
    const missingPeer = String(new mongoose.Types.ObjectId());
    const [first, second, foreign] = await Chat.create([
      { users: [viewer, peer] },
      { users: [viewer, missingPeer] },
      { users: [peer, missingPeer] },
    ]);
    await Message.create([
      { chatId: first._id, sender: peer, seen: false },
      { chatId: first._id, sender: peer, seen: false },
      { chatId: first._id, sender: viewer, seen: false },
      { chatId: first._id, sender: peer, seen: true },
      { chatId: foreign._id, sender: peer, seen: false },
    ]);
    let batchCalls = 0;
    const service = new ChatService(Chat, Message, {
      getUsers: async ids => {
        batchCalls++;
        assert.deepEqual(new Set(ids), new Set([peer, missingPeer]));
        return [{ _id: peer, username: 'Public peer' }];
      },
    }, {}, {}, { warn: () => {}, error: () => {} });
    const result = await service.getAllChats({ _id: viewer, role: 'user' });
    assert.equal(result.chats.length, 2);
    const byId = new Map(result.chats.map(row => [String(row.chat._id), row]));
    assert.equal(byId.get(String(first._id)).chat.unseenCount, 2);
    assert.equal(byId.get(String(second._id)).chat.unseenCount, 0);
    assert.deepEqual(byId.get(String(first._id)).user, {
      user: { _id: peer, username: 'Public peer' },
    });
    assert.deepEqual(byId.get(String(second._id)).user, {
      _id: missingPeer, name: 'Unknown User',
    });
    assert.equal(batchCalls, 1);
    console.log('Chat DB check passed: ownership, unread counts, public fields, missing peer fallback.');
  } finally {
    for (const model of [Chat, Message]) {
      await model.collection.drop().catch(error => {
        if (error.code !== 26) throw error;
      });
    }
    await connection.close();
  }
}
main().catch(error => { console.error(error.name, error.code || ''); process.exitCode = 1; });
