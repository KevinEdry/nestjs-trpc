// File name: procedure.factory.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ProcedureFactory } from '../procedure.factory';
import { ConsoleLogger } from '@nestjs/common';
import { MetadataScanner, ModuleRef } from '@nestjs/core';
import { PROCEDURE_METADATA_KEY, PROCEDURE_TYPE_KEY, MIDDLEWARE_KEY, PROCEDURE_PARAM_METADATA_KEY } from '../../trpc.constants';
import { z } from 'zod';
import { ProcedureBuilder, TRPCError, initTRPC } from '@trpc/server';
import { ProcedureFactoryMetadata, ProcedureParamDecoratorType } from '../../interfaces/factory.interface';
import { TRPCMiddleware } from '../../interfaces';
import { Context, Input, Middlewares, Options, Query } from '../../decorators';
import { ProcedureType } from '../../trpc.enum';

describe('ProcedureFactory', () => {
  let procedureFactory: ProcedureFactory;
  let moduleRef: ModuleRef;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcedureFactory,
        {
          provide: ConsoleLogger,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: MetadataScanner,
          useValue: {
            scanFromPrototype: jest.fn(),
          },
        },
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    procedureFactory = module.get<ProcedureFactory>(ProcedureFactory);
    moduleRef = module.get<ModuleRef>(ModuleRef);
  });

  describe('getProcedures', () => {
    it('should return procedures', () => {
      const userSchema = z.object({
        id: z.string(),
        name: z.string(),
      });

      class UserService {
        async getUser(userId: string) {
          return { id: userId, name: 'Test User' };
        }
      }

      class ProtectedMiddleware implements TRPCMiddleware {
        use(opts: any) {
          return opts;
        }
      }

      class UserRouter {
        constructor(private readonly userService: UserService) {}

        @Query({          
          input: z.object({ userId: z.string() }),
          output: userSchema
        })
        @Middlewares(ProtectedMiddleware)
        async getUserById(@Input("userId") userId: string, @Context() ctx: any, @Options() opts: any): Promise<any> {
          const user = await this.userService.getUser(userId);
          if (ctx.ben) {
            throw new TRPCError({
              message: 'Could not find user.',
              code: 'NOT_FOUND',
            });
          }
          return user;
        }
      }

      const mockInstance = new UserRouter(new UserService());
      const mockPrototype = Object.getPrototypeOf(mockInstance);

      (procedureFactory['metadataScanner'].scanFromPrototype as jest.Mock).mockImplementation(
        (instance, prototype, callback) => {
          return [callback('getUserById', prototype)];
        }
      );

      const result = procedureFactory.getProcedures(mockInstance, mockPrototype);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'getUserById',
        type: ProcedureType.Query,
        input: expect.any(Object),
        output: expect.any(Object),
        middlewares: ProtectedMiddleware,
        params: [
          { type: 'options', index: 2 },
          { type: 'ctx', index: 1 },
          { type: 'input', index: 0, key: 'userId' },
        ],
      });
    });
  });

  describe('serializeProcedures', () => {
    it('should serialize procedures into a trpc procedure', () => {
      const userSchema = z.object({
        id: z.string(),
        name: z.string(),
      });

      class ProtectedMiddleware implements TRPCMiddleware {
        use(opts: any) {
          return opts;
        }
      }

      const mockProcedures: Array<ProcedureFactoryMetadata> = [
        {
          input: z.object({ userId: z.string() }),
          output: userSchema,
          type: 'query',
          middlewares: ProtectedMiddleware,
          name: 'getUserById',
          implementation: jest.fn(),
          params: [
            { type: ProcedureParamDecoratorType.Input, index: 0, key: 'userId' },
            { type:  ProcedureParamDecoratorType.Context, index: 1 },
            { type:  ProcedureParamDecoratorType.Options, index: 2 },
          ],
        },
      ];

      const mockInstance = { 
        constructor: class UserRouter {},
        getUserById: jest.fn(),
      };

      const t = initTRPC.context().create();
      const mockProcedureBuilder: ProcedureBuilder<any> = t.procedure;
      
      (moduleRef.get as jest.Mock).mockReturnValue(mockInstance);

      const result = procedureFactory.serializeProcedures(
        mockProcedures,
        mockInstance,
        'users',
        mockProcedureBuilder,
        undefined
      );

      expect(result).toHaveProperty('getUserById');
      
      expect(typeof result.getUserById).toBe('function');
      expect(result.getUserById._def).toBeDefined();
      expect(result.getUserById._def.inputs).toBeDefined();
      expect(result.getUserById._def.output).toBeDefined();
      
      expect(result.getUserById._def.inputs[0]).toEqual(mockProcedures[0].input);
      expect(result.getUserById._def.output).toEqual(mockProcedures[0].output);

      // The middleware number here is 3 and not 1 because we append the input and output middlewares before the `ProtectedMiddleware`.
      expect(result.getUserById._def.middlewares.length).toBe(3);

      expect(result.getUserById._def.query).toBeDefined();
    });
  });
});