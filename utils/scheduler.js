const cron = require('node-cron');
const ScheduledJob = require('../models/ScheduledJob');

// Helper function to process jobs
const processJob = async (job, sock) => {
    console.log(`⏰ Running Scheduled Job: ${job._id}`);
    
    try {
        for (const target of job.targets) {
            await sock.sendMessage(target, { text: job.message });
            // Tiny delay to prevent ban
            await new Promise(r => setTimeout(r, 1000));
        }
        
        job.status = 'completed';
        await job.save();
        console.log(`✅ Job ${job._id} Completed`);
    } catch (err) {
        console.error(`❌ Job ${job._id} Failed:`, err);
        job.status = 'failed';
        await job.save();
    }
};

const initScheduler = (sock) => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        if (!sock) return;

        const now = new Date();
        
        // Find jobs that are due (scheduledTime <= now) and still pending
        const jobs = await ScheduledJob.find({
            status: 'pending',
            scheduledTime: { $lte: now }
        });

        for (const job of jobs) {
            await processJob(job, sock);
        }
    });
    console.log("🕒 Scheduler Service Started");
};

module.exports = { initScheduler };