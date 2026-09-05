import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------------
// Configuração de cada seção do painel. Pra adicionar um novo campo a uma
// tabela existente, basta acrescentar um item em "fields" — o formulário e a
// listagem se ajustam sozinhos. Campos do tipo "file" fazem upload pro
// Supabase Storage (bucket "site-images") e guardam a URL pública resultante.
// ---------------------------------------------------------------------------
const SECTIONS = {
  cardapio: {
    label: 'Cardápio',
    table: 'cardapio_itens',
    orderBy: [{ column: 'categoria_ordem' }, { column: 'ordem' }],
    fields: [
      { key: 'categoria', label: 'Categoria', type: 'text', required: true, placeholder: 'Ex: Caipirinhas' },
      { key: 'categoria_ordem', label: 'Ordem da categoria', type: 'number', default: 0, placeholder: 'Ex: 1 = aparece primeiro' },
      { key: 'nome', label: 'Nome', type: 'text', required: true },
      { key: 'descricao', label: 'Descrição', type: 'text' },
      { key: 'preco', label: 'Preço (R$)', type: 'number' },
      { key: 'ordem', label: 'Ordem dentro da categoria', type: 'number', default: 0 },
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
      { key: 'foto_url', label: 'Foto do produto', type: 'file' },
      { key: 'ordem', label: 'Ordem', type: 'number', default: 0 },
      { key: 'ativo', label: 'Ativo (aparece no site)', type: 'checkbox', default: true },
    ],
    title: (row) => row.nome,
    subtitle: (row) => (row.preco != null ? `R$ ${Number(row.preco).toFixed(2)}` : 'Consultar valor'),
    image: (row) => row.foto_url,
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
  fotos: {
    label: 'Fotos do Hero',
    table: 'hero_fotos',
    orderBy: [{ column: 'ordem' }],
    fields: [
      { key: 'url', label: 'Foto', type: 'file', required: true },
      { key: 'ordem', label: 'Ordem no carrossel', type: 'number', default: 0 },
      { key: 'ativo', label: 'Ativo (aparece no carrossel)', type: 'checkbox', default: true },
    ],
    title: (row) => `Foto (ordem ${row.ordem})`,
    subtitle: () => '',
    image: (row) => row.url,
  },
};

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ---------------------------------------------------------------------------
// UPLOAD DE IMAGEM (bucket "site-images" no Supabase Storage)
// ---------------------------------------------------------------------------
async function uploadImage(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('site-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('site-images').getPublicUrl(path);
  return data.publicUrl;
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

const forgotBtn = document.getElementById('forgotPasswordBtn');
const forgotStatus = document.getElementById('forgotStatus');

forgotBtn.addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) {
    forgotStatus.textContent = 'Digita seu e-mail no campo acima primeiro.';
    return;
  }
  forgotBtn.disabled = true;
  forgotStatus.textContent = 'Enviando…';

  const redirectTo = `${window.location.origin}${window.location.pathname.replace('admin.html', '')}nova-senha.html`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  forgotBtn.disabled = false;
  // Mensagem igual em caso de sucesso ou erro, de propósito: não revela se
  // aquele e-mail existe ou não cadastrado no sistema.
  forgotStatus.textContent = 'Se esse e-mail estiver cadastrado, chega um link em instantes pra você criar sua senha.';
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
// RENDERIZAÇÃO GENÉRICA DE CADA SEÇÃO (cardápio, loja, agenda, fotos)
// ---------------------------------------------------------------------------
let panelsInitialized = false;

function initPanelsOnce() {
  if (panelsInitialized) return;
  panelsInitialized = true;
  Object.keys(SECTIONS).forEach((key) => setupSection(key));
  setupConfigSection();
}

function fieldInputHtml(field, value) {
  if (field.type === 'file') {
    const currentUrl = value || '';
    const preview = currentUrl
      ? `<img src="${escapeHtml(currentUrl)}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;margin-bottom:8px;display:block;">`
      : '';
    return `${preview}<input type="hidden" id="f_${field.key}_current" value="${escapeHtml(currentUrl)}"><input type="file" id="f_${field.key}" accept="image/*">`;
  }
  const val = value !== undefined && value !== null ? value : (field.default ?? '');
  if (field.type === 'checkbox') {
    return `<input type="checkbox" id="f_${field.key}" ${val ? 'checked' : ''}>`;
  }
  const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : '';
  return `<input type="${field.type}" id="f_${field.key}"${placeholder} value="${escapeHtml(val)}">`;
}

function setupSection(key) {
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
    if (field.type === 'file') continue; // tratado à parte em handleSave (upload assíncrono)
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
    if (field.required && (data[field.key] === null || data[field.key] === '' || data[field.key] === undefined)) {
      return `O campo "${field.label}" é obrigatório.`;
    }
  }
  return null;
}

async function handleSave(key, editingId) {
  const config = SECTIONS[key];
  const errEl = document.getElementById(`err-${key}`);
  const btn = document.getElementById(`add-${key}`);
  const data = readForm(key);

  // Uploads de imagem, se houver campos do tipo "file" nesta seção.
  for (const field of config.fields) {
    if (field.type !== 'file') continue;
    const fileInput = document.getElementById(`f_${field.key}`);
    if (fileInput.files && fileInput.files.length > 0) {
      errEl.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Enviando imagem…';
      try {
        data[field.key] = await uploadImage(fileInput.files[0]);
      } catch (err) {
        errEl.textContent = 'Não foi possível enviar a imagem: ' + err.message;
        btn.disabled = false;
        btn.textContent = editingId ? 'Salvar edição' : 'Adicionar';
        return;
      }
    } else if (!editingId) {
      data[field.key] = null;
    }
    // Editando sem escolher arquivo novo: não mexe nesse campo, mantém o valor atual no banco.
  }

  const problem = validateForm(key, data);
  if (problem) {
    errEl.textContent = problem;
    btn.disabled = false;
    btn.textContent = editingId ? 'Salvar edição' : 'Adicionar';
    return;
  }
  errEl.textContent = '';

  const query = editingId
    ? supabase.from(config.table).update(data).eq('id', editingId)
    : supabase.from(config.table).insert([data]);

  const { error } = await query;
  btn.disabled = false;

  if (error) {
    showStatus(key, 'error', 'Não foi possível salvar: ' + error.message);
    btn.textContent = editingId ? 'Salvar edição' : 'Adicionar';
    return;
  }
  showStatus(key, 'success', editingId ? 'Item atualizado.' : 'Item adicionado.');
  renderForm(key, {});
  btn.textContent = 'Adicionar';
  btn.onclick = () => handleSave(key, null);
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
    .map((row) => {
      const imgUrl = config.image ? config.image(row) : null;
      const thumb = imgUrl
        ? `<img src="${escapeHtml(imgUrl)}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0;">`
        : '';
      const subtitle = config.subtitle(row) || '';
      return `
      <div class="admin-row ${row.ativo ? '' : 'inactive'}">
        <div class="ar-main" style="display:flex;align-items:center;gap:12px;">
          ${thumb}
          <div>
            <div class="ar-title">${escapeHtml(config.title(row))}</div>
            ${subtitle ? `<div class="ar-sub">${escapeHtml(subtitle)}${row.ativo ? '' : ' · inativo'}</div>` : (!row.ativo ? '<div class="ar-sub">inativo</div>' : '')}
          </div>
        </div>
        <div class="ar-actions">
          <button class="icon-btn" title="Editar" data-action="edit" data-id="${row.id}">✏️</button>
          <button class="icon-btn danger" title="Apagar" data-action="delete" data-id="${row.id}">🗑️</button>
        </div>
      </div>`;
    })
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

// ---------------------------------------------------------------------------
// CONFIGURAÇÕES GERAIS (horários, endereço, WhatsApp, Instagram)
// Tabela singleton (uma linha só, id fixo = 1) — por isso tem um formulário
// próprio, em vez de usar o mecanismo de lista do restante do painel.
// ---------------------------------------------------------------------------
const CONFIG_FIELDS = [
  { key: 'horario_qua_qui', label: 'Horário quarta e quinta' },
  { key: 'horario_sex_sab', label: 'Horário sexta e sábado' },
  { key: 'horario_dom', label: 'Horário domingo' },
  { key: 'endereco', label: 'Endereço completo' },
  { key: 'whatsapp', label: 'WhatsApp (ex: (98) 97005-0048)' },
  { key: 'instagram', label: 'Instagram (com @)' },
];

async function setupConfigSection() {
  const panel = document.getElementById('panel-config');
  if (!panel) return;

  panel.innerHTML = `
    <div class="admin-card">
      <h2>Informações gerais do site</h2>
      <p style="font-size:13px;color:#5a5450;margin-bottom:16px;">Horários, endereço, WhatsApp e Instagram usados na home, na página Sobre e na página Contato.</p>
      <div class="form-error" id="err-config"></div>
      <div class="form-grid" id="form-config">Carregando…</div>
      <div class="form-actions">
        <button class="btn btn-amber" id="save-config">Salvar</button>
      </div>
    </div>
    <div id="status-config"></div>
  `;

  const { data, error } = await supabase.from('site_config').select('*').eq('id', 1).single();
  const values = error || !data ? {} : data;

  const formEl = document.getElementById('form-config');
  formEl.innerHTML = CONFIG_FIELDS.map(
    (f) => `
    <div class="field">
      <label for="cf_${f.key}">${f.label}</label>
      <input type="text" id="cf_${f.key}" value="${escapeHtml(values[f.key] ?? '')}">
    </div>`
  ).join('');

  document.getElementById('save-config').addEventListener('click', async () => {
    const payload = {};
    CONFIG_FIELDS.forEach((f) => {
      payload[f.key] = document.getElementById(`cf_${f.key}`).value;
    });
    const errEl = document.getElementById('err-config');
    errEl.textContent = '';
    const { error } = await supabase.from('site_config').update(payload).eq('id', 1);
    const statusEl = document.getElementById('status-config');
    if (error) {
      statusEl.innerHTML = `<div class="status-msg error">Não foi possível salvar: ${error.message}</div>`;
    } else {
      statusEl.innerHTML = `<div class="status-msg success">Configurações salvas.</div>`;
      setTimeout(() => { statusEl.innerHTML = ''; }, 4000);
    }
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}