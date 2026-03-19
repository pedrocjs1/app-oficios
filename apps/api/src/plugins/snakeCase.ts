import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === "object" && obj.constructor === Object) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(
        /[A-Z]/g,
        (letter) => `_${letter.toLowerCase()}`
      );
      result[snakeKey] = toSnakeCase(value);
    }
    return result;
  }
  return obj;
}

export default fp(async function snakeCasePlugin(
  fastify: FastifyInstance
): Promise<void> {
  fastify.addHook("preSerialization", async (_request, _reply, payload) => {
    return toSnakeCase(payload);
  });
});
