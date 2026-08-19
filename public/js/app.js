/**
 * @file app.js
 * @description Lógica de Interface do Utilizador (Frontend JavaScript SPA) do SGE-RBAC.
 * Controla a autenticação local, persistência em LocalStorage, gestão de sessão JWT,
 * renderização dinâmica de tabelas e gráficos (Chart.js), navegação entre secções,
 * modais de tramitação/despacho/arquivamento e matriz RBAC.
 */

// ==========================================
// GESTÃO DE ESTADO DA APLICAÇÃO (VARIÁVEIS GLOBAIS)
// ==========================================
let utilizadorAtual = null;                                             // Guarda os dados do utilizador autenticado no momento
let tokenAutenticacaoAtual = localStorage.getItem('sge_token') || null; // Guarda o Token JWT de Segurança para manter a sessão ativa
let expedientesEmMemoria = [];                                         // Cache local da lista de expedientes/processos carregados da API
let registosAuditoriaEmMemoria = [];                                   // Cache local dos registos de auditoria carregados da API
let instanciaGraficoEstados = null;                                     // Instância ativa do gráfico de barras de estados (Chart.js)
let instanciaGraficoPrioridades = null;                                 // Instância ativa do gráfico de rosca de prioridades (Chart.js)

// ==========================================
// INICIALIZAÇÃO E EVENTOS DOM DA APLICAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  inicializarTemaVisual();

  // Se existir um token salvo em LocalStorage, tenta obter o perfil atual
  if (tokenAutenticacaoAtual) {
    carregarPerfilUtilizador();
  } else {
    exibirTelaLogin();
  }

  // Registar ouvintes de submissão nos formulários da aplicação
  const formularioLogin = document.getElementById('login-form');
  if (formularioLogin) formularioLogin.addEventListener('submit', tratarSubmissaoLogin);

  const formularioNovoExpediente = document.getElementById('form-new-exp');
  if (formularioNovoExpediente) formularioNovoExpediente.addEventListener('submit', tratarCriacaoExpediente);

  const formularioTramitar = document.getElementById('form-tramitar');
  if (formularioTramitar) formularioTramitar.addEventListener('submit', tratarSubmissaoTramitacao);

  const formularioDespacho = document.getElementById('form-despacho');
  if (formularioDespacho) formularioDespacho.addEventListener('submit', tratarSubmissaoDespacho);

  const formularioArquivar = document.getElementById('form-arquivar');
  if (formularioArquivar) formularioArquivar.addEventListener('submit', tratarSubmissaoArquivamento);

  const formularioUtilizador = document.getElementById('form-user');
  if (formularioUtilizador) formularioUtilizador.addEventListener('submit', tratarSubmissaoUtilizador);
});

// URL Base da API (Suporta a abertura direta do ficheiro index.html via protocolo file:)
const URL_BASE_API = (window.location.protocol === 'file:' || !window.location.port) ? 'http://localhost:3000' : '';

/**
 * Preenche automaticamente as credenciais na tela de login para demonstração rápida.
 * 
 * @param {string} emailUtilizador - Endereço de e-mail de teste
 * @param {string} palavraPasse - Palavra-passe correspondente
 */
window.fillDemo = function (emailUtilizador, palavraPasse) {
  const campoEmail = document.getElementById('login-email');
  const campoSenha = document.getElementById('login-password');
  if (campoEmail) campoEmail.value = emailUtilizador;
  if (campoSenha) campoSenha.value = palavraPasse;
  exibirNotificacaoToast(`Credenciais de ${emailUtilizador} preenchidas. Clique em 'Entrar'.`, 'info');
};

// ==========================================
// GESTÃO DO TEMA VISUAL (CLARO / ESCURO)
// ==========================================

/**
 * Inicializa o tema visual preferido do utilizador guardado em LocalStorage.
 */
function inicializarTemaVisual() {
  const temaSalvo = localStorage.getItem('sge_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', temaSalvo);
  atualizarIconeTema(temaSalvo);
}

/**
 * Alterna entre os temas visuais 'dark' (escuro) e 'light' (claro).
 */
window.toggleTheme = function () {
  const temaAtual = document.documentElement.getAttribute('data-theme') || 'dark';
  const proximoTema = temaAtual === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', proximoTema);
  localStorage.setItem('sge_theme', proximoTema);
  atualizarIconeTema(proximoTema);
};

/**
 * Atualiza o ícone do botão de alternância de tema no cabeçalho.
 * 
 * @param {string} nomeTema - Nome do tema atual ('dark' ou 'light')
 */
function atualizarIconeTema(nomeTema) {
  const iconeTema = document.getElementById('theme-icon');
  if (iconeTema) {
    iconeTema.className = nomeTema === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
  }
}

// ==========================================
// SISTEMA DE NOTIFICAÇÕES (TOAST)
// ==========================================

/**
 * Exibe uma mensagem de notificação flutuante temporária na interface.
 * 
 * @param {string} mensagemTexto - Conteúdo da mensagem a ser exibida
 * @param {string} tipoNotificacao - Tipo ('info', 'success', 'error', 'warning')
 */
function exibirNotificacaoToast(mensagemTexto, tipoNotificacao = 'info') {
  const meiasContentor = document.getElementById('toast-container');
  if (!meiasContentor) return;

  const elementoToast = document.createElement('div');
  elementoToast.className = `toast toast-${tipoNotificacao}`;
  elementoToast.innerText = mensagemTexto;
  meiasContentor.appendChild(elementoToast);

  setTimeout(() => {
    elementoToast.remove();
  }, 4000);
}

// ==========================================
// REQUISIÇÕES HTTP À API REST (FETCH WRAPPER)
// ==========================================

