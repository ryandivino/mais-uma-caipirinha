import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function money(value) {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------------------------------------------------------------------------
// CARDÁPIO (cardapio.html)
// ---------------------------------------------------------------------------
async function renderCardapio() {
  const container = document.getElementById('cardapio-container');
  if (!container) return;

  const { data, error } = await supabase
    .from('cardapio_itens')
    .select('*')
    .eq('ativo', true)
    .order('categoria_ordem', { ascending: true })
    .order('ordem', { ascending: true });

  if (error) {
    container.innerHTML = `<p style="padding:24px;">Não foi possível carregar o cardápio agora. Tenta de novo em alguns minutos.</p>`;
    return;
  }
  if (!data || data.length === 0) {
    container.innerHTML = `<p style="padding:24px;">Cardápio em atualização, volte em breve.</p>`;
    return;
  }

  const categorias = [];
  const porCategoria = {};
  for (const item of data) {
    if (!porCategoria[item.categoria]) {
      porCategoria[item.categoria] = [];
      categorias.push(item.categoria);
    }
    porCategoria[item.categoria].push(item);
  }

  container.innerHTML = categorias
    .map((categoria) => {
      const itens = porCategoria[categoria]
        .map(
          (item) => `
          <li>
            <span>${escapeHtml(item.nome)}${item.descricao ? `<br><small style="opacity:.7;font-size:12px;">${escapeHtml(item.descricao)}</small>` : ''}</span>
            <span>${item.preco != null ? money(item.preco) : ''}</span>
          </li>`
        )
        .join('');
      return `
        <div class="cardapio-cat">
          <h3>${escapeHtml(categoria)}</h3>
          <ul>${itens}</ul>
        </div>`;
    })
    .join('');
}

// ---------------------------------------------------------------------------
// LOJA (loja.html)
// ---------------------------------------------------------------------------
async function renderLoja() {
  const container = document.getElementById('loja-container');
  if (!container) return;

  const { data, error } = await supabase
    .from('loja_itens')
    .select('*')
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  if (error) {
    container.innerHTML = `<p>Não foi possível carregar a loja agora. Tenta de novo em alguns minutos.</p>`;
    return;
  }
  if (!data || data.length === 0) {
    container.innerHTML = `<p>Nenhum produto disponível por aqui, volte em breve.</p>`;
    return;
  }

  container.innerHTML = data
    .map(
      (item) => `
      <div class="product-card">
        <div class="product-photo">
          ${
            item.foto_url
              ? `<img src="${escapeHtml(item.foto_url)}" alt="${escapeHtml(item.nome)}" style="width:100%;height:100%;object-fit:cover;">`
              : `<span class="pp-icon">📷</span><span class="pp-text">Foto em breve</span>`
          }
        </div>
        <div class="product-info">
          <div class="p-name">${escapeHtml(item.nome)}</div>
          <div class="p-price">${item.preco != null ? money(item.preco) : 'Consultar valor'}</div>
          ${item.descricao ? `<p class="p-desc">${escapeHtml(item.descricao)}</p>` : ''}
        </div>
      </div>`
    )
    .join('');
}

// ---------------------------------------------------------------------------
// AGENDA (agenda.html)
// ---------------------------------------------------------------------------
function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return { display: `${d}/${m}`, weekday: weekdayName(y, m, d) };
}

function weekdayName(y, m, d) {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return dias[date.getDay()];
}

async function renderAgenda() {
  const container = document.getElementById('agenda-container');
  if (!container) return;

  const hoje = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('agenda_eventos')
    .select('*')
    .eq('ativo', true)
    .gte('data', hoje)
    .order('data', { ascending: true });

  if (error) {
    container.innerHTML = `<p>Não foi possível carregar a agenda agora. Tenta de novo em alguns minutos.</p>`;
    return;
  }
  if (!data || data.length === 0) {
    container.innerHTML = `<p>Nenhum evento marcado por enquanto, fica de olho no Instagram.</p>`;
    return;
  }

  container.innerHTML = data
    .map((evento) => {
      const { display, weekday } = formatDate(evento.data);
      return `
      <div class="agenda-item">
        <div class="agenda-day">${display}<span>${weekday}</span></div>
        <div>
          <div class="agenda-title">${escapeHtml(evento.titulo)}</div>
          ${evento.lineup ? `<div class="agenda-line">${escapeHtml(evento.lineup)}</div>` : ''}
        </div>
        <div class="agenda-tag">${escapeHtml(evento.tag || '+1 Caipy')}</div>
      </div>`;
    })
    .join('');
}

// ---------------------------------------------------------------------------
// FOTOS DO HERO (index.html)
// ---------------------------------------------------------------------------
async function renderHeroFotos() {
  const container = document.querySelector('.hero-photo');
  if (!container) return;

  const { data, error } = await supabase
    .from('hero_fotos')
    .select('*')
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  if (!error && data && data.length > 0) {
    container.innerHTML = data
      .map((foto, i) => `<img src="${escapeHtml(foto.url)}" alt="Rolê na Mais Uma Caipirinha" class="${i === 0 ? 'active' : ''}">`)
      .join('');
  }
  // se der erro ou o banco ainda estiver vazio, mantém as fotos que já
  // estão fixas no HTML como fallback, em vez de deixar o espaço vazio.

  const photos = container.querySelectorAll('img');
  if (photos.length > 1) {
    photos.forEach((p, i) => p.classList.toggle('active', i === 0));
    let current = 0;
    setInterval(() => {
      photos[current].classList.remove('active');
      current = (current + 1) % photos.length;
      photos[current].classList.add('active');
    }, 4000);
  }
}

// ---------------------------------------------------------------------------
// CONFIGURAÇÕES GERAIS (horários, endereço, WhatsApp, Instagram)
// Preenche qualquer elemento com data-config="chave" no HTML, o link de
// WhatsApp (data-config-whatsapp-link), o mapa (id="mapaFrame") e a faixa
// de horários animada do hero (.hero-strip-track).
// ---------------------------------------------------------------------------
async function renderSiteConfig() {
  const { data, error } = await supabase.from('site_config').select('*').eq('id', 1).single();
  if (error || !data) return;

  document.querySelectorAll('[data-config]').forEach((el) => {
    const key = el.getAttribute('data-config');
    if (data[key] != null) el.textContent = data[key];
  });

  document.querySelectorAll('[data-config-whatsapp-link]').forEach((el) => {
    const digits = (data.whatsapp || '').replace(/\D/g, '');
    if (digits) el.setAttribute('href', `https://wa.me/55${digits}`);
  });

  const mapaFrame = document.getElementById('mapaFrame');
  if (mapaFrame && data.endereco) {
    mapaFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(data.endereco)}&output=embed`;
  }

  const stripTrack = document.querySelector('.hero-strip-track');
  if (stripTrack) {
    const textos = [
      `QUA E QUI ${(data.horario_qua_qui || '').toUpperCase()}`,
      `SEX E SÁB ${(data.horario_sex_sab || '').toUpperCase()}`,
      `DOM ${(data.horario_dom || '').toUpperCase()}`,
    ];
    const spans = [];
    for (let i = 0; i < 4; i++) {
      textos.forEach((t) => spans.push(`<span>${escapeHtml(t)}</span>`));
    }
    stripTrack.innerHTML = spans.join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderCardapio();
  renderLoja();
  renderAgenda();
  renderHeroFotos();
  renderSiteConfig();
});