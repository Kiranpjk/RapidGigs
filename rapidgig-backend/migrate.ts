import { runMigrations } from './src/utils/migrations';
import { runProfileMigrations } from './src/utils/profileMigrations';
import { runVideoMigrations } from './src/utils/videoMigrations';
import { runJobMigrations } from './src/utils/jobMigrations';

// Run all migrations
async function runAllMigrations() {
  try {
    await runMigrations();
    await runProfileMigrations();
    await runVideoMigrations();
    await runJobMigrations();
    console.log('All migration scripts completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration script failed:', error);
    process.exit(1);
  }
}

runAllMigrations();