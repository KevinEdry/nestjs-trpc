import { Router } from 'nestjs-trpc';

@Router()
export class IncompleteRouter {
    getUser() {
        return { name: 'test' };
    // Missing closing brace for method
// Missing closing brace for class
