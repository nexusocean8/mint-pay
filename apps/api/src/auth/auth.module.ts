import { Module } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { AdminKeyGuard } from './admin-key.guard';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [ApiKeyGuard, AdminKeyGuard, AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, ApiKeyGuard, AdminKeyGuard],
})
export class AuthModule {}
