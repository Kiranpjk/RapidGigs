import express from 'express';
import { Category } from '../models/Category';

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories.map(cat => ({
      id: cat._id.toString(),
      name: cat.name,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
