# ADR-0003: Remove Polling Feature from Provider

**Status:** Accepted
**Date:** 2025-11-24
**Deciders:** Development team
**Supersedes:** Partial supersession of ADR-0001 (polling-related decisions)

## Context

The `changebot-provider` component originally included a `pollInterval` prop that enabled automatic polling for updates at a specified interval. This was implemented as an opt-in feature to allow widgets to automatically refresh their data.

However, analysis of actual customer usage patterns reveals that this feature doesn't align with real-world needs:
- **90% of customers publish new updates once a month** or less frequently
- Polling every few seconds/minutes for monthly updates is wasteful
- The feature adds unnecessary complexity to the component
- It was implemented without concrete customer requirements (LLM-generated feature speculation)

## Decision

**We will remove the polling feature entirely** from the `changebot-provider` component.

### What's Being Removed
- `pollInterval` prop
- `pollTimer` internal property
- Polling setup logic in `componentWillLoad()`
- Polling cleanup logic in `disconnectedCallback()`
- Related configuration in services config

### What Remains
- Single fetch on component load
- Manual refresh capability (users can reload the page or remount the component)
- All other provider functionality unchanged

## Rationale

### 1. Misalignment with Customer Behavior
**Problem:** Customers publish updates infrequently (typically monthly), making continuous polling pointless.

**Example:**
- Customer publishes update on January 1st
- Widget polls every 30 seconds for 30 days
- That's ~86,400 API calls for a single update
- 99.999% of those calls return no new data

### 2. Feature Was Speculative
The polling feature was added based on hypothetical use cases rather than actual customer requirements. This is a classic case of premature optimization and feature bloat.

### 3. Simpler Mental Model
**Before:** Developers need to understand:
- When to use polling vs not
- What interval to choose
- How it affects API rate limits
- Cleanup and lifecycle management

**After:** Provider fetches once on load. Simple and predictable.

### 4. Better Alternatives Exist
For customers who genuinely need real-time updates:
- **Server-sent events (SSE)**: More efficient push-based approach
- **WebSockets**: True bidirectional real-time communication
- **Webhook callbacks**: Server notifies on new updates

These are better architectural patterns for real-time needs and can be added later if truly needed.

### 5. Reduced API Load
Removing polling eliminates unnecessary API traffic, reducing:
- Server costs
- Network bandwidth
- Client battery/CPU usage
- Potential rate limit issues

## Consequences

### Positive
- **Simpler codebase**: Less code to maintain and test
- **Better performance**: No background timers consuming resources
- **Clearer documentation**: One less prop to explain
- **Reduced API load**: Fewer unnecessary requests
- **Honest feature set**: Only includes what customers actually need

### Negative
- **No automatic refresh**: Widgets won't update without page reload
  - *Mitigation:* This matches actual customer behavior (monthly updates)
- **Breaking change**: Existing code using `pollInterval` will need updates
  - *Mitigation:* Prop will be ignored silently; no errors thrown
  - *Impact:* Minimal - feature was for testing only (per CLAUDE.md)

### Neutral
- Users who need real-time updates will need to implement their own solution
  - This is appropriate given the rarity of the use case

## Implementation

Changes implemented in commit [ref]:
1. Removed `@Prop() pollInterval` declaration
2. Removed `pollTimer` property and associated logic
3. Removed polling setup in `componentWillLoad()`
4. Removed `disconnectedCallback()` lifecycle method
5. Updated `CLAUDE.md` to remove `pollInterval` from testing-only props list
6. Auto-generated files (TypeScript definitions, framework wrappers) will update on next build

## Future Considerations

If real-time update requirements emerge based on actual customer needs:

1. **Implement push-based solution** (SSE or WebSockets) rather than polling
2. **Add optional webhook support** for server-to-client notifications
3. **Consider a "check for updates" action** that consumers can trigger manually

Do NOT re-add polling without:
- Concrete customer requirements with documented use cases
- Analysis showing customers publish updates frequently enough to justify it
- Consideration of more efficient real-time alternatives

## Lessons Learned

- **Build for actual needs, not hypothetical ones**: Features should solve real problems
- **Question LLM suggestions**: AI can generate plausible-sounding features that don't align with reality
- **Understand user behavior first**: Know your data patterns before architecting solutions
- **Simple is better**: Start minimal and add complexity only when justified

## References

- ADR-0001: Original provider architecture (included polling)
- CLAUDE.md: Documentation guidelines (listed pollInterval as testing-only)
