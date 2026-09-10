# Kanban Dev

A lightweight, local kanban board built into VS Code. No account, no sync, nothing leaving your project. The board lives alongside your code and can be versioned like any other file.

## Why

SaaS kanban tools (Trello, Jira, etc.) require login, internet access and a context switch outside the editor. Kanban Dev opens as a regular tab inside VS Code and stores everything in `.kanbn/board.json` at the root of your workspace. You can version it with Git alongside your project, or ignore it, your choice.

## Features

- **Per project board**: each workspace has its own `.kanbn/board.json`, isolated from the others.
- **Custom columns**: create, rename, delete and reorder columns via drag and drop (defaults: To Do / In Progress / Done).
- **Drag and drop tasks**: move tasks between columns by dragging the card.
- **Nested checklists**: subtasks inside each task, with progress count (e.g. 3/5).
- **Comments per task**: timestamped notes history.
- **Mark as complete**: quick completion toggle without moving the task to another column.
- **Fully local**: no data ever leaves your machine; no internet or account required.

## How to install

### From the Marketplace
1. Open the Extensions tab in VS Code (`Ctrl+Shift+X`).
2. Search for **Kanban Dev**.
3. Click **Install**.

### Via command line
```bash
code --install-extension HadrianAndrade.kanban-dev
```

### Manual (.vsix)
1. Download the `.vsix` file from the release.
2. In VS Code: `Ctrl+Shift+P` then **Extensions: Install from VSIX...** and select the file.

## How to use

1. Open a workspace/folder in VS Code.
2. `Ctrl+Shift+P` then **Kanban Dev: Open Board** opens the board in a new tab.
3. `Ctrl+Shift+P` then **Kanban Dev: New Task** quickly creates a task by picking a column.
4. The board is saved automatically to `.kanbn/board.json` on every change.

## Data and privacy

The board lives entirely in the local file `.kanbn/board.json`, inside your workspace. The extension makes no network calls and collects no telemetry.

## License

MIT
