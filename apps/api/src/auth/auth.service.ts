import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto, LoginDto, UpdateDto } from './dto/user.dto';
import { Model, Types } from 'mongoose';
import * as argon2 from 'argon2';
import { User } from './schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async status(): Promise<{ registered: boolean }> {
    const count = await this.userModel.countDocuments();
    return { registered: count > 0 };
  }

  async me() {
    const user = await this.userModel.findOne();

    if (!user) {
      throw new UnauthorizedException();
    }

    return { email: user.email };
  }

  async register(registerDto: RegisterDto): Promise<string> {
    const adminExists = (await this.userModel.countDocuments()) > 0;

    if (adminExists) {
      throw new ForbiddenException('Admin user already registered');
    }

    const hashedPassword = await argon2.hash(registerDto.password);

    const user = await this.userModel.create({
      email: registerDto.email,
      password: hashedPassword,
    });

    return this.generateToken(user);
  }

  async login(loginDto: LoginDto): Promise<string> {
    const user = await this.validateUser(loginDto);
    return this.generateToken(user);
  }

  async update(updateDto: UpdateDto) {
    const user = await this.userModel.findOne({ email: updateDto.email });

    if (!user) {
      throw new UnauthorizedException();
    }

    const isPasswordValid = await argon2.verify(
      user.password,
      updateDto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const updates: Partial<{ email: string; password: string }> = {};

    if (updateDto.email !== user.email) {
      updates.email = updateDto.email;
    }

    if (updateDto.newPassword) {
      updates.password = await argon2.hash(updateDto.newPassword);
    }

    await this.userModel.findOneAndUpdate({ email: updateDto.email }, updates);

    return { email: updates.email ?? user.email };
  }

  async validateUser(loginDto: LoginDto): Promise<User> {
    const user = await this.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(
      user.password,
      loginDto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private generateToken(user: User): string {
    return this.jwtService.sign({ sub: user._id.toString() });
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(new Types.ObjectId(id));
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email });
  }
}
