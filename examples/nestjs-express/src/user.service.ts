import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';

@Injectable()
export class UserService {
  async test(): Promise<string> {
    return 'test';
  }
}
