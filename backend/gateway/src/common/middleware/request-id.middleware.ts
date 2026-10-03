import { Injectable, NestMiddleware } from '@nestjs/common';
import {
  CLIENT_REQUEST_ID_HEADER,
  REQUEST_ID_HEADER,
  createRequestCorrelation,
  runWithLogContext,
} from '@nrapp/observability';
import type { NextFunction, Response } from 'express';
import type { RequestWithContext } from '../interfaces/request-context.interface';

export {
  CLIENT_REQUEST_ID_HEADER,
  REQUEST_ID_HEADER,
} from '@nrapp/observability';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    request: RequestWithContext,
    response: Response,
    next: NextFunction,
  ): void {
    const incomingRequestId = request.headers[REQUEST_ID_HEADER];
    const { requestId, clientRequestId } = createRequestCorrelation(
      incomingRequestId,
      { trustIncoming: false },
    );

    request.requestContext = {
      requestId,
      ...(clientRequestId ? { clientRequestId } : {}),
    };
    request.headers[REQUEST_ID_HEADER] = requestId;
    if (clientRequestId) {
      request.headers[CLIENT_REQUEST_ID_HEADER] = clientRequestId;
    } else {
      delete request.headers[CLIENT_REQUEST_ID_HEADER];
    }
    response.setHeader(REQUEST_ID_HEADER, requestId);
    runWithLogContext(
      {
        request_id: requestId,
        ...(clientRequestId ? { client_request_id: clientRequestId } : {}),
      },
      () => next(),
    );
  }
}
