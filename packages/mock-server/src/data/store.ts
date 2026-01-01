import {
  Update,
  Widget,
  UserTracking,
  generateDefaultWidget,
  generateDefaultPublications,
  generateNewUserScenario,
  generateReturningUserScenario,
  generateManyUpdatesScenario,
  generateNoUpdatesScenario,
} from './seed.js';

export type ErrorMode = 'none' | 'updates' | 'users' | 'all';
export type ScenarioName = 'newUser' | 'returningUser' | 'manyUpdates' | 'noUpdates';

export interface ServerConfig {
  responseDelay: number;
  errorMode: ErrorMode;
}

export interface MockServerState {
  widget: Widget;
  publications: Update[];
  users: Record<string, UserTracking>;
  config: ServerConfig;
}

export interface RequestLogEntry {
  timestamp: string;
  method: string;
  path: string;
  body?: unknown;
  response?: unknown;
}

class MockStore {
  private state: MockServerState;
  private requestLog: RequestLogEntry[] = [];
  private maxLogEntries = 50;

  constructor() {
    this.state = this.getDefaultState();
  }

  private getDefaultState(): MockServerState {
    return {
      widget: generateDefaultWidget(),
      publications: generateDefaultPublications(),
      users: {},
      config: {
        responseDelay: 0,
        errorMode: 'none',
      },
    };
  }

  // Getters
  getWidget(): Widget {
    return this.state.widget;
  }

  getPublications(): Update[] {
    return this.state.publications;
  }

  getUser(userId: string): UserTracking | null {
    return this.state.users[userId] || null;
  }

  getConfig(): ServerConfig {
    return this.state.config;
  }

  getFullState(): MockServerState & { requestLog: RequestLogEntry[] } {
    return {
      ...this.state,
      requestLog: this.requestLog,
    };
  }

  // Setters
  setWidget(widget: Widget): void {
    this.state.widget = widget;
  }

  setPublications(publications: Update[]): void {
    this.state.publications = publications;
  }

  addPublication(publication: Update): void {
    this.state.publications.unshift(publication);
  }

  updatePublication(id: number, updates: Partial<Update>): void {
    const index = this.state.publications.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.state.publications[index] = { ...this.state.publications[index], ...updates };
    }
  }

  deletePublication(id: number): void {
    this.state.publications = this.state.publications.filter((p) => p.id !== id);
  }

  setUser(userId: string, data: Partial<UserTracking>): void {
    this.state.users[userId] = {
      id: userId,
      last_seen_at: null,
      ...this.state.users[userId],
      ...data,
    };
  }

  setUserLastSeen(userId: string, timestamp: string | null): void {
    this.setUser(userId, { last_seen_at: timestamp });
  }

  deleteUser(userId: string): void {
    delete this.state.users[userId];
  }

  // Config
  setResponseDelay(ms: number): void {
    this.state.config.responseDelay = ms;
  }

  setErrorMode(mode: ErrorMode): void {
    this.state.config.errorMode = mode;
  }

  // Scenarios
  applyScenario(name: ScenarioName): void {
    let scenario: { publications: Update[]; user: UserTracking };

    switch (name) {
      case 'newUser':
        scenario = generateNewUserScenario();
        break;
      case 'returningUser':
        scenario = generateReturningUserScenario();
        break;
      case 'manyUpdates':
        scenario = generateManyUpdatesScenario();
        break;
      case 'noUpdates':
        scenario = generateNoUpdatesScenario();
        break;
    }

    this.state.publications = scenario.publications;
    this.state.users = { [scenario.user.id]: scenario.user };
    this.state.widget = generateDefaultWidget();
  }

  // Request logging
  logRequest(entry: Omit<RequestLogEntry, 'timestamp'>): void {
    this.requestLog.unshift({
      ...entry,
      timestamp: new Date().toISOString(),
    });
    if (this.requestLog.length > this.maxLogEntries) {
      this.requestLog.pop();
    }
  }

  getRequestLog(): RequestLogEntry[] {
    return this.requestLog;
  }

  clearRequestLog(): void {
    this.requestLog = [];
  }

  // Reset
  reset(): void {
    this.state = this.getDefaultState();
    this.requestLog = [];
  }
}

export const mockStore = new MockStore();
