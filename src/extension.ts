import * as vscode from 'vscode';
import { BoardStore } from './boardStore';
import { KanbanPanel } from './panel';

export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return;

  const store = new BoardStore(workspaceRoot);

  context.subscriptions.push(
    vscode.commands.registerCommand('kanbanDev.open', () => {
      KanbanPanel.createOrShow(context.extensionUri, store);
    }),
    vscode.commands.registerCommand('kanbanDev.newTask', async () => {
      const panel = KanbanPanel.createOrShow(context.extensionUri, store);
      const board = store.get();
      const columnNames = board.columns.sort((a, b) => a.position - b.position).map((c) => c.name);
      const chosen = await vscode.window.showQuickPick(columnNames, { placeHolder: 'Escolha a coluna' });
      if (!chosen) return;
      const column = board.columns.find((c) => c.name === chosen);
      if (!column) return;
      panel.focusNewTask(column.id);
    })
  );
}

export function deactivate() {}
