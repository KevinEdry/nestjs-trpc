import { Test, TestingModule } from '@nestjs/testing';
import { RouterFactory } from '../router.factory';
import { ConsoleLogger } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { ProcedureFactory } from '../procedure.factory';
import { ROUTER_METADATA_KEY, MIDDLEWARES_KEY, PROCEDURE_TYPE_KEY, PROCEDURE_METADATA_KEY } from '../../trpc.constants';
import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { TRPCMiddleware } from '../../interfaces';

const { router, procedure } = initTRPC.context().create();

describe('RouterFactory', () => {
  let routerFactory: RouterFactory;
  let modulesContainer: ModulesContainer;
  let procedureFactory: ProcedureFactory;

  beforeEach(async () => {

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouterFactory,
        {
          provide: ConsoleLogger,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: ModulesContainer,
          useValue: new Map(),
        },
        {
          provide: ProcedureFactory,
          useValue: {
            getProcedures: jest.fn(),
            serializeProcedures: jest.fn(),
          },
        },
      ],
    }).compile();

    routerFactory = module.get<RouterFactory>(RouterFactory);
    modulesContainer = module.get<ModulesContainer>(ModulesContainer);
    procedureFactory = module.get<ProcedureFactory>(ProcedureFactory);
  });

  describe('getRouters', () => {
    it('should return an empty array if no routers are present', ()=> {
      const result = routerFactory.getRouters();
      expect(result).toHaveLength(0);
    });
    it('should return routers with correct metadata', () => {
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

      @Reflect.metadata(ROUTER_METADATA_KEY, { alias: 'users' })
      class UserRouter {
        constructor(private readonly userService: UserService) {}

        @Reflect.metadata(PROCEDURE_TYPE_KEY, 'query')
        @Reflect.metadata(PROCEDURE_METADATA_KEY, {
          input: z.object({ userId: z.string() }),
          output: userSchema,
        })
        @Reflect.metadata(MIDDLEWARES_KEY, ProtectedMiddleware)
        async getUserById(userId: string, ctx: any, _opts: any): Promise<any> {
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

      class MockTestService {}

      // Create an instance of the router
      const userRouterInstance = new UserRouter(new UserService());
      const mockServiceInstance = new MockTestService();

      const mockModule = {
        providers: new Map([
          ['UserRouter', { 
            name: 'UserRouter',
            instance: userRouterInstance,
            isResolved: true
          }],
          ['MockService', { 
            name: 'MockService',
            instance: mockServiceInstance,
            isResolved: true
          }]
        ])
      };
      modulesContainer.set('TestModule', mockModule as any);

      const result = routerFactory.getRouters();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'UserRouter',
        instance: userRouterInstance,
        alias: 'users',
        middlewares: [],
        path: undefined,
      });
    });
  });

  describe('serializeRoutes', () => {
    it('should serialize routes with procedures', () => {
      // Setup mock data
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

      @Reflect.metadata(ROUTER_METADATA_KEY, { alias: 'users' })
      class UserRouter {
        constructor(private readonly userService: UserService) {}

        async getUserById(userId: string, ctx: any, _opts: any): Promise<any> {
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

      const userRouterInstance = new UserRouter(new UserService());

      // Setup ModulesContainer
      const mockModule = {
        providers: new Map([
          ['UserRouter', { 
            name: 'UserRouter',
            instance: userRouterInstance,
            isResolved: true
          }]
        ])
      };
      modulesContainer.set('TestModule', mockModule as any);

      // Mock getProcedures
      const mockProcedures = [{
        input: z.object({ userId: z.string() }),
        output: userSchema,
        type: 'query',
        name: 'getUserById',
        implementation: UserRouter.prototype.getUserById,
        params: [
          { type: 'input', index: 0, key: 'userId' },
          { type: 'context', index: 1 },
          { type: 'options', index: 2 },
        ],
        middlewares: ProtectedMiddleware,
      }];
      (procedureFactory.getProcedures as jest.Mock).mockReturnValue(mockProcedures);

      // Mock serializeProcedures
      (procedureFactory.serializeProcedures as jest.Mock).mockReturnValue({
        getUserById: procedure.query(() => { return "mock" }),
      });

      // Mock procedure builder
      const mockProcedureBuilder = {
        input: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        query: jest.fn().mockReturnThis(),
        use: jest.fn().mockReturnThis(),
      } as any;

      // Call serializeRoutes
      const result = routerFactory.serializeRoutes(router, mockProcedureBuilder);

      // Assertions
      expect(result).toHaveProperty('users');
      expect(result.users).toHaveProperty('getUserById');
      expect(procedureFactory.serializeProcedures).toHaveBeenCalledWith(
        mockProcedures,
        userRouterInstance,
        'users',
        mockProcedureBuilder,
        []
      );
    });
  });
});