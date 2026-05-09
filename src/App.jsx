import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "simple-task-reminder-working-version";

function makeId() {
  return "task-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getTomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateString) {
  if (!dateString) return "No date selected";
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = b.length + 1;
  const cols = a.length + 1;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i++) grid[i][0] = i;
  for (let j = 0; j < cols; j++) grid[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      grid[i][j] = Math.min(
        grid[i - 1][j] + 1,
        grid[i][j - 1] + 1,
        grid[i - 1][j - 1] + cost
      );
    }
  }

  return grid[b.length][a.length];
}

function matchesSearch(task, query) {
  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return true;

  const text = normalizeText(task.title + " " + task.notes);
  if (text.includes(cleanQuery)) return true;

  const queryWords = cleanQuery.split(" ");
  const taskWords = text.split(" ");

  return queryWords.some((queryWord) =>
    taskWords.some((taskWord) => {
      if (taskWord.includes(queryWord) || queryWord.includes(taskWord)) return true;
      const allowedMistakes = queryWord.length <= 4 ? 1 : 2;
      return distance(queryWord, taskWord) <= allowedMistakes;
    })
  );
}

function TaskCard({ task, onToggle, onDelete }) {
  const today = getToday();
  const tomorrow = getTomorrow();
  const isDueToday = task.deadline === today && !task.completed;
  const isDueTomorrow = task.deadline === tomorrow && !task.completed;
  const isOverdue = task.deadline < today && !task.completed;

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-4 shadow-lg shadow-pink-100 backdrop-blur sm:rounded-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <button
          onClick={() => onToggle(task.id)}
          className="mt-1 h-8 w-8 shrink-0 rounded-full border-2 border-slate-400 text-base font-bold leading-7 text-slate-700 sm:h-6 sm:w-6 sm:text-sm sm:leading-5"
          aria-label="Toggle task"
        >
          {task.completed ? "✓" : ""}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={task.completed ? "font-bold text-slate-400 line-through" : "font-bold text-slate-950"}>
              {task.title}
            </h3>
            {isDueToday && <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">Due today</span>}
            {isDueTomorrow && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">Due tomorrow</span>}
            {isOverdue && <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Overdue</span>}
          </div>

          {task.notes && <p className="mt-1 text-sm text-slate-500">{task.notes}</p>}

          <p className="mt-3 rounded-xl bg-gradient-to-br from-pink-100 via-rose-50 to-fuchsia-100 px-3 py-2 text-xs font-semibold text-slate-600">
            Deadline: {formatDate(task.deadline)}
          </p>
        </div>

        <button
          onClick={() => onDelete(task.id)}
          className="h-11 w-full rounded-xl px-3 text-sm font-bold text-red-600 hover:bg-red-50 sm:h-9 sm:w-auto"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (error) {
      // Continue without saved data.
    }

    return [
      {
        id: makeId(),
        title: "Call supplier",
        notes: "Confirm delivery details.",
        deadline: getTomorrow(),
        completed: false,
      },
    ];
  });

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [deadline, setDeadline] = useState(getTomorrow());
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      // Continue without browser storage.
    }
  }, [tasks]);

  function addTask(event) {
    event.preventDefault();

    if (!title.trim()) return;

    const newTask = {
      id: makeId(),
      title: title.trim(),
      notes: notes.trim(),
      deadline: deadline || getTomorrow(),
      completed: false,
    };

    setTasks([newTask, ...tasks]);
    setTitle("");
    setNotes("");
    setDeadline(getTomorrow());
  }

  function toggleTask(id) {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  function deleteTask(id) {
    setTasks(tasks.filter((task) => task.id !== id));
  }

  const today = getToday();
  const tomorrow = getTomorrow();

  const dueToday = tasks.filter((task) => task.deadline === today && !task.completed);
  const dueTomorrow = tasks.filter((task) => task.deadline === tomorrow && !task.completed);
  const overdue = tasks.filter((task) => task.deadline < today && !task.completed);
  const completed = tasks.filter((task) => task.completed);

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => matchesSearch(task, search))
      .sort((a, b) => {
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
        return String(a.deadline).localeCompare(String(b.deadline));
      });
  }, [tasks, search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-rose-50 to-fuchsia-100 px-3 py-4 text-slate-950 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-5 rounded-[1.75rem] bg-pink-600 p-5 text-white shadow-xl sm:mb-6 sm:rounded-3xl sm:p-6">
          <p className="mb-2 text-sm font-bold text-pink-100">Simple Task Reminder</p>
          <h1 className="text-2xl font-black leading-tight sm:text-4xl">Daily Task List</h1>
          <p className="mt-2 max-w-2xl text-sm text-pink-100">
            Add tasks anytime, choose a deadline, and see what needs attention today and tomorrow.
          </p>
          <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold leading-6">
            Today: {formatDate(today)}
          </p>
        </header>

        <section className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 md:grid-cols-4">
          <div className="rounded-2xl bg-white/90 backdrop-blur p-4 shadow-lg shadow-pink-100">
            <p className="text-sm font-bold text-slate-500">Due today</p>
            <p className="mt-1 text-3xl font-black">{dueToday.length}</p>
          </div>
          <div className="rounded-2xl bg-white/90 backdrop-blur p-4 shadow-lg shadow-pink-100">
            <p className="text-sm font-bold text-slate-500">Due tomorrow</p>
            <p className="mt-1 text-3xl font-black">{dueTomorrow.length}</p>
          </div>
          <div className="rounded-2xl bg-white/90 backdrop-blur p-4 shadow-lg shadow-pink-100">
            <p className="text-sm font-bold text-slate-500">Overdue</p>
            <p className="mt-1 text-3xl font-black">{overdue.length}</p>
          </div>
          <div className="rounded-2xl bg-white/90 backdrop-blur p-4 shadow-lg shadow-pink-100">
            <p className="text-sm font-bold text-slate-500">Completed</p>
            <p className="mt-1 text-3xl font-black">{completed.length}</p>
          </div>
        </section>

        <div className="grid gap-5 md:gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-5 md:space-y-6">
            <section className="rounded-[1.75rem] bg-white/90 p-4 shadow-lg shadow-pink-100 backdrop-blur sm:rounded-3xl sm:p-5">
              <h2 className="mb-4 text-xl font-black">Add a task</h2>
              <form onSubmit={addTask} className="space-y-3">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Buy groceries"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:ring-4 focus:ring-pink-200 sm:text-sm"
                />
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional notes"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:ring-4 focus:ring-pink-200 sm:text-sm"
                />
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-500">Deadline</span>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:ring-4 focus:ring-pink-200 sm:text-sm"
                  />
                  <p className="mt-2 rounded-xl bg-pink-50 px-3 py-2 text-xs font-bold text-pink-700">
                    Selected deadline: {formatDate(deadline)}
                  </p>
                </label>
                <p className="rounded-2xl bg-pink-50 px-4 py-3 text-xs font-bold text-pink-700">
                  Reminder appears one day before the deadline in the “Due tomorrow” section.
                </p>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-pink-600 px-4 py-4 text-base font-black text-white hover:bg-pink-700 sm:py-3 sm:text-sm"
                >
                  Save task
                </button>
              </form>
            </section>

            <section className="rounded-[1.75rem] bg-white/90 p-4 shadow-lg shadow-pink-100 backdrop-blur sm:rounded-3xl sm:p-5">
              <h2 className="mb-2 text-xl font-black">Reminder system</h2>
              <p className="text-sm leading-6 text-slate-600">
                To keep the app simple and reliable, reminders are displayed inside the app. Any task due tomorrow appears automatically in the reminder box.
              </p>
            </section>
          </aside>

          <main className="space-y-5 md:space-y-6">
            <section className="rounded-[1.75rem] border border-pink-200 bg-pink-50 p-4 shadow-sm sm:rounded-3xl sm:p-5">
              
              <h2 className="mb-3 text-xl font-black text-pink-900">
  <span className="text-red-600">*</span> Due tomorrow
</h2>
              <div className="space-y-3">
                {dueTomorrow.length > 0 ? (
                  dueTomorrow.map((task) => (
                    <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                  ))
                ) : (
                  <p className="text-sm font-semibold text-pink-700">No tasks due tomorrow.</p>
                )}
              </div>
            </section>

            <section className="rounded-[1.75rem] bg-white/90 p-4 shadow-lg shadow-pink-100 backdrop-blur sm:rounded-3xl sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black">All tasks</h2>
                  <p className="text-sm text-slate-500">Sorted by nearest deadline first.</p>
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search with spelling mistakes"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:ring-4 focus:ring-pink-200 sm:text-sm sm:w-72"
                />
              </div>

              <div className="space-y-3">
                {visibleTasks.length > 0 ? (
                  visibleTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <h3 className="font-black">No tasks found</h3>
                    <p className="mt-1 text-sm text-slate-500">Add a task or try another search.</p>
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
