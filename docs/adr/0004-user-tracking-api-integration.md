# ADR-0004: User Tracking API Integration

**Status:** Accepted
**Date:** 2025-11-26
**Deciders:** Development team

## Context

Currently, the `changebot-provider` component tracks which updates a user has viewed using localStorage only. This works well for anonymous users and single-device scenarios, but has limitations for authenticated users who access the application from multiple devices:

- localStorage is device-specific and doesn't sync across browsers or devices
- When a user views updates on their laptop, their phone still shows all updates as "new"
- There's no server-side record of what updates each user has seen
- Customers cannot analyze which users have seen which updates

For B2B SaaS applications with authenticated users, it's valuable to:
- Sync "last viewed" timestamps across all user sessions and devices
- Provide a consistent experience regardless of which device the user accesses
- Enable analytics on update engagement per user
- Support customer-managed user tracking via their own API

## Decision

**We will add API-backed user tracking** to the `changebot-provider` component while maintaining backward compatibility with localStorage-only tracking.

### New Props
- `userId?: string` - Unique identifier for the user
- `userData?: string` - JSON string containing arbitrary user metadata (e.g., email, plan type)

### API Integration
When `userId` is provided, the widget will:
1. **On load:** GET from `/api/v1/widgets/:slug/users/:id` to fetch `last_seen_at`
2. **On view:** PATCH to `/api/v1/widgets/:slug/users/:id` to update `last_seen_at`
3. **Fallback:** Use localStorage if API calls fail (graceful degradation)

### Implementation Strategy
- **Fast initialization:** Component loads with localStorage data (synchronous read, minimal delay)
- **localStorage-first for reads:** `fetchLastSeen()` synchronously returns localStorage value, then syncs from API in background
- **Background API sync:** `syncFromApi()` runs asynchronously, updates state when complete without blocking
- **API sync on write:** `setLastViewed()` updates both localStorage and API when user views updates
- **Abstraction layer:** Hide API vs localStorage logic behind `fetchLastSeen()` and `setLastViewed()` methods
- **Call site simplicity:** No implementation details at call sites (`hydrateLastViewed()` and `markAsViewed()`)
- **Test compatibility:** `hydrateLastViewed()` includes `await Promise.resolve()` to work with Stencil test environment
- **Graceful degradation:** Widget continues to work even if API is unavailable
- **Validation:** Parse and validate `userData` JSON, discard if invalid but continue tracking

## Rationale

### 1. Cross-Device Consistency
**Problem:** User sees "3 new updates" on laptop after viewing them on phone.

**Solution:** API syncs last_seen_at across all devices.

**Example:**
- User views updates on laptop → API stores timestamp
- User opens app on phone → API returns timestamp, phone shows no new updates

### 2. Backward Compatibility
Widgets without `userId` continue to work exactly as before using localStorage only. This is a purely additive feature.

### 3. Customer Control
Customers host the API endpoints on their own infrastructure, giving them full control over:
- Data storage and privacy compliance
- User identification and authentication
- Additional metadata tracking (via `userData`)
- Analytics and reporting

### 4. Clean Abstraction
By hiding API vs localStorage logic in private methods, we keep the component code clean and maintainable. The `hydrateLastViewed()` and `markAsViewed()` methods simply call `fetchLastSeen()` and `setLastViewed()` without knowing the implementation details.

### 5. Non-Blocking Performance
The component initializes quickly with localStorage data (synchronous read) while API sync happens in the background (asynchronous). This ensures the widget never blocks on slow network requests, providing a responsive user experience even with high-latency API endpoints. The `await Promise.resolve()` in `hydrateLastViewed()` adds minimal delay (~0ms) while maintaining test compatibility.

### 6. Null Handling Prevents Notification Spam
When a user's `last_seen_at` is null (never tracked before), we set it to the current timestamp. This prevents showing all historical updates as "new" when a customer first migrates to user tracking.

## API Specification

### GET /api/v1/widgets/:slug/users/:id
**Purpose:** Fetch the last seen timestamp for a user

**Response:**
```json
{
  "id": "user-123",
  "last_seen_at": "2025-11-21T23:39:58.000Z"  // or null
}
```

### PATCH /api/v1/widgets/:slug/users/:id
**Purpose:** Update user's last seen timestamp

**Request Body:**
```json
{
  "last_seen_at": "2025-11-21T23:39:58.000Z",
  "data": {  // Optional: from userData prop
    "email": "user@example.com",
    "plan": "pro"
  }
}
```

