import * as vscode from 'vscode';
import { BoardStore } from './boardStore';
import { Board, Task, Column } from './types';

type InMsg =
  | { type: 'ready' }
  | { type: 'addColumn'; name: string }
  | { type: 'renameColumn'; id: string; name: string }
  | { type: 'deleteColumn'; id: string }
  | { type: 'reorderColumns'; orderedIds: string[] }
  | { type: 'addTask'; columnId: string; title: string }
  | { type: 'updateTask'; id: number; patch: Partial<Task> }
  | { type: 'deleteTask'; id: number }
  | { type: 'moveTask'; id: number; columnId: string }
  | { type: 'toggleTaskComplete'; id: number }
  | { type: 'addComment'; taskId: number; text: string };

type OutMsg = { type: 'board'; board: Board } | { type: 'focusNewTask'; columnId: string };

export class KanbanPanel {
  public static current: KanbanPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly store: BoardStore;
  private disposables: vscode.Disposable[] = [];

  static createOrShow(extensionUri: vscode.Uri, store: BoardStore) {
    const column = vscode.window.activeTextEditor?.viewColumn;
    if (KanbanPanel.current) {
      KanbanPanel.current.panel.reveal(column);
      return KanbanPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      'kanbanDev',
      'Kanban Dev',
      column ?? vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')] }
    );
    KanbanPanel.current = new KanbanPanel(panel, extensionUri, store);
    return KanbanPanel.current;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, store: BoardStore) {
    this.panel = panel;
    this.store = store;
    this.panel.webview.html = this.getHtml(extensionUri);
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage((msg: InMsg) => this.handleMessage(msg), null, this.disposables);
  }

  focusNewTask(columnId: string) {
    this.post({ type: 'focusNewTask', columnId });
  }

  private post(msg: OutMsg) {
    this.panel.webview.postMessage(msg);
  }

  private sendBoard() {
    this.post({ type: 'board', board: this.store.get() });
  }

  private handleMessage(msg: InMsg) {
    const board = this.store.get();
    const now = new Date().toISOString();

    switch (msg.type) {
      case 'ready':
        this.sendBoard();
        return;

      case 'addColumn': {
        const id = cryptoId();
        board.columns.push({ id, name: msg.name.trim() || 'Nova coluna', position: board.columns.length });
        break;
      }
      case 'renameColumn': {
        const col = board.columns.find((c) => c.id === msg.id);
        if (col) col.name = msg.name.trim() || col.name;
        break;
      }
      case 'deleteColumn': {
        board.columns = board.columns.filter((c) => c.id !== msg.id);
        board.tasks = board.tasks.filter((t) => t.columnId !== msg.id);
        break;
      }
      case 'reorderColumns': {
        msg.orderedIds.forEach((id, idx) => {
          const col = board.columns.find((c) => c.id === id);
          if (col) col.position = idx;
        });
        break;
      }
      case 'addTask': {
        const task: Task = {
          id: board.nextTaskId++,
          columnId: msg.columnId,
          title: msg.title.trim() || 'Nova task',
          description: '',
          checklist: [],
          comments: [],
          completed: false,
          createdAt: now,
          updatedAt: now,
        };
        board.tasks.push(task);
        break;
      }
      case 'updateTask': {
        const task = board.tasks.find((t) => t.id === msg.id);
        if (task) Object.assign(task, msg.patch, { updatedAt: now });
        break;
      }
      case 'deleteTask': {
        board.tasks = board.tasks.filter((t) => t.id !== msg.id);
        break;
      }
      case 'moveTask': {
        const task = board.tasks.find((t) => t.id === msg.id);
        if (task) { task.columnId = msg.columnId; task.updatedAt = now; }
        break;
      }
      case 'toggleTaskComplete': {
        const task = board.tasks.find((t) => t.id === msg.id);
        if (task) { task.completed = !task.completed; task.updatedAt = now; }
        break;
      }
      case 'addComment': {
        const task = board.tasks.find((t) => t.id === msg.taskId);
        if (task) {
          task.comments.push({ id: cryptoId(), text: msg.text.trim(), createdAt: now });
          task.updatedAt = now;
        }
        break;
      }
    }

    this.store.save(board);
    this.sendBoard();
  }

  private getHtml(extensionUri: vscode.Uri): string {
    const webview = this.panel.webview;
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.css'));
    const nonce = cryptoId();
    return `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>Kanban Dev</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  dispose() {
    KanbanPanel.current = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) d.dispose();
    }
  }
}

function cryptoId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
