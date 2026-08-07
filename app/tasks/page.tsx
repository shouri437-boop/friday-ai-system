"use client";

import { useState, useEffect } from "react";
import { Task, TaskStatus, TaskPriority } from "@/types";
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Search, 
  ExternalLink,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";

const INITIAL_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Implement FastAPI Async Tool Worker Endpoint",
    description: "Connect LangGraph tool caller with background worker queue.",
    status: "in_progress",
    priority: "high",
    notionId: "notion-9821",
    tags: ["Backend", "FastAPI", "Python"],
    createdAt: "Today",
  },
  {
    id: "task-2",
    title: "Setup Obsidian Vault Local RAG Pipeline",
    description: "Parse markdown notes into chunked vector embeddings with LlamaIndex.",
    status: "completed",
    priority: "urgent",
    notionId: "notion-9820",
    tags: ["RAG", "Obsidian", "VectorDB"],
    createdAt: "Yesterday",
  },
  {
    id: "task-3",
    title: "Configure PostgreSQL pgvector Extension",
    description: "Deploy docker container with pgvector and run migration schema.",
    status: "completed",
    priority: "medium",
    tags: ["Database", "Postgres"],
    createdAt: "2 days ago",
  },
  {
    id: "task-4",
    title: "Design Next.js FRIDAY UI Shell & Dark Mode",
    description: "Build glassmorphism UI layout, chat feed, and sidebar controls.",
    status: "in_progress",
    priority: "urgent",
    tags: ["Frontend", "Next.js", "Tailwind"],
    createdAt: "Today",
  },
  {
    id: "task-5",
    title: "Integrate Tavily Web Search Tool",
    description: "Allow FRIDAY agent to query real-time web results for context.",
    status: "todo",
    priority: "low",
    tags: ["Tool", "WebSearch"],
    createdAt: "3 days ago",
  },
];

const COLUMNS: { id: TaskStatus; title: string; icon: typeof Clock }[] = [
  { id: "todo", title: "To Do", icon: Clock },
  { id: "in_progress", title: "In Progress", icon: Layers },
  { id: "completed", title: "Completed", icon: CheckCircle2 },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority] = useState<string>("all");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("medium");

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("http://localhost:8000/api/tasks");
        if (res.ok) {
          const data = await res.json();
          if (data.tasks && data.tasks.length > 0) {
            const apiTasks: Task[] = data.tasks.map((t: any) => ({
              id: t.id,
              title: t.title,
              description: t.description || "",
              status: (t.status || "todo") as TaskStatus,
              priority: (t.priority || "medium") as TaskPriority,
              notionId: t.notion_id || `notion-${Math.floor(Math.random() * 9000 + 1000)}`,
              tags: t.tags || ["AI Agent"],
              createdAt: t.created_at || "Today",
            }));
            setTasks(apiTasks);
          }
        }
      } catch (e) {
        console.warn("Could not sync tasks from backend API:", e);
      }
    }
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      status: "todo",
      priority: newTaskPriority,
      notionId: `notion-${Math.floor(Math.random() * 9000 + 1000)}`,
      tags: ["Manual"],
      createdAt: "Just now",
    };
    setTasks([newTask, ...tasks]);
    setNewTaskTitle("");
    setIsAddingTask(false);
  };

  const moveTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-500/15 text-rose-300 border-rose-500/30";
      case "high":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "medium":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
      case "low":
        return "bg-slate-800 text-slate-400 border-white/5";
    }
  };

  return (
    <div className="flex flex-col h-full p-6 md:p-8 space-y-6 overflow-y-auto bg-[#05020c] font-['Rajdhani',sans-serif] text-[#d9f8ff]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#d688d6]/20 pb-4">
        <div>
          <h2 className="text-xl font-['Orbitron',sans-serif] font-bold text-[#d9f8ff] flex items-center gap-2 tracking-wider">
            <CheckSquare className="w-5 h-5 text-[#ffc3ea]" /> Task Workspace
          </h2>
          <p className="text-xs text-[#5c8a93] font-mono mt-0.5">
            Synchronized with Notion Workspace & Real Action Executor
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#5c8a93] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-[#091a20]/60 border border-[#4a1f52]/60 text-xs text-[#d9f8ff] placeholder-[#5c8a93] focus:outline-none focus:border-[#ffc3ea]"
            />
          </div>

          <button
            onClick={() => setIsAddingTask(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#4a1f52] to-[#d688d6] text-[#d9f8ff] font-['Orbitron',sans-serif] font-bold text-xs hover:border-[#ffc3ea] transition-all shadow-[0_0_15px_rgba(255,195,234,0.2)] cursor-pointer"
            id="add-task-btn"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* New Task Creation Inline Panel */}
      {isAddingTask && (
        <div className="p-4 rounded-2xl border border-[#d688d6]/40 bg-gradient-to-b from-[#1e0e2a]/70 to-[#060a12]/80 backdrop-blur-md space-y-3">
          <h3 className="text-xs font-['Orbitron',sans-serif] font-bold text-[#ffc3ea] uppercase tracking-wider">
            Create Task in Notion
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-[#091a20]/60 border border-[#4a1f52]/60 text-sm text-[#d9f8ff] focus:outline-none focus:border-[#ffc3ea]"
              autoFocus
            />
            {/* Voice mic for task title */}
            <VoiceMicButton
              onTranscript={(t) => setNewTaskTitle(t)}
              size="sm"
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
              className="px-3 py-2 rounded-xl bg-[#091a20]/60 border border-[#4a1f52]/60 text-xs text-[#d9f8ff] focus:outline-none"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent Priority</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleCreateTask}
                className="px-4 py-2 bg-[#d688d6] text-[#05020c] font-['Orbitron',sans-serif] font-bold rounded-xl text-xs hover:bg-[#ffc3ea] transition-colors cursor-pointer"
              >
                Save
              </button>
              <button
                onClick={() => setIsAddingTask(false)}
                className="px-3 py-2 bg-[#12081d] text-[#5c8a93] border border-[#d688d6]/20 rounded-xl text-xs hover:text-[#d9f8ff] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          const ColIcon = col.icon;

          return (
            <div
              key={col.id}
              className="flex flex-col glass-panel rounded-2xl p-4 border border-white/10 space-y-4"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <ColIcon className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-sm text-slate-200">
                    {col.title}
                  </span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 font-mono">
                    No tasks in this column
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/30 transition-all space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-slate-200 leading-snug group-hover:text-cyan-300 transition-colors">
                          {task.title}
                        </h4>
                        {task.notionId && (
                          <span title="Open in Notion">
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 shrink-0 cursor-pointer" />
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Tags & Priority */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                        <span className={cn("px-2 py-0.5 rounded-md border font-mono uppercase", getPriorityBadge(task.priority))}>
                          {task.priority}
                        </span>

                        {/* Quick move buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {col.id !== "todo" && (
                            <button
                              onClick={() => moveTaskStatus(task.id, "todo")}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white"
                              title="Move to To Do"
                            >
                              ←
                            </button>
                          )}
                          {col.id !== "in_progress" && (
                            <button
                              onClick={() => moveTaskStatus(task.id, "in_progress")}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white"
                              title="Move to In Progress"
                            >
                              ⚡
                            </button>
                          )}
                          {col.id !== "completed" && (
                            <button
                              onClick={() => moveTaskStatus(task.id, "completed")}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 hover:text-white"
                              title="Mark Complete"
                            >
                              ✓
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
