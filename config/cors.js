const cors = require('cors');

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://buy-fast-data-bundles.vercel.app',
    'https://www.fastdatabundles.co.ke',
    'https://fastdatabundles.co.ke'
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log("Blocked by CORS:", origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);