import { Router, Response } from 'express';
import axios, { AxiosError } from 'axios';
import mongoose from 'mongoose';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Application } from '../models/Application';
import { Job } from '../models/Job';

// Thin gateway to the Java payment-service: checks the JWT here, forwards the user id + shared key.
const router = Router();
const payments = axios.create({
  baseURL: process.env.PAYMENT_SERVICE_URL || 'http://localhost:8081',
  headers: { 'X-Internal-Key': process.env.PAYMENT_SERVICE_KEY || '' },
  timeout: 10000,
});

const forward = async (req: AuthRequest, res: Response, method: 'get' | 'post', path: string, data?: unknown) => {
  try {
    const r = await payments.request({ method, url: path, data, headers: { 'X-User-Id': req.user!.userId } });
    res.status(r.status).json(r.data);
  } catch (e) {
    const err = e as AxiosError;
    if (err.response) return res.status(err.response.status).json(err.response.data);
    res.status(502).json({ error: 'Payment service unavailable' });
  }
};

// Client creates a milestone contract for a hired applicant
router.post('/contracts', authenticate, async (req: AuthRequest, res) => {
  const { applicationId, currency = 'EUR', milestones } = req.body;
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    return res.status(400).json({ error: 'Invalid application ID' });
  }
  const app = await Application.findById(applicationId);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'hired') return res.status(400).json({ error: 'Applicant must be hired first' });
  const job = await Job.findById(app.jobId);
  if (!job || job.postedBy.toString() !== req.user!.userId) {
    return res.status(403).json({ error: 'Only the job poster can create a contract' });
  }
  forward(req, res, 'post', '/contracts', {
    applicationId, jobId: job._id.toString(), freelancerId: app.userId.toString(), currency, milestones,
  });
});

router.get('/contracts', authenticate, (req: AuthRequest, res) => forward(req, res, 'get', '/contracts'));

router.get('/contracts/:id', authenticate, (req: AuthRequest, res) =>
  forward(req, res, 'get', `/contracts/${encodeURIComponent(req.params.id)}`));

// action = fund | submit | approve | reject (the Java service checks who may do what)
router.post('/contracts/:id/milestones/:index/:action', authenticate, (req: AuthRequest, res) => {
  const { id, index, action } = req.params;
  if (!/^\d+$/.test(index) || !['fund', 'submit', 'approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid milestone action' });
  }
  forward(req, res, 'post', `/contracts/${encodeURIComponent(id)}/milestones/${index}/${action}`);
});

export default router;
