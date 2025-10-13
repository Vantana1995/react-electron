import { createServer } from 'http';
import next from 'next';
import path from 'path';
import { tunnelServer } from './services/tunnel-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

console.log('🔧 Starting custom Next.js server...');

// Create Next.js app
const app = next({
  dev,
  hostname,
  port,
  dir: path.join(__dirname, '..'), // Явно указываем корень Next.js
});
const handle = app.getRequestHandler();

console.log('📦 Preparing Next.js application...');

app.prepare().then(async () => {
  console.log('✅ Next.js ready!');

  // Create HTTP server AFTER Next.js is ready
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // Initialize Socket.io tunnel server
  tunnelServer.initialize(httpServer);

  // Initialize NFT Listener Manager
  try {
    console.log('\n🎨 Starting Dynamic NFT Listener Manager...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { dynamicNFTListenerManager } = await import(
      './services/dynamic-nft-listener-manager'
    );
    await dynamicNFTListenerManager.start();

    console.log('✅ Dynamic NFT Listener Manager started successfully');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Failed to start Dynamic NFT Listener Manager:', error);
    // Don't crash the server, just log the error
  }

  // Start server
  httpServer
    .once('error', (err) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`✅ HTTP server listening on http://${hostname}:${port}`);
      console.log(`✅ Next.js API routes available at http://${hostname}:${port}/api/*`);
      console.log(`✅ Tunnel endpoint: ws://${hostname}:${port}/tunnel`);
    });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down server...');

    // Stop NFT Listener Manager
    try {
      const { dynamicNFTListenerManager } = await import(
        './services/dynamic-nft-listener-manager'
      );
      await dynamicNFTListenerManager.stop();
      console.log('✅ NFT Listener Manager stopped');
    } catch (error) {
      console.error('❌ Error stopping NFT Listener Manager:', error);
    }

    tunnelServer.shutdown();
    httpServer.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}).catch((err) => {
  console.error('❌ Failed to prepare Next.js:', err);
  process.exit(1);
});
