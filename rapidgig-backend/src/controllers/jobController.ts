import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { JobService } from '../services/jobService';
import { CreateJobData, UpdateJobData, CreateApplicationData } from '../models/Job';

export class JobController {
  // Job Management
  static async createJob(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'recruiter') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only recruiters can create jobs'
          }
        });
      }
      
      const {
        title,
        description,
        category,
        duration,
        payRate,
        payType,
        location,
        workType,
        requiredSkills,
        expiresAt
      } = req.body;
      
      // Validation
      if (!title || !description || !category || !duration || !payRate || !payType || !location || !workType || !requiredSkills) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'All job fields are required'
          }
        });
      }
      
      if (!['hourly', 'fixed', 'negotiable'].includes(payType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAY_TYPE',
            message: 'Pay type must be hourly, fixed, or negotiable'
          }
        });
      }
      
      if (!['remote', 'onsite', 'hybrid'].includes(workType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_WORK_TYPE',
            message: 'Work type must be remote, onsite, or hybrid'
          }
        });
      }
      
      const jobData: CreateJobData = {
        title,
        description,
        category,
        duration,
        pay_rate: parseFloat(payRate),
        pay_type: payType,
        location,
        work_type: workType,
        required_skills: Array.isArray(requiredSkills) ? requiredSkills : requiredSkills.split(',').map((s: string) => s.trim()),
        recruiter_id: userId,
        expires_at: expiresAt ? new Date(expiresAt) : undefined
      };
      
      const job = await JobService.createJob(jobData);
      
      res.status(201).json({
        success: true,
        data: job,
        message: 'Job created successfully'
      });
      
    } catch (error) {
      console.error('Create job error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_JOB_FAILED',
          message: 'Failed to create job'
        }
      });
    }
  }
  
  static async getJob(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const ipAddress = req.ip;
      
      const job = await JobService.getJobById(id);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Job not found'
          }
        });
      }
      
      // Increment view count (async, don't wait)
      JobService.incrementViews(id, userId, ipAddress).catch(console.error);
      
      // Check if job is saved by current user (if student)
      let isSaved = false;
      if (userId && req.user?.role === 'student') {
        isSaved = await JobService.isJobSaved(id, userId);
      }
      
      res.json({
        success: true,
        data: {
          ...job,
          is_saved: isSaved
        }
      });
      
    } catch (error) {
      console.error('Get job error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_JOB_FAILED',
          message: 'Failed to retrieve job'
        }
      });
    }
  }
  
  static async getJobs(req: AuthRequest, res: Response) {
    try {
      const {
        category,
        workType,
        payType,
        location,
        requiredSkills,
        minPay,
        maxPay,
        search,
        page = 1,
        limit = 20
      } = req.query;
      
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const filters = {
        category: category as string,
        work_type: workType as string,
        pay_type: payType as string,
        location: location as string,
        required_skills: requiredSkills ? (requiredSkills as string).split(',') : undefined,
        min_pay: minPay ? parseFloat(minPay as string) : undefined,
        max_pay: maxPay ? parseFloat(maxPay as string) : undefined,
        search: search as string,
        limit: parseInt(limit as string),
        offset
      };
      
      const jobs = await JobService.getJobs(filters);
      
      res.json({
        success: true,
        data: {
          jobs,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: jobs.length
          }
        }
      });
      
    } catch (error) {
      console.error('Get jobs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_JOBS_FAILED',
          message: 'Failed to retrieve jobs'
        }
      });
    }
  }
  
  static async getRecruiterJobs(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'recruiter') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only recruiters can view their jobs'
          }
        });
      }
      
      const { status, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const jobs = await JobService.getJobs({
        recruiter_id: userId,
        status: status as string,
        limit: parseInt(limit as string),
        offset
      });
      
      res.json({
        success: true,
        data: {
          jobs,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: jobs.length
          }
        }
      });
      
    } catch (error) {
      console.error('Get recruiter jobs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_RECRUITER_JOBS_FAILED',
          message: 'Failed to retrieve recruiter jobs'
        }
      });
    }
  }
  
  static async updateJob(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'recruiter') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only recruiters can update jobs'
          }
        });
      }
      
      // Check if job belongs to recruiter
      const existingJob = await JobService.getJobById(id);
      if (!existingJob || existingJob.recruiter_id !== userId) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Job not found or access denied'
          }
        });
      }
      
      const updateData: UpdateJobData = {};
      const {
        title,
        description,
        category,
        duration,
        payRate,
        payType,
        location,
        workType,
        requiredSkills,
        status,
        expiresAt
      } = req.body;
      
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (category) updateData.category = category;
      if (duration) updateData.duration = duration;
      if (payRate) updateData.pay_rate = parseFloat(payRate);
      if (payType) updateData.pay_type = payType;
      if (location) updateData.location = location;
      if (workType) updateData.work_type = workType;
      if (requiredSkills) {
        updateData.required_skills = Array.isArray(requiredSkills) 
          ? requiredSkills 
          : requiredSkills.split(',').map((s: string) => s.trim());
      }
      if (status) updateData.status = status;
      if (expiresAt) updateData.expires_at = new Date(expiresAt);
      
      const updatedJob = await JobService.updateJob(id, updateData);
      
      res.json({
        success: true,
        data: updatedJob,
        message: 'Job updated successfully'
      });
      
    } catch (error) {
      console.error('Update job error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_JOB_FAILED',
          message: 'Failed to update job'
        }
      });
    }
  }
  
  static async deleteJob(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'recruiter') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only recruiters can delete jobs'
          }
        });
      }
      
      const deleted = await JobService.deleteJob(id, userId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Job not found or access denied'
          }
        });
      }
      
      res.json({
        success: true,
        message: 'Job deleted successfully'
      });
      
    } catch (error) {
      console.error('Delete job error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_JOB_FAILED',
          message: 'Failed to delete job'
        }
      });
    }
  }
  
  // Application Management
  static async applyToJob(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'student') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only students can apply to jobs'
          }
        });
      }
      
      const { coverLetter } = req.body;
      
      // Check if job exists and is active
      const job = await JobService.getJobById(id);
      if (!job || job.status !== 'active') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'JOB_NOT_AVAILABLE',
            message: 'Job not found or no longer available'
          }
        });
      }
      
      const applicationData: CreateApplicationData = {
        job_id: id,
        student_id: userId,
        cover_letter: coverLetter
      };
      
      const application = await JobService.createApplication(applicationData);
      
      res.status(201).json({
        success: true,
        data: application,
        message: 'Application submitted successfully'
      });
      
    } catch (error: any) {
      console.error('Apply to job error:', error);
      
      if (error.code === '23505') { // Unique violation - already applied
        return res.status(409).json({
          success: false,
          error: {
            code: 'ALREADY_APPLIED',
            message: 'You have already applied to this job'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'APPLICATION_FAILED',
          message: 'Failed to submit application'
        }
      });
    }
  }
  
  static async getJobApplications(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'recruiter') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only recruiters can view job applications'
          }
        });
      }
      
      // Check if job belongs to recruiter
      const job = await JobService.getJobById(id);
      if (!job || job.recruiter_id !== userId) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Job not found or access denied'
          }
        });
      }
      
      const { status } = req.query;
      const applications = await JobService.getJobApplications(id, status as string);
      
      res.json({
        success: true,
        data: applications
      });
      
    } catch (error) {
      console.error('Get job applications error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_APPLICATIONS_FAILED',
          message: 'Failed to retrieve applications'
        }
      });
    }
  }
  
  static async getStudentApplications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'student') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only students can view their applications'
          }
        });
      }
      
      const { status } = req.query;
      const applications = await JobService.getStudentApplications(userId, status as string);
      
      res.json({
        success: true,
        data: applications
      });
      
    } catch (error) {
      console.error('Get student applications error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_APPLICATIONS_FAILED',
          message: 'Failed to retrieve applications'
        }
      });
    }
  }
  
  static async updateApplicationStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      const { status } = req.body;
      
      if (!userId || userRole !== 'recruiter') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only recruiters can update application status'
          }
        });
      }
      
      if (!['pending', 'reviewed', 'accepted', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Invalid application status'
          }
        });
      }
      
      // Check if application belongs to recruiter's job
      const application = await JobService.getApplicationById(id);
      if (!application) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'APPLICATION_NOT_FOUND',
            message: 'Application not found'
          }
        });
      }
      
      const job = await JobService.getJobById(application.job_id);
      if (!job || job.recruiter_id !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied'
          }
        });
      }
      
      const updatedApplication = await JobService.updateApplication(
        id, 
        { status }, 
        userId
      );
      
      res.json({
        success: true,
        data: updatedApplication,
        message: 'Application status updated successfully'
      });
      
    } catch (error) {
      console.error('Update application status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_APPLICATION_FAILED',
          message: 'Failed to update application status'
        }
      });
    }
  }
  
  static async withdrawApplication(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'student') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only students can withdraw their applications'
          }
        });
      }
      
      const withdrawn = await JobService.withdrawApplication(id, userId);
      
      if (!withdrawn) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'APPLICATION_NOT_FOUND',
            message: 'Application not found or cannot be withdrawn'
          }
        });
      }
      
      res.json({
        success: true,
        message: 'Application withdrawn successfully'
      });
      
    } catch (error) {
      console.error('Withdraw application error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'WITHDRAW_APPLICATION_FAILED',
          message: 'Failed to withdraw application'
        }
      });
    }
  }
  
  // Saved Jobs
  static async saveJob(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'student') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only students can save jobs'
          }
        });
      }
      
      await JobService.saveJob(id, userId);
      
      res.json({
        success: true,
        message: 'Job saved successfully'
      });
      
    } catch (error) {
      console.error('Save job error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SAVE_JOB_FAILED',
          message: 'Failed to save job'
        }
      });
    }
  }
  
  static async unsaveJob(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'student') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only students can unsave jobs'
          }
        });
      }
      
      await JobService.unsaveJob(id, userId);
      
      res.json({
        success: true,
        message: 'Job unsaved successfully'
      });
      
    } catch (error) {
      console.error('Unsave job error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UNSAVE_JOB_FAILED',
          message: 'Failed to unsave job'
        }
      });
    }
  }
  
  static async getSavedJobs(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'student') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only students can view saved jobs'
          }
        });
      }
      
      const savedJobs = await JobService.getSavedJobs(userId);
      
      res.json({
        success: true,
        data: savedJobs
      });
      
    } catch (error) {
      console.error('Get saved jobs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_SAVED_JOBS_FAILED',
          message: 'Failed to retrieve saved jobs'
        }
      });
    }
  }
  
  // Utility Endpoints
  static async getJobCategories(req: AuthRequest, res: Response) {
    try {
      const categories = await JobService.getJobCategories();
      
      res.json({
        success: true,
        data: categories
      });
      
    } catch (error) {
      console.error('Get job categories error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_CATEGORIES_FAILED',
          message: 'Failed to retrieve job categories'
        }
      });
    }
  }
  
  static async getRecommendedJobs(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'student') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only students can get job recommendations'
          }
        });
      }
      
      const { limit = 10 } = req.query;
      const recommendedJobs = await JobService.getRecommendedJobs(userId, parseInt(limit as string));
      
      res.json({
        success: true,
        data: recommendedJobs
      });
      
    } catch (error) {
      console.error('Get recommended jobs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_RECOMMENDATIONS_FAILED',
          message: 'Failed to retrieve job recommendations'
        }
      });
    }
  }
  
  static async getTrendingJobs(req: AuthRequest, res: Response) {
    try {
      const { limit = 10 } = req.query;
      const trendingJobs = await JobService.getTrendingJobs(parseInt(limit as string));
      
      res.json({
        success: true,
        data: trendingJobs
      });
      
    } catch (error) {
      console.error('Get trending jobs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_TRENDING_FAILED',
          message: 'Failed to retrieve trending jobs'
        }
      });
    }
  }
  
  static async getSimilarJobs(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { limit = 10 } = req.query;
      
      const { MatchingService } = await import('../services/matchingService');
      const similarJobs = await MatchingService.getSimilarJobs(id, parseInt(limit as string));
      
      res.json({
        success: true,
        data: similarJobs
      });
      
    } catch (error) {
      console.error('Get similar jobs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_SIMILAR_JOBS_FAILED',
          message: 'Failed to retrieve similar jobs'
        }
      });
    }
  }
  
  static async getNearbyJobs(req: AuthRequest, res: Response) {
    try {
      const { location, radius = 50, limit = 20 } = req.query;
      
      if (!location) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_LOCATION',
            message: 'Location parameter is required'
          }
        });
      }
      
      const { MatchingService } = await import('../services/matchingService');
      const nearbyJobs = await MatchingService.getNearbyJobs(
        location as string,
        parseInt(radius as string),
        parseInt(limit as string)
      );
      
      res.json({
        success: true,
        data: nearbyJobs
      });
      
    } catch (error) {
      console.error('Get nearby jobs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_NEARBY_JOBS_FAILED',
          message: 'Failed to retrieve nearby jobs'
        }
      });
    }
  }
  
  static async getTrendingJobsByCategory(req: AuthRequest, res: Response) {
    try {
      const { category } = req.params;
      const { limit = 10 } = req.query;
      
      const { MatchingService } = await import('../services/matchingService');
      const trendingJobs = await MatchingService.getTrendingJobsByCategory(
        category,
        parseInt(limit as string)
      );
      
      res.json({
        success: true,
        data: trendingJobs
      });
      
    } catch (error) {
      console.error('Get trending jobs by category error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_TRENDING_BY_CATEGORY_FAILED',
          message: 'Failed to retrieve trending jobs by category'
        }
      });
    }
  }
  
  // Application Workflow Management
  static async getApplicationWithHistory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }
      
      const { ApplicationWorkflowService } = await import('../services/applicationWorkflowService');
      const application = await ApplicationWorkflowService.getApplicationWithHistory(id);
      
      if (!application) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'APPLICATION_NOT_FOUND',
            message: 'Application not found'
          }
        });
      }
      
      // Check access permissions
      const hasAccess = application.student_id === userId || 
                       (req.user?.role === 'recruiter' && application.recruiter_id === userId);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied'
          }
        });
      }
      
      res.json({
        success: true,
        data: application
      });
      
    } catch (error) {
      console.error('Get application with history error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_APPLICATION_HISTORY_FAILED',
          message: 'Failed to retrieve application history'
        }
      });
    }
  }
  
  static async getApplicationStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }
      
      const { ApplicationWorkflowService } = await import('../services/applicationWorkflowService');
      
      let stats;
      if (userRole === 'recruiter') {
        stats = await ApplicationWorkflowService.getRecruiterApplicationStats(userId);
      } else if (userRole === 'student') {
        stats = await ApplicationWorkflowService.getStudentApplicationStats(userId);
      } else {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: 'Invalid user role'
          }
        });
      }
      
      res.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      console.error('Get application stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_APPLICATION_STATS_FAILED',
          message: 'Failed to retrieve application statistics'
        }
      });
    }
  }
  
  static async bulkUpdateApplications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'recruiter') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only recruiters can bulk update applications'
          }
        });
      }
      
      const { applicationIds, status, notes } = req.body;
      
      if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_APPLICATION_IDS',
            message: 'Valid application IDs array is required'
          }
        });
      }
      
      if (!['pending', 'reviewed', 'accepted', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Invalid application status'
          }
        });
      }
      
      const { ApplicationWorkflowService } = await import('../services/applicationWorkflowService');
      const updatedApplications = await ApplicationWorkflowService.bulkUpdateApplicationStatus(
        applicationIds,
        status,
        userId,
        notes
      );
      
      res.json({
        success: true,
        data: updatedApplications,
        message: `${updatedApplications.length} applications updated successfully`
      });
      
    } catch (error) {
      console.error('Bulk update applications error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_UPDATE_FAILED',
          message: 'Failed to bulk update applications'
        }
      });
    }
  }
  
  static async getApplicationsRequiringAttention(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'recruiter') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only recruiters can view applications requiring attention'
          }
        });
      }
      
      const { ApplicationWorkflowService } = await import('../services/applicationWorkflowService');
      const applications = await ApplicationWorkflowService.getApplicationsRequiringAttention(userId);
      
      res.json({
        success: true,
        data: applications
      });
      
    } catch (error) {
      console.error('Get applications requiring attention error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ATTENTION_APPLICATIONS_FAILED',
          message: 'Failed to retrieve applications requiring attention'
        }
      });
    }
  }
  
  static async getRecommendedActions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId || userRole !== 'recruiter') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only recruiters can view recommended actions'
          }
        });
      }
      
      const { ApplicationWorkflowService } = await import('../services/applicationWorkflowService');
      const actions = await ApplicationWorkflowService.getRecommendedActions(userId);
      
      res.json({
        success: true,
        data: actions
      });
      
    } catch (error) {
      console.error('Get recommended actions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_RECOMMENDED_ACTIONS_FAILED',
          message: 'Failed to retrieve recommended actions'
        }
      });
    }
  }
}