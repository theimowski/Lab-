type Todo = { id: number; text: string; done: boolean; created_at: number };

const list = document.getElementById("list") as HTMLUListElement;
const empty = document.getElementById("empty") as HTMLParagraphElement;
const form = document.getElementById("add-form") as HTMLFormElement;
const input = document.getElementById("add-input") as HTMLInputElement;

const api = {
  list: (): Promise<Todo[]> => fetch("/api/todos").then((r) => r.json()),
  add: (text: string): Promise<Todo> =>
    fetch("/api/todos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }).then((r) => r.json()),
  toggle: (id: number): Promise<Todo> =>
    fetch(`/api/todos/${id}`, { method: "PATCH" }).then((r) => r.json()),
  remove: (id: number): Promise<void> =>
    fetch(`/api/todos/${id}`, { method: "DELETE" }).then(() => undefined),
};

function render(todos: Todo[]) {
  list.replaceChildren();
  empty.hidden = todos.length > 0;
  for (const t of todos) {
    const li = document.createElement("li");
    li.className = "todo" + (t.done ? " done" : "");
    li.dataset.id = String(t.id);

    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = t.done;
    cb.addEventListener("change", async () => {
      const updated = await api.toggle(t.id);
      t.done = updated.done;
      li.classList.toggle("done", t.done);
    });
    const span = document.createElement("span");
    span.textContent = t.text;
    label.append(cb, span);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete";
    del.setAttribute("aria-label", `Delete "${t.text}"`);
    del.textContent = "✕";
    del.addEventListener("click", async () => {
      await api.remove(t.id);
      li.remove();
      if (!list.children.length) empty.hidden = false;
    });

    li.append(label, del);
    list.append(li);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  const created = await api.add(text);
  const todos = [created, ...currentTodos()];
  render(todos);
  input.focus();
});

function currentTodos(): Todo[] {
  return Array.from(list.querySelectorAll<HTMLLIElement>("li.todo")).map((li) => ({
    id: Number(li.dataset.id),
    text: li.querySelector("span")!.textContent ?? "",
    done: li.classList.contains("done"),
    created_at: 0,
  }));
}

api.list().then(render);
