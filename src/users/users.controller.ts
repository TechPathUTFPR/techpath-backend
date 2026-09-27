import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { UsersService } from './users.service.js';
import { UsersAuthService } from './users-auth.service.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersAuthService: UsersAuthService,
  ) {}

  /** Cadastro de um novo usuário (estudante/profissional). */
  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    const user = await this.usersService.register(registerUserDto);
    const accessToken = await this.usersAuthService.signToken(user);

    return { accessToken, user };
  }

  /** Login de um usuário já cadastrado, para acessar o questionário. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginUserDto: LoginUserDto) {
    const user = await this.usersService.validateCredentials(loginUserDto);
    const accessToken = await this.usersAuthService.signToken(user);

    return { accessToken, user };
  }
}
