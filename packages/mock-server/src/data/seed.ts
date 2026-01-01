// Types matching the core package
export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Update {
  id: number;
  title: string;
  content: string;
  display_date: string;
  published_at: string;
  expires_on: string | null;
  highlight_target: 'banner' | 'toast' | null;
  hosted_url: string | null;
  tags: Tag[];
}

export interface Widget {
  title: string;
  subheading: string | null;
  slug: string;
  branded: boolean;
}

export interface UserTracking {
  id: string;
  last_seen_at: string | null;
  data?: Record<string, unknown>;
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to generate a publication at a specific offset from now
export function generatePublication(
  id: number,
  daysAgo: number,
  overrides?: Partial<Update>
): Update {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  const defaults: Update = {
    id,
    title: `Update #${id}`,
    content: `<p>This is update #${id}, published ${daysAgo} days ago.</p>`,
    display_date: formatDate(date),
    published_at: date.toISOString(),
    expires_on: null,
    highlight_target: null,
    hosted_url: `https://example.com/updates/${id}`,
    tags: [],
  };

  return { ...defaults, ...overrides };
}

export function generateDefaultWidget(): Widget {
  return {
    title: 'Product Updates',
    subheading: 'Latest features and improvements',
    slug: 'mock-demo',
    branded: false,
  };
}

export function generateDefaultPublications(): Update[] {
  return [
    generatePublication(1, 0, {
      title: "Today's Feature Release",
      content: '<p>Brand new feature launched today! Check out our latest improvements.</p>',
      highlight_target: 'banner',
      tags: [{ id: 1, name: 'Feature', color: '#10b981' }],
    }),
    generatePublication(2, 2, {
      title: 'Performance Improvements',
      content: '<p>We have improved load times by 40% across the board.</p>',
      highlight_target: 'toast',
      tags: [{ id: 2, name: 'Performance', color: '#3b82f6' }],
    }),
    generatePublication(3, 5, {
      title: 'Bug Fix: Login Issues',
      content: '<p>Fixed an issue where some users could not log in on mobile devices.</p>',
      tags: [{ id: 3, name: 'Bug Fix', color: '#ef4444' }],
    }),
    generatePublication(4, 10, {
      title: 'New Dashboard Design',
      content: '<p>Introducing our redesigned dashboard with improved navigation.</p>',
      tags: [{ id: 1, name: 'Feature', color: '#10b981' }],
    }),
    generatePublication(5, 20, {
      title: 'API v2 Released',
      content: '<p>Our new API version is now available with better performance and new endpoints.</p>',
      tags: [
        { id: 1, name: 'Feature', color: '#10b981' },
        { id: 4, name: 'API', color: '#8b5cf6' },
      ],
    }),
  ];
}

// Scenario generators
export function generateNewUserScenario(): { publications: Update[]; user: UserTracking } {
  return {
    publications: generateDefaultPublications(),
    user: { id: 'test-user', last_seen_at: null },
  };
}

export function generateReturningUserScenario(): { publications: Update[]; user: UserTracking } {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return {
    publications: generateDefaultPublications(),
    user: { id: 'test-user', last_seen_at: sevenDaysAgo.toISOString() },
  };
}

export function generateManyUpdatesScenario(): { publications: Update[]; user: UserTracking } {
  const publications: Update[] = [];
  for (let i = 1; i <= 20; i++) {
    publications.push(
      generatePublication(i, i - 1, {
        title: `Update #${i}`,
        content: `<p>This is update number ${i} in the many updates scenario.</p>`,
        highlight_target: i === 1 ? 'banner' : i === 2 ? 'toast' : null,
        tags: [{ id: (i % 4) + 1, name: ['Feature', 'Bug Fix', 'Performance', 'API'][i % 4], color: ['#10b981', '#ef4444', '#3b82f6', '#8b5cf6'][i % 4] }],
      })
    );
  }
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return {
    publications,
    user: { id: 'test-user', last_seen_at: thirtyDaysAgo.toISOString() },
  };
}

export function generateNoUpdatesScenario(): { publications: Update[]; user: UserTracking } {
  return {
    publications: [],
    user: { id: 'test-user', last_seen_at: new Date().toISOString() },
  };
}
