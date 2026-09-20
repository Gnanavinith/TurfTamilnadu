import { ApiError } from '../utils/ApiError.js'

/**
 * validate({ body: schema, params: schema, query: schema })
 * Each part is optional. Present parts replace req.body/params/query with parsed data.
 */
export const validate =
  (schemas = {}) =>
  (req, _res, next) => {
    const parts = { body: req.body, params: req.params, query: req.query }

    for (const part of ['body', 'params', 'query']) {
      const schema = schemas[part]
      if (!schema) continue

      const result = schema.safeParse(parts[part])
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }))
        return next(new ApiError(400, 'Validation failed', details))
      }
      // Express 5 exposes req.query/req.params as getter-only properties;
      // defineProperty shadows them so the parsed values reach the handler.
      Object.defineProperty(req, part, {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      })
    }

    return next()
  }

export default validate