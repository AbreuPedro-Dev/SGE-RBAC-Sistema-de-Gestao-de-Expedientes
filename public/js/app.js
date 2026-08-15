// Gestão de Estado da Aplicação (Variáveis Globais do Frontend)
let currentUser = null;                         // Guarda os dados do utilizador autenticado no momento
let currentToken = localStorage.getItem('sge_token') || null; // Guarda o Token de Segurança (JWT) para manter a sessão ativa
let cachedExpedientes = [];                     // Guarda em memória a lista de expedientes/processos carregados da API
let cachedAuditLogs = [];                       // Guarda em memória a lista de registos de auditoria carregados da API
let statusChartInstance = null;                 // Guarda a instância ativa do gráfico de estados (Chart.js)
let priorityChartInstance = null;               // Guarda a instância ativa do gráfico de prioridades (Chart.js)

// Inicialização e Eventos da Aplicação
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  if (currentToken) {
    fetchProfile();
  } else {
    showLogin();
  }

  // Registadores de Eventos do Formulário
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('form-new-exp').addEventListener('submit', handleCreateExpedient);
  document.getElementById('form-tramitar').addEventListener('submit', handleTramitarSubmit);
  document.getElementById('form-despacho').addEventListener('submit', handleDespachoSubmit);
  document.getElementById('form-arquivar').addEventListener('submit', handleArquivarSubmit);
  document.getElementById('form-user').addEventListener('submit', handleUserSubmit);
});

// Auxiliar para URL base da API (Suporta abertura do index.html diretamente como ficheiro local)
const API_BASE = (window.location.protocol === 'file:' || !window.location.port) ? 'http://localhost:3000' : '';

// Auxiliar: Preenchimento Rápido de Demonstração (Preenche credenciais na tela de login)
window.fillDemo = function (email, password) {
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  if (emailInput) emailInput.value = email;
  if (passwordInput) passwordInput.value = password;
  showToast(`Credenciais de ${email} preenchidas. Clique em 'Entrar'.`, 'info');
};

// Gestão do Tema Visual (Claro / Escuro)
function initTheme() {
  const saved = localStorage.getItem('sge_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

window.toggleTheme = function () {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sge_theme', next);
  updateThemeIcon(next);
};

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.className = theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
  }
}

// Notificações Flutuantes (Toast)
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Auxiliar de Requisições à API REST (Fetch)
async function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
    ...(options.headers || {})
  };

  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

  try {
    const res = await fetch(fullUrl, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (url !== '/api/auth/login') {
          showToast(data.message || 'Sessão expirada ou sem permissão.', 'error');
        }
      }
      throw new Error(data.message || 'Erro no servidor.');
    }
    return data;
  } catch (err) {
    console.error('Erro na requisição API:', err);
    throw err;
  }
}

// Controladores de Autenticação (Login e Perfil)
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    currentToken = data.token;
    localStorage.setItem('sge_token', currentToken);
    currentUser = data.user;

    showToast('Login efetuado com sucesso!', 'success');
    showAppLayout();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function fetchProfile() {
  try {
    const data = await apiFetch('/api/auth/me');
    currentUser = data.user;
    showAppLayout();
  } catch (err) {
    logout();
  }
}

window.logout = function () {
  currentToken = null;
  currentUser = null;
  localStorage.removeItem('sge_token');
  showLogin();
};

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-layout').style.display = 'none';
}

