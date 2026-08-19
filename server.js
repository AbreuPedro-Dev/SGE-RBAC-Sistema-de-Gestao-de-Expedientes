/**
 * @file server.js
 * @description Servidor de Aplicação HTTP (Express API) para o SGE-RBAC (Sistema de Gestão de Expedientes).
 * Providencia endpoints RESTful para autenticação, gestão de utilizadores, matriz de acessos RBAC,
 * ciclo de vida de expedientes (registo, tramitação, despacho e arquivamento) e logs de auditoria.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Importação dos módulos locais da aplicação
const baseDados = require('./src/database/db');
const { JWT_SECRET, authenticateToken, checkPermission } = require('./src/middleware/auth');

// Inicialização da aplicação Express
const aplicacao = express();
const PORTA = process.env.PORT || 3000;

// Configuração de Middlewares Globais do Express
aplicacao.use(cors());
aplicacao.use(express.json());
aplicacao.use(express.static(path.join(__dirname, 'public')));

/**
 * Função auxiliar para capturar o endereço IP do cliente solicitante.
 * 
 * @param {Object} requisicao - Objeto req do Express
 * @returns {string} Endereço IP do cliente
 */
const obterIpCliente = (requisicao) => 
  requisicao.headers['x-forwarded-for'] || 
  (requisicao.socket && requisicao.socket.remoteAddress) || 
  '127.0.0.1';

// ==========================================
// 1. AUTENTICAÇÃO E GESTÃO DE PERFIL DE SESSÃO
// ==========================================

/**
 * @route POST /api/auth/login
 * @description Realiza a autenticação do utilizador com e-mail e palavra-passe, retornando o Token JWT e permissões.
 */
