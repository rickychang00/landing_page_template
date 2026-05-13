import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { adminUsers } from '../db/schema';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

function signToken(id: string, email: string): string {
  return jwt.sign({ sub: id, email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const user = await db.query.adminUsers.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken(user.id, user.email);
  res.json({ token, user: { id: user.id, email: user.email } });
});

// POST /auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const existing = await db.query.adminUsers.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });

  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(adminUsers).values({ email, passwordHash }).returning();

  const token = signToken(user.id, user.email);
  res.status(201).json({ token, user: { id: user.id, email: user.email } });
});

// GET /auth/refresh
router.get('/refresh', requireAuth, (req: AuthRequest, res: Response) => {
  const token = signToken(req.userId!, req.userEmail!);
  res.json({ token, user: { id: req.userId, email: req.userEmail } });
});

export default router;
