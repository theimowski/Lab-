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
  update: (id: number, text: string): Promise<Todo> =>
    fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }).then((r) => r.json()),
  remove: (id: number): Promise<void> =>
    fetch(`/api/todos/${id}`, { method: "DELETE" }).then(() => undefined),
};

function startEdit(li: HTMLLIElement, span: HTMLSpanElement, t: Todo, editBtn: HTMLButtonElement) {
  if (li.classList.contains("editing")) return;
  li.classList.add("editing");
  const original = t.text;

  const editor = document.createElement("input");
  editor.type = "text";
  editor.className = "edit-input";
  editor.value = original;
  editor.maxLength = 200;
  editor.setAttribute("enterkeyhint", "done");
  editor.setAttribute("aria-label", "Edit todo text");
  span.replaceWith(editor);
  editor.focus();
  editor.select();

  let settled = false;
  const finish = async (commit: boolean) => {
    if (settled) return;
    settled = true;
    const next = editor.value.trim();
    let text = original;
    if (commit && next && next !== original) {
      try {
        const updated = await api.update(t.id, next);
        text = updated.text;
        t.text = updated.text;
      } catch {
        // network error: revert to original
      }
    }
    span.textContent = text;
    editor.replaceWith(span);
    editBtn.setAttribute("aria-label", `Edit "${text}"`);
    li.classList.remove("editing");
  };

  editor.addEventListener("blur", () => finish(true));
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finish(false);
    }
  });
}

function render(todos: Todo[]) {
  list.replaceChildren();
  empty.hidden = todos.length > 0;
  for (const t of todos) {
    const li = document.createElement("li");
    li.className = "todo" + (t.done ? " done" : "");
    li.dataset.id = String(t.id);

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = t.done;
    cb.setAttribute("aria-label", `Toggle "${t.text}"`);
    cb.addEventListener("change", async () => {
      const updated = await api.toggle(t.id);
      t.done = updated.done;
      li.classList.toggle("done", t.done);
    });

    const span = document.createElement("span");
    span.className = "text";
    span.textContent = t.text;

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "edit";
    edit.setAttribute("aria-label", `Edit "${t.text}"`);
    edit.textContent = "✎";
    edit.addEventListener("click", () => startEdit(li, span, t, edit));

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

    li.append(cb, span, edit, del);
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
  return Array.from(list.querySelectorAll<HTMLLIElement>("li.todo")).map((li) => {
    const editor = li.querySelector<HTMLInputElement>("input.edit-input");
    const span = li.querySelector<HTMLSpanElement>("span.text");
    return {
      id: Number(li.dataset.id),
      text: editor ? editor.value : (span?.textContent ?? ""),
      done: li.classList.contains("done"),
      created_at: 0,
    };
  });
}

api.list().then(render);
