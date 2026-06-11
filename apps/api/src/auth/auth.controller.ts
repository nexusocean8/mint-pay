import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateDto } from './dto/user.dto';
import {
  AccessTokenResponseDto,
  MeResponseDto,
  UpdateResponseDto,
  StatusResponseDto,
} from './dto/auth-response.dto';
import { GetUser } from '../decorators/get-user';
import { PayloadDto } from './dto/payload.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Check whether an admin user has been registered' })
  @ApiResponse({ status: 200, type: StatusResponseDto })
  @Get('status')
  async status(): Promise<StatusResponseDto> {
    return await this.authService.status();
  }

  @ApiOperation({ summary: 'Get current admin user' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: MeResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@GetUser() user: PayloadDto): Promise<MeResponseDto> {
    return await this.authService.me(user.sub);
  }

  @ApiOperation({
    summary: 'Register admin user',
    description: 'Only succeeds once. Returns 403 if an admin already exists.',
  })
  @ApiResponse({ status: 201, type: AccessTokenResponseDto })
  @ApiResponse({ status: 403, description: 'Admin user already registered' })
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<AccessTokenResponseDto> {
    const access_token = await this.authService.register(registerDto);
    return { access_token };
  }

  @ApiOperation({ summary: 'Login as admin' })
  @ApiResponse({ status: 200, type: AccessTokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @HttpCode(200)
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AccessTokenResponseDto> {
    const access_token = await this.authService.login(loginDto);
    return { access_token };
  }

  @ApiOperation({ summary: 'Update admin email or password' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: UpdateResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or missing token',
  })
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  async update(
    @GetUser() user: PayloadDto,
    @Body() updateDto: UpdateDto,
  ): Promise<UpdateResponseDto> {
    return await this.authService.update(user.sub, updateDto);
  }
}
