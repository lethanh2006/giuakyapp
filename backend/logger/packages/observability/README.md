# @nrapp/observability

Package CommonJS dùng chung cho backend NRApp, gồm Pino JSON logger, Nest logger
adapter, phân loại lỗi an toàn và correlation bằng `request_id`.

```ts
import {
  createAppLogger,
  PinoNestLogger,
  runWithLogContext,
} from '@nrapp/observability';

const rootLogger = createAppLogger({ serviceName: 'payment' });
const nestLogger = new PinoNestLogger(rootLogger, 'Payment');

runWithLogContext({ request_id: 'req-123' }, () => {
  rootLogger.info({ 'event.name': 'payment.created' }, 'Payment created');
});
```

Production và test mặc định xuất JSON. Có thể đặt `LOG_FORMAT=pretty` khi phát
triển cục bộ và `LOG_LEVEL` để chọn mức log. Logger tự che các field nhạy cảm;
không đưa raw body, authorization header hoặc credential vào log.

Request middleware của mỗi service dùng `createRequestCorrelation` với header
`x-request-id`, sau đó gọi `runWithLogContext`. Nhờ AsyncLocalStorage, mọi log
trong request đó tự có `request_id` mà không cần truyền tay qua từng hàm.
