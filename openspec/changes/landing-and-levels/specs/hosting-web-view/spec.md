# Delta for hosting-web-view

## ADDED Requirements

### Requirement: PR-Action Completion Callback

The hosting web view MUST expose a completion callback/event for every PR
action it performs — create, comment, close, reopen, merge — to its host
component, carrying the action kind and the resulting PR id/status. This
lets a hosting host (e.g. a level) validate checklist goals and count the
action toward its command budget. Sandbox visuals and behavior MUST NOT
change when no host subscribes to the callback.

#### Scenario: A level host observes a merge completion
- GIVEN a level with `allowHostingUI: true` renders the hosting web view
- WHEN the player merges a PR through the web view
- THEN the level host receives a completion event with the merge action
  and the PR's new `merged` status

#### Scenario: Sandbox host ignores the callback with no behavior change
- GIVEN the sandbox renders the hosting web view without subscribing to
  the callback
- WHEN the player performs any PR action
- THEN the sandbox's visible behavior is identical to before this change
