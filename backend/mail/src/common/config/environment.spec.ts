import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  const required = {
    SMTP_USER: 'mailer@example.com',
    SMTP_PASS: 'app-password',
  };

  it('chuẩn hóa cấu hình mặc định', () => {
    const config = validateEnvironment(required);

    expect(config).toMatchObject({
      PORT: 5001,
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: 465,
      SMTP_SECURE: true,
      SMTP_CONNECTION_TIMEOUT_MS: 3000,
      SMTP_AUTH: true,
      MAIL_FROM: 'mailer@example.com',
      RABBITMQ_HOST: 'localhost',
      RABBITMQ_PORT: 5672,
      MAIL_QUEUE: 'send-otp',
      MAIL_PREFETCH: 5,
      MAIL_RETRY_QUEUE: 'send-otp.retry',
      MAIL_DEAD_LETTER_QUEUE: 'send-otp.dlq',
      MAIL_MAX_RETRIES: 5,
      MAIL_RETRY_DELAY_MS: 5000,
    });
  });

  it('hỗ trợ tên biến RabbitMQ cũ trong giai đoạn chuyển đổi', () => {
    const config = validateEnvironment({
      ...required,
      Rabbitmq_Host: 'rabbitmq',
      Rabbitmq_Port: '5673',
      Rabbitmq_Username: 'legacy-user',
      Rabbitmq_Password: 'legacy-password',
    });

    expect(config).toMatchObject({
      RABBITMQ_HOST: 'rabbitmq',
      RABBITMQ_PORT: 5673,
      RABBITMQ_USER: 'legacy-user',
      RABBITMQ_PASSWORD: 'legacy-password',
    });
  });

  it('dừng khởi động khi thiếu thông tin SMTP bắt buộc', () => {
    expect(() =>
      validateEnvironment({ SMTP_USER: 'mailer@example.com' }),
    ).toThrow('SMTP_PASS');
  });

  it('cho phép Mailpit local không cần tài khoản SMTP', () => {
    const config = validateEnvironment({
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1025',
      SMTP_AUTH: 'false',
      SMTP_SECURE: 'false',
      MAIL_FROM: 'NRApp Local <noreply@nrapp.local>',
    });

    expect(config).toMatchObject({
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: 1025,
      SMTP_AUTH: false,
      SMTP_SECURE: false,
      SMTP_USER: '',
      SMTP_PASS: '',
      MAIL_FROM: 'NRApp Local <noreply@nrapp.local>',
    });
  });

  it('từ chối port không hợp lệ', () => {
    expect(() =>
      validateEnvironment({ ...required, SMTP_PORT: 'invalid' }),
    ).toThrow('SMTP_PORT');
  });
});
