import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'; 


async function bootstrap() {
    const app = await NestFactory.create(AppModule);


    // Validation Pipes
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // elimina propiedades no definidas en DTO
            forbidNonWhitelisted: true, // lanza error si mandan propiedades extra
            transform: true, // convierte tipos automáticamente
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );// Elimina campos no definidos en el DTO esto es aplicando lo de forma global a toda la aplicación, también se puede aplicar a nivel de controlador o método

    




    // CORS
    app.enableCors({
        origin: true, // true para permitir cualquier origen o bien un array de origenes permitidos ['http://localhost:3000', 'http://localhost:4200']
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Métodos HTTP permitidos
        preflightContinue: false,// No pasar la respuesta a la siguiente función de middleware, se refiere a la respuesta de la solicitud de preflight OPTIONS
        optionsSuccessStatus: 204 // Código de estado para las respuestas de preflight OPTIONS
    })

    // Versioning
    app.enableVersioning({
        type: VersioningType.URI,
    }); // Habilita la versión de la API



    // Swagger Documentation
    const config = new DocumentBuilder()
        .setTitle('SpeedLink API ⚡')
        .setDescription('Api Description')
        .setVersion('1.0')
        .addBearerAuth()
        // .addApiKey(
        //   {
        //     type: 'apiKey',
        //     name: 'Authorization',
        //     in: 'header',
        //     description: 'Header Authorization obligatorio',
        //   },
        //   'authorization',
        // )
        .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('/developer/api/docs', app, documentFactory);

    // Global Prefix
    app.setGlobalPrefix('api'); // set global prefix for all routes 

    await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();

 