# ADR-0001: Provider-Badge Architecture for Changebot Widgets

**Status:** Accepted
**Date:** 2025-09-29
**Deciders:** Development team

## Context

We need to build a widget system that shows users how many new updates are available from a Changebot API. The widget needs to:
- Be embeddable on any website
- Track what users have already seen
- Poll for new updates periodically
- Handle multiple independent instances
- Work without a backend session

## Decision

We will use a **Provider-Consumer pattern** with two separate web components:
1. `changebot-provider` - Manages API communication and state
2. `changebot-badge` - Displays the notification count

### Key Design Decisions

#### 1. Separation of Concerns
**Decision:** Split data management (provider) from display (badge)

**Rationale:**
- Single Responsibility: Provider handles API/state, badge handles UI
- Flexibility: Multiple badges can connect to one provider
- Testability: Badge can be tested with manual props without API
- Reusability: Future components (list, modal) can reuse the same provider

**Alternatives considered:**
- Single component doing both: Rejected because it couples data fetching with display
- Redux-style global store: Rejected as too heavy for a simple widget

#### 2. Communication via DOM Events
**Decision:** Use CustomEvents for provider-badge communication

**Rationale:**
- Framework agnostic: Works with vanilla JS, React, Vue, etc.
- No direct coupling: Components don't need references to each other
- Browser native: No additional libraries needed
- Composable: Events bubble through Shadow DOM boundaries

**Implementation:**
```javascript
// Badge requests context
dispatchEvent(new CustomEvent('changebot:context-request', {
  detail: { callback: (services) => {...}, scope: 'default' },
  bubbles: true,
  composed: true
}));

// Provider responds with services
if (event.detail.scope === this.scope) {
  event.detail.callback(this.services);
}
```

#### 3. Scope-based Isolation
**Decision:** Use "scope" prop to enable multiple independent instances

**Rationale:**
- Multiple data sources: Different APIs on same page
- Role separation: Admin vs user updates
- Independent state: Each scope has its own "last viewed" timestamp

**Example use cases:**
- Multiple products on a dashboard
- Different update types (security vs features)
- Role-based notifications

#### 4. Client-side "Last Viewed" Tracking
**Decision:** Use localStorage with scope-specific keys

**Rationale:**
- No backend session required
- Persists across page reloads
- Simple implementation
- Per-scope isolation: `changebot:lastViewed:{scope}`

**Trade-offs:**
- Not synced across devices
- Can be cleared by user
- Limited to same origin

#### 5. Pull-based Updates with Optional Polling
**Decision:** Fetch on load, with opt-in polling via `poll-interval` prop

**Rationale:**
- Reduces unnecessary API calls
- User controls polling frequency
- No polling by default (opt-in)
- Respects rate limits

**Implementation:**
- No `poll-interval`: Fetch once on load
- `poll-interval="30"`: Poll every 30 seconds
- Minimum 1 second to prevent aggressive polling
- No automatic retry on rate limits

#### 6. Badge Display Rules
**Decision:**
- Hide when count is 0
- Show "9+" for counts over 9
- Calculate "new" as updates after last viewed timestamp

**Rationale:**
- Clean UI: Hidden when nothing new
- Compact: "9+" keeps badge size consistent
- Clear state: When no lastViewed, everything is new

## Consequences

### Positive
- **Composable**: Easy to add new display components
- **Performant**: Single provider for multiple consumers
- **Flexible**: Works in any web environment
- **Maintainable**: Clear separation of concerns
- **Testable**: Components can be tested independently

### Negative
- **Complexity**: Two components instead of one
- **Event coordination**: Requires understanding of event flow
- **Timing issues**: Badge might request context before provider is ready (solved by immediate service initialization)

### Neutral
- **localStorage dependency**: Works well for single-device usage
- **No built-in sync**: Multi-device sync would require backend changes

## Implementation Notes

### Rate Limiting
When a 429 is received:
- Log detailed information to console
- Display user-friendly error message
- Wait for next regular poll cycle (no aggressive retry)
- Use server's `Retry-After` header if provided

### Debug Experience
Components log with emoji prefixes for easy debugging:
- 🔌 Provider events
- 📛 Badge events
- 🚫 Rate limit events
- ✅ Success events

### Testing Strategy
Two HTML pages:
1. `index.html` - Production example with real API
2. `test.html` - Component showcase with manual props, no API calls

## Future Considerations

1. **Additional display components**: Modal, list, drawer views could reuse the provider
2. **Backend sync**: Could add user authentication to sync viewed state
3. **WebSocket support**: Could add real-time updates instead of polling
4. **Offline support**: Could cache updates and sync when online

## References

- [Web Components Best Practices](https://developers.google.com/web/fundamentals/web-components/best-practices)
- [CustomEvent API](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
- [Stencil Documentation](https://stenciljs.com/docs/introduction)