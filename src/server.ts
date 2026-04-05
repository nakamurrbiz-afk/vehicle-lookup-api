import { buildApp } from './app';
// config は Vercel 側で環境変数として管理するため、listen 用の port は不要になります

const start = async () => {
  const app = await buildApp();

  // ローカル開発環境（Vercel以外）の時だけ listen を実行するようにします
  if (process.env.NODE_ENV !== 'production') {
    app.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
      console.log('Server listening on http://localhost:3000');
    });
  }

  // Vercel がリクエストを処理するために Fastify インスタンスを返します
  return app;
};

// Vercel のハンドラーとしてエクスポート
export default start();