import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URL');
        if (!uri) throw new Error('MONGO_URL is not defined');

        return {
          uri,
          dbName: configService.get<string>('MONGO_DB_NAME') || 'nrapp',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
