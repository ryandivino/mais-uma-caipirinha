# Mais Uma Caipirinha — Site institucional

Site institucional (Frente 1) para o bar Mais Uma Caipirinha, em São Luís.
Feito como site estático multi-página, sem framework e sem build step.

## Estrutura

```
index.html        página inicial (cartão de visita)
agenda.html       agenda semanal de eventos
cardapio.html     cardápio completo
sobre.html        sobre o bar + horários/endereço
regras.html       regras do bar
loja.html         camisetas / merch
contato.html      contato + mapa

assets/
  css/styles.css  todo o visual do site (uma fonte só, compartilhada por todas as páginas)
  js/nav.js       lógica do menu hambúrguer (abre/fecha, marca link ativo ao clicar)
  img/            ícone da logo (icon.svg), favicons e variações de app icon
```

## Rodando localmente

Como é tudo estático, dá pra abrir `index.html` direto no navegador. Pra evitar
qualquer restrição de navegador com caminhos relativos, o mais seguro é servir
a pasta com um servidor simples:

```bash
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

## Paleta e tipografia

- Magenta `#8B1E68`, Âmbar `#E8A33D`, Verde `#3D7A3E`, Creme `#F7F3EA`, Tinta `#1F1A1D`
- Títulos: Poppins (700/800)
- Wordmark da logo: Baloo 2 (700) — reproduz a fonte usada na arte da marca
- Corpo de texto: Inter

## Conteúdo hardcoded (atenção antes de publicar)

Cardápio, agenda, endereço, horários e regras estão com o texto real que a
Mais Uma usa hoje, direto no HTML. Não há CMS ainda — qualquer atualização de
preço, evento ou regra exige editar o HTML e publicar de novo.

## Próxima etapa (Frente 2, futura)

Painel de controle para o bar editar cardápio e agenda sem tocar em código.
Abordagem planejada: Supabase (Postgres + Auth), mesmo backend usado no
ReHum OS. A tabela de agenda vai guardar data real de cada evento, para que
itens passados saiam da página pública automaticamente.

## Domínio e deploy

Ainda não decididos. Sendo um site 100% estático, funciona em qualquer
hospedagem de arquivos estáticos (Vercel, Netlify, GitHub Pages, Cloudflare
Pages) sem configuração especial.
"# mais-uma-caipirinha" 
