(function(){
  const STORAGE_KEY = 'todo.items.v1';
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /** @type {HTMLInputElement} */
  const input = $('#new-todo');
  const addBtn = $('#add-btn');
  const list = $('#list');
  const itemsLeftEl = $('#items-left');
  const filters = $$('.filter');
  const toggleAllBtn = $('#toggle-all');
  const clearCompletedBtn = $('#clear-completed');

  const state = {
    items: loadItems(),
    filter: 'all' // 'all' | 'active' | 'completed'
  };

  function loadItems(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(x => x && typeof x.id === 'string');
    } catch { return []; }
  }

  function save(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }

  function uid(){
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function addItem(title){
    const t = title.trim();
    if (!t) return;
    state.items.push({ id: uid(), title: t, completed: false });
    save();
    render();
  }

  function updateItem(id, patch){
    const idx = state.items.findIndex(i => i.id === id);
    if (idx === -1) return;
    state.items[idx] = { ...state.items[idx], ...patch };
    save();
    render();
  }

  function deleteItem(id){
    state.items = state.items.filter(i => i.id !== id);
    save();
    render();
  }

  function setFilter(f){
    state.filter = f;
    render();
  }

  function filtered(){
    switch(state.filter){
      case 'active': return state.items.filter(i => !i.completed);
      case 'completed': return state.items.filter(i => i.completed);
      default: return state.items;
    }
  }

  function render(){
    // Update filter buttons
    filters.forEach(btn => {
      const active = btn.dataset.filter === state.filter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    // Render list
    list.innerHTML = '';
    const items = filtered();
    for (const item of items){
      const li = document.createElement('li');
      li.className = 'item' + (item.completed ? ' completed' : '');
      li.dataset.id = item.id;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'checkbox';
      checkbox.checked = item.completed;
      checkbox.ariaLabel = 'Mark completed';
      checkbox.addEventListener('change', () => updateItem(item.id, { completed: checkbox.checked }));

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = item.title;
      title.tabIndex = 0;
      title.setAttribute('role', 'textbox');
      title.setAttribute('aria-label', 'Edit title');

      const actions = document.createElement('div');
      actions.className = 'row-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'edit';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => startEdit(title, item));

      const delBtn = document.createElement('button');
      delBtn.className = 'delete';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => deleteItem(item.id));

      actions.append(editBtn, delBtn);
      li.append(checkbox, title, actions);
      list.appendChild(li);
    }

    const left = state.items.filter(i => !i.completed).length;
    itemsLeftEl.textContent = `${left} item${left===1?'':'s'} left`;
  }

  function startEdit(titleEl, item){
    titleEl.setAttribute('contenteditable', 'true');
    titleEl.focus();
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function finish(commit){
      titleEl.removeAttribute('contenteditable');
      titleEl.removeEventListener('keydown', onKey);
      titleEl.removeEventListener('blur', onBlur);
      if (commit){
        const newTitle = titleEl.textContent.trim();
        if (newTitle) updateItem(item.id, { title: newTitle });
        else deleteItem(item.id);
      } else {
        titleEl.textContent = item.title;
      }
    }

    function onKey(e){
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    }
    function onBlur(){ finish(true); }

    titleEl.addEventListener('keydown', onKey);
    titleEl.addEventListener('blur', onBlur);
  }

  // Events
  addBtn.addEventListener('click', () => { addItem(input.value); input.value=''; input.focus(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { addItem(input.value); input.value=''; }
  });

  filters.forEach(btn => btn.addEventListener('click', () => setFilter(btn.dataset.filter)));

  toggleAllBtn.addEventListener('click', () => {
    const allCompleted = state.items.length > 0 && state.items.every(i => i.completed);
    state.items = state.items.map(i => ({ ...i, completed: !allCompleted }));
    save();
    render();
  });

  clearCompletedBtn.addEventListener('click', () => {
    state.items = state.items.filter(i => !i.completed);
    save();
    render();
  });

  // Initial render
  render();
})();
