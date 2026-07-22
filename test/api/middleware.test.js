import { requireAuth, createRequireGuildAccess } from '../../src/api/middlewares/auth.js';
import { validate } from '../../src/api/middlewares/validate.js';
import { settingsPatch } from '../../src/api/validators/schemas.js';

const mockRes = () => {
  const r = {};
  r.status = (c) => {
    r.statusCode = c;
    return r;
  };
  r.json = (b) => {
    r.body = b;
    return r;
  };
  return r;
};
const mockNext = () => {
  const fn = (err) => {
    fn.err = err;
  };
  return fn;
};

describe('requireAuth', () => {
  it('rejects a request with no session user', () => {
    const next = mockNext();
    requireAuth({ session: {} }, mockRes(), next);
    expect(next.err?.code).toBe('UNAUTHORIZED');
  });
  it('passes an authenticated request', () => {
    const next = mockNext();
    requireAuth({ session: { user: { id: '1' } } }, mockRes(), next);
    expect(next.err).toBeUndefined();
  });
});

describe('requireGuildAccess (deny-by-default)', () => {
  const repositories = {
    guilds: {
      findById: (id) => {
        if (id === 'G1') return { _id: 'G1', active: true };
        if (id === 'Gdead') return { _id: 'Gdead', active: false };
        return null;
      },
    },
  };
  const mw = createRequireGuildAccess({ repositories });

  it('403 when the user does not administer the guild', async () => {
    const next = mockNext();
    await mw(
      { session: { user: { id: 'u' }, adminGuildIds: ['GX'] }, params: { guildId: 'G1' } },
      mockRes(),
      next,
    );
    expect(next.err?.code).toBe('FORBIDDEN');
  });

  it('404 when the bot is not present in the guild', async () => {
    const next = mockNext();
    await mw(
      { session: { user: { id: 'u' }, adminGuildIds: ['Gdead'] }, params: { guildId: 'Gdead' } },
      mockRes(),
      next,
    );
    expect(next.err?.code).toBe('NOT_FOUND');
  });

  it('grants access when the user administers AND the bot is present', async () => {
    const req = { session: { user: { id: 'u' }, adminGuildIds: ['G1'] }, params: { guildId: 'G1' } };
    const next = mockNext();
    await mw(req, mockRes(), next);
    expect(next.err).toBeUndefined();
    expect(req.guildId).toBe('G1');
  });
});

describe('validate', () => {
  it('rejects unknown keys (strict schema)', () => {
    const next = mockNext();
    validate(settingsPatch, 'body')({ body: { bogus: 1 } }, mockRes(), next);
    expect(next.err?.code).toBe('VALIDATION_ERROR');
  });
  it('passes and keeps valid body', () => {
    const next = mockNext();
    const req = { body: { features: { alerts: true } } };
    validate(settingsPatch, 'body')(req, mockRes(), next);
    expect(next.err).toBeUndefined();
    expect(req.body.features.alerts).toBe(true);
  });
});
