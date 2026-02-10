export const customTransformer = {
    serialize: (value: any) => JSON.stringify(value),
    deserialize: (value: string) => JSON.parse(value),
};
