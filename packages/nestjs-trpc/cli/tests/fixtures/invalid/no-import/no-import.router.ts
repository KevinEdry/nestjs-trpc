// No import of Router decorator - using it without importing

@Router()
export class NoImportRouter {
    getUser() {
        return { name: 'test' };
    }
}
