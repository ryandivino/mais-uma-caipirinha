import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loadingState = document.getElementById('loadingState');
const formState = document.getElementById('formState');
const invalidState = document.getElementById('invalidState');
const successState = document.getElementById('successState');

function showOnly(el) {
  [loadingState, formState, invalidState, successState].forEach((s) => {
    s.style.display = s === el ? 'block' : 'none';
  });
}

// O link do e-mail de recuperação traz um token na própria URL. O supabase-js
// processa isso automaticamente ao carregar e dispara o evento abaixo.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    showOnly(formState);
  }
});

// Se depois de alguns segundos nada aconteceu (nem PASSWORD_RECOVERY, nem
// sessão nenhuma), o link provavelmente é inválido ou já expirou.
setTimeout(async () => {
  if (loadingState.style.display === 'none') return; // já saiu do estado de carregando
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    showOnly(formState);
  } else {
    showOnly(invalidState);
  }
}, 4000);

document.getElementById('novaSenhaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('novaSenhaError');
  errEl.textContent = '';

  const senha = document.getElementById('novaSenha').value;
  const confirma = document.getElementById('confirmaSenha').value;

  if (senha !== confirma) {
    errEl.textContent = 'As senhas não são iguais.';
    return;
  }
  if (senha.length < 6) {
    errEl.textContent = 'A senha precisa ter pelo menos 6 caracteres.';
    return;
  }

  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    errEl.textContent = 'Não foi possível salvar: ' + error.message;
    return;
  }
  showOnly(successState);
});