aplicacao.post('/api/auth/login', (requisicao, resposta) => {
  const { email, password } = requisicao.body;

  // Validação de preenchimento dos campos obrigatórios
  if (!email || !password) {
    return resposta.status(400).json({ success: false, message: 'Informe o e-mail e a palavra-passe.' });
  }

  // Pesquisa do utilizador na base de dados
  const utilizadorEncontrado = baseDados.getUserByEmail(email);

  // Se o utilizador não existir ou estiver desativado
  if (!utilizadorEncontrado || !utilizadorEncontrado.active) {
    baseDados.addAuditLog({
      action: 'LOGIN_FALHOU',
      entity: 'Autenticação',
      details: `Tentativa de login falhada para o e-mail: ${email} (Utilizador inexistente ou inativo)`,
      ip_address: obterIpCliente(requisicao),
      success: false
    });
    return resposta.status(401).json({ success: false, message: 'Credenciais inválidas ou utilizador inativo.' });
  }

  // Comparação encriptada da palavra-passe fornecida com a hash armazenada
  const palavraPasseValida = bcrypt.compareSync(password, utilizadorEncontrado.password);

  if (!palavraPasseValida) {
    baseDados.addAuditLog({
      user_id: utilizadorEncontrado.id,
      user_name: utilizadorEncontrado.name,
      user_role: 'N/A',
      action: 'LOGIN_FALHOU',
      entity: 'Autenticação',
      details: `Palavra-passe incorreta para o utilizador: ${email}`,
      ip_address: obterIpCliente(requisicao),
      success: false
    });
    return resposta.status(401).json({ success: false, message: 'Credenciais inválidas.' });
  }

  // Obter permissões e detalhes do perfil do utilizador
  const listaPermissoes = baseDados.getUserPermissions(utilizadorEncontrado.role_id);
  const perfilUtilizador = baseDados.getRoles().find(r => r.id === utilizadorEncontrado.role_id);

  // Gerar Token JWT com validade de 24 horas
  const tokenAcesso = jwt.sign(
    { 
      id: utilizadorEncontrado.id, 
      email: utilizadorEncontrado.email, 
      role_id: utilizadorEncontrado.role_id, 
      role_code: perfilUtilizador ? perfilUtilizador.code : 'N/A' 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Registar o evento de login com sucesso no log de auditoria
  baseDados.addAuditLog({
    user_id: utilizadorEncontrado.id,
    user_name: utilizadorEncontrado.name,
    user_role: perfilUtilizador ? perfilUtilizador.name : 'N/A',
    action: 'LOGIN_SUCESSO',
    entity: 'Autenticação',
    entity_id: String(utilizadorEncontrado.id),
    details: `Sessão iniciada com sucesso. Perfil: ${perfilUtilizador ? perfilUtilizador.name : 'N/A'}`,
    ip_address: obterIpCliente(requisicao),
    success: true
  });

  // Remover a palavra-passe antes de retornar a resposta ao cliente
  const utilizadorSemSenha = { ...utilizadorEncontrado };
  delete utilizadorSemSenha.password;

  return resposta.json({
    success: true,
    message: 'Autenticação realizada com sucesso.',
    token: tokenAcesso,
    user: {
      ...utilizadorSemSenha,
      role_name: perfilUtilizador ? perfilUtilizador.name : 'N/A',
      role_code: perfilUtilizador ? perfilUtilizador.code : 'N/A',
      permissions: listaPermissoes
    }
  });
});

/**
 * @route GET /api/auth/me
 * @description Retorna os dados do utilizador autenticado na sessão atual.
 */
aplicacao.get('/api/auth/me', authenticateToken, (requisicao, resposta) => {
  resposta.json({
    success: true,
    user: requisicao.user
  });
});

// ==========================================
// 2. GESTÃO DE UTILIZADORES & MATRIZ RBAC
// ==========================================

/**
 * @route GET /api/users
 * @description Retorna a lista de utilizadores do sistema (requer permissão 'users:manage').
 */
aplicacao.get('/api/users', authenticateToken, checkPermission('users:manage'), (requisicao, resposta) => {
  const listaUtilizadores = baseDados.getUsers();
  resposta.json({ success: true, users: listaUtilizadores });
});

/**
 * @route POST /api/users
 * @description Regista um novo utilizador no sistema (requer permissão 'users:manage').
 */
aplicacao.post('/api/users', authenticateToken, checkPermission('users:manage'), (requisicao, resposta) => {
  const { name, email, password, role_id, department } = requisicao.body;

  if (!name || !email || !password || !role_id) {
    return resposta.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios.' });
  }

  const utilizadorExistente = baseDados.getUserByEmail(email);
  if (utilizadorExistente) {
    return resposta.status(400).json({ success: false, message: 'Já existe um utilizador registado com este e-mail.' });
  }

  const novoUtilizador = baseDados.createUser({ name, email, password, role_id, department });

  baseDados.addAuditLog({
    user_id: requisicao.user.id,
    user_name: requisicao.user.name,
    user_role: requisicao.user.role_name,
    action: 'UTILIZADOR_CRIADO',
    entity: 'Utilizador',
    entity_id: String(novoUtilizador.id),
    details: `Novo utilizador '${novoUtilizador.name}' (${novoUtilizador.email}) criado com perfil ID: ${role_id}.`,
    ip_address: obterIpCliente(requisicao),
    success: true
  });

  resposta.json({ success: true, message: 'Utilizador criado com sucesso.', user: novoUtilizador });
});

/**
 * @route PUT /api/users/:id
 * @description Atualiza os dados de um utilizador existente (requer permissão 'users:manage').
 */
aplicacao.put('/api/users/:id', authenticateToken, checkPermission('users:manage'), (requisicao, resposta) => {
  const { id } = requisicao.params;
  const utilizadorAtualizado = baseDados.updateUser(id, requisicao.body);

  if (!utilizadorAtualizado) {
    return resposta.status(404).json({ success: false, message: 'Utilizador não encontrado.' });
  }

  baseDados.addAuditLog({
    user_id: requisicao.user.id,
    user_name: requisicao.user.name,
    user_role: requisicao.user.role_name,
    action: 'UTILIZADOR_ATUALIZADO',
    entity: 'Utilizador',
    entity_id: String(id),
    details: `Dados do utilizador '${utilizadorAtualizado.name}' atualizados.`,
    ip_address: obterIpCliente(requisicao),
    success: true
  });

  resposta.json({ success: true, message: 'Utilizador atualizado com sucesso.', user: utilizadorAtualizado });
});

/**
 * @route GET /api/roles
 * @description Retorna todos os perfis e permissões do catálogo RBAC.
 */
aplicacao.get('/api/roles', authenticateToken, (requisicao, resposta) => {
  const listaPerfis = baseDados.getRoles();
  const listaPermissoes = baseDados.getPermissions();
  resposta.json({ success: true, roles: listaPerfis, permissions: listaPermissoes });
});

/**
 * @route PUT /api/roles/:id/permissions
 * @description Atualiza as permissões de um perfil na matriz RBAC (requer permissão 'rbac:manage').
 */
aplicacao.put('/api/roles/:id/permissions', authenticateToken, checkPermission('rbac:manage'), (requisicao, resposta) => {
  const { id } = requisicao.params;
  const { permission_ids } = requisicao.body;

  if (!Array.isArray(permission_ids)) {
    return resposta.status(400).json({ success: false, message: 'Instrução inválida para permissões.' });
  }

  const perfilAtualizado = baseDados.updateRolePermissions(id, permission_ids);

  baseDados.addAuditLog({
    user_id: requisicao.user.id,
    user_name: requisicao.user.name,
    user_role: requisicao.user.role_name,
    action: 'MATRIZ_RBAC_ALTERADA',
    entity: 'Perfil RBAC',
    entity_id: String(id),
    details: `Matriz de permissões do perfil '${perfilAtualizado.name}' alterada (${permission_ids.length} permissões).`,
    ip_address: obterIpCliente(requisicao),
    success: true
  });

  resposta.json({ success: true, message: 'Matriz de permissões atualizada com sucesso.', role: perfilAtualizado });
});

// ==========================================
// 3. GESTÃO DE EXPEDIENTES (PROCESSOS)
// ==========================================

/**
 * @route GET /api/expedientes
 * @description Retorna os expedientes visíveis para o perfil do utilizador (requer permissão 'expediente:read').
 */
aplicacao.get('/api/expedientes', authenticateToken, checkPermission('expediente:read'), (requisicao, resposta) => {
  const listaExpedientes = baseDados.getExpedientes(requisicao.user.role_code, requisicao.user.permissions);
  resposta.json({ success: true, expedientes: listaExpedientes });
});

/**
 * @route GET /api/expedientes/:id
 * @description Retorna os detalhes de um expediente, incluindo tramitações e despachos.
 */
aplicacao.get('/api/expedientes/:id', authenticateToken, checkPermission('expediente:read'), (requisicao, resposta) => {
  const { id } = requisicao.params;
  const expedienteEncontrado = baseDados.getExpedientById(id);

  if (!expedienteEncontrado) {
    return resposta.status(404).json({ success: false, message: 'Expediente não encontrado.' });
  }

  // Verificação de restrição de segurança para expedientes confidenciais
  if (expedienteEncontrado.confidentiality === 'Confidencial' &&
      requisicao.user.role_code !== 'admin' &&
      requisicao.user.role_code !== 'gestor' &&
      !requisicao.user.permissions.includes('expediente:read_confidential')) {
    return resposta.status(403).json({ success: false, message: 'Este expediente é confidencial e exige permissão especial.' });
  }

  resposta.json({ success: true, expedient: expedienteEncontrado });
});

/**
 * @route POST /api/expedientes
 * @description Regista um novo expediente no sistema (requer permissão 'expediente:create').
 */
aplicacao.post('/api/expedientes', authenticateToken, checkPermission('expediente:create'), (requisicao, resposta) => {
  const { title, applicant, subject, priority, confidentiality, current_department } = requisicao.body;

  if (!title || !applicant || !subject) {
    return resposta.status(400).json({ success: false, message: 'Preencha o título, requerente e assunto.' });
  }

  const novoExpediente = baseDados.createExpedient(
    { title, applicant, subject, priority, confidentiality, current_department },
    requisicao.user
  );

  baseDados.addAuditLog({
    user_id: requisicao.user.id,
    user_name: requisicao.user.name,
    user_role: requisicao.user.role_name,
    action: 'EXPEDIENTE_REGISTADO',
    entity: 'Expediente',
    entity_id: novoExpediente.nup,
    details: `Novo expediente registado: '${novoExpediente.nup} - ${novoExpediente.title}' [${novoExpediente.confidentiality}]`,
    ip_address: obterIpCliente(requisicao),
    success: true
  });

  resposta.json({ success: true, message: 'Expediente registado com sucesso.', expedient: novoExpediente });
});

/**
 * @route POST /api/expedientes/:id/tramitar
 * @description Encaminha/tramita um expediente para outro departamento (requer permissão 'expediente:tramitar').
 */
aplicacao.post('/api/expedientes/:id/tramitar', authenticateToken, checkPermission('expediente:tramitar'), (requisicao, resposta) => {
  const { id } = requisicao.params;
  const { to_department, opinion } = requisicao.body;

  if (!to_department || !opinion) {
    return resposta.status(400).json({ success: false, message: 'Selecione o departamento de destino e insira o parecer/instruções.' });
  }

  const expedienteEncontrado = baseDados.getExpedientById(id);
  if (!expedienteEncontrado) {
    return resposta.status(404).json({ success: false, message: 'Expediente não encontrado.' });
  }

  if (expedienteEncontrado.status === 'Arquivado') {
    return resposta.status(400).json({ success: false, message: 'Não é possível tramitar um expediente arquivado.' });
  }

  const novaTramitacao = baseDados.addTramitacao(id, { to_department, opinion }, requisicao.user);

  baseDados.addAuditLog({
    user_id: requisicao.user.id,
    user_name: requisicao.user.name,
    user_role: requisicao.user.role_name,
    action: 'EXPEDIENTE_TRAMITADO',
    entity: 'Expediente',
    entity_id: expedienteEncontrado.nup,
    details: `Tramitado de '${expedienteEncontrado.current_department}' para '${to_department}'. Parecer: ${opinion}`,
    ip_address: obterIpCliente(requisicao),
    success: true
  });

  resposta.json({ success: true, message: 'Expediente tramitado com sucesso.', tramitacao: novaTramitacao });
});

/**
 * @route POST /api/expedientes/:id/despachar
 * @description Emite um despacho decisório para um expediente (requer permissão 'expediente:despachar').
 */
aplicacao.post('/api/expedientes/:id/despachar', authenticateToken, checkPermission('expediente:despachar'), (requisicao, resposta) => {
  const { id } = requisicao.params;
  const { decision, justification } = requisicao.body;

  if (!decision || !justification) {
    return resposta.status(400).json({ success: false, message: 'Selecione a decisão (Deferido/Indeferido/etc) e a fundamentação.' });
  }

  const expedienteEncontrado = baseDados.getExpedientById(id);
  if (!expedienteEncontrado) {
    return resposta.status(404).json({ success: false, message: 'Expediente não encontrado.' });
  }

  if (expedienteEncontrado.status === 'Arquivado') {
    return resposta.status(400).json({ success: false, message: 'Expediente já se encontra arquivado.' });
  }

  const novoDespacho = baseDados.addDespacho(id, { decision, justification }, requisicao.user);

  baseDados.addAuditLog({
    user_id: requisicao.user.id,
    user_name: requisicao.user.name,
    user_role: requisicao.user.role_name,
    action: 'DESPACHO_EMITIDO',
    entity: 'Expediente',
    entity_id: expedienteEncontrado.nup,
    details: `Despacho emitido: '${decision}'. Fundamentação: ${justification}`,
    ip_address: obterIpCliente(requisicao),
    success: true
  });

  resposta.json({ success: true, message: 'Despacho emitido com sucesso.', despacho: novoDespacho });
});

/**
 * @route POST /api/expedientes/:id/arquivar
 * @description Arquiva um expediente no Arquivo Geral (requer permissão 'expediente:arquivar').
 */
aplicacao.post('/api/expedientes/:id/arquivar', authenticateToken, checkPermission('expediente:arquivar'), (requisicao, resposta) => {
  const { id } = requisicao.params;
  const { location } = requisicao.body;

  const expedienteEncontrado = baseDados.getExpedientById(id);
  if (!expedienteEncontrado) {
    return resposta.status(404).json({ success: false, message: 'Expediente não encontrado.' });
  }

  const expedienteArquivado = baseDados.arquivarExpedient(id, { location }, requisicao.user);

  baseDados.addAuditLog({
    user_id: requisicao.user.id,
    user_name: requisicao.user.name,
    user_role: requisicao.user.role_name,
    action: 'EXPEDIENTE_ARQUIVADO',
    entity: 'Expediente',
    entity_id: expedienteEncontrado.nup,
    details: `Expediente arquivado com sucesso na localização: '${expedienteArquivado.archived_location}'`,
    ip_address: obterIpCliente(requisicao),
    success: true
  });

  resposta.json({ success: true, message: 'Expediente arquivado com sucesso.', expedient: expedienteArquivado });
});

// ==========================================
// 4. AUDITORIA, PAINEL E REINICIALIZAÇÃO
// ==========================================

/**
 * @route GET /api/audit-logs
 * @description Retorna o histórico de logs de auditoria do sistema (requer permissão 'audit:view').
 */
aplicacao.get('/api/audit-logs', authenticateToken, checkPermission('audit:view'), (requisicao, resposta) => {
  const listaLogs = baseDados.getAuditLogs();
  resposta.json({ success: true, logs: listaLogs });
});

/**
 * @route DELETE /api/audit-logs
 * @description Apaga todos os registos de auditoria acumulados (requer permissão 'audit:view').
 */
aplicacao.delete('/api/audit-logs', authenticateToken, checkPermission('audit:view'), (requisicao, resposta) => {
  baseDados.clearAuditLogs();
  baseDados.addAuditLog({
    user_id: requisicao.user.id,
    user_name: requisicao.user.name,
    user_role: requisicao.user.role_name,
    action: 'AUDITORIA_LIMPA',
    entity: 'Auditoria',
    entity_id: 'SYSTEM',
    details: 'Todos os registos de auditoria anteriores foram limpos pelo utilizador.',
    ip_address: obterIpCliente(requisicao),
    success: true
  });
  resposta.json({ success: true, message: 'Registos de auditoria limpos com sucesso.' });
});

/**
 * @route GET /api/stats
 * @description Retorna as estatísticas consolidadas para exibições de gráficos e estatísticas no Dashboard.
 */
aplicacao.get('/api/stats', authenticateToken, (requisicao, resposta) => {
  const estatisticasDashboard = baseDados.getDashboardStats();
  resposta.json({ success: true, stats: estatisticasDashboard });
});

/**
 * @route POST /api/reset-demo
 * @description Restaura a base de dados para o estado inicial de demonstração (exclusivo para Administradores).
 */
aplicacao.post('/api/reset-demo', authenticateToken, (requisicao, resposta) => {
  if (requisicao.user.role_code !== 'admin') {
    return resposta.status(403).json({ success: false, message: 'Apenas Administradores podem reinicializar os dados.' });
  }
  baseDados.resetFullDatabase();
  resposta.json({ success: true, message: 'Dados de demonstração reinicializados com sucesso!' });
});

/**
 * @route GET *
 * @description Rota genérica de fallback para suportar a navegação da aplicação Single Page Application (SPA).
 */
aplicacao.get('*', (requisicao, resposta) => {
  resposta.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicialização do servidor HTTP na porta definida
aplicacao.listen(PORTA, () => {
  console.log(`====================================================`);
  console.log(`  SGE-RBAC - Sistema de Gestão de Expedientes  `);
  console.log(`  Servidor em execução em: http://localhost:${PORTA}  `);
  console.log(`====================================================`);
});
