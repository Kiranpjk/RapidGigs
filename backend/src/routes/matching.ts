/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AI Candidate Matching Routes
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * POST /api/matching/:applicationId  — Compute match score for an application
 * GET  /api/matching/:applicationId  — Get cached match result (if exists)
 *
 * Only accessible by the recruiter who owns the job (verified via application → job → postedBy).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Application } from '../models/Application';
import { Job } from '../models/Job';
import { User } from '../models/User';
import { computeMatchScore, MatchResult } from '../services/candidateMatcher';

const router = express.Router();

// In-memory cache for match results (keyed by application ID)
// In production, store on the Application document or Redis
const matchCache = new Map<string, MatchResult>();

/**
 * POST /api/matching/:applicationId
 * Compute or re-compute the AI match score for a specific application.
 */
router.post('/:applicationId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { applicationId } = req.params;
    const forceRefresh = req.query.refresh === 'true';

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    // ── Load application + user + job ────────────────────────────────────
    const application = await Application.findById(applicationId)
      .populate('userId', 'name email avatarUrl title');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const job = await Job.findById(application.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Associated job not found' });
    }

    // ── Auth: Only the job poster can request match scores ───────────────
    if (job.postedBy.toString() !== req.user!.userId) {
      return res.status(403).json({ error: 'Only the job poster can access match scores' });
    }

    // ── Check if result already exists in DB ─────────────────────────────
    if (!forceRefresh && application.aiMatchResult) {
      return res.json({
        ...application.aiMatchResult,
        cached: true,
      });
    }

    // ── Compute match ───────────────────────────────────────────────────
    const applicant = application.userId as any;
    const candidateName = applicant?.name || 'Unknown Candidate';

    const result = await computeMatchScore({
      jobTitle: job.title,
      jobDescription: job.description,
      candidateName,
      coverLetter: application.coverLetter,
      resumeUrl: application.resumeUrl,
      videoUrl: application.videoUrl,
    });

    // ── Persist result to Database ──────────────────────────────────────
    await Application.findByIdAndUpdate(applicationId, {
      aiMatchResult: result
    });

    return res.json({
      ...result,
      cached: false,
    });
  } catch (error: any) {
    console.error('[Matching] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/matching/:applicationId
 * Retrieve a match result from DB.
 */
router.get('/:applicationId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { applicationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    // Verify authorization
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const job = await Job.findById(application.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Associated job not found' });
    }

    if (job.postedBy.toString() !== req.user!.userId) {
      return res.status(403).json({ error: 'Only the job poster can access match scores' });
    }

    if (!application.aiMatchResult) {
      return res.status(404).json({
        error: 'No match score computed yet',
        hint: 'POST to /api/matching/:applicationId to compute one',
      });
    }

    return res.json({ ...application.aiMatchResult, cached: true });
  } catch (error: any) {
    console.error('[Matching] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/matching/batch/:jobId
 * Compute match scores for ALL applications of a job in one call.
 * Returns an array of results keyed by application ID.
 */
router.post('/batch/:jobId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { jobId } = req.params;
    const forceRefresh = req.query.refresh === 'true';

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user!.userId) {
      return res.status(403).json({ error: 'Only the job poster can access match scores' });
    }

    const applications = await Application.find({ jobId: new mongoose.Types.ObjectId(jobId) })
      .populate('userId', 'name email avatarUrl title');

    if (applications.length === 0) {
      return res.json({ results: [], count: 0 });
    }

    const results: Array<{ applicationId: string; result: MatchResult }> = [];

    for (const app of applications) {
      const appId = app._id.toString();

      // Use existing result if available
      if (!forceRefresh && app.aiMatchResult) {
        results.push({ applicationId: appId, result: app.aiMatchResult as any });
        continue;
      }

      const applicant = app.userId as any;
      const candidateName = applicant?.name || 'Unknown Candidate';

      const result = await computeMatchScore({
        jobTitle: job.title,
        jobDescription: job.description,
        candidateName,
        coverLetter: app.coverLetter,
        resumeUrl: app.resumeUrl,
        videoUrl: app.videoUrl,
      });

      // Persist to DB
      await Application.findByIdAndUpdate(appId, {
        aiMatchResult: result
      });

      results.push({ applicationId: appId, result });
    }

    // Sort by match score descending
    results.sort((a, b) => b.result.matchScore - a.result.matchScore);

    return res.json({
      results,
      count: results.length,
      jobTitle: job.title,
    });
  } catch (error: any) {
    console.error('[Matching] Batch error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
