import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

/**
 * Enables vitest fake timers and returns a `userEvent` instance that will not hang.
 *
 * Every `userEvent` interaction routes through `@testing-library/react`'s
 * `asyncWrapper`, which drains the microtask queue with an internal
 * `setTimeout(resolve, 0)` and only pumps that timer when
 * `jestFakeTimersAreEnabled()` returns true. That helper gates on
 * `typeof jest !== 'undefined'` — Jest-specific detection vitest never
 * satisfies. So under `vi.useFakeTimers()` the timer is faked, nothing
 * advances it, and every `user.type()` / `user.click()` awaits a promise that
 * can never resolve. The test does not fail; it times out at 5000ms with no
 * stack trace pointing at your test body. See
 * `node_modules/@testing-library/react/dist/pure.js` — `asyncWrapper` and
 * `jestFakeTimersAreEnabled`.
 *
 * Stubbing a minimal `globalThis.jest` is the community workaround. Treat it as
 * permanent rather than a stopgap: RTL 16.3.2 is the latest release, its issue
 * is open with no fix planned, and vitest closed its own as not-planned. This
 * file goes away when RTL drops the Jest coupling, not on a version bump.
 *
 * @see https://github.com/testing-library/react-testing-library/issues/1197 RTL, open — the `asyncWrapper` / Jest coupling itself, added in RTL 14
 * @see https://github.com/testing-library/user-event/issues/833 user-event — `userEvent.click` timing out under fake timers
 * @see https://github.com/vitest-dev/vitest/issues/3184 vitest, closed as not-planned — where the `globalThis.jest` stub circulates
 *
 * Confirmed dead ends, do not retry: `delay: null`, an async-wrapped
 * `advanceTimers`, narrowing `toFake`, polyfilling `MessageChannel`, and
 * enabling fake timers before the initial render (that last one reintroduces a
 * hang in RTL's first `findBy*` poll, which has nothing advancing the clock).
 *
 * Paired with {@link restoreRealTimers}, which `testsConfig/setup.ts` runs after
 * every test — callers never clean up by hand.
 */
export function setupFakeTimerUser() {
  vi.useFakeTimers()
  Object.assign(globalThis, {
    jest: { advanceTimersByTime: vi.advanceTimersByTime.bind(vi) },
  })
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

/**
 * Reverses {@link setupFakeTimerUser}. Runs globally after every test, so it is
 * a no-op in the tests that never enabled fake timers. A leaked fake clock
 * fails the *next* test instead of this one, which is why this is not left to
 * per-file `afterEach` hooks.
 */
export function restoreRealTimers() {
  vi.useRealTimers()
  Reflect.deleteProperty(globalThis, 'jest')
}
