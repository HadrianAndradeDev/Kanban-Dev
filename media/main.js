(function () {
  const vscode = acquireVsCodeApi();
  const root = document.getElementById('root');

  const ICON_TRASH = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4h11M5.5 4V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4M6.5 7.5v4M9.5 7.5v4M3.5 4l.6 8.5a1 1 0 0 0 1 .9h5.8a1 1 0 0 0 1-.9L12.5 4"/></svg>';
  const ICON_PLUS = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>';
  const ICON_CLOSE = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
  const ICON_EDIT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 2.5l3 3L5 14H2v-3l8.5-8.5z"/></svg>';

  /** @type {{columns: any[], tasks: any[]}} */
  let board = { columns: [], tasks: [] };
  let searchQuery = '';
  let sortOrder = 'recent'; // 'recent' | 'oldest'
  let dateFilter = 'all'; // 'all' | 'today' | 'week' | 'month'
  let openTaskId = null;
  let draggedTaskId = null;
  let draggedColumnId = null;
  let addingTaskColumnId = null;
  let addingColumn = false;
  let confirmingDeleteColumnId = null;
  let confirmingDeleteTask = false;

  // Enquanto o usuário está digitando num campo de texto do modal (título/descrição),
  // ignoramos o re-render disparado pela resposta do backend — evita perder o foco/cursor
  // a cada tecla. O DOM já reflete o que o usuário digitou; só re-renderiza quando o
  // campo perde o foco (autosave já disparado) ou o modal é fechado/reaberto.
  let suppressRenderWhileTyping = false;

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'board') {
      board = msg.board;
      if (!suppressRenderWhileTyping) render();
    } else if (msg.type === 'focusNewTask') {
      addingTaskColumnId = msg.columnId;
      render();
    }
  });

  vscode.postMessage({ type: 'ready' });

  function send(msg) {
    vscode.postMessage(msg);
  }

  function genId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function countChecklist(items) {
    let done = 0, total = 0;
    (function walk(list) {
      for (const it of list) {
        total++;
        if (it.done) done++;
        walk(it.children || []);
      }
    })(items);
    return { done, total };
  }

  function matchesDateFilter(task) {
    if (dateFilter === 'all') return true;
    const created = new Date(task.createdAt);
    const now = new Date();
    if (dateFilter === 'today') {
      return created.toDateString() === now.toDateString();
    }
    if (dateFilter === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return created >= start;
    }
    if (dateFilter === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return created >= start;
    }
    return true;
  }

  function visibleTasksFor(columnId) {
    const q = searchQuery.trim().toLowerCase();
    let tasks = board.tasks.filter((t) => t.columnId === columnId);
    if (q) {
      tasks = tasks.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
      );
    }
    tasks = tasks.filter(matchesDateFilter);
    tasks = tasks.slice().sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === 'recent' ? -diff : diff;
    });
    return tasks;
  }

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (k === 'className') node.className = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'html') node.innerHTML = v;
        else if (v === undefined || v === null) continue;
        else if (k === 'checked') node.checked = !!v;
        else node.setAttribute(k, v);
      }
    }
    for (const child of children || []) {
      if (child == null) continue;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  function iconBtn(iconSvg, title, onclick, extraClass) {
    return el('button', {
      className: 'icon-btn' + (extraClass ? ' ' + extraClass : ''),
      title,
      html: iconSvg,
      onclick,
    }, []);
  }

  function renderBoardArea() {
    const boardArea = root.querySelector('.board-area');
    if (!boardArea) return;
    boardArea.innerHTML = '';
    boardArea.appendChild(renderBoard());
    if (openTaskId) {
      const task = board.tasks.find((t) => t.id === openTaskId);
      if (task) boardArea.appendChild(renderTaskModal(task));
      else openTaskId = null;
    }
  }

  function render() {
    root.innerHTML = '';
    root.appendChild(renderToolbar());
    const boardArea = el('div', { className: 'board-area' }, []);
    root.appendChild(boardArea);
    renderBoardArea();
  }

  function renderToolbar() {
    const search = el('input', {
      type: 'text',
      placeholder: 'Buscar por título ou descrição...',
      value: searchQuery,
      oninput: (e) => { searchQuery = e.target.value; renderBoardArea(); },
    });

    const sortSelect = el('select', {
      onchange: (e) => { sortOrder = e.target.value; renderBoardArea(); },
    }, [
      el('option', { value: 'recent', selected: sortOrder === 'recent' ? 'selected' : undefined }, ['Mais recente']),
      el('option', { value: 'oldest', selected: sortOrder === 'oldest' ? 'selected' : undefined }, ['Mais antigo']),
    ]);

    const dateSelect = el('select', {
      onchange: (e) => { dateFilter = e.target.value; renderBoardArea(); },
    }, [
      el('option', { value: 'all', selected: dateFilter === 'all' ? 'selected' : undefined }, ['Qualquer data']),
      el('option', { value: 'today', selected: dateFilter === 'today' ? 'selected' : undefined }, ['Hoje']),
      el('option', { value: 'week', selected: dateFilter === 'week' ? 'selected' : undefined }, ['Esta semana']),
      el('option', { value: 'month', selected: dateFilter === 'month' ? 'selected' : undefined }, ['Este mês']),
    ]);

    return el('div', { className: 'toolbar' }, [search, sortSelect, dateSelect]);
  }

  function enablePanning(boardEl) {
    let isPanning = false;
    let startX = 0;
    let startScroll = 0;
    boardEl.addEventListener('mousedown', (e) => {
      if (e.target !== boardEl) return; // só arrasta clicando no fundo vazio, não em colunas/cards
      isPanning = true;
      startX = e.clientX;
      startScroll = boardEl.scrollLeft;
      boardEl.classList.add('panning');
    });
    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      boardEl.scrollLeft = startScroll - (e.clientX - startX);
    });
    window.addEventListener('mouseup', () => {
      isPanning = false;
      boardEl.classList.remove('panning');
    });
  }

  function renderBoard() {
    const columns = board.columns.slice().sort((a, b) => a.position - b.position);
    const boardEl = el('div', { className: 'board' });

    for (const col of columns) {
      boardEl.appendChild(renderColumn(col));
    }

    boardEl.appendChild(renderAddColumn());
    enablePanning(boardEl);

    return boardEl;
  }

  function renderAddColumn() {
    if (!addingColumn) {
      const btn = el('button', {
        className: 'add-column-btn',
        onclick: () => { addingColumn = true; render(); },
      }, []);
      btn.innerHTML = ICON_PLUS + '<span>Nova coluna</span>';
      return el('div', { className: 'add-column' }, [btn]);
    }

    const input = el('input', { type: 'text', placeholder: 'Nome da coluna' });
    let settled = false;
    const commit = () => {
      if (settled) return;
      settled = true;
      const name = input.value.trim();
      if (name) send({ type: 'addColumn', name });
      addingColumn = false;
      render();
    };
    const cancel = () => {
      if (settled) return;
      settled = true;
      addingColumn = false;
      render();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') cancel();
    });

    const confirmBtn = el('button', { className: 'btn', onmousedown: (e) => e.preventDefault(), onclick: commit }, ['Criar']);
    const cancelBtn = el('button', { className: 'btn secondary', onmousedown: (e) => e.preventDefault(), onclick: cancel }, ['Cancelar']);

    const form = el('div', { className: 'add-column-form' }, [
      input,
      el('div', { className: 'actions' }, [confirmBtn, cancelBtn]),
    ]);

    setTimeout(() => input.focus(), 0);
    return el('div', { className: 'add-column' }, [form]);
  }

  function renderColumn(col) {
    const tasks = visibleTasksFor(col.id);

    const nameSpan = el('span', { className: 'name' }, [col.name]);
    const startRename = () => {
      const input = el('input', { type: 'text', value: col.name });
      nameSpan.replaceWith(input);
      input.focus();
      input.select();
      const commit = () => {
        const name = input.value.trim();
        if (name && name !== col.name) send({ type: 'renameColumn', id: col.id, name });
        else render();
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') render(); });
    };
    nameSpan.addEventListener('dblclick', startRename);

    const editBtn = iconBtn(ICON_EDIT, 'Renomear coluna', startRename);
    const deleteBtn = iconBtn(ICON_TRASH, 'Excluir coluna', () => { confirmingDeleteColumnId = col.id; render(); }, 'icon-danger');
    const actions = el('div', { className: 'actions' }, [editBtn, deleteBtn]);

    const header = el('div', {
      className: 'column-header',
      draggable: 'true',
      ondragstart: () => { draggedColumnId = col.id; },
      ondragover: (e) => e.preventDefault(),
      ondrop: (e) => {
        e.preventDefault();
        if (!draggedColumnId || draggedColumnId === col.id) return;
        const columns = board.columns.slice().sort((a, b) => a.position - b.position);
        const fromIdx = columns.findIndex((c) => c.id === draggedColumnId);
        const toIdx = columns.findIndex((c) => c.id === col.id);
        columns.splice(toIdx, 0, columns.splice(fromIdx, 1)[0]);
        send({ type: 'reorderColumns', orderedIds: columns.map((c) => c.id) });
        draggedColumnId = null;
      },
    }, [nameSpan, el('span', { className: 'count' }, [String(tasks.length)]), actions]);

    const list = el('div', {
      className: 'task-list',
      ondragover: (e) => { e.preventDefault(); list.parentElement.classList.add('drag-over'); },
      ondragleave: () => list.parentElement.classList.remove('drag-over'),
      ondrop: (e) => {
        e.preventDefault();
        list.parentElement.classList.remove('drag-over');
        if (draggedTaskId) {
          send({ type: 'moveTask', id: draggedTaskId, columnId: col.id });
          draggedTaskId = null;
        }
      },
    });

    for (const task of tasks) {
      list.appendChild(renderCard(task));
    }
    if (tasks.length === 0) {
      list.appendChild(el('div', { className: 'empty-hint' }, ['Crie sua primeira tarefa']));
    }

    const children = [header];

    if (confirmingDeleteColumnId === col.id) {
      const confirmBar = el('div', { className: 'confirm-bar' }, [
        el('span', {}, [`Excluir "${col.name}" e todas as suas tasks? Essa ação não pode ser desfeita.`]),
        el('div', { className: 'actions' }, [
          el('button', {
            className: 'btn danger',
            onclick: () => { send({ type: 'deleteColumn', id: col.id }); confirmingDeleteColumnId = null; },
          }, ['Excluir']),
          el('button', {
            className: 'btn secondary',
            onclick: () => { confirmingDeleteColumnId = null; render(); },
          }, ['Cancelar']),
        ]),
      ]);
      children.push(confirmBar);
    }

    children.push(list);

    if (addingTaskColumnId === col.id) {
      const input = el('input', { type: 'text', placeholder: 'Título da tarefa...', className: 'new-task-input' });
      let settled = false;
      const commit = () => {
        if (settled) return;
        settled = true;
        const title = input.value.trim();
        if (title) send({ type: 'addTask', columnId: col.id, title });
        addingTaskColumnId = null;
        render();
      };
      const cancel = () => {
        if (settled) return;
        settled = true;
        addingTaskColumnId = null;
        render();
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') cancel();
      });
      input.addEventListener('blur', () => { if (input.value.trim()) commit(); else cancel(); });
      children.push(el('div', { className: 'new-task-wrap' }, [input]));
      setTimeout(() => input.focus(), 0);
    } else {
      const addTaskBtn = el('button', {
        className: 'add-task-btn',
        onclick: () => { addingTaskColumnId = col.id; render(); },
      }, []);
      addTaskBtn.innerHTML = ICON_PLUS + '<span>Adicionar tarefa</span>';
      children.push(addTaskBtn);
    }

    return el('div', { className: 'column' }, children);
  }

  function renderCard(task) {
    const checkbox = el('input', {
      type: 'checkbox',
      checked: task.completed ? 'checked' : undefined,
      onclick: (e) => { e.stopPropagation(); send({ type: 'toggleTaskComplete', id: task.id }); },
    });

    const titleRow = el('div', { className: 'title' }, [checkbox, el('span', {}, [task.title])]);

    const { done, total } = countChecklist(task.checklist || []);
    const metaParts = [];
    if (total > 0) metaParts.push(`${done}/${total} itens`);
    if ((task.comments || []).length > 0) metaParts.push(`${task.comments.length} comentário${task.comments.length > 1 ? 's' : ''}`);

    const meta = metaParts.length ? el('div', { className: 'meta' }, [metaParts.join('  ·  ')]) : null;
    const idTag = el('div', { className: 'card-id' }, [`#${task.id}`]);

    return el('div', {
      className: 'task-card' + (task.completed ? ' completed' : ''),
      draggable: 'true',
      ondragstart: () => { draggedTaskId = task.id; },
      onclick: () => { openTaskId = task.id; render(); },
    }, [titleRow, meta, idTag]);
  }

  // ── Task modal ─────────────────────────────────────────────────────────

  function renderTaskModal(task) {
    const overlay = el('div', {
      className: 'overlay',
      onclick: (e) => { if (e.target === overlay) { openTaskId = null; confirmingDeleteTask = false; render(); } },
    });

    const titleInput = el('input', { type: 'text', className: 'title-input', value: task.title });
    let titleTimer = null;
    titleInput.addEventListener('focus', () => { suppressRenderWhileTyping = true; });
    titleInput.addEventListener('blur', () => { suppressRenderWhileTyping = false; });
    titleInput.addEventListener('input', () => {
      clearTimeout(titleTimer);
      titleTimer = setTimeout(() => send({ type: 'updateTask', id: task.id, patch: { title: titleInput.value } }), 400);
    });

    const descInput = el('textarea', { placeholder: 'Descrição...' }, []);
    descInput.value = task.description || '';
    let descTimer = null;
    descInput.addEventListener('focus', () => { suppressRenderWhileTyping = true; });
    descInput.addEventListener('blur', () => { suppressRenderWhileTyping = false; });
    descInput.addEventListener('input', () => {
      clearTimeout(descTimer);
      descTimer = setTimeout(() => send({ type: 'updateTask', id: task.id, patch: { description: descInput.value } }), 400);
    });

    const closeBtn = iconBtn(ICON_CLOSE, 'Fechar', () => { openTaskId = null; confirmingDeleteTask = false; render(); });

    let headerRight;
    if (confirmingDeleteTask) {
      headerRight = el('div', { className: 'confirm-bar', style: 'margin:0;' }, [
        el('span', {}, ['Excluir esta task?']),
        el('div', { className: 'actions' }, [
          el('button', {
            className: 'btn danger',
            onclick: () => { send({ type: 'deleteTask', id: task.id }); openTaskId = null; confirmingDeleteTask = false; render(); },
          }, ['Excluir']),
          el('button', { className: 'btn secondary', onclick: () => { confirmingDeleteTask = false; render(); } }, ['Cancelar']),
        ]),
      ]);
    } else {
      const deleteBtn = iconBtn(ICON_TRASH, 'Excluir task', () => { confirmingDeleteTask = true; render(); }, 'icon-danger');
      headerRight = el('div', { className: 'actions' }, [deleteBtn, closeBtn]);
    }

    const header = el('div', { className: 'row' }, [
      el('h2', {}, [`TASK #${task.id}`]),
      headerRight,
    ]);

    const checklistSection = renderChecklistSection(task);
    const commentsSection = renderCommentsSection(task);

    const modal = el('div', { className: 'modal' }, [
      header,
      titleInput,
      descInput,
      el('hr'),
      checklistSection,
      commentsSection,
    ]);
    overlay.appendChild(modal);
    return overlay;
  }

  function renderChecklistSection(task) {
    const items = task.checklist || [];
    const { done, total } = countChecklist(items);

    const titleEl = el('div', { className: 'section-title' }, [
      `Checklist${total > 0 ? ` — ${done}/${total}` : ''}`,
    ]);

    const list = el('div', {}, items.map((item, idx) => renderChecklistItem(task, items, item, idx)));

    const addBtn = el('button', {
      className: 'add-task-btn',
      style: 'margin:2px 0 0;',
      onclick: () => {
        const next = items.concat([{ id: genId(), text: '', done: false, children: [] }]);
        send({ type: 'updateTask', id: task.id, patch: { checklist: next } });
      },
    }, []);
    addBtn.innerHTML = ICON_PLUS + '<span>Adicionar item</span>';

    return el('div', {}, [titleEl, list, addBtn]);
  }

  function renderChecklistItem(task, items, item, idx) {
    const checkbox = el('input', {
      type: 'checkbox',
      checked: item.done ? 'checked' : undefined,
      onclick: () => {
        const next = items.slice();
        next[idx] = { ...item, done: !item.done };
        send({ type: 'updateTask', id: task.id, patch: { checklist: next } });
      },
    });

    const textInput = el('input', { type: 'text', value: item.text, placeholder: 'Descreva o item...' });
    let timer = null;
    textInput.addEventListener('focus', () => { suppressRenderWhileTyping = true; });
    textInput.addEventListener('blur', () => { suppressRenderWhileTyping = false; });
    textInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = items.slice();
        next[idx] = { ...item, text: textInput.value };
        send({ type: 'updateTask', id: task.id, patch: { checklist: next } });
      }, 400);
    });

    const removeBtn = iconBtn(ICON_TRASH, 'Remover item', () => {
      const next = items.filter((_, i) => i !== idx);
      send({ type: 'updateTask', id: task.id, patch: { checklist: next } });
    }, 'icon-danger');

    return el('div', { className: 'checklist-item' + (item.done ? ' done' : '') }, [checkbox, textInput, removeBtn]);
  }

  function renderCommentsSection(task) {
    const titleEl = el('div', { className: 'section-title' }, ['Comentários']);

    const comments = task.comments || [];
    const list = comments.length
      ? el('div', {}, comments.slice().reverse().map((c) =>
          el('div', { className: 'comment' }, [
            el('div', {}, [c.text]),
            el('div', { className: 'date' }, [new Date(c.createdAt).toLocaleString('pt-BR')]),
          ])
        ))
      : el('div', { className: 'empty-hint' }, ['Nenhum comentário ainda']);

    const input = el('input', { type: 'text', placeholder: 'Escrever um comentário e pressionar Enter...' });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        send({ type: 'addComment', taskId: task.id, text: input.value.trim() });
        input.value = '';
      }
    });

    return el('div', {}, [titleEl, list, input]);
  }
})();
