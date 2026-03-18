import { buildApp } from './app';
import { config } from './config/env';

buildApp()
  .then((app) => {
    app.listen({ port: config.port, host: '0.0.0.0' }, (err) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
