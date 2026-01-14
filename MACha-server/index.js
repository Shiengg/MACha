import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ROLE = process.env.ROLE?.toLowerCase();

console.log(`🚀 Starting application with ROLE=${ROLE || 'server (default)'}`);

try {
    await import('./worker/worker.js');
    console.log('📦 Starting worker process...');
    await import('./server.js');
    console.log('🌐 Starting server process...');
} catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
}

