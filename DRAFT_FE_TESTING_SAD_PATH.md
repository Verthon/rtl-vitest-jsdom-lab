# Draft — sad path as an expected scenario

Status: draft, outside the curator pipeline. Not distilled, not probed,
no maintainer verdict.

Scope: RTL + happy-dom + Vitest.

## The problem

Failure states get classified as edge cases, and edge cases get covered
when there is time. But a request failing is not an unusual event in a
deployed application — it is a certainty at some volume, and the state
the user lands in when it happens is a designed state whether or not
anyone designed it.

The most common undesigned outcome is a spinner that never resolves. The
request failed, the handler that would have cleared the loading state
was never reached, and the interface communicates that work is in
progress indefinitely. Nothing threw. Nothing was logged as an error by
the application. From the user's side this is worse than an error
message, because there is no information and no action available.

## The mechanism

Happy-path tests establish that a state machine reaches its success
terminal. They say nothing about whether every other path terminates.
Loading states are entered on request start and exited by the success
handler; if the failure handler was not written, or was written and
forgets to clear the flag, the machine has a state with no exit and the
happy-path test is entirely unaffected.

This generalizes past loading. Any state entered optimistically and
cleared by a response has the same structure: submit-disabled buttons,
optimistic list insertions, transitional messages. The failing path is
where they get stuck, and the passing path never visits it.

## The kinds are not interchangeable

Treating "the request failed" as one scenario collapses cases that reach
the application differently and need different handling:

- **A validation failure** returns a structured response the interface
  is expected to render against specific fields
- **A server fault** returns nothing useful, and the correct response is
  a general failure message and probably a retry
- **A network fault** produces no response at all — the promise rejects
  with a client-side error, and code parsing a response body will fail
  in a second, unrelated way while handling the first
- **A timeout** may leave the request in flight, so the user retrying
  can produce two effects from one intent

Testing one of these does not cover the others. The most frequently
skipped is the network fault, because it is the one that does not arrive
as a response, and error-handling code written against response shapes
tends to break on it.

MSW makes producing each of these cheap, so the gap is not usually
capability. It is that the failure taxonomy was never enumerated, and
what does not get named does not get tested.

## The framing

The question is not whether errors are handled. It is what state the
interface is in afterward, and whether the user can proceed from there.
An error that is caught, logged, and leaves the screen unchanged is
handled in the code sense and unhandled in every sense the user cares
about.

## Questions worth asking

- If this request fails, what is on screen, and can the user do anything
  from there?
- Which failure kinds does this cover — validation, server, network,
  timeout — and which are assumed to behave like the covered one?
- Does every state this component can enter have an exit on the failing
  path?
- If the response never arrives at all, does the code that handles
  errors still work?

## Who pays

The developer covering only the happy path finishes sooner and the suite
is green on all the cases it contains. The payer is the user who hits
the failure in production and sits in front of a permanent spinner with
no message and nothing to click — and after them, whoever handles the
support ticket, which reports that the application is stuck without
information about what was stuck, because nothing on the failing path
produced any.
