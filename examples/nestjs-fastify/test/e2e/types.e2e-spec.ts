/**
 * Type verification tests for generated AppRouter types.
 *
 * These tests verify that the Rust CLI generates valid TypeScript types
 * that can be imported and type-checked. If TypeScript compilation succeeds,
 * the generated types are valid.
 */
import type { AppRouter } from '../../src/@generated/server';

describe('Generated Types (e2e)', () => {
  it('AppRouter type is importable', () => {
    const routerType: AppRouter | null = null;
    expect(routerType).toBeNull();
  });

  it('AppRouter has expected router structure', () => {
    type UsersRouter = AppRouter['users'];
    type GetUserById = UsersRouter['getUserById'];

    expect(true).toBe(true);
  });
});
