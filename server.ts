import { Database } from "bun:sqlite";
import { networkInterfaces } from "node:os";
import index from "./index.html";

type TodoRow = { id: number; text: string; done: number; created_at: number };
type Todo = { id: number; text: string; done: boolean; created_at: number };

const db = new Database("todos.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`);

const stmts = {
  list: db.query<TodoRow, []>("SELECT * FROM todos ORDER BY created_at DESC"),
  insert: db.query<TodoRow, [string, number]>(
    "INSERT INTO todos (text, done, created_at) VALUES (?, 0, ?) RETURNING *",
  ),
  toggle: db.query<TodoRow, [number]>(
    "UPDATE todos SET done = 1 - done WHERE id = ? RETURNING *",
  ),
  updateText: db.query<TodoRow, [string, number]>(
    "UPDATE todos SET text = ? WHERE id = ? RETURNING *",
  ),
  remove: db.query<TodoRow, [number]>(
    "DELETE FROM todos WHERE id = ? RETURNING *",
  ),
};

const toTodo = (r: TodoRow): Todo => ({
  id: r.id,
  text: r.text,
  done: r.done === 1,
  created_at: r.created_at,
});

const json = (data: unknown, init?: ResponseInit) =>
  Response.json(data, init);

const port = Number(Bun.env.PORT ?? 3000);

const server = Bun.serve({
  hostname: "0.0.0.0",
  port,
  development: Bun.env.NODE_ENV !== "production",
  routes: {
    "/": index,

    "/api/todos": {
      GET: () => json(stmts.list.all().map(toTodo)),
      POST: async (req) => {
        const body = (await req.json()) as { text?: unknown };
        const text = typeof body.text === "string" ? body.text.trim() : "";
        if (!text) return json({ error: "text required" }, { status: 400 });
        const row = stmts.insert.get(text, Date.now());
        return json(toTodo(row!), { status: 201 });
      },
    },

    "/api/todos/:id": {
      PATCH: async (req) => {
        const id = Number(req.params.id);
        const ctype = req.headers.get("content-type") ?? "";
        if (ctype.includes("application/json")) {
          const body = (await req.json()) as { text?: unknown };
          if (typeof body.text === "string") {
            const text = body.text.trim();
            if (!text) return json({ error: "text required" }, { status: 400 });
            const row = stmts.updateText.get(text, id);
            if (!row) return json({ error: "not found" }, { status: 404 });
            return json(toTodo(row));
          }
        }
        const row = stmts.toggle.get(id);
        if (!row) return json({ error: "not found" }, { status: 404 });
        return json(toTodo(row));
      },
      DELETE: (req) => {
        const id = Number(req.params.id);
        const row = stmts.remove.get(id);
        if (!row) return json({ error: "not found" }, { status: 404 });
        return new Response(null, { status: 204 });
      },
    },
  },
});

const lanIps = Object.values(networkInterfaces())
  .flat()
  .filter((i): i is NonNullable<typeof i> => !!i && i.family === "IPv4" && !i.internal)
  .map((i) => i.address);

console.log(`\n  Todo app ready on port ${server.port}`);
console.log(`    local:   http://localhost:${server.port}`);
for (const ip of lanIps) {
  console.log(`    network: http://${ip}:${server.port}`);
}
console.log("");
