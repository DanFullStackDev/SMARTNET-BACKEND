const cron = require('node-cron');
const ScheduledJob = require('../models/ScheduledJob');

// Helper function to process jobs
const waitHuman = async (min = 15, max = 45) => {
    const ms = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
    await new Promise(resolve => setTimeout(resolve, ms));
};

// Helper function to process jobs
const processJob = async (job, sock) => {
    console.log(`⏰ Running Scheduled Job: ${job._id}`);
    
    try {
        for (const target of job.targets) {
            // 1. Simulate typing
            await sock.sendPresenceUpdate('composing', target);
            await waitHuman(2, 5); 

            // 2. Send the message
            await sock.sendMessage(target, { text: job.message });
            
            // 3. Massive humanized delay to prevent bans (15 to 45 seconds)
            await waitHuman(15, 45); 
        }
        
        job.status = 'completed';
        await job.save();
        console.log(`✅ Job ${job._id} Completed safely.`);
    } catch (err) {
        console.error(`❌ Job ${job._id} Failed:`, err);
        job.status = 'failed';
        await job.save();
    }
};

const initScheduler = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        const sock = global.sock; // <--- ADD THIS LINE
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