/**
 * Executa requisições HTTP para a API REST incluindo automaticamente o Token JWT.
 * 
 * @param {string} caminhoUrl - Endpoint relativo da API (ex: '/api/expedientes')
 * @param {Object} opcoesRequisicao - Opções da requisição Fetch (method, body, headers)
 * @returns {Promise<Object>} Resposta JSON parsed da API
 */
async function executarRequisicaoApi(caminhoUrl, opcoesRequisicao = {}) {
  const cabecalhosRequisicao = {
    'Content-Type': 'application/json',
    ...(tokenAutenticacaoAtual ? { 'Authorization': `Bearer ${tokenAutenticacaoAtual}` } : {}),
    ...(opcoesRequisicao.headers || {})
  };

  const urlCompleta = caminhoUrl.startsWith('http') ? caminhoUrl : `${URL_BASE_API}${caminhoUrl}`;

  try {
    const respostaHttp = await fetch(urlCompleta, { ...opcoesRequisicao, headers: cabecalhosRequisicao });
    const dadosResposta = await respostaHttp.json();

    if (!respostaHttp.ok) {
      if (respostaHttp.status === 401 || respostaHttp.status === 403) {
        if (caminhoUrl !== '/api/auth/login') {
          exibirNotificacaoToast(dadosResposta.message || 'Sessão expirada ou sem permissão.', 'error');
        }
      }
      throw new Error(dadosResposta.message || 'Erro de comunicação com o servidor.');
    }
    return dadosResposta;
  } catch (erroRequisicao) {
    console.error('Erro na requisição à API:', erroRequisicao);
    throw erroRequisicao;
  }
}

// ==========================================
// CONTROLADORES DE AUTENTICAÇÃO E SESSÃO
// ==========================================

/**
 * Processa a submissão do formulário de login.
 * 
 * @param {Event} evento - Evento de submit do formulário
 */
async function tratarSubmissaoLogin(evento) {
  evento.preventDefault();
  const emailUtilizador = document.getElementById('login-email').value;
  const palavraPasseUtilizador = document.getElementById('login-password').value;

  try {
    const dadosAutenticacao = await executarRequisicaoApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailUtilizador, password: palavraPasseUtilizador })
    });

    tokenAutenticacaoAtual = dadosAutenticacao.token;
    localStorage.setItem('sge_token', tokenAutenticacaoAtual);
    utilizadorAtual = dadosAutenticacao.user;

    exibirNotificacaoToast('Login efetuado com sucesso!', 'success');
    exibirLayoutAplicacao();
  } catch (erroLogin) {
    exibirNotificacaoToast(erroLogin.message, 'error');
  }
}

/**
 * Consulta a API para validar a sessão ativa e obter os dados do perfil atual.
 */
async function carregarPerfilUtilizador() {
  try {
    const dadosPerfil = await executarRequisicaoApi('/api/auth/me');
    utilizadorAtual = dadosPerfil.user;
    exibirLayoutAplicacao();
  } catch (erroPerfil) {
    encerrarSessao();
  }
}

/**
 * Encerra a sessão do utilizador, removendo os tokens salvos e retornando à tela de login.
 */
window.logout = function () {
  tokenAutenticacaoAtual = null;
  utilizadorAtual = null;
  localStorage.removeItem('sge_token');
  exibirTelaLogin();
};

/**
 * Exibe o ecrã de login e oculta o layout principal da aplicação.
 */
function exibirTelaLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-layout').style.display = 'none';
}

/**
 * Exibe o layout principal da aplicação e configura o menu de acordo com o perfil RBAC.
 */
function exibirLayoutAplicacao() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-layout').style.display = 'flex';

  // Renderizar o nome e o perfil do utilizador na barra lateral e cabeçalho
  document.getElementById('user-name-display').innerText = utilizadorAtual.name;
  const tituloBoasVindas = document.getElementById('welcome-user-title');
  if (tituloBoasVindas) tituloBoasVindas.innerText = `Bem-vindo, ${utilizadorAtual.name}`;
  const subtituloPerfil = document.getElementById('welcome-user-role');
  if (subtituloPerfil) subtituloPerfil.innerText = `Perfil ativo: ${utilizadorAtual.role_name.toUpperCase()}`;

  const avatarUtilizador = document.getElementById('user-avatar');
  if (avatarUtilizador) {
    avatarUtilizador.innerHTML = `${utilizadorAtual.name.charAt(0).toUpperCase()}<span class="avatar-status-dot"></span>`;
  }

  const crachaPerfil = document.getElementById('user-role-display');
  crachaPerfil.innerText = utilizadorAtual.role_name;

  if (utilizadorAtual.role_code === 'admin') crachaPerfil.style.background = '#ef4444';
  else if (utilizadorAtual.role_code === 'gestor') crachaPerfil.style.background = '#f59e0b';
  else if (utilizadorAtual.role_code === 'tecnico') crachaPerfil.style.background = '#0f766e';
  else crachaPerfil.style.background = '#10b981';

  // Aplicar regras de visibilidade aos botões e links de acordo com as permissões RBAC
  const possuiGestaoUtilizadores = utilizadorAtual.role_code === 'admin' || utilizadorAtual.permissions.includes('users:manage');
  const possuiGestaoRbac = utilizadorAtual.role_code === 'admin' || utilizadorAtual.permissions.includes('rbac:manage');
  const possuiVisualizacaoAuditoria = utilizadorAtual.role_code === 'admin' || utilizadorAtual.permissions.includes('audit:view');
  const possuiCriacaoExpedientes = utilizadorAtual.role_code === 'admin' || utilizadorAtual.permissions.includes('expediente:create');

  document.getElementById('nav-users').style.display = possuiGestaoUtilizadores ? 'block' : 'none';
  document.getElementById('nav-rbac').style.display = possuiGestaoRbac ? 'block' : 'none';
  document.getElementById('nav-audit').style.display = possuiVisualizacaoAuditoria ? 'block' : 'none';

  document.getElementById('btn-new-exp').style.display = possuiCriacaoExpedientes ? 'inline-flex' : 'none';
  document.getElementById('btn-header-new-exp').style.display = possuiCriacaoExpedientes ? 'inline-flex' : 'none';

  switchTab('dashboard');
  carregarDadosExpedientes();
}

