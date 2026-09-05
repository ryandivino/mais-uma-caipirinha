import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------------
// Configuração de cada seção do painel. Pra adicionar um novo campo a uma
// tabela existente, basta acrescentar um item em "fields" — o formulário e a
// listagem se ajustam sozinhos.
// ---------------------------------------------------------------------------
const SECTIONS = {
  cardapio: {
    label: 'Cardápio',
    table: 'cardapio_itens',
    orderBy: [{ column: 'categoria' }, { column: 'ordem' }],
    fields: [
      { key: 'categoria', label: 'Categoria', type: 'text', required: true, placeholder: 'Ex: Caipirinhas' },
      { key: 'nome', label: 'Nome', type: 'text', required: true },
      { key: 'descricao', label: 'Descrição', type: 'text' },
      { key: 'preco', label: 'Preço (R$)', type: 'number' },
      { key: 'ordem', label: 'Ordem', type: 'number', default: 0 },
      { key: 'ativo', label: 'Ativo (aparece no site)', type: 'checkbox', default: true },
    ],
    title: (row) => row.nome,
    subtitle: (row) => [row.categoria, row.preco != null ? `R$ ${Number(row.preco).toFixed(2)}` : null].filter(Boolean).join(' · '),
  },
  loja: {
    label: 'Loja',
    table: 'loja_itens',
    orderBy: [{ column: 'ordem' }],
    fields: [
      { key: 'nome', label: 'Nome', type: 'text', required: true },
      { key: 'descricao', label: 'Descrição', type: 'text' },
      { key: 'preco', label: 'Preço (R$, vazio = "Consultar valor")', type: 'number' },
      { key: 'foto_url', label: 'URL da foto', type: 'text', placeholder: 'https://...' },
      { key: 'ordem', label: 'Ordem', type: 'number', default: 0 },
      { key: 'ativo', label: 'Ativo (aparece no site)', type: 'checkbox', default: true },
    ],
    title: (row) => row.nome,
    subtitle: (row) => (row.preco != null ? `R$ ${Number(row.preco).toFixed(2)}` : 'Consultar valor'),
  },
  agenda: {
    label: 'Agenda',
    table: 'agenda_eventos',
    orderBy: [{ column: 'data' }],
    fields: [
      { key: 'data', label: 'Data', type: 'date', required: true },
      { key: 'titulo', label: 'Título', type: 'text', required: true },
      { key: 'lineup', label: 'Line-up', type: 'text' },
      { key: 'tag', label: 'Tag', type: 'text', default: '+1 Caipy' },
      { key: 'ativo', label: 'Ativo (aparece no site)', type: 'checkbox', default: true },
    ],
    title: (row) => row.titulo,
    subtitle: (row) => [formatDate(row.data), row.lineup].filter(Boolean).join(' · '),
  },
};

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------
const loginScreen = document.getElementById('loginScreen');
const adminScreen = document.getElementById('adminScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = 'Não foi possível entrar. Confira o e-mail e a senha.';
  }
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    loginScreen.style.display = 'none';
    adminScreen.style.display = 'block';
    initPanelsOnce();
  } else {
    loginScreen.style.display = 'flex';
    adminScreen.style.display = 'none';
  }
});

// ---------------------------------------------------------------------------
// TABS
// ---------------------------------------------------------------------------
document.querySelectorAll('.admin-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.section}`).classList.add('active');
  });
});

// ---------------------------------------------------------------------------
// RENDERIZAÇÃO GENÉRICA DE CADA SEÇÃO
// ---------------------------------------------------------------------------
let panelsInitialized = false;

function initPanelsOnce() {
  if (panelsInitialized) return;
  panelsInitialized = true;
  Object.keys(SECTIONS).forEach((key) => setupSection(key));
}

function fieldInputHtml(field, value) {
  const val = value !== undefined && value !== null ? value : (field.default ?? '');
  if (field.type === 'checkbox') {
    return `<input type="checkbox" id="f_${field.key}" ${val ? 'checked' : ''}>`;
  }
  const placeholder = field.placeholder ? ` placeholder="${field.placeholder}"` : '';
  return `<input type="${field.type}" id="f_${field.key}"${placeholder} value="${val ?? ''}">`;
}

function setupSection(key) {
  const config = SECTIONS[key];
  const panel = document.getElementById(`panel-${key}`);

  panel.innerHTML = `
    <div class="admin-card">
      <h2>Adicionar item</h2>
      <div class="form-error" id="err-${key}"></div>
      <div class="form-grid" id="form-${key}"></div>
      <div class="form-actions">
        <button class="btn btn-amber" id="add-${key}">Adicionar</button>
      </div>
    </div>
    <div id="status-${key}"></div>
    <div class="admin-list" id="list-${key}"><div class="empty-state">Carregando…</div></div>
  `;

  renderForm(key, {});

  document.getElementById(`add-${key}`).addEventListener('click', () => handleSave(key, null));

  loadList(key);
}

