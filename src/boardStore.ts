import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Board, emptyBoard } from './types';

export class BoardStore {
  private readonly filePath: string;
  private board: Board;

  constructor(workspaceRoot: string) {
    const dir = path.join(workspaceRoot, '.kanbn');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.filePath = path.join(dir, 'board.json');
    this.board = this.load();
  }

  private load(): Board {
    if (!fs.existsSync(this.filePath)) {
      const board = emptyBoard();
      this.persist(board);
      return board;
    }
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const board = JSON.parse(raw) as Board;
      return this.migrate(board);
    } catch {
      return emptyBoard();
    }
  }

  /** Ensures sequential numeric task.id and nextTaskId, even for boards saved by older versions. */
  private migrate(board: Board): Board {
    const needsMigration = typeof board.nextTaskId !== 'number' || board.tasks.some((t) => typeof t.id !== 'number');
    if (!needsMigration) return board;

    let nextId = 1;
    for (const task of board.tasks) {
      (task as any).id = nextId++;
    }
    board.nextTaskId = nextId;
    this.persist(board);
    return board;
  }

  private persist(board: Board): void {
    fs.writeFileSync(this.filePath, JSON.stringify(board, null, 2), 'utf-8');
  }

  get(): Board {
    return this.board;
  }

  save(board: Board): void {
    this.board = board;
    this.persist(board);
  }
}
