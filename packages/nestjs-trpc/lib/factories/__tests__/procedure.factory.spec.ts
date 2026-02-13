import { Test, TestingModule } from '@nestjs/testing';
import { ProcedureFactory } from '../procedure.factory';
import { MetadataScanner, ModuleRef } from '@nestjs/core';
import { z } from 'zod';
import { TRPCProcedureBuilder, TRPCError, initTRPC } from '@trpc/server';
import { ProcedureFactoryMetadata, ProcedureParamDecoratorType } from '../../interfaces/factory.interface';
import { TRPCMiddleware } from '../../interfaces';
import { Ctx, Input, UseMiddlewares, Options, Query, Mutation, Subscription } from '../../decorators';
import { ProcedureType } from '../../trpc.enum';
import { TRPC_LOGGER } from '../../trpc.constants';

describe('ProcedureFactory', () => {
  let procedureFactory: ProcedureFactory;
  let metadataScanner: jest.Mocked<MetadataScanner>
  let moduleRef: ModuleRef;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcedureFactory,
        {
          provide: TRPC_LOGGER,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: MetadataScanner,
          useValue: {
            getAllMethodNames: jest.fn(),
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
    metadataScanner = module.get(MetadataScanner);
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
        @UseMiddlewares(ProtectedMiddleware)
        async getUserById(@Input("userId") userId: string, @Ctx() ctx: any, @Options() opts: any): Promise<any> {
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

      metadataScanner.getAllMethodNames.mockImplementation(
        (prototype: object | null) => {
          return ['getUserById'];
        }
      );

      const result = procedureFactory.getProcedures(mockInstance, mockPrototype);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'getUserById',
        type: ProcedureType.Query,
        input: expect.any(Object),
        output: expect.any(Object),
        middlewares: [ProtectedMiddleware],
        params: [
          { type: 'options', index: 2 },
          { type: 'ctx', index: 1 },
          { type: 'input', index: 0, key: 'userId' },
        ],
      });
    });

    it('should extract meta from @Query decorator', () => {
      const procedureMeta = { roles: ['admin'] };

      class AdminRouter {
        @Query({
          input: z.object({ id: z.string() }),
          meta: procedureMeta,
        })
        async getAdmin(@Input("id") id: string): Promise<any> {
          return { id };
        }
      }

      const mockInstance = new AdminRouter();
      const mockPrototype = Object.getPrototypeOf(mockInstance);

      metadataScanner.getAllMethodNames.mockImplementation(() => ['getAdmin']);

      const result = procedureFactory.getProcedures(mockInstance, mockPrototype);

      expect(result).toHaveLength(1);
      expect(result[0].meta).toEqual(procedureMeta);
    });

    it('should extract meta from @Mutation decorator', () => {
      const procedureMeta = { roles: ['admin'], requiresAuth: true };

      class AdminRouter {
        @Mutation({
          input: z.object({ name: z.string() }),
          meta: procedureMeta,
        })
        async createItem(@Input("name") name: string): Promise<any> {
          return { name };
        }
      }

      const mockInstance = new AdminRouter();
      const mockPrototype = Object.getPrototypeOf(mockInstance);

      metadataScanner.getAllMethodNames.mockImplementation(() => ['createItem']);

      const result = procedureFactory.getProcedures(mockInstance, mockPrototype);

      expect(result).toHaveLength(1);
      expect(result[0].meta).toEqual(procedureMeta);
      expect(result[0].type).toBe(ProcedureType.Mutation);
    });

    it('should set meta to undefined when not provided in decorator', () => {
      class PublicRouter {
        @Query({ input: z.object({ id: z.string() }) })
        async getData(@Input("id") id: string): Promise<any> {
          return { id };
        }
      }

      const mockInstance = new PublicRouter();
      const mockPrototype = Object.getPrototypeOf(mockInstance);

      metadataScanner.getAllMethodNames.mockImplementation(() => ['getData']);

      const result = procedureFactory.getProcedures(mockInstance, mockPrototype);

      expect(result).toHaveLength(1);
      expect(result[0].meta).toBeUndefined();
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
          meta: undefined,
          type: ProcedureType.Query,
          middlewares: [ProtectedMiddleware],
          name: 'getUserById',
          implementation: jest.fn(),
          params: [
            { type: ProcedureParamDecoratorType.Input, index: 0, key: 'userId' },
            { type:  ProcedureParamDecoratorType.Ctx, index: 1 },
            { type:  ProcedureParamDecoratorType.Options, index: 2 },
          ],
        },
      ];

      const mockInstance = { 
        constructor: class UserRouter {},
        getUserById: jest.fn(),
      };

      const t = initTRPC.context().create();
      const mockProcedureBuilder = t.procedure;
      
      (moduleRef.get as jest.Mock).mockReturnValue(mockInstance);

      const result = procedureFactory.serializeProcedures(
        mockProcedures,
        mockInstance,
        'users',
        mockProcedureBuilder,
        []
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

      expect(result.getUserById._def.type).toBe('query');
    });

    it('should attach meta to the procedure when provided', () => {
      const t = initTRPC.context().create();
      const mockProcedureBuilder = t.procedure;

      const procedureMeta = { roles: ['admin', 'editor'] };

      const mockProcedures: Array<ProcedureFactoryMetadata> = [
        {
          input: z.object({ id: z.string() }),
          output: undefined,
          meta: procedureMeta,
          type: ProcedureType.Query,
          middlewares: [],
          name: 'getProtectedData',
          implementation: jest.fn(),
          params: [
            { type: ProcedureParamDecoratorType.Input, index: 0, key: 'id' },
          ],
        },
      ];

      const mockInstance = {
        constructor: class ProtectedRouter {},
        getProtectedData: jest.fn(),
      };

      (moduleRef.get as jest.Mock).mockReturnValue(mockInstance);

      const result = procedureFactory.serializeProcedures(
        mockProcedures,
        mockInstance,
        'protected',
        mockProcedureBuilder,
        [],
      );

      expect(result.getProtectedData._def.meta).toEqual(procedureMeta);
    });

    it('should not set meta on the procedure when meta is undefined', () => {
      const t = initTRPC.context().create();
      const mockProcedureBuilder = t.procedure;

      const mockProcedures: Array<ProcedureFactoryMetadata> = [
        {
          input: undefined,
          output: undefined,
          meta: undefined,
          type: ProcedureType.Query,
          middlewares: [],
          name: 'getPublicData',
          implementation: jest.fn(),
          params: [],
        },
      ];

      const mockInstance = {
        constructor: class PublicRouter {},
        getPublicData: jest.fn(),
      };

      (moduleRef.get as jest.Mock).mockReturnValue(mockInstance);

      const result = procedureFactory.serializeProcedures(
        mockProcedures,
        mockInstance,
        'public',
        mockProcedureBuilder,
        [],
      );

      expect(result.getPublicData._def.meta).toBeUndefined();
    });

    it('should attach meta to a mutation procedure', () => {
      const t = initTRPC.context().create();
      const mockProcedureBuilder = t.procedure;

      const procedureMeta = { requiresAuth: true, roles: ['admin'] };

      const mockProcedures: Array<ProcedureFactoryMetadata> = [
        {
          input: z.object({ name: z.string() }),
          output: undefined,
          meta: procedureMeta,
          type: ProcedureType.Mutation,
          middlewares: [],
          name: 'createItem',
          implementation: jest.fn(),
          params: [
            { type: ProcedureParamDecoratorType.Input, index: 0, key: 'name' },
          ],
        },
      ];

      const mockInstance = {
        constructor: class ItemRouter {},
        createItem: jest.fn(),
      };

      (moduleRef.get as jest.Mock).mockReturnValue(mockInstance);

      const result = procedureFactory.serializeProcedures(
        mockProcedures,
        mockInstance,
        'items',
        mockProcedureBuilder,
        [],
      );

      expect(result.createItem._def.meta).toEqual(procedureMeta);
    });

    it('should serialize a subscription procedure', () => {
      const t = initTRPC.context().create();
      const mockProcedureBuilder = t.procedure;

      const mockProcedures: Array<ProcedureFactoryMetadata> = [
        {
          input: z.object({ channelId: z.string() }),
          output: z.object({ message: z.string() }),
          meta: undefined,
          type: ProcedureType.Subscription,
          middlewares: [],
          name: 'onMessage',
          implementation: jest.fn(),
          params: [
            { type: ProcedureParamDecoratorType.Input, index: 0, key: 'channelId' },
          ],
        },
      ];

      const mockInstance = {
        constructor: class EventRouter {},
        onMessage: jest.fn(),
      };

      (moduleRef.get as jest.Mock).mockReturnValue(mockInstance);

      const result = procedureFactory.serializeProcedures(
        mockProcedures,
        mockInstance,
        'events',
        mockProcedureBuilder,
        [],
      );

      expect(result).toHaveProperty('onMessage');
      expect(typeof result.onMessage).toBe('function');
      expect(result.onMessage._def).toBeDefined();
      expect(result.onMessage._def.type).toBe('subscription');
      expect(result.onMessage._def.inputs[0]).toEqual(mockProcedures[0].input);
      expect(result.onMessage._def.output).toEqual(mockProcedures[0].output);
    });

    it('should extract subscription procedure from getProcedures', () => {
      class EventRouter {
        @Subscription({
          input: z.object({ channelId: z.string() }),
          output: z.object({ message: z.string() }),
        })
        async *onMessage(@Input("channelId") channelId: string): AsyncGenerator<any> {
          yield { message: 'test' };
        }
      }

      const mockInstance = new EventRouter();
      const mockPrototype = Object.getPrototypeOf(mockInstance);

      metadataScanner.getAllMethodNames.mockImplementation(() => ['onMessage']);

      const result = procedureFactory.getProcedures(mockInstance, mockPrototype);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'onMessage',
        type: ProcedureType.Subscription,
        input: expect.any(Object),
        output: expect.any(Object),
      });
    });

    it('should attach meta alongside input, output, and middlewares', () => {
      const t = initTRPC.context().create();
      const mockProcedureBuilder = t.procedure;

      class AuthMiddleware implements TRPCMiddleware {
        use(opts: any) {
          return opts.next();
        }
      }

      const procedureMeta = { roles: ['admin'] };
      const inputSchema = z.object({ id: z.string() });
      const outputSchema = z.object({ id: z.string(), name: z.string() });

      const mockProcedures: Array<ProcedureFactoryMetadata> = [
        {
          input: inputSchema,
          output: outputSchema,
          meta: procedureMeta,
          type: ProcedureType.Query,
          middlewares: [AuthMiddleware],
          name: 'getProtectedItem',
          implementation: jest.fn(),
          params: [
            { type: ProcedureParamDecoratorType.Input, index: 0, key: 'id' },
          ],
        },
      ];

      const mockInstance = {
        constructor: class ProtectedRouter {},
        getProtectedItem: jest.fn(),
      };

      (moduleRef.get as jest.Mock).mockReturnValue(mockInstance);

      const result = procedureFactory.serializeProcedures(
        mockProcedures,
        mockInstance,
        'protected',
        mockProcedureBuilder,
        [],
      );

      expect(result.getProtectedItem._def.meta).toEqual(procedureMeta);
      expect(result.getProtectedItem._def.inputs[0]).toEqual(inputSchema);
      expect(result.getProtectedItem._def.output).toEqual(outputSchema);
      expect(result.getProtectedItem._def.middlewares.length).toBeGreaterThan(0);
    });
  });
});