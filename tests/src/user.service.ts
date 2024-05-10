import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';

@Injectable()
export class UserService {
  test(): string {
    return 'mana hama';
  }
}
