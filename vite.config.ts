import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // Lightweight mock API middleware for dev. Serves JSON for /api/* endpoints
        // so the frontend can run without a separate backend during development.
        {
          name: 'vite:mock-api',
          configureServer(server) {
            if (mode !== 'development') return;

            // In-memory store
            const store = {
              columns: [
                {
                  _id: 'col-1',
                  title: 'To Do',
                  order: 0,
                  tasks: [
                    {
                      _id: 'task-1',
                      title: 'Welcome! ✨',
                      description: 'This is a sample task. Edit or delete it.',
                      order: 0,
                      columnId: 'col-1',
                    },
                  ],
                },
                {
                  _id: 'col-2',
                  title: 'In Progress',
                  order: 1,
                  tasks: [],
                },
                {
                  _id: 'col-3',
                  title: 'Done',
                  order: 2,
                  tasks: [],
                },
              ],
            } as any;

            const json = (res: any, payload: any, status = 200) => {
              res.statusCode = status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            };

            const collectBody = (req: any): Promise<any> =>
              new Promise((resolve) => {
                const chunks: Uint8Array[] = [];
                req.on('data', (c: Uint8Array) => chunks.push(c));
                req.on('end', () => {
                  try {
                    const raw = Buffer.concat(chunks).toString();
                    resolve(raw ? JSON.parse(raw) : {});
                  } catch (e) {
                    resolve({});
                  }
                });
              });

            server.middlewares.use(async (req, res, next) => {
              if (!req.url || !req.url.startsWith('/api')) return next();

              const url = req.url.split('?')[0];

              // GET /api/boards -> return columns
              if (req.method === 'GET' && url === '/api/boards') {
                return json(res, store.columns.map((c: any) => ({ ...c })));
              }

              // POST /api/columns -> create column
              if (req.method === 'POST' && url === '/api/columns') {
                const body = await collectBody(req);
                const newCol = {
                  _id: `col-${Date.now()}`,
                  title: body.title || 'Untitled',
                  order: store.columns.length,
                  tasks: [],
                };
                store.columns.push(newCol);
                return json(res, newCol, 201);
              }

              // PATCH /api/columns/:id -> update title
              if (req.method === 'PATCH' && url.startsWith('/api/columns/')) {
                const id = url.replace('/api/columns/', '');
                const body = await collectBody(req);
                const col = store.columns.find((c: any) => c._id === id);
                if (!col) return json(res, { message: 'Column not found' }, 404);
                if (body.title) col.title = body.title;
                return json(res, col);
              }

              // DELETE /api/columns/:id
              if (req.method === 'DELETE' && url.startsWith('/api/columns/')) {
                const id = url.replace('/api/columns/', '');
                const idx = store.columns.findIndex((c: any) => c._id === id);
                if (idx === -1) return json(res, { message: 'Column not found' }, 404);
                store.columns.splice(idx, 1);
                return json(res, {});
              }

              // POST /api/tasks -> create task
              if (req.method === 'POST' && url === '/api/tasks') {
                const body = await collectBody(req);
                const column = store.columns.find((c: any) => c._id === body.columnId);
                if (!column) return json(res, { message: 'Column not found' }, 404);
                const newTask = {
                  _id: `task-${Date.now()}`,
                  title: body.title || 'Untitled Task',
                  description: body.description || '',
                  order: column.tasks.length,
                  columnId: column._id,
                };
                column.tasks.push(newTask);
                return json(res, newTask, 201);
              }

              // PATCH /api/tasks/:id -> update task
              if (req.method === 'PATCH' && url.startsWith('/api/tasks/')) {
                const id = url.replace('/api/tasks/', '');
                const body = await collectBody(req);
                let found: any = null;
                for (const c of store.columns) {
                  const t = c.tasks.find((x: any) => x._id === id);
                  if (t) { found = t; break; }
                }
                if (!found) return json(res, { message: 'Task not found' }, 404);
                if (body.title) found.title = body.title;
                if (body.description !== undefined) found.description = body.description;
                return json(res, found);
              }

              // DELETE /api/tasks/:id
              if (req.method === 'DELETE' && url.startsWith('/api/tasks/')) {
                const id = url.replace('/api/tasks/', '');
                for (const c of store.columns) {
                  const idx = c.tasks.findIndex((t: any) => t._id === id);
                  if (idx !== -1) { c.tasks.splice(idx, 1); return json(res, {}); }
                }
                return json(res, { message: 'Task not found' }, 404);
              }

              // PUT /api/boards/reorder-columns
              if (req.method === 'PUT' && url === '/api/boards/reorder-columns') {
                const body = await collectBody(req);
                const { columnIds } = body || {};
                if (!Array.isArray(columnIds)) return json(res, { message: 'Invalid payload' }, 400);
                store.columns = columnIds.map((id: string, idx: number) => ({ ...store.columns.find((c: any) => c._id === id), order: idx }));
                return json(res, {});
              }

              // PUT /api/boards/reorder-tasks
              if (req.method === 'PUT' && url === '/api/boards/reorder-tasks') {
                const body = await collectBody(req);
                const { taskId, sourceColumnId, destinationColumnId, newIndex } = body || {};
                if (!taskId) return json(res, { message: 'Invalid payload' }, 400);
                const source = store.columns.find((c: any) => c._id === sourceColumnId);
                const dest = store.columns.find((c: any) => c._id === destinationColumnId);
                if (!source || !dest) return json(res, { message: 'Column(s) not found' }, 404);
                const idx = source.tasks.findIndex((t: any) => t._id === taskId);
                if (idx === -1) return json(res, { message: 'Task not found in source' }, 404);
                const [task] = source.tasks.splice(idx, 1);
                task.columnId = destinationColumnId;
                dest.tasks.splice(newIndex, 0, task);
                return json(res, {});
              }

              // Fallback for unhandled /api routes
              return json(res, { message: 'Not found' }, 404);
            });
          },
        },
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