/**
 * Alterna a visibilidade da barra lateral de navegação em ecrãs móveis.
 */
window.toggleMobileSidebar = function () {
  const barraLateral = document.getElementById('main-sidebar');
  const camadaSobreposicao = document.getElementById('sidebar-overlay');
  if (barraLateral && camadaSobreposicao) {
    barraLateral.classList.toggle('mobile-active');
    camadaSobreposicao.classList.toggle('active');
  }
};

/**
 * Alterna a aba/secção ativa na navegação da aplicação SPA.
 * 
 * @param {string} nomeAba - Identificador da aba ('dashboard', 'expedientes', 'users', 'rbac', 'audit')
 */
window.switchTab = function (nomeAba) {
  // Fechar o menu móvel caso esteja visível
  const barraLateral = document.getElementById('main-sidebar');
  const camadaSobreposicao = document.getElementById('sidebar-overlay');
  if (barraLateral && barraLateral.classList.contains('mobile-active')) {
    barraLateral.classList.remove('mobile-active');
    if (camadaSobreposicao) camadaSobreposicao.classList.remove('active');
  }

  const linksNavegacao = document.querySelectorAll('.nav-link');
  linksNavegacao.forEach(link => link.classList.remove('active'));

  const seccoesPagina = document.querySelectorAll('.view-section');
  seccoesPagina.forEach(sec => sec.classList.remove('active'));

  const titulosVistas = {
    'dashboard': 'Dashboard Principal & Indicadores',
    'expedientes': 'Gestão e Tramitação de Expedientes',
    'users': 'Gestão de Utilizadores e Contas',
    'rbac': 'Matriz de Controlo de Acesso (RBAC)',
    'audit': 'Auditoria de Ações e Relatórios'
  };

  document.getElementById(`view-${nomeAba}`).classList.add('active');
  document.getElementById('current-view-title').innerText = titulosVistas[nomeAba] || 'Painel SGE';

  // Destacar o link correspondente no menu
  const linkAtivo = Array.from(linksNavegacao).find(link => link.getAttribute('onclick')?.includes(nomeAba));
  if (linkAtivo) linkAtivo.classList.add('active');

  // Carregar dados da aba selecionada
  if (nomeAba === 'dashboard') carregarDadosDashboard();
  else if (nomeAba === 'expedientes') carregarDadosExpedientes();
  else if (nomeAba === 'users') carregarDadosUtilizadores();
  else if (nomeAba === 'rbac') carregarDadosRbac();
  else if (nomeAba === 'audit') carregarDadosAuditoria();
};

// ==========================================
// 1. MÓDULO DO DASHBOARD E ESTATÍSTICAS
// ==========================================

/**
 * Consulta a API de estatísticas e atualiza os indicadores do Dashboard.
 */
async function carregarDadosDashboard() {
  try {
    const respostaStats = await executarRequisicaoApi('/api/stats');
    const dadosEstatistiscos = respostaStats.stats;

    document.getElementById('kpi-total-exp').innerText = dadosEstatistiscos.totalExpedientes;
    document.getElementById('kpi-tramitacao').innerText = dadosEstatistiscos.emTramitacao;
    document.getElementById('kpi-deferidos').innerText = dadosEstatistiscos.deferidos;
    document.getElementById('kpi-urgentes').innerText = dadosEstatistiscos.urgentes;

    // Exibir o painel de reinicialização apenas para Administradores
    const bannerReinicializacao = document.getElementById('banner-reset-demo');
    if (bannerReinicializacao) {
      const eAdministrador = utilizadorAtual && utilizadorAtual.role_code === 'admin';
      bannerReinicializacao.style.display = eAdministrador ? 'flex' : 'none';
    }

    renderizarGraficosDashboard(dadosEstatistiscos);
  } catch (erroDashboard) {
    exibirNotificacaoToast('Erro ao carregar estatísticas do dashboard', 'error');
  }
}

/**
 * Solicita a reinicialização dos dados de demonstração à API.
 */
window.resetDemoData = async function () {
  if (!confirm('Tem a certeza de que deseja restaurar todos os dados demonstrativos? Esta ação repõe utilizadores, expedientes, tramitações, despachos e logs de auditoria nos valores iniciais.')) {
    return;
  }
  try {
    exibirNotificacaoToast('A restaurar dados demonstrativos em todos os módulos...', 'info');
    await executarRequisicaoApi('/api/reset-demo', { method: 'POST' });
    exibirNotificacaoToast('Dados demonstrativos restaurados com sucesso!', 'success');
    recarregarTodosModulos();
  } catch (erroRestauro) {
    exibirNotificacaoToast('Erro ao restaurar dados: ' + erroRestauro.message, 'error');
  }
};

/**
 * Recarrega os dados de todos os módulos visíveis na interface.
 */
function recarregarTodosModulos() {
  carregarDadosDashboard();
  carregarDadosExpedientes();
  if (utilizadorAtual) {
    const listaPermissoes = utilizadorAtual.permissions || [];
    const eAdministrador = utilizadorAtual.role_code === 'admin';
    if (eAdministrador || listaPermissoes.includes('users:manage')) carregarDadosUtilizadores();
    if (eAdministrador || listaPermissoes.includes('rbac:manage')) carregarDadosRbac();
    if (eAdministrador || listaPermissoes.includes('audit:view')) carregarDadosAuditoria();
  }
}

