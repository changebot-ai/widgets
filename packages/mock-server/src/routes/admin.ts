import { Router, Request, Response } from 'express';
import { mockStore, ScenarioName, ErrorMode } from '../data/store.js';
import { Update } from '../data/seed.js';

const router = Router();

// GET /admin/api/state - Get full server state
router.get('/state', (req: Request, res: Response) => {
  res.json(mockStore.getFullState());
});

// POST /admin/api/publications - Replace all publications
router.post('/publications', (req: Request, res: Response) => {
  const { publications } = req.body as { publications: Update[] };
  mockStore.setPublications(publications);
  res.json({ success: true });
});

// POST /admin/api/publications/add - Add single publication
router.post('/publications/add', (req: Request, res: Response) => {
  const publication = req.body as Update;
  mockStore.addPublication(publication);
  res.json({ success: true, id: publication.id });
});

// PATCH /admin/api/publications/:id - Update publication
router.patch('/publications/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  mockStore.updatePublication(id, req.body);
  res.json({ success: true });
});

// DELETE /admin/api/publications/:id - Delete publication
router.delete('/publications/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  mockStore.deletePublication(id);
  res.json({ success: true });
});

// POST /admin/api/user - Set user tracking data
router.post('/user', (req: Request, res: Response) => {
  const { userId, last_seen_at } = req.body as { userId: string; last_seen_at: string | null };
  mockStore.setUserLastSeen(userId, last_seen_at);
  res.json({ success: true });
});

// DELETE /admin/api/user/:userId - Delete user
router.delete('/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  mockStore.deleteUser(decodeURIComponent(userId));
  res.json({ success: true });
});

// POST /admin/api/config - Update server config
router.post('/config', (req: Request, res: Response) => {
  const { responseDelay, errorMode } = req.body as {
    responseDelay?: number;
    errorMode?: ErrorMode;
  };
  if (responseDelay !== undefined) mockStore.setResponseDelay(responseDelay);
  if (errorMode !== undefined) mockStore.setErrorMode(errorMode);
  res.json({ success: true, config: mockStore.getConfig() });
});

// POST /admin/api/scenario - Apply preset scenario
router.post('/scenario', (req: Request, res: Response) => {
  const { name } = req.body as { name: ScenarioName };
  mockStore.applyScenario(name);
  res.json({ success: true, scenario: name });
});

// POST /admin/api/reset - Reset to defaults
router.post('/reset', (req: Request, res: Response) => {
  mockStore.reset();
  res.json({ success: true });
});

// GET /admin/api/log - Get request log
router.get('/log', (req: Request, res: Response) => {
  res.json(mockStore.getRequestLog());
});

// DELETE /admin/api/log - Clear request log
router.delete('/log', (req: Request, res: Response) => {
  mockStore.clearRequestLog();
  res.json({ success: true });
});

export default router;
