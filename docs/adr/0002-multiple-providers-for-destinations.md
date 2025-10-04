# ADR-0002: Multiple Providers for Destination-Specific Content

**Status:** Accepted
**Date:** 2025-10-04
**Deciders:** Development team

## Context

Changebot's web API has a publications/destinations abstraction where different types of content can be published to different destinations (e.g., "drawer", "header", "announcement"). This abstraction is central to how Changebot integrates with other platforms like Webflow and Slack.

We need to support displaying destination-specific content in different widget components:
- A drawer showing updates from the "drawer" destination
- A header component showing only the most recent announcement from the "header" destination
- Different components consuming different subsets of publications

The challenge: Our existing provider architecture (ADR-0001) was designed for a single provider to fetch from one endpoint and distribute data to multiple display components within a single scope.

## Decision

We will **use multiple provider instances with different scopes**, where each provider fetches from a different destination endpoint. This leverages the existing scope-based isolation architecture rather than modifying the provider to handle multiple destinations.

### Architecture Pattern

```html
<!-- Provider for general updates (drawer destination) -->
<changebot-provider
  slug="customer-slug"
  url="https://api.changebot.ai/v1/updates/customer-slug?destination=drawer"
  scope="drawer"
  poll-interval="30">
</changebot-provider>

<!-- Provider for header announcements (header destination) -->
<changebot-provider
  slug="customer-slug"
  url="https://api.changebot.ai/v1/updates/customer-slug?destination=header"
  scope="header"
  poll-interval="60">
</changebot-provider>

<!-- Components connect to their respective providers via scope -->
<changebot-drawer scope="drawer"></changebot-drawer>
<changebot-badge scope="drawer"></changebot-badge>
<changebot-header scope="header"></changebot-header>
```

### How It Works

1. **Each destination gets its own provider instance** with a unique scope
2. **Each provider fetches from a destination-specific endpoint** via the `url` prop with query parameters
3. **Components specify which destination they need** via the matching `scope` prop
4. **Existing scope-based event routing** ensures each component receives data only from its matching provider
5. **Independent state** - each destination has its own "last viewed" timestamp, loading state, and update list

## Alternatives Considered

### Alternative 1: Query Parameters on Provider
Add a `destination` prop to the provider that gets appended as a query parameter.

**Pros:**
- Simpler HTML markup
- Single provider per customer

**Cons:**
- Requires code changes to provider component
- Couples provider to Changebot API conventions
- Doesn't support non-destination-based filtering
- Less flexible for future use cases

**Rejected because:** Requires unnecessary code changes when existing architecture already supports this pattern.

### Alternative 2: Multi-Source Provider
Modify provider to accept and fetch from multiple destinations simultaneously, storing them in separate store slices.

**Pros:**
- Single provider instance
- Could aggregate related destinations

**Cons:**
- Significant complexity increase
- Tighter coupling between provider and API structure
- More complex store management
- Harder to test
- Doesn't align with existing scope isolation pattern

**Rejected because:** Over-engineered for the problem. Scope-based isolation was designed for exactly this use case.

### Alternative 3: Abandon Destinations Abstraction
Add flags to publications (e.g., `header: true`) instead of using destinations.

**Pros:**
- Single endpoint fetch
- Simpler provider setup

**Cons:**
- Breaks existing Changebot integrations (Webflow, Slack)
- Loses clean API abstraction
- Couples frontend widget patterns to backend data model
- Makes backend API less flexible

**Rejected because:** This would harm the broader Changebot platform architecture to solve a frontend-specific concern.

## Consequences

### Positive

- **Zero code changes required** - Leverages existing scope architecture
- **Preserves API abstraction** - Destinations remain a clean backend concept
- **Independent state management** - Each destination has its own viewed state, error handling, and polling
- **Flexible polling strategies** - Different destinations can have different poll intervals
- **Clear mental model** - One provider per data source maps naturally to one provider per destination
- **Testable** - Each provider instance can be tested independently
- **Scalable** - Easy to add more destinations without architectural changes

### Negative

- **Multiple DOM elements** - Each destination requires a provider element in the HTML
- **Separate API calls** - Each provider fetches independently (not a single aggregated fetch)
- **Initial setup complexity** - Users need to understand scope-to-provider mapping

### Neutral

- **Memory overhead** - Multiple provider instances vs. single complex provider is roughly equivalent
- **Event coordination** - No more complex than single provider, just multiplied by N destinations

## Implementation Guidelines

### Provider Configuration

Each provider should be configured with:
1. **Unique scope** matching the destination name
2. **Destination-specific URL** using query parameters or different endpoints
3. **Appropriate poll interval** based on content update frequency

### Component Configuration

Each component should:
1. **Specify scope** matching its data source destination
2. **Handle absence of provider** gracefully (already implemented)
3. **Not need knowledge** of other destinations or scopes

### Naming Conventions

- Use destination names as scope values: `scope="drawer"`, `scope="header"`
- Keep localStorage keys destination-scoped: `changebot:lastViewed:drawer`
- Maintain clear 1:1 mapping between backend destination and frontend scope

## Examples

### Basic Setup: Drawer + Header
```html
<changebot-provider
  slug="acme-corp"
  scope="drawer"
  poll-interval="30">
</changebot-provider>
<changebot-provider
  slug="acme-corp"
  url="https://api.changebot.ai/v1/updates/acme-corp?destination=header"
  scope="header"
  poll-interval="60">
</changebot-provider>

<changebot-badge scope="drawer"></changebot-badge>
<changebot-drawer scope="drawer"></changebot-drawer>
<changebot-header scope="header"></changebot-header>
```

### Multi-tenant Dashboard
```html
<!-- Customer A updates -->
<changebot-provider
  slug="customer-a"
  scope="customer-a">
</changebot-provider>

<!-- Customer B updates -->
<changebot-provider
  slug="customer-b"
  scope="customer-b">
</changebot-provider>

<!-- Each section shows its customer's updates -->
<div class="customer-section">
  <h2>Customer A</h2>
  <changebot-drawer scope="customer-a"></changebot-drawer>
</div>
<div class="customer-section">
  <h2>Customer B</h2>
  <changebot-drawer scope="customer-b"></changebot-drawer>
</div>
```

## Future Considerations

1. **Provider helper library** - Could provide a JS helper to simplify multi-provider setup
2. **Shared caching** - Multiple providers for the same slug could share HTTP cache
3. **Aggregated destinations** - Future component that displays updates from multiple destinations
4. **Dynamic provider registration** - Runtime addition/removal of providers for SPA navigation

## Related Decisions

- **ADR-0001**: Established the provider-consumer pattern and scope-based isolation that makes this approach possible

## References

- [Stencil Component Context](https://stenciljs.com/docs/context)
- [Web Components Composition Patterns](https://developers.google.com/web/fundamentals/web-components/shadowdom)
- Changebot API destinations documentation (internal)
