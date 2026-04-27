import { Module } from '@nestjs/common';
// import { CacheModule } from '@nestjs/cache-manager';
// import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

//Guards 

import { PrismaModule } from './prisma/prisma.module';

//Controllers + Modules 

//Inventory


@Module({
    imports: [ 
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: `.env.${process.env.NODE_ENV}`,
        }), 
        PrismaModule
    ],
    controllers: [

    ],
    providers: [

    ],
})
export class AppModule { }