import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'], // opcional pero útil
    });

    console.log('DATABASE_URL:', process.env.DATABASE_URL);
  }

  async onModuleInit() {
    await this.$connect();
    console.log('🟢 Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔴 Prisma disconnected');
  }
}