// This file has intentional syntax errors
import { Router } from 'nestjs-trpc';

@Router()
export class BrokenRouter {
    // Missing closing brace intentionally
    getUser() {
        return {{{
}
