import { buildApp } from '../src/app';

export default async (req: any, res: any) => {
  const app = await buildApp();
  await app.ready();
  
  // VercelからのリクエストURLから、余計な '/api' を取り除く処理を追加（もしあれば）
  const url = req.url.replace(/^\/api/, '');
  req.url = url;

  app.server.emit('request', req, res);
};