const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");
const counter = document.querySelector("#counter");
const template = document.querySelector("#todo-template");
const filterButtons = document.querySelectorAll("[data-filter]");

let todos = [];
let filter = "all";

function createTodo(title) {
  return {
    id: crypto.randomUUID(),
    title,
    done: false,
    createdAt: new Date().toISOString()
  };
}

async function persist() {
  await window.todoStore.save(todos);
}

function visibleTodos() {
  if (filter === "active") return todos.filter((todo) => !todo.done);
  if (filter === "done") return todos.filter((todo) => todo.done);
  return todos;
}

function render() {
  list.replaceChildren();

  for (const todo of visibleTodos()) {
    const item = template.content.firstElementChild.cloneNode(true);
    const checkbox = item.querySelector("input");
    const title = item.querySelector("span");
    const deleteButton = item.querySelector(".delete-button");

    checkbox.checked = todo.done;
    title.textContent = todo.title;
    item.classList.toggle("done", todo.done);

    checkbox.addEventListener("change", async () => {
      todo.done = checkbox.checked;
      await persist();
      render();
    });

    deleteButton.addEventListener("click", async () => {
      todos = todos.filter((itemTodo) => itemTodo.id !== todo.id);
      await persist();
      render();
    });

    list.append(item);
  }

  const left = todos.filter((todo) => !todo.done).length;
  counter.textContent = `${left} left`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) return;

  todos = [createTodo(title), ...todos];
  input.value = "";
  await persist();
  render();
});

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
}

window.todoStore.load().then((loadedTodos) => {
  todos = loadedTodos;
  render();
});
