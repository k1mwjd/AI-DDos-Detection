import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 👈 프론트엔드가 자유롭게 API를 호출할 수 있도록 CORS를 활성화합니다.
  app.enableCors({
    origin: '*', // 실배포시에는 프론트엔드 주소만 적어주는 것이 좋습니다.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  await app.listen(3000); // NestJS는 3000번 포트에서 실행됩니다.
}
bootstrap();