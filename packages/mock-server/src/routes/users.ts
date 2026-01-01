import { Router, Request, Response } from 'express';
import { mockStore } from '../data/store.js';

const router = Router();

// GET /users/:userId - Get user tracking data
router.get('/users/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const decodedUserId = decodeURIComponent(userId);
  const config = mockStore.getConfig();

  // Log request
  mockStore.logRequest({
    method: 'GET',
    path: `/users/${decodedUserId}`,
  });

  // Apply configured delay
  if (config.responseDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.responseDelay));
  }

  // Check error mode
  if (config.errorMode === 'users' || config.errorMode === 'all') {
    return res.status(500).json({ error: 'Simulated server error' });
  }

  let user = mockStore.getUser(decodedUserId);

  if (!user) {
    // Auto-create user (matches production API behavior)
    mockStore.setUser(decodedUserId, { id: decodedUserId, last_seen_at: null });
    user = mockStore.getUser(decodedUserId)!;
  }

  res.json(user);
});

// PATCH /users/:userId - Update user's last_seen_at
router.patch('/users/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const decodedUserId = decodeURIComponent(userId);
  const { last_seen_at, data } = req.body;
  const config = mockStore.getConfig();

  // Log request
  mockStore.logRequest({
    method: 'PATCH',
    path: `/users/${decodedUserId}`,
    body: { last_seen_at, data },
  });

  // Apply configured delay
  if (config.responseDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.responseDelay));
  }

  // Check error mode
  if (config.errorMode === 'users' || config.errorMode === 'all') {
    return res.status(500).json({ error: 'Simulated server error' });
  }

  mockStore.setUser(decodedUserId, {
    id: decodedUserId,
    last_seen_at,
    data,
  });

  res.status(200).json({ success: true });
});

export default router;
