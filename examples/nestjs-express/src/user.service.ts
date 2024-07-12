import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { User } from './user.schema';

@Injectable()
export class UserService {
  async test(): Promise<string> {
    return 'test';
  }

  async getUser(userId: string): Promise<User> {
    return;
  }
}