function showAppLayout() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-layout').style.display = 'flex';

  // Renderizar Informações do Utilizador no Menu Lateral e Cabeçalho
  document.getElementById('user-name-display').innerText = currentUser.name;
  const welcomeTitle = document.getElementById('welcome-user-title');
  if (welcomeTitle) welcomeTitle.innerText = `Bem-vindo, ${currentUser.name}`;
  const welcomeRole = document.getElementById('welcome-user-role');
  if (welcomeRole) welcomeRole.innerText = `Perfil activo: ${currentUser.role_name.toUpperCase()}`;

  const userAvatar = document.getElementById('user-avatar');
  if (userAvatar) {
    userAvatar.innerHTML = `${currentUser.name.charAt(0).toUpperCase()}<span class="avatar-status-dot"></span>`;
  }
  const roleBadge = document.getElementById('user-role-display');
  roleBadge.innerText = currentUser.role_name;

  if (currentUser.role_code === 'admin') roleBadge.style.background = '#ef4444';
  else if (currentUser.role_code === 'gestor') roleBadge.style.background = '#f59e0b';
  else if (currentUser.role_code === 'tecnico') roleBadge.style.background = '#0f766e';
  else roleBadge.style.background = '#10b981';

  // Aplicar Visibilidade da Navegação Baseada no RBAC
  const hasUserMgmt = currentUser.role_code === 'admin' || currentUser.permissions.includes('users:manage');
  const hasRbacMgmt = currentUser.role_code === 'admin' || currentUser.permissions.includes('rbac:manage');
  const hasAuditView = currentUser.role_code === 'admin' || currentUser.permissions.includes('audit:view');
  const hasExpCreate = currentUser.role_code === 'admin' || currentUser.permissions.includes('expediente:create');

  document.getElementById('nav-users').style.display = hasUserMgmt ? 'block' : 'none';
  document.getElementById('nav-rbac').style.display = hasRbacMgmt ? 'block' : 'none';
  document.getElementById('nav-audit').style.display = hasAuditView ? 'block' : 'none';

  document.getElementById('btn-new-exp').style.display = hasExpCreate ? 'inline-flex' : 'none';
  document.getElementById('btn-header-new-exp').style.display = hasExpCreate ? 'inline-flex' : 'none';

  switchTab('dashboard');
  loadExpedientesData();
}

// Auxiliar de Alternância do Menu Lateral em Dispositivos Móveis
window.toggleMobileSidebar = function () {
  const sidebar = document.getElementById('main-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar && overlay) {
    sidebar.classList.toggle('mobile-active');
    overlay.classList.toggle('active');
  }
};

// Navegação e Alternância de Abas
window.switchTab = function (tabName) {
  // Fechar o menu lateral móvel se estiver aberto
  const sidebar = document.getElementById('main-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar && sidebar.classList.contains('mobile-active')) {
    sidebar.classList.remove('mobile-active');
    if (overlay) overlay.classList.remove('active');
  }

  const links = document.querySelectorAll('.nav-link');
  links.forEach(l => l.classList.remove('active'));

  const sections = document.querySelectorAll('.view-section');
  sections.forEach(s => s.classList.remove('active'));

  const titles = {
    'dashboard': 'Dashboard Principal & Indicadores',
    'expedientes': 'Gestão e Tramitação de Expedientes',
    'users': 'Gestão de Utilizadores e Contas',
    'rbac': 'Matriz de Controle de Acesso (RBAC)',
    'audit': 'Auditoria de Ações e Relatórios'
  };

  document.getElementById(`view-${tabName}`).classList.add('active');
  document.getElementById('current-view-title').innerText = titles[tabName] || 'Painel SGE';

  // Encontrar o link de navegação ativo
  const activeLink = Array.from(links).find(l => l.getAttribute('onclick')?.includes(tabName));
  if (activeLink) activeLink.classList.add('active');

  // Carregar dados da secção selecionada
  if (tabName === 'dashboard') loadDashboardData();
  else if (tabName === 'expedientes') loadExpedientesData();
  else if (tabName === 'users') loadUsersData();
  else if (tabName === 'rbac') loadRbacData();
  else if (tabName === 'audit') loadAuditData();
};

