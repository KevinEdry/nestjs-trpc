import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';
import { Folder } from './folder.types';

@Router({ alias: 'folders' })
export class FolderRouter {
    @Query()
    list(): Folder[] {
        return [];
    }

    @Query({ output: z.object({ id: z.string() }) })
    getById(id: string) {
        return { id };
    }

    @Mutation()
    create() {
        return { id: '1', name: 'New', parentId: null };
    }
}
