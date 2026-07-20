import { createNotifyDispatchProcessor } from '../../src/workers/notifyDispatch.js';

const noopLogger = { warn() {}, error() {}, debug() {} };

function makeRepos(notif) {
  const calls = {};
  return {
    calls,
    notifications: {
      findOne: () => notif,
      markSent: (k, id) => {
        calls.sent = { k, id };
      },
      markSkipped: (k, r) => {
        calls.skipped = { k, r };
      },
      recordFailure: (k, e) => {
        calls.failed = { k, e: String(e) };
      },
    },
  };
}

describe('notify-dispatch processor', () => {
  it('posts embeds and marks the notification sent', async () => {
    const repos = makeRepos({
      dedupeKey: 'd1',
      status: 'pending',
      channelId: 'C1',
      payload: { embeds: [{ title: 'x' }] },
    });
    const rest = { post: () => ({ id: 'msg1' }) };
    const proc = createNotifyDispatchProcessor({ repositories: repos, rest, logger: noopLogger });

    const result = await proc({ data: { dedupeKey: 'd1' } });
    expect(result.sent).toBe(true);
    expect(repos.calls.sent).toEqual({ k: 'd1', id: 'msg1' });
  });

  it('skips terminal permission errors without retrying', async () => {
    const repos = makeRepos({ dedupeKey: 'd2', status: 'pending', channelId: 'C1', payload: {} });
    const rest = {
      post: () => {
        const err = new Error('missing permissions');
        err.code = 50013;
        throw err;
      },
    };
    const proc = createNotifyDispatchProcessor({ repositories: repos, rest, logger: noopLogger });

    const result = await proc({ data: { dedupeKey: 'd2' } });
    expect(result.skipped).toBe('terminal');
    expect(repos.calls.skipped).toBeDefined();
  });

  it('throws transient errors so BullMQ retries', async () => {
    const repos = makeRepos({ dedupeKey: 'd3', status: 'pending', channelId: 'C1', payload: {} });
    const rest = {
      post: () => {
        const err = new Error('boom');
        err.code = 500;
        throw err;
      },
    };
    const proc = createNotifyDispatchProcessor({ repositories: repos, rest, logger: noopLogger });

    await expect(proc({ data: { dedupeKey: 'd3' } })).rejects.toThrow('boom');
    expect(repos.calls.failed).toBeDefined();
  });

  it('skips a notification that is no longer pending', async () => {
    const repos = makeRepos({ dedupeKey: 'd4', status: 'sent' });
    const rest = {
      post: () => {
        throw new Error('should not post');
      },
    };
    const proc = createNotifyDispatchProcessor({ repositories: repos, rest, logger: noopLogger });

    const result = await proc({ data: { dedupeKey: 'd4' } });
    expect(result.skipped).toBe('sent');
  });
});
