import { Injectable } from '@nestjs/common';
import { User } from './user.schema';

export const mop = {
  minimi: true,
};

@Injectable()
export class UserService {
  async test(): Promise<string> {
    return 'test';
  }

  async getUser(userId: string): Promise<User> {
    return {
      name: 'user',
      email: 'user@email.com',
      password: '0000',
    };
  }
}
