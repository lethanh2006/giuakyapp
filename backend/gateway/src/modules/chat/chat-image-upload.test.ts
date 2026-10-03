import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import {
  CHAT_IMAGE_MIME_ERROR,
  filterSupportedChatImage,
  isSupportedChatImageMimeType,
} from './chat-image-upload';

test('chỉ chấp nhận MIME JPEG, PNG và GIF', () => {
  for (const mimeType of ['image/jpeg', 'image/png', 'image/gif']) {
    assert.equal(isSupportedChatImageMimeType(mimeType), true);
  }
  assert.equal(
    isSupportedChatImageMimeType(' IMAGE/JPEG; charset=binary '),
    true,
  );

  let receivedError: Error | null = new Error('callback chưa chạy');
  let accepted = false;
  filterSupportedChatImage({ mimetype: 'image/png' }, (error, acceptFile) => {
    receivedError = error;
    accepted = acceptFile;
  });

  assert.equal(receivedError, null);
  assert.equal(accepted, true);
});

test('từ chối các định dạng image khác trước khi chuyển tiếp', () => {
  for (const mimeType of [
    'image/webp',
    'image/heic',
    'image/svg+xml',
    'application/pdf',
    '',
    undefined,
  ]) {
    let receivedError: Error | null = null;
    let accepted = true;

    filterSupportedChatImage({ mimetype: mimeType }, (error, acceptFile) => {
      receivedError = error;
      accepted = acceptFile;
    });

    assert.equal(accepted, false);
    assert.ok(receivedError instanceof BadRequestException);
    assert.equal(receivedError.message, CHAT_IMAGE_MIME_ERROR);
  }
});
