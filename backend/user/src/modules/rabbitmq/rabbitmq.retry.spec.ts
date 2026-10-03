import { EventEmitter } from 'node:events';
import { RabbitMQService } from './rabbitmq.service';

describe('User lưu retry/DLQ trước khi ack', () => {
  function setup() {
    const channel = Object.assign(new EventEmitter(), {
      assertQueue: jest.fn().mockResolvedValue(undefined),
      sendToQueue: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
    });
    const service = new RabbitMQService({} as never) as unknown as {
      retryOrPark: (
        channel: unknown,
        queue: string,
        message: unknown,
        retryable: boolean,
      ) => Promise<void>;
    };
    const message = {
      content: Buffer.from('{}'),
      properties: { headers: { 'x-request-id': 'req' } },
    };
    return { service, channel, message };
  }
  it.each([true, false])(
    'chờ confirm của hàng đợi lỗi, retryable=%s',
    async (retryable) => {
      const { service, channel, message } = setup();
      const pending = service.retryOrPark(
        channel,
        'user-profile-sync',
        message,
        retryable,
      );
      await new Promise((resolve) => setImmediate(resolve));
      expect(channel.ack).not.toHaveBeenCalled();
      const callback = (channel.sendToQueue.mock.calls[0] as unknown[])[3] as (
        error: Error | null,
      ) => void;
      callback(null);
      await pending;
      expect(channel.ack).toHaveBeenCalledWith(message);
      expect(channel.nack).not.toHaveBeenCalled();
      expect(channel.assertQueue).toHaveBeenCalledWith(
        `user-profile-sync.${retryable ? 'retry' : 'dead'}`,
        expect.objectContaining({ durable: true }),
      );
      if (retryable)
        expect(channel.assertQueue).toHaveBeenCalledWith(
          'user-profile-sync.retry',
          {
            durable: true,
            arguments: {
              'x-queue-type': 'quorum',
              'x-message-ttl': 5000,
              'x-dead-letter-exchange': '',
              'x-dead-letter-routing-key': 'user-profile-sync',
              'x-dead-letter-strategy': 'at-least-once',
              'x-overflow': 'reject-publish',
            },
          },
        );
    },
  );
  it('confirm lỗi thì requeue bản gốc, không ack', async () => {
    const { service, channel, message } = setup();
    const pending = service.retryOrPark(
      channel,
      'user-profile-sync',
      message,
      true,
    );
    await new Promise((resolve) => setImmediate(resolve));
    const callback = (channel.sendToQueue.mock.calls[0] as unknown[])[3] as (
      error: Error,
    ) => void;
    callback(new Error('Broker nack'));
    await pending;
    expect(channel.nack).toHaveBeenCalledWith(message, false, true);
    expect(channel.ack).not.toHaveBeenCalled();
  });
  it('queue bị xóa trước publish thì requeue bản gốc', async () => {
    const { service, channel, message } = setup();
    const pending = service.retryOrPark(
      channel,
      'user-profile-sync',
      message,
      true,
    );
    await new Promise((resolve) => setImmediate(resolve));
    const options = (channel.sendToQueue.mock.calls[0] as unknown[])[2] as {
      messageId: string;
    };
    channel.emit('return', { properties: { messageId: options.messageId } });
    await pending;
    expect(channel.nack).toHaveBeenCalledWith(message, false, true);
    expect(channel.ack).not.toHaveBeenCalled();
  });
});
