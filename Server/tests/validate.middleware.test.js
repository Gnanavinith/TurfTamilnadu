import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validate } from '../src/middleware/validate.js'

const phoneSchema = z.object({ phone: z.string().regex(/^\d{10}$/) })

function makeReq(body) {
  return { body, params: {}, query: {} }
}

describe('validate middleware', () => {
  it('parses a valid body and calls next', async () => {
    const req = makeReq({ phone: '9876543210' })
    const next = vi.fn()

    await validate({ body: phoneSchema })(req, {}, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
    expect(req.body.phone).toBe('9876543210')
  })

  it('rejects an invalid body with an ApiError carrying details', async () => {
    const req = makeReq({ phone: '123' })
    const next = vi.fn()

    await validate({ body: phoneSchema })(req, {}, next)

    expect(next).toHaveBeenCalledTimes(1)
    const err = next.mock.calls[0][0]
    expect(err.statusCode).toBe(400)
    expect(err.details.length).toBeGreaterThan(0)
  })

  it('rejects an invalid param', async () => {
    const req = { body: {}, params: { matchId: 'not-an-id' }, query: {} }
    const next = vi.fn()

    await validate({ params: z.object({ matchId: z.string().regex(/^[a-f\d]{24}$/i) }) })(
      req,
      {},
      next,
    )

    const err = next.mock.calls[0][0]
    expect(err.statusCode).toBe(400)
    expect(err.details[0].path).toBe('matchId')
  })

  it('coerces strings into numbers when a schema preprocesses input', async () => {
    const schema = z.object({
      value: z.coerce.number().int().positive(),
    })
    const req = { body: { value: '7' }, params: {}, query: {} }
    const next = vi.fn()

    await validate({ body: schema })(req, {}, next)

    expect(req.body.value).toBe(7)
    expect(next).toHaveBeenCalledTimes(1)
  })
})