**Response:**
```json
{
  "id": "user-123",
  "last_seen_at": "2025-11-21T23:39:58.000Z"
}
```

**Behavior:**
- Only updates if new timestamp is newer than existing
- Returns existing timestamp if provided timestamp is stale
- Creates user record if doesn't exist
- Updates data field with latest payload regardless of timestamp staleness

## Implementation Details

### Architecture

**New Methods:**
- `parseUserData()` - Validates and parses userData JSON
- `fetchUserTracking()` - Low-level GET request to user tracking API
- `updateUserTracking(timestamp, data?)` - Low-level PATCH request to user tracking API
- `fetchLastSeen()` - Synchronously reads from localStorage, kicks off `syncFromApi()` in background if userId exists
- `syncFromApi()` - Background API sync that updates state when complete (non-blocking)
- `setLastViewed(timestamp)` - Updates both API and localStorage
- `updateLocalStore(timestamp)` - Helper to update both store state and localStorage

**Modified Methods:**
- `hydrateLastViewed()` - Now async with `await Promise.resolve()` for test compatibility, calls `fetchLastSeen()`
- `markAsViewed()` - Now async, calls `setLastViewed()`
- `componentWillLoad()` - Now async, awaits `hydrateLastViewed()` (fast in production, testable)

### Error Handling Pattern
Following existing patterns in the codebase:
```typescript
try {
  // API call
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Failed...';
  console.warn('⚠️ Changebot widget: Could not...', { error, userId });
  // Fallback to localStorage
}
```

- Uses `console.warn` (not `console.error`) to avoid breaking customer sites
- Includes emoji prefix for easy debugging
- Logs context (userId, slug) for troubleshooting
- Widget continues to function despite API failures

### UserData Validation
Invalid JSON in `userData` prop:
- Logs `console.error` with clear message
- Discards userData but continues tracking visit
- Still sends API requests (without data payload)
- Prevents widget breakage from invalid input

## Consequences

### Positive
- **Cross-device sync**: Users get consistent experience across all devices
- **Customer control**: Customers own the API and data
- **Backward compatible**: Existing widgets continue to work unchanged
- **Analytics enabled**: Customers can track user engagement
- **Clean architecture**: Well-abstracted, maintainable code
- **Graceful degradation**: Works even when API is unavailable
- **Flexible metadata**: userData allows tracking arbitrary user info

### Negative
- **API dependency**: Requires customers to implement and host API endpoints
  - *Mitigation:* Falls back to localStorage if API unavailable
  - *Mitigation:* Comprehensive API documentation provided
- **Increased complexity**: More code paths to test and maintain
  - *Mitigation:* Clean abstraction limits complexity exposure
  - *Mitigation:* Comprehensive unit tests added

### Neutral
- localStorage remains the source of truth for client-side state
- API is treated as sync mechanism, not primary storage

## Testing

**Unit Tests Added:**
- JSON parsing with valid and invalid userData
- API URL construction with slug and custom url
- fetchLastSeen() with and without userId
- updateLastSeen() with and without userId
- API success, failure, and null response handling
- localStorage fallback behavior
- Component lifecycle integration

**Demo Page:**
- `user-tracking-demo.html` demonstrates both valid and invalid userData
- Shows API fallback behavior with console logging
- Includes testing instructions for developers

## Migration Path

**For customers without user tracking:**
- No changes required
- Widgets continue to use localStorage only

**For customers adding user tracking:**
1. Implement the two API endpoints on their server
2. Add `user-id` and optional `user-data` props to their widget
3. Deploy - feature works immediately with fallback to localStorage

**Example:**
```html
<changebot-provider
  slug="my-widget"
  user-id="user-123"
  user-data='{"email": "user@example.com", "plan": "pro"}'
/>
```

## Future Considerations

1. **Bulk user tracking**: If customers need to query tracking data for many users
2. **Webhooks**: Server-initiated notifications when new updates are published
3. **Analytics dashboard**: Built-in reporting on user engagement
4. **Offline queue**: Queue API calls when offline, sync when reconnected

## Lessons Learned

- **Abstraction is key**: Hiding implementation details at call sites keeps code clean
- **Graceful degradation**: Always provide fallbacks for network-dependent features
- **Backward compatibility**: Additive changes allow gradual adoption
- **Validation matters**: Always validate external input (userData JSON)
- **Customer control**: Let customers own their data and infrastructure

## References

- ADR-0001: Provider-Badge Architecture (establishes provider-consumer pattern)
- new-tracking.md: Original requirements document
- API specification in monolith documentation