// 1. MÓDULO DO DASHBOARD E ESTATÍSTICAS
async function loadDashboardData() {
  try {
    const data = await apiFetch('/api/stats');
    const stats = data.stats;

    document.getElementById('kpi-total-exp').innerText = stats.totalExpedientes;
    document.getElementById('kpi-tramitacao').innerText = stats.emTramitacao;
    document.getElementById('kpi-deferidos').innerText = stats.deferidos;
    document.getElementById('kpi-urgentes').innerText = stats.urgentes;

    // Exibir banner de restauro se o utilizador for administrador, onde se faz 
    const banner = document.getElementById('banner-reset-demo');
    if (banner) {
      const isAdmin = currentUser && currentUser.role_code === 'admin';
      banner.style.display = isAdmin ? 'flex' : 'none';
    }

    renderDashboardCharts(stats);
  } catch (err) {
    showToast('Erro ao carregar estatísticas do dashboard', 'error');
  }
}

window.resetDemoData = async function () {
  if (!confirm('Tem a certeza de que deseja restaurar todos os dados demonstrativos? Esta ação repõe utilizadores, expedientes, tramitações, despachos e logs de auditoria nos valores iniciais.')) {
    return;
  }
  try {
    showToast('A restaurar dados demonstrativos em todos os módulos...', 'info');
    await apiFetch('/api/reset-demo', { method: 'POST' });
    showToast('Dados demonstrativos restaurados com sucesso em todos os módulos!', 'success');
    // Recarregar TODOS os módulos para refletir os dados restaurados
    reloadAllModules();
  } catch (err) {
    showToast('Erro ao restaurar dados: ' + err.message, 'error');
  }
};

// Recarrega cada secção de módulo que possua carregador de dados
function reloadAllModules() {
  loadDashboardData();
  loadExpedientesData();
  // Carregar apenas se o utilizador tiver as permissões necessárias
  if (currentUser) {
    const perms = currentUser.permissions || [];
    const isAdmin = currentUser.role_code === 'admin';
    if (isAdmin || perms.includes('users:manage')) loadUsersData();
    if (isAdmin || perms.includes('rbac:manage')) loadRbacData();
    if (isAdmin || perms.includes('audit:view')) loadAuditData();
  }
}

function renderDashboardCharts(stats) {
  try {
    if (typeof Chart === 'undefined') return;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const textColor = isLight ? '#0f172a' : '#f8fafc';

    // Gráfico 1: Expedientes por Estado
    const canvasStatus = document.getElementById('chart-status');
    if (canvasStatus) {
      const ctxStatus = canvasStatus.getContext('2d');
      if (statusChartInstance) statusChartInstance.destroy();

      statusChartInstance = new Chart(ctxStatus, {
        type: 'bar',
        data: {
          labels: Object.keys(stats.byStatus),
          datasets: [{
            label: 'Quantidade de Expedientes',
            data: Object.values(stats.byStatus),
            backgroundColor: ['#0f766e', '#f59e0b', '#10b981', '#ef4444', '#64748b'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: textColor } },
            y: { ticks: { color: textColor, precision: 0 } }
          }
        }
      });
    }

    // Gráfico 2: Expedientes por Prioridade
    const canvasPriority = document.getElementById('chart-priority');
    if (canvasPriority) {
      const ctxPriority = canvasPriority.getContext('2d');
      if (priorityChartInstance) priorityChartInstance.destroy();

      priorityChartInstance = new Chart(ctxPriority, {
        type: 'doughnut',
        data: {
          labels: Object.keys(stats.byPriority),
          datasets: [{
            data: Object.values(stats.byPriority),
            backgroundColor: ['#34d399', '#fbbf24', '#f87171', '#c084fc']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: textColor } }
          }
        }
      });
    }
  } catch (chartErr) {
    console.warn('Erro ao renderizar gráficos:', chartErr);
  }
}

// 2. MÓDULO DE GESTÃO DE EXPEDIENTES
async function loadExpedientesData() {
  try {
    const data = await apiFetch('/api/expedientes');
    cachedExpedientes = data.expedientes;
    renderExpedientesTable(cachedExpedientes);
  } catch (err) {
    showToast('Erro ao carregar lista de expedientes', 'error');
  }
}

