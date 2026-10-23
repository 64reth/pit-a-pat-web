process.env.PITAPAT_SERVE_ASSETS='1';
process.env.PITAPAT_SERVER_PORT??='8788';
process.env.PITAPAT_STATE_DIR??='.local-state-preview';
await import('./dev-server.mjs');
