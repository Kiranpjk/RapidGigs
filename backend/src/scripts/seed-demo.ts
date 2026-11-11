import crypto from 'crypto';
import mongoose from 'mongoose';
import { config } from '../config/env';
import { User } from '../models/User';
import { Job } from '../models/Job';
import { Category } from '../models/Category';
import { hashPassword } from '../utils/password';

// Usage: npm run seed:demo [-- --remove]. Everything is keyed to this one user.
const DEMO_EMAIL = 'demo-recruiter@rapidgig.demo';

type Demo = [title: string, company: string, category: string, location: string, type: 'Remote' | 'On-site' | 'Hybrid', pay: string, description: string];

const DEMOS: Demo[] = [
  ['React Frontend Developer', 'Northwind Labs', 'Web Development', 'Berlin, Germany', 'Hybrid', 'EUR 55-70 per hour', 'We are building a booking dashboard for small clinics and need a React developer to own the front end. You will work with TypeScript and a small design team. The contract runs three months with a likely extension.'],
  ['Flutter Mobile Engineer', 'Bluepeak Studio', 'Mobile Development', 'Remote', 'Remote', 'USD 45-60 per hour', 'Help us ship the second version of a fitness tracking app on iOS and Android. You should be comfortable with Flutter, REST APIs and app store releases. Work is async with one weekly call.'],
  ['Product Designer for Onboarding Flow', 'Lumen Harbor', 'UI/UX Design', 'London, UK', 'Hybrid', 'GBP 400 per day', 'Redesign the first-run experience of our budgeting tool. Expect user interviews, wireframes and a clickable prototype in Figma. Two days a month in the office.'],
  ['Junior Data Analyst', 'Quarry Street Analytics', 'Data Science', 'Toronto, Canada', 'On-site', 'CAD 38 per hour', 'Clean and analyze retail sales data and present weekly findings to the operations team. SQL and a spreadsheet tool are required, Python is a plus. This is a six month placement.'],
  ['Social Media Campaign Manager', 'Fernlight Foods', 'Digital Marketing', 'Remote', 'Remote', 'USD 3,000 per month', 'Plan and run a spring campaign for a regional snack brand across Instagram and TikTok. You will set the calendar, brief creators and report on reach each week. Experience with small consumer brands helps.'],
  ['Blog Writer for Developer Tools', 'Cobalt Forge', 'Content Creation', 'Remote', 'Remote', 'USD 250 per article', 'Write clear, practical articles for software developers, about two per week. You will receive an outline and access to our engineers for questions. Past technical writing samples are requested.'],
  ['Short-form Video Editor', 'Redwood Reels', 'Video Editing', 'Austin, USA', 'Hybrid', 'USD 30-40 per hour', 'Cut vertical videos for a travel channel from raw footage, adding captions, music and simple motion graphics. You will deliver around ten clips a week. Premiere or DaVinci Resolve experience is needed.'],
  ['Part-time Project Coordinator', 'Alder and Finch Builders', 'Project Management', 'Dublin, Ireland', 'On-site', 'EUR 22 per hour', 'Keep a home renovation schedule on track by coordinating trades, suppliers and inspection dates. You will update a shared plan each morning and flag delays early. About 25 hours a week.'],
  ['Customer Support Specialist', 'Tidewater Software', 'Customer Support', 'Remote', 'Remote', 'USD 20-25 per hour', 'Answer customer emails and chats for a small invoicing product, aiming for a same-day reply. You will write help articles from recurring questions. Evening hours in US Eastern time are preferred.'],
  ['Virtual Assistant for Founder', 'Marlowe and Pine', 'Virtual Assistant', 'Remote', 'Remote', 'USD 18 per hour', 'Support a busy founder with calendar management, travel booking and inbox triage. Discretion and reliable communication matter most. Around 15 hours a week, flexible schedule.'],
  ['Brand and Packaging Designer', 'Saffron Row', 'Graphic Design', 'Amsterdam, Netherlands', 'Hybrid', 'EUR 500 per day', 'Create a label and box design for a new line of loose-leaf teas. You will deliver print-ready files and a short style guide. A portfolio with packaging work is expected.'],
  ['Machine Learning Intern', 'Greywater Robotics', 'Machine Learning', 'Pune, India', 'On-site', 'INR 30,000 per month', 'Assist the perception team with labelling data, training small image classifiers and writing evaluation scripts. You should know Python and basic PyTorch. This is a four month internship.'],
];

async function main() {
  const remove = process.argv.slice(2).includes('--remove');
  try {
    await mongoose.connect(config.db.uri, { serverSelectionTimeoutMS: 5000 });
  } catch (e: any) {
    // Not printing e.message: driver errors can echo the connection string.
    console.error(`Could not connect to MongoDB (${e?.name || 'error'}). Check MONGO_URI.`);
    process.exit(1);
  }

  try {
    const demoUser = await User.findOne({ email: DEMO_EMAIL }).select('_id');

    if (remove) {
      // Every delete is scoped to the demo user's id; nothing else is matched.
      let removed = 0;
      if (demoUser) {
        removed = (await Job.deleteMany({ postedBy: demoUser._id })).deletedCount;
        await User.deleteOne({ _id: demoUser._id });
      }
      console.log(`Removed ${removed} demo jobs and the demo user`);
      return;
    }

    // Random, unrecorded password: nobody can log in as this user. Set on insert only.
    const password = await hashPassword(crypto.randomBytes(32).toString('hex'));
    const user = await User.findOneAndUpdate(
      { email: DEMO_EMAIL },
      {
        $setOnInsert: { email: DEMO_EMAIL, password, permissions: [] },
        $set: { name: 'Demo Recruiter', role: 'recruiter', isRecruiter: true, isStudent: false, isActive: true },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    let created = 0;
    let updated = 0;
    for (const [title, company, categoryName, location, type, pay, description] of DEMOS) {
      // No-op update when the category exists; matches what the server does at startup.
      const category = await Category.findOneAndUpdate(
        { name: categoryName },
        { $setOnInsert: { name: categoryName } },
        { upsert: true, new: true }
      );
      const res = await Job.updateOne(
        { postedBy: user!._id, title },
        { $set: { company, location, type, pay, description, categoryId: category!._id, status: 'Open', maxSlots: 3 } },
        { upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
      if (res.upsertedCount) created++;
      else updated++;
    }
    console.log(`Seeded ${DEMOS.length} demo jobs (${created} created, ${updated} updated)`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((e) => {
  console.error(`Seed failed: ${e?.name || 'error'}`);
  process.exit(1);
});