function renderExpedientesTable(list) {
  const tbody = document.getElementById('tbody-expedientes');
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum expediente encontrado.</td></tr>`;
    return;
  }

  const perms = currentUser.permissions || [];
  const isAdmin = currentUser.role_code === 'admin';
  const canTramitar = isAdmin || perms.includes('expediente:tramitar');
  const canDespachar = isAdmin || perms.includes('expediente:despachar');
  const canArquivar = isAdmin || perms.includes('expediente:arquivar');

  list.forEach(exp => {
    const tr = document.createElement('tr');

    // Classe do Emblema de Estado
    let statusClass = 'badge-entrada';
    if (exp.status === 'Em Tramitação') statusClass = 'badge-tramitacao';
    else if (exp.status === 'Deferido') statusClass = 'badge-deferido';
    else if (exp.status === 'Indeferido') statusClass = 'badge-indeferido';
    else if (exp.status === 'Arquivado') statusClass = 'badge-arquivado';

    // Emblema de Prioridade
    let priorityClass = `badge-${exp.priority.toLowerCase()}`;

    // Emblema de Confidencialidade
    let confBadge = exp.confidentiality === 'Confidencial'
      ? `<span class="badge badge-confidential"><i class="ri-lock-2-line"></i> Confidencial</span>`
      : `<span class="badge badge-public">${exp.confidentiality}</span>`;

    const isClosed = exp.status === 'Arquivado';

    tr.innerHTML = `
      <td><strong>${exp.nup}</strong></td>
      <td>
        <div style="font-weight: 600;">${exp.title}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted);"><i class="ri-user-line"></i> ${exp.applicant}</div>
      </td>
      <td><span class="badge ${priorityClass}">${exp.priority}</span></td>
      <td>${confBadge}</td>
      <td><i class="ri-building-4-line"></i> ${exp.current_department}</td>
      <td><span class="badge ${statusClass}">${exp.status}</span></td>
      <td>
        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" onclick="viewExpedientDetails(${exp.id})" title="Ver Detalhes e Histórico">
            <i class="ri-eye-line"></i>
          </button>
          ${canTramitar && !isClosed ? `
            <button class="btn btn-primary btn-sm" onclick="openTramitarModal(${exp.id})" title="Tramitar / Encaminhar">
              <i class="ri-route-line"></i>
            </button>
          ` : ''}
          ${canDespachar && !isClosed ? `
            <button class="btn btn-success btn-sm" onclick="openDespachoModal(${exp.id})" title="Emitir Despacho">
              <i class="ri-quill-pen-line"></i>
            </button>
          ` : ''}
          ${canArquivar && !isClosed ? `
            <button class="btn btn-warning btn-sm" onclick="openArquivarModal(${exp.id})" title="Arquivar">
              <i class="ri-archive-line"></i>
            </button>
          ` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.filterExpedientes = function () {
  const searchInput = document.getElementById('search-expedientes');
  const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const statusSelect = document.getElementById('filter-status');
  const statusFilter = statusSelect ? statusSelect.value : '';

  if (!cachedExpedientes || !cachedExpedientes.length) {
    loadExpedientesData();
    return;
  }

  const filtered = cachedExpedientes.filter(exp => {
    const nup = (exp.nup || '').toLowerCase();
    const title = (exp.title || '').toLowerCase();
    const applicant = (exp.applicant || '').toLowerCase();
    const matchesSearch = !query || nup.includes(query) || title.includes(query) || applicant.includes(query);
    const matchesStatus = !statusFilter || exp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  renderExpedientesTable(filtered);
};

// Modal de Detalhes do Expediente e Linha do Tempo
window.viewExpedientDetails = async function (id) {
  try {
    const data = await apiFetch(`/api/expedientes/${id}`);
    const exp = data.expedient;

    document.getElementById('view-exp-nup').innerText = `${exp.nup} - ${exp.title}`;

    let tramitacoesHTML = '';
    if (exp.tramitacoes && exp.tramitacoes.length) {
      tramitacoesHTML = exp.tramitacoes.map(t => `
        <div class="timeline-item">
          <div class="timeline-date">${new Date(t.created_at).toLocaleString('pt-PT')}</div>
          <div class="timeline-title">${t.from_department} &rarr; ${t.to_department}</div>
          <div class="timeline-body">
            <div><strong>Responsável:</strong> ${t.user_name} (${t.user_role})</div>
            <div style="margin-top: 0.25rem;"><strong>Parecer / Instruções:</strong> ${t.opinion}</div>
          </div>
        </div>
      `).join('');
    } else {
      tramitacoesHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">Nenhuma tramitação efetuada até ao momento.</p>`;
    }

    let despachosHTML = '';
    if (exp.despachos && exp.despachos.length) {
      despachosHTML = exp.despachos.map(d => `
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: #34d399;">
            <span><i class="ri-check-double-line"></i> DESPACHO: ${d.decision}</span>
            <span>${new Date(d.created_at).toLocaleString('pt-PT')}</span>
          </div>
          <div style="font-size: 0.85rem; margin-top: 0.4rem;">${d.justification}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem;">Assinado por: ${d.user_name} (${d.user_role})</div>
        </div>
      `).join('');
    } else {
      despachosHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">Nenhum despacho emitido.</p>`;
    }

    const html = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; background: var(--bg-primary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Requerente</div>
          <div style="font-weight: 700;">${exp.applicant}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Estado Atual</div>
          <div style="font-weight: 700;">${exp.status} (${exp.current_department})</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Prioridade / Confidencialidade</div>
          <div style="font-weight: 700;">${exp.priority} | ${exp.confidentiality}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Data de Entrada</div>
          <div style="font-weight: 700;">${new Date(exp.created_at).toLocaleString('pt-PT')}</div>
        </div>
      </div>

      <div style="margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;"><i class="ri-align-left"></i> Assunto / Descrição</h4>
        <div style="background: var(--bg-primary); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.9rem;">
          ${exp.subject}
        </div>
      </div>

      ${exp.archived_location ? `
        <div style="margin-bottom: 1.25rem; background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; padding: 0.75rem; border-radius: 8px; font-size: 0.85rem;">
          <strong><i class="ri-archive-line"></i> Localização no Arquivo:</strong> ${exp.archived_location}
        </div>
      ` : ''}

      <div style="margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;"><i class="ri-quill-pen-line"></i> Despachos Decisórios</h4>
        ${despachosHTML}
      </div>

      <div>
        <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;"><i class="ri-route-line"></i> Histórico de Tramitações</h4>
        <div class="timeline">
          ${tramitacoesHTML}
        </div>
      </div>
    `;

    document.getElementById('view-exp-content').innerHTML = html;
    openModal('modal-view-exp');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Ações do Expediente (Tramitar, Despachar, Arquivar)
window.openNewExpedientModal = function () {
  document.getElementById('form-new-exp').reset();
  openModal('modal-new-exp');
};

async function handleCreateExpedient(e) {
  e.preventDefault();
  const body = {
    title: document.getElementById('exp-title').value,
    applicant: document.getElementById('exp-applicant').value,
    current_department: document.getElementById('exp-dept').value,
    priority: document.getElementById('exp-priority').value,
    confidentiality: document.getElementById('exp-confidentiality').value,
    subject: document.getElementById('exp-subject').value
  };

  try {
    await apiFetch('/api/expedientes', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    showToast('Expediente criado com sucesso!', 'success');
    closeModal('modal-new-exp');
    loadExpedientesData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.openTramitarModal = function (id) {
  document.getElementById('tramitar-exp-id').value = id;
  document.getElementById('form-tramitar').reset();
  openModal('modal-tramitar');
};

async function handleTramitarSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('tramitar-exp-id').value;
  const body = {
    to_department: document.getElementById('tramitar-to-dept').value,
    opinion: document.getElementById('tramitar-opinion').value
  };

  try {
    await apiFetch(`/api/expedientes/${id}/tramitar`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    showToast('Tramitação concluída com sucesso!', 'success');
    closeModal('modal-tramitar');
    loadExpedientesData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.openDespachoModal = function (id) {
  document.getElementById('despacho-exp-id').value = id;
  document.getElementById('form-despacho').reset();
  openModal('modal-despacho');
};

async function handleDespachoSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('despacho-exp-id').value;
  const body = {
    decision: document.getElementById('despacho-decision').value,
    justification: document.getElementById('despacho-justification').value
  };

  try {
    await apiFetch(`/api/expedientes/${id}/despachar`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    showToast('Despacho assinado e emitido com sucesso!', 'success');
    closeModal('modal-despacho');
    loadExpedientesData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.openArquivarModal = function (id) {
  document.getElementById('arquivar-exp-id').value = id;
  document.getElementById('form-arquivar').reset();
  openModal('modal-arquivar');
};

async function handleArquivarSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('arquivar-exp-id').value;
  const body = {
    location: document.getElementById('arquivar-location').value
  };

  try {
    await apiFetch(`/api/expedientes/${id}/arquivar`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    showToast('Expediente arquivado com sucesso!', 'success');
    closeModal('modal-arquivar');
    loadExpedientesData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 3. MÓDULO DE GESTÃO DE UTILIZADORES
async function loadUsersData() {
  try {
    const data = await apiFetch('/api/users');
    renderUsersTable(data.users);
  } catch (err) {
    showToast('Erro ao carregar utilizadores', 'error');
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('tbody-users');
  tbody.innerHTML = '';

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td>${u.department}</td>
      <td><span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa;">${u.role_name}</span></td>
      <td>
        <span class="badge ${u.active ? 'badge-deferido' : 'badge-indeferido'}">
          ${u.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editUser(${u.id}, '${escapeHtml(u.name)}', '${u.email}', ${u.role_id}, '${escapeHtml(u.department)}')">
          <i class="ri-edit-line"></i> Editar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

window.openUserModal = function () {
  document.getElementById('modal-user-title').innerText = 'Adicionar Novo Utilizador';
  document.getElementById('user-id').value = '';
  document.getElementById('form-user').reset();
  openModal('modal-user');
};

window.editUser = function (id, name, email, roleId, department) {
  document.getElementById('modal-user-title').innerText = 'Editar Utilizador';
  document.getElementById('user-id').value = id;
  document.getElementById('user-name').value = name;
  document.getElementById('user-email').value = email;
  document.getElementById('user-password').value = '';
  document.getElementById('user-role-select').value = roleId;
  document.getElementById('user-department').value = department;
  openModal('modal-user');
};

async function handleUserSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('user-id').value;
  const body = {
    name: document.getElementById('user-name').value,
    email: document.getElementById('user-email').value,
    role_id: document.getElementById('user-role-select').value,
    department: document.getElementById('user-department').value
  };

  const pass = document.getElementById('user-password').value;
  if (pass) body.password = pass;

  try {
    if (id) {
      await apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Utilizador atualizado com sucesso!', 'success');
    } else {
      if (!pass) {
        showToast('Insira a palavra-passe para o novo utilizador.', 'error');
        return;
      }
      body.password = pass;
      await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(body) });
      showToast('Utilizador criado com sucesso!', 'success');
    }
    closeModal('modal-user');
    loadUsersData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 4. MÓDULO DE MATRIZ DE PERMISSÕES RBAC
async function loadRbacData() {
  try {
    const data = await apiFetch('/api/roles');
    renderRbacMatrix(data.roles, data.permissions);
  } catch (err) {
    showToast('Erro ao carregar Matriz RBAC', 'error');
  }
}

function renderRbacMatrix(roles, permissions) {
  const container = document.getElementById('rbac-matrix-container');

  let html = `
    <table class="custom-table">
      <thead>
        <tr>
          <th>Permissão / Ação do Sistema</th>
          ${roles.map(r => `<th style="text-align: center; color: ${r.color}">${r.name}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  permissions.forEach(p => {
    html += `
      <tr>
        <td>
          <div style="font-weight: 600;">${p.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${p.code} (${p.category})</div>
        </td>
    `;

    roles.forEach(r => {
      const hasPerm = r.permissions.some(rp => rp.id === p.id);
      const isAdmin = r.code === 'admin';
      html += `
        <td style="text-align: center;">
          <input type="checkbox"
            style="width: 18px; height: 18px; cursor: pointer;"
            ${hasPerm ? 'checked' : ''}
            ${isAdmin ? 'disabled' : ''}
            onchange="toggleRbacPermission(${r.id}, ${p.id}, this.checked)"
          >
        </td>
      `;
    });

    html += `</tr>`;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

window.toggleRbacPermission = async function (roleId, permissionId, isChecked) {
  try {
    const data = await apiFetch('/api/roles');
    const role = data.roles.find(r => r.id === roleId);
    let permIds = role.permissions.map(p => p.id);

    if (isChecked) {
      if (!permIds.includes(permissionId)) permIds.push(permissionId);
    } else {
      permIds = permIds.filter(id => id !== permissionId);
    }

    await apiFetch(`/api/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permission_ids: permIds })
    });

    showToast('Matriz de permissões RBAC atualizada!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
    loadRbacData(); // Recarregar em caso de falha
  }
};

// 5. MÓDULO DE LOGS DE AUDITORIA
async function loadAuditData() {
  try {
    const data = await apiFetch('/api/audit-logs');
    cachedAuditLogs = data.logs;
    renderAuditTable(cachedAuditLogs);
  } catch (err) {
    showToast('Erro ao carregar logs de auditoria', 'error');
  }
}

function renderAuditTable(logs) {
  const tbody = document.getElementById('tbody-audit');
  tbody.innerHTML = '';

  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum registo de auditoria.</td></tr>`;
    return;
  }

  logs.forEach(l => {
    const tr = document.createElement('tr');
    const statusColor = l.success ? '#10b981' : '#ef4444';

    tr.innerHTML = `
      <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(l.timestamp).toLocaleString('pt-PT')}</td>
      <td>
        <div style="font-weight: 600;">${l.user_name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${l.user_role}</div>
      </td>
      <td><strong style="color: ${statusColor}">${l.action}</strong></td>
      <td><span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #c084fc;">${l.entity}: ${l.entity_id}</span></td>
      <td style="font-size: 0.85rem;">${l.details}</td>
      <td style="font-size: 0.8rem; font-family: monospace;">${l.ip_address}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.filterAuditLogs = function () {
  const query = document.getElementById('search-audit').value.toLowerCase();
  const filtered = cachedAuditLogs.filter(l => {
    return l.user_name.toLowerCase().includes(query) ||
      l.action.toLowerCase().includes(query) ||
      l.details.toLowerCase().includes(query) ||
      l.entity.toLowerCase().includes(query);
  });
  renderAuditTable(filtered);
};

window.exportAuditCSV = function () {
  if (!cachedAuditLogs.length) {
    showToast('Sem dados para exportar.', 'error');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'Data/Hora,Utilizador,Perfil,Acao,Entidade,Detalhes,IP\n';

  cachedAuditLogs.forEach(l => {
    const row = [
      `"${new Date(l.timestamp).toLocaleString('pt-PT')}"`,
      `"${l.user_name}"`,
      `"${l.user_role}"`,
      `"${l.action}"`,
      `"${l.entity}: ${l.entity_id}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.ip_address}"`
    ].join(',');
    csvContent += row + '\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SGE_Auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Ficheiro CSV gerado com sucesso!', 'success');
};

window.clearAuditLogsUI = async function () {
  if (!confirm('Tem a certeza de que deseja eliminar todos os registos de auditoria? Esta ação não pode ser desfeita.')) {
    return;
  }

  try {
    const data = await apiFetch('/api/audit-logs', {
      method: 'DELETE'
    });
    showToast(data.message || 'Registos de auditoria limpos com sucesso.', 'success');
    loadAuditData();
  } catch (err) {
    showToast(err.message || 'Erro ao limpar registos de auditoria.', 'error');
  }
};


// Funções Utilitárias para Modais
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

window.closeModal = function (id) {
  document.getElementById(id).classList.remove('active');
};