function renderForm(key, values) {
  const config = SECTIONS[key];
  const formEl = document.getElementById(`form-${key}`);
  formEl.innerHTML = config.fields
    .map((field) => {
      if (field.type === 'checkbox') {
        return `<div class="checkbox-field">${fieldInputHtml(field, values[field.key])}<label for="f_${field.key}">${field.label}</label></div>`;
      }
      return `<div class="field"><label for="f_${field.key}">${field.label}${field.required ? ' *' : ''}</label>${fieldInputHtml(field, values[field.key])}</div>`;
    })
    .join('');
}

function readForm(key) {
  const config = SECTIONS[key];
  const data = {};
  for (const field of config.fields) {
    const el = document.getElementById(`f_${field.key}`);
    if (field.type === 'checkbox') {
      data[field.key] = el.checked;
    } else if (field.type === 'number') {
      data[field.key] = el.value === '' ? null : Number(el.value);
    } else {
      data[field.key] = el.value === '' ? null : el.value;
    }
  }
  return data;
}

function validateForm(key, data) {
  const config = SECTIONS[key];
  for (const field of config.fields) {
    if (field.required && (data[field.key] === null || data[field.key] === '')) {
      return `O campo "${field.label}" é obrigatório.`;
    }
  }
  return null;
}

async function handleSave(key, editingId) {
  const config = SECTIONS[key];
  const errEl = document.getElementById(`err-${key}`);
  const data = readForm(key);
  const problem = validateForm(key, data);
  if (problem) {
    errEl.textContent = problem;
    return;
  }
  errEl.textContent = '';

  const query = editingId
    ? supabase.from(config.table).update(data).eq('id', editingId)
    : supabase.from(config.table).insert([data]);

  const { error } = await query;
  if (error) {
    showStatus(key, 'error', 'Não foi possível salvar: ' + error.message);
    return;
  }
  showStatus(key, 'success', editingId ? 'Item atualizado.' : 'Item adicionado.');
  renderForm(key, {});
  document.getElementById(`add-${key}`).textContent = 'Adicionar';
  document.getElementById(`add-${key}`).onclick = () => handleSave(key, null);
  loadList(key);
}

async function handleDelete(key, id) {
  if (!confirm('Apagar este item? Essa ação não pode ser desfeita.')) return;
  const config = SECTIONS[key];
  const { error } = await supabase.from(config.table).delete().eq('id', id);
  if (error) {
    showStatus(key, 'error', 'Não foi possível apagar: ' + error.message);
    return;
  }
  showStatus(key, 'success', 'Item apagado.');
  loadList(key);
}

function handleEdit(key, row) {
  renderForm(key, row);
  const btn = document.getElementById(`add-${key}`);
  btn.textContent = 'Salvar edição';
  btn.onclick = () => handleSave(key, row.id);
  document.getElementById(`form-${key}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showStatus(key, type, message) {
  const el = document.getElementById(`status-${key}`);
  el.innerHTML = `<div class="status-msg ${type}">${message}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 4000);
}

async function loadList(key) {
  const config = SECTIONS[key];
  const listEl = document.getElementById(`list-${key}`);
  let query = supabase.from(config.table).select('*');
  for (const ord of config.orderBy) query = query.order(ord.column, { ascending: true });
  const { data, error } = await query;

  if (error) {
    listEl.innerHTML = `<div class="empty-state">Erro ao carregar: ${error.message}</div>`;
    return;
  }
  if (!data || data.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Nenhum item cadastrado ainda.</div>`;
    return;
  }

  listEl.innerHTML = data
    .map(
      (row) => `
      <div class="admin-row ${row.ativo ? '' : 'inactive'}">
        <div class="ar-main">
          <div class="ar-title">${escapeHtml(config.title(row))}</div>
          <div class="ar-sub">${escapeHtml(config.subtitle(row) || '')}${row.ativo ? '' : ' · inativo'}</div>
        </div>
        <div class="ar-actions">
          <button class="icon-btn" title="Editar" data-action="edit" data-id="${row.id}">✏️</button>
          <button class="icon-btn danger" title="Apagar" data-action="delete" data-id="${row.id}">🗑️</button>
        </div>
      </div>`
    )
    .join('');

  listEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = data.find((r) => r.id === btn.dataset.id);
      handleEdit(key, row);
    });
  });
  listEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => handleDelete(key, btn.dataset.id));
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}