/**
 * Renderiza os gráficos interativos de estados e prioridades utilizando a biblioteca Chart.js.
 * 
 * @param {Object} dadosEstatistiscos - Dados estatísticos agrupados
 */
function renderizarGraficosDashboard(dadosEstatistiscos) {
  try {
    if (typeof Chart === 'undefined') return;
    const eTemaClaro = document.documentElement.getAttribute('data-theme') === 'light';
    const corTexto = eTemaClaro ? '#0f172a' : '#f8fafc';

    // Gráfico 1: Expedientes por Estado
    const elementoCanvasEstados = document.getElementById('chart-status');
    if (elementoCanvasEstados) {
      const contextoEstados = elementoCanvasEstados.getContext('2d');
      if (instanciaGraficoEstados) instanciaGraficoEstados.destroy();

      instanciaGraficoEstados = new Chart(contextoEstados, {
        type: 'bar',
        data: {
          labels: Object.keys(dadosEstatistiscos.byStatus),
          datasets: [{
            label: 'Quantidade de Expedientes',
            data: Object.values(dadosEstatistiscos.byStatus),
            backgroundColor: ['#0f766e', '#f59e0b', '#10b981', '#ef4444', '#64748b'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: corTexto } },
            y: { ticks: { color: corTexto, precision: 0 } }
          }
        }
      });
    }

    // Gráfico 2: Expedientes por Prioridade
    const elementoCanvasPrioridades = document.getElementById('chart-priority');
    if (elementoCanvasPrioridades) {
      const contextoPrioridades = elementoCanvasPrioridades.getContext('2d');
      if (instanciaGraficoPrioridades) instanciaGraficoPrioridades.destroy();

      instanciaGraficoPrioridades = new Chart(contextoPrioridades, {
        type: 'doughnut',
        data: {
          labels: Object.keys(dadosEstatistiscos.byPriority),
          datasets: [{
            data: Object.values(dadosEstatistiscos.byPriority),
            backgroundColor: ['#34d399', '#fbbf24', '#f87171', '#c084fc']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: corTexto } }
          }
        }
      });
    }
  } catch (erroGrafico) {
    console.warn('Erro ao renderizar gráficos:', erroGrafico);
  }
}

// ==========================================
// 2. MÓDULO DE GESTÃO DE EXPEDIENTES
// ==========================================

/**
 * Consulta a API de expedientes e armazena os resultados na cache em memória.
 */
async function carregarDadosExpedientes() {
  try {
    const dadosRecebidos = await executarRequisicaoApi('/api/expedientes');
    expedientesEmMemoria = dadosRecebidos.expedientes;
    renderizarTabelaExpedientes(expedientesEmMemoria);
  } catch (erroExpedientes) {
    exibirNotificacaoToast('Erro ao carregar lista de expedientes', 'error');
  }
}

/**
 * Renderiza a tabela de expedientes na interface.
 * 
 * @param {Array<Object>} listaExpedientes - Coleção de expedientes a serem listados
 */
function renderizarTabelaExpedientes(listaExpedientes) {
  const corpoTabela = document.getElementById('tbody-expedientes');
  corpoTabela.innerHTML = '';

  if (!listaExpedientes.length) {
    corpoTabela.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum expediente encontrado.</td></tr>`;
    return;
  }

  const permissoesUtilizador = utilizadorAtual.permissions || [];
  const eAdministrador = utilizadorAtual.role_code === 'admin';
  const podeTramitar = eAdministrador || permissoesUtilizador.includes('expediente:tramitar');
  const podeDespachar = eAdministrador || permissoesUtilizador.includes('expediente:despachar');
  const podeArquivar = eAdministrador || permissoesUtilizador.includes('expediente:arquivar');

  listaExpedientes.forEach(expediente => {
    const linhaTabela = document.createElement('tr');

    // Determinar estilo visual do crachá de estado
    let classeEstado = 'badge-entrada';
    if (expediente.status === 'Em Tramitação') classeEstado = 'badge-tramitacao';
    else if (expediente.status === 'Deferido') classeEstado = 'badge-deferido';
    else if (expediente.status === 'Indeferido') classeEstado = 'badge-indeferido';
    else if (expediente.status === 'Arquivado') classeEstado = 'badge-arquivado';

    // Determinar estilo visual da prioridade
    let classePrioridade = `badge-${expediente.priority.toLowerCase()}`;

    // Determinar crachá de confidencialidade
    let crachaConfidencialidade = expediente.confidentiality === 'Confidencial'
      ? `<span class="badge badge-confidential"><i class="ri-lock-2-line"></i> Confidencial</span>`
      : `<span class="badge badge-public">${expediente.confidentiality}</span>`;

    const estaEncerrado = expediente.status === 'Arquivado';

    linhaTabela.innerHTML = `
      <td><strong>${expediente.nup}</strong></td>
      <td>
        <div style="font-weight: 600;">${expediente.title}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted);"><i class="ri-user-line"></i> ${expediente.applicant}</div>
      </td>
      <td><span class="badge ${classePrioridade}">${expediente.priority}</span></td>
      <td>${crachaConfidencialidade}</td>
      <td><i class="ri-building-4-line"></i> ${expediente.current_department}</td>
      <td><span class="badge ${classeEstado}">${expediente.status}</span></td>
      <td>
        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" onclick="viewExpedientDetails(${expediente.id})" title="Ver Detalhes e Histórico">
            <i class="ri-eye-line"></i>
          </button>
          ${podeTramitar && !estaEncerrado ? `
            <button class="btn btn-primary btn-sm" onclick="openTramitarModal(${expediente.id})" title="Tramitar / Encaminhar">
              <i class="ri-route-line"></i>
            </button>
          ` : ''}
          ${podeDespachar && !estaEncerrado ? `
            <button class="btn btn-success btn-sm" onclick="openDespachoModal(${expediente.id})" title="Emitir Despacho">
              <i class="ri-quill-pen-line"></i>
            </button>
          ` : ''}
          ${podeArquivar && !estaEncerrado ? `
            <button class="btn btn-warning btn-sm" onclick="openArquivarModal(${expediente.id})" title="Arquivar">
              <i class="ri-archive-line"></i>
            </button>
          ` : ''}
        </div>
      </td>
    `;
    corpoTabela.appendChild(linhaTabela);
  });
}

/**
 * Filtra a lista de expedientes em tempo real por NUP, título, requerente ou estado.
 */
window.filterExpedientes = function () {
  const campoPesquisa = document.getElementById('search-expedientes');
  const termoPesquisa = (campoPesquisa ? campoPesquisa.value : '').toLowerCase().trim();
  const seletorEstado = document.getElementById('filter-status');
  const filtroEstado = seletorEstado ? seletorEstado.value : '';

  if (!expedientesEmMemoria || !expedientesEmMemoria.length) {
    carregarDadosExpedientes();
    return;
  }

  const expedientesFiltrados = expedientesEmMemoria.filter(expediente => {
    const nup = (expediente.nup || '').toLowerCase();
    const titulo = (expediente.title || '').toLowerCase();
    const requerente = (expediente.applicant || '').toLowerCase();
    const correspondePesquisa = !termoPesquisa || nup.includes(termoPesquisa) || titulo.includes(termoPesquisa) || requerente.includes(termoPesquisa);
    const correspondeEstado = !filtroEstado || expediente.status === filtroEstado;
    return correspondePesquisa && correspondeEstado;
  });

  renderizarTabelaExpedientes(expedientesFiltrados);
};

/**
 * Carrega e exibe os detalhes completos de um expediente no modal de visualização.
 * 
 * @param {number|string} idExpediente - ID do expediente a visualizar
 */
window.viewExpedientDetails = async function (idExpediente) {
  try {
    const respostaExpediente = await executarRequisicaoApi(`/api/expedientes/${idExpediente}`);
    const expediente = respostaExpediente.expedient;

    document.getElementById('view-exp-nup').innerText = `${expediente.nup} - ${expediente.title}`;

    // Construção da linha do tempo de tramitações
    let htmlTramitacoes = '';
    if (expediente.tramitacoes && expediente.tramitacoes.length) {
      htmlTramitacoes = expediente.tramitacoes.map(tramitacao => `
        <div class="timeline-item">
          <div class="timeline-date">${new Date(tramitacao.created_at).toLocaleString('pt-PT')}</div>
          <div class="timeline-title">${tramitacao.from_department} &rarr; ${tramitacao.to_department}</div>
          <div class="timeline-body">
            <div><strong>Responsável:</strong> ${tramitacao.user_name} (${tramitacao.user_role})</div>
            <div style="margin-top: 0.25rem;"><strong>Parecer / Instruções:</strong> ${tramitacao.opinion}</div>
          </div>
        </div>
      `).join('');
    } else {
      htmlTramitacoes = `<p style="font-size: 0.85rem; color: var(--text-muted);">Nenhuma tramitação efetuada até ao momento.</p>`;
    }

    // Construção do histórico de despachos
    let htmlDespachos = '';
    if (expediente.despachos && expediente.despachos.length) {
      htmlDespachos = expediente.despachos.map(despacho => `
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: #34d399;">
            <span><i class="ri-check-double-line"></i> DESPACHO: ${despacho.decision}</span>
            <span>${new Date(despacho.created_at).toLocaleString('pt-PT')}</span>
          </div>
          <div style="font-size: 0.85rem; margin-top: 0.4rem;">${despacho.justification}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem;">Assinado por: ${despacho.user_name} (${despacho.user_role})</div>
        </div>
      `).join('');
    } else {
      htmlDespachos = `<p style="font-size: 0.85rem; color: var(--text-muted);">Nenhum despacho emitido.</p>`;
    }

    const htmlDetalhes = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; background: var(--bg-primary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Requerente</div>
          <div style="font-weight: 700;">${expediente.applicant}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Estado Atual</div>
          <div style="font-weight: 700;">${expediente.status} (${expediente.current_department})</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Prioridade / Confidencialidade</div>
          <div style="font-weight: 700;">${expediente.priority} | ${expediente.confidentiality}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Data de Entrada</div>
          <div style="font-weight: 700;">${new Date(expediente.created_at).toLocaleString('pt-PT')}</div>
        </div>
      </div>

      <div style="margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;"><i class="ri-align-left"></i> Assunto / Descrição</h4>
        <div style="background: var(--bg-primary); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.9rem;">
          ${expediente.subject}
        </div>
      </div>

      ${expediente.archived_location ? `
        <div style="margin-bottom: 1.25rem; background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; padding: 0.75rem; border-radius: 8px; font-size: 0.85rem;">
          <strong><i class="ri-archive-line"></i> Localização no Arquivo:</strong> ${expediente.archived_location}
        </div>
      ` : ''}

      <div style="margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;"><i class="ri-quill-pen-line"></i> Despachos Decisórios</h4>
        ${htmlDespachos}
      </div>

      <div>
        <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;"><i class="ri-route-line"></i> Histórico de Tramitações</h4>
        <div class="timeline">
          ${htmlTramitacoes}
        </div>
      </div>
    `;

    document.getElementById('view-exp-content').innerHTML = htmlDetalhes;
    abrirModal('modal-view-exp');
  } catch (erroDetalhes) {
    exibirNotificacaoToast(erroDetalhes.message, 'error');
  }
};

// Modais e Manipulação de Ações do Expediente
window.openNewExpedientModal = function () {
  document.getElementById('form-new-exp').reset();
  abrirModal('modal-new-exp');
};

/**
 * Trata o registo de um novo expediente via formulário.
 */
async function tratarCriacaoExpediente(evento) {
  evento.preventDefault();
  const dadosFormulario = {
    title: document.getElementById('exp-title').value,
    applicant: document.getElementById('exp-applicant').value,
    current_department: document.getElementById('exp-dept').value,
    priority: document.getElementById('exp-priority').value,
    confidentiality: document.getElementById('exp-confidentiality').value,
    subject: document.getElementById('exp-subject').value
  };

  try {
    await executarRequisicaoApi('/api/expedientes', {
      method: 'POST',
      body: JSON.stringify(dadosFormulario)
    });
    exibirNotificacaoToast('Expediente criado com sucesso!', 'success');
    fecharModal('modal-new-exp');
    carregarDadosExpedientes();
  } catch (erroCriacao) {
    exibirNotificacaoToast(erroCriacao.message, 'error');
  }
}

window.openTramitarModal = function (idExpediente) {
  document.getElementById('tramitar-exp-id').value = idExpediente;
  document.getElementById('form-tramitar').reset();
  abrirModal('modal-tramitar');
};

/**
 * Trata o envio do formulário de tramitação de um expediente.
 */
async function tratarSubmissaoTramitacao(evento) {
  evento.preventDefault();
  const idExpediente = document.getElementById('tramitar-exp-id').value;
  const dadosTramitacao = {
    to_department: document.getElementById('tramitar-to-dept').value,
    opinion: document.getElementById('tramitar-opinion').value
  };

  try {
    await executarRequisicaoApi(`/api/expedientes/${idExpediente}/tramitar`, {
      method: 'POST',
      body: JSON.stringify(dadosTramitacao)
    });
    exibirNotificacaoToast('Tramitação concluída com sucesso!', 'success');
    fecharModal('modal-tramitar');
    carregarDadosExpedientes();
  } catch (erroTramitacao) {
    exibirNotificacaoToast(erroTramitacao.message, 'error');
  }
}

window.openDespachoModal = function (idExpediente) {
  document.getElementById('despacho-exp-id').value = idExpediente;
  document.getElementById('form-despacho').reset();
  abrirModal('modal-despacho');
};

/**
 * Trata a emissão de despacho decisório para um expediente.
 */
async function tratarSubmissaoDespacho(evento) {
  evento.preventDefault();
  const idExpediente = document.getElementById('despacho-exp-id').value;
  const dadosDespacho = {
    decision: document.getElementById('despacho-decision').value,
    justification: document.getElementById('despacho-justification').value
  };

  try {
    await executarRequisicaoApi(`/api/expedientes/${idExpediente}/despachar`, {
      method: 'POST',
      body: JSON.stringify(dadosDespacho)
    });
    exibirNotificacaoToast('Despacho assinado e emitido com sucesso!', 'success');
    fecharModal('modal-despacho');
    carregarDadosExpedientes();
  } catch (erroDespacho) {
    exibirNotificacaoToast(erroDespacho.message, 'error');
  }
}

window.openArquivarModal = function (idExpediente) {
  document.getElementById('arquivar-exp-id').value = idExpediente;
  document.getElementById('form-arquivar').reset();
  abrirModal('modal-arquivar');
};

/**
 * Trata a confirmação de arquivamento físico de um expediente.
 */
async function tratarSubmissaoArquivamento(evento) {
  evento.preventDefault();
  const idExpediente = document.getElementById('arquivar-exp-id').value;
  const dadosArquivamento = {
    location: document.getElementById('arquivar-location').value
  };

  try {
    await executarRequisicaoApi(`/api/expedientes/${idExpediente}/arquivar`, {
      method: 'POST',
      body: JSON.stringify(dadosArquivamento)
    });
    exibirNotificacaoToast('Expediente arquivado com sucesso!', 'success');
    fecharModal('modal-arquivar');
    carregarDadosExpedientes();
  } catch (erroArquivamento) {
    exibirNotificacaoToast(erroArquivamento.message, 'error');
  }
}

// ==========================================
// 3. MÓDULO DE GESTÃO DE UTILIZADORES
// ==========================================

/**
 * Carrega a lista de utilizadores cadastrados na API.
 */
async function carregarDadosUtilizadores() {
  try {
    const dadosUtilizadores = await executarRequisicaoApi('/api/users');
    renderizarTabelaUtilizadores(dadosUtilizadores.users);
  } catch (erroUtilizadores) {
    exibirNotificacaoToast('Erro ao carregar utilizadores', 'error');
  }
}

/**
 * Renderiza a tabela de utilizadores no painel de administração.
 * 
 * @param {Array<Object>} listaUtilizadores - Lista de utilizadores retornada da API
 */
function renderizarTabelaUtilizadores(listaUtilizadores) {
  const corpoTabela = document.getElementById('tbody-users');
  corpoTabela.innerHTML = '';

  listaUtilizadores.forEach(utilizador => {
    const linhaTabela = document.createElement('tr');
    linhaTabela.innerHTML = `
      <td>${utilizador.id}</td>
      <td><strong>${utilizador.name}</strong></td>
      <td>${utilizador.email}</td>
      <td>${utilizador.department}</td>
      <td><span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa;">${utilizador.role_name}</span></td>
      <td>
        <span class="badge ${utilizador.active ? 'badge-deferido' : 'badge-indeferido'}">
          ${utilizador.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editUser(${utilizador.id}, '${escaparHtml(utilizador.name)}', '${utilizador.email}', ${utilizador.role_id}, '${escaparHtml(utilizador.department)}')">
          <i class="ri-edit-line"></i> Editar
        </button>
      </td>
    `;
    corpoTabela.appendChild(linhaTabela);
  });
}

/**
 * Escapa aspas e caracteres especiais para injeção segura em strings HTML inline.
 * 
 * @param {string} textoBruto - Texto a ser escapado
 */
function escaparHtml(textoBruto) {
  return (textoBruto || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

window.openUserModal = function () {
  document.getElementById('modal-user-title').innerText = 'Adicionar Novo Utilizador';
  document.getElementById('user-id').value = '';
  document.getElementById('form-user').reset();
  abrirModal('modal-user');
};

window.editUser = function (idUtilizador, nome, email, idPerfil, departamento) {
  document.getElementById('modal-user-title').innerText = 'Editar Utilizador';
  document.getElementById('user-id').value = idUtilizador;
  document.getElementById('user-name').value = nome;
  document.getElementById('user-email').value = email;
  document.getElementById('user-password').value = '';
  document.getElementById('user-role-select').value = idPerfil;
  document.getElementById('user-department').value = departamento;
  abrirModal('modal-user');
};

/**
 * Processa a criação ou edição de um utilizador via formulário.
 */
async function tratarSubmissaoUtilizador(evento) {
  evento.preventDefault();
  const idUtilizador = document.getElementById('user-id').value;
  const dadosFormulario = {
    name: document.getElementById('user-name').value,
    email: document.getElementById('user-email').value,
    role_id: document.getElementById('user-role-select').value,
    department: document.getElementById('user-department').value
  };

  const palavraPasseDigitada = document.getElementById('user-password').value;
  if (palavraPasseDigitada) dadosFormulario.password = palavraPasseDigitada;

  try {
    if (idUtilizador) {
      await executarRequisicaoApi(`/api/users/${idUtilizador}`, { method: 'PUT', body: JSON.stringify(dadosFormulario) });
      exibirNotificacaoToast('Utilizador atualizado com sucesso!', 'success');
    } else {
      if (!palavraPasseDigitada) {
        exibirNotificacaoToast('Insira a palavra-passe para o novo utilizador.', 'error');
        return;
      }
      dadosFormulario.password = palavraPasseDigitada;
      await executarRequisicaoApi('/api/users', { method: 'POST', body: JSON.stringify(dadosFormulario) });
      exibirNotificacaoToast('Utilizador criado com sucesso!', 'success');
    }
    fecharModal('modal-user');
    carregarDadosUtilizadores();
  } catch (erroUtilizador) {
    exibirNotificacaoToast(erroUtilizador.message, 'error');
  }
}

// ==========================================
// 4. MÓDULO DE MATRIZ DE PERMISSÕES RBAC
// ==========================================

/**
 * Carrega os perfis e permissões para construir a matriz RBAC dinâmica.
 */
async function carregarDadosRbac() {
  try {
    const dadosRbac = await executarRequisicaoApi('/api/roles');
    renderizarMatrizRbac(dadosRbac.roles, dadosRbac.permissions);
  } catch (erroRbac) {
    exibirNotificacaoToast('Erro ao carregar Matriz RBAC', 'error');
  }
}

/**
 * Renderiza a tabela da matriz RBAC com caixas de seleção (checkboxes) para cada perfil.
 * 
 * @param {Array<Object>} perfis - Lista de perfis do sistema
 * @param {Array<Object>} permissoes - Lista de permissões do catálogo
 */
function renderizarMatrizRbac(perfis, permissoes) {
  const contentorMatriz = document.getElementById('rbac-matrix-container');

  let htmlMatriz = `
    <table class="custom-table">
      <thead>
        <tr>
          <th>Permissão / Ação do Sistema</th>
          ${perfis.map(p => `<th style="text-align: center; color: ${p.color}">${p.name}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  permissoes.forEach(permissao => {
    htmlMatriz += `
      <tr>
        <td>
          <div style="font-weight: 600;">${permissao.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${permissao.code} (${permissao.category})</div>
        </td>
    `;

    perfis.forEach(perfil => {
      const possuiPermissao = perfil.permissions.some(permPerfil => permPerfil.id === permissao.id);
      const eAdministrador = perfil.code === 'admin';
      htmlMatriz += `
        <td style="text-align: center;">
          <input type="checkbox"
            style="width: 18px; height: 18px; cursor: pointer;"
            ${possuiPermissao ? 'checked' : ''}
            ${eAdministrador ? 'disabled' : ''}
            onchange="toggleRbacPermission(${perfil.id}, ${permissao.id}, this.checked)"
          >
        </td>
      `;
    });

    htmlMatriz += `</tr>`;
  });

  htmlMatriz += `
      </tbody>
    </table>
  `;

  contentorMatriz.innerHTML = htmlMatriz;
}

/**
 * Ativa ou desativa uma permissão específica para um perfil na matriz RBAC.
 * 
 * @param {number|string} idPerfil - ID do perfil
 * @param {number|string} idPermissao - ID da permissão
 * @param {boolean} eMarcado - Estado da caixa de seleção (true para adicionar, false para remover)
 */
window.toggleRbacPermission = async function (idPerfil, idPermissao, eMarcado) {
  try {
    const dadosAtuais = await executarRequisicaoApi('/api/roles');
    const perfilEncontrado = dadosAtuais.roles.find(r => r.id === idPerfil);
    let idsPermissoes = perfilEncontrado.permissions.map(p => p.id);

    if (eMarcado) {
      if (!idsPermissoes.includes(idPermissao)) idsPermissoes.push(idPermissao);
    } else {
      idsPermissoes = idsPermissoes.filter(id => id !== idPermissao);
    }

    await executarRequisicaoApi(`/api/roles/${idPerfil}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permission_ids: idsPermissoes })
    });

    exibirNotificacaoToast('Matriz de permissões RBAC atualizada!', 'success');
  } catch (erroMatriz) {
    exibirNotificacaoToast(erroMatriz.message, 'error');
    carregarDadosRbac();
  }
};

// ==========================================
// 5. MÓDULO DE LOGS DE AUDITORIA E RELATÓRIOS
// ==========================================

/**
 * Carrega a lista de registos de auditoria registados no sistema.
 */
async function carregarDadosAuditoria() {
  try {
    const dadosAuditoria = await executarRequisicaoApi('/api/audit-logs');
    registosAuditoriaEmMemoria = dadosAuditoria.logs;
    renderizarTabelaAuditoria(registosAuditoriaEmMemoria);
  } catch (erroAuditoria) {
    exibirNotificacaoToast('Erro ao carregar logs de auditoria', 'error');
  }
}

/**
 * Renderiza a tabela de logs de auditoria na interface.
 * 
 * @param {Array<Object>} listaLogs - Lista de registos de auditoria
 */
function renderizarTabelaAuditoria(listaLogs) {
  const corpoTabela = document.getElementById('tbody-audit');
  corpoTabela.innerHTML = '';

  if (!listaLogs.length) {
    corpoTabela.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum registo de auditoria.</td></tr>`;
    return;
  }

  listaLogs.forEach(log => {
    const linhaTabela = document.createElement('tr');
    const corSucesso = log.success ? '#10b981' : '#ef4444';

    linhaTabela.innerHTML = `
      <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(log.timestamp).toLocaleString('pt-PT')}</td>
      <td>
        <div style="font-weight: 600;">${log.user_name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${log.user_role}</div>
      </td>
      <td><strong style="color: ${corSucesso}">${log.action}</strong></td>
      <td><span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #c084fc;">${log.entity}: ${log.entity_id}</span></td>
      <td style="font-size: 0.85rem;">${log.details}</td>
      <td style="font-size: 0.8rem; font-family: monospace;">${log.ip_address}</td>
    `;
    corpoTabela.appendChild(linhaTabela);
  });
}

/**
 * Filtra a tabela de auditoria em tempo real pelo nome do utilizador, ação ou detalhes.
 */
window.filterAuditLogs = function () {
  const campoPesquisa = document.getElementById('search-audit');
  const termoPesquisa = (campoPesquisa ? campoPesquisa.value : '').toLowerCase().trim();

  const logsFiltrados = registosAuditoriaEmMemoria.filter(log => {
    return log.user_name.toLowerCase().includes(termoPesquisa) ||
      log.action.toLowerCase().includes(termoPesquisa) ||
      log.details.toLowerCase().includes(termoPesquisa) ||
      log.entity.toLowerCase().includes(termoPesquisa);
  });
  renderizarTabelaAuditoria(logsFiltrados);
};

/**
 * Exporta a lista de registos de auditoria para um ficheiro no formato CSV.
 */
window.exportAuditCSV = function () {
  if (!registosAuditoriaEmMemoria.length) {
    exibirNotificacaoToast('Sem dados para exportar.', 'error');
    return;
  }

  let conteudoCsv = 'data:text/csv;charset=utf-8,';
  conteudoCsv += 'Data/Hora,Utilizador,Perfil,Acao,Entidade,Detalhes,IP\n';

  registosAuditoriaEmMemoria.forEach(log => {
    const linhaCsv = [
      `"${new Date(log.timestamp).toLocaleString('pt-PT')}"`,
      `"${log.user_name}"`,
      `"${log.user_role}"`,
      `"${log.action}"`,
      `"${log.entity}: ${log.entity_id}"`,
      `"${log.details.replace(/"/g, '""')}"`,
      `"${log.ip_address}"`
    ].join(',');
    conteudoCsv += linhaCsv + '\n';
  });

  const uriCodificada = encodeURI(conteudoCsv);
  const elementoDownload = document.createElement('a');
  elementoDownload.setAttribute('href', uriCodificada);
  elementoDownload.setAttribute('download', `SGE_Auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(elementoDownload);
  elementoDownload.click();
  document.body.removeChild(elementoDownload);
  exibirNotificacaoToast('Ficheiro CSV gerado com sucesso!', 'success');
};

/**
 * Limpa todos os registos de auditoria acumulados no sistema após confirmação do utilizador.
 */
window.clearAuditLogsUI = async function () {
  if (!confirm('Tem a certeza de que deseja eliminar todos os registos de auditoria? Esta ação não pode ser desfeita.')) {
    return;
  }

  try {
    const respostaLimpeza = await executarRequisicaoApi('/api/audit-logs', {
      method: 'DELETE'
    });
    exibirNotificacaoToast(respostaLimpeza.message || 'Registos de auditoria limpos com sucesso.', 'success');
    carregarDadosAuditoria();
  } catch (erroLimpeza) {
    exibirNotificacaoToast(erroLimpeza.message || 'Erro ao limpar registos de auditoria.', 'error');
  }
};

// ==========================================
// FUNÇÕES UTILITÁRIAS PARA MODAIS
// ==========================================

/**
 * Abre um modal na interface adicando a classe 'active'.
 * 
 * @param {string} idModal - ID do elemento do modal
 */
function abrirModal(idModal) {
  const elementoModal = document.getElementById(idModal);
  if (elementoModal) elementoModal.classList.add('active');
}

/**
 * Fecha um modal ativo na interface removendo a classe 'active'.
 * 
 * @param {string} idModal - ID do elemento do modal
 */
window.closeModal = function (idModal) {
  const elementoModal = document.getElementById(idModal);
  if (elementoModal) elementoModal.classList.remove('active');
};
