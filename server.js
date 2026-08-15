const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const db = require('./src/database/db');
const { JWT_SECRET, authenticateToken, checkPermission } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper for client IP
const getClientIp = (req) => req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

// ==========================================
// 1. AUTENTICAÇÃO E PERFIL
// ==========================================

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Informe o e-mail e a palavra-passe.' });
  }

  const user = db.getUserByEmail(email);

  if (!user || !user.active) {
    db.addAuditLog({
      action: 'LOGIN_FALHOU',
      entity: 'Autenticação',
      details: `Tentativa de login falhada para o e-mail: ${email} (Utilizador inexistente ou inativo)`,
      ip_address: getClientIp(req),
      success: false
    });
    return res.status(401).json({ success: false, message: 'Credenciais inválidas ou utilizador inativo.' });
  }

  const isValidPassword = bcrypt.compareSync(password, user.password);

  if (!isValidPassword) {
    db.addAuditLog({
      user_id: user.id,
      user_name: user.name,
      user_role: 'N/A',
      action: 'LOGIN_FALHOU',
      entity: 'Autenticação',
      details: `Palavra-passe incorreta para o utilizador: ${email}`,
      ip_address: getClientIp(req),
      success: false
    });
    return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
  }

  const permissions = db.getUserPermissions(user.role_id);
  const role = db.getRoles().find(r => r.id === user.role_id);

  const token = jwt.sign(
    { id: user.id, email: user.email, role_id: user.role_id, role_code: role ? role.code : 'N/A' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  db.addAuditLog({
    user_id: user.id,
    user_name: user.name,
    user_role: role ? role.name : 'N/A',
    action: 'LOGIN_SUCESSO',
    entity: 'Autenticação',
    entity_id: String(user.id),
    details: `Sessão iniciada com sucesso. Perfil: ${role ? role.name : 'N/A'}`,
    ip_address: getClientIp(req),
    success: true
  });

  const userClean = { ...user };
  delete userClean.password;
  return res.json({
    success: true,
    message: 'Autenticação realizada com sucesso.',
    token,
    user: {
      ...userClean,
      role_name: role ? role.name : 'N/A',
      role_code: role ? role.code : 'N/A',
      permissions
    }
  });
});

// Obter perfil atual
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// ==========================================
// 2. GESTÃO DE UTILIZADORES & RBAC
// ==========================================

// Listar Utilizadores
app.get('/api/users', authenticateToken, checkPermission('users:manage'), (req, res) => {
  const users = db.getUsers();
  res.json({ success: true, users });
});

// Criar Utilizador
app.post('/api/users', authenticateToken, checkPermission('users:manage'), (req, res) => {
  const { name, email, password, role_id, department } = req.body;

  if (!name || !email || !password || !role_id) {
    return res.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios.' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ success: false, message: 'Já existe um utilizador registado com este e-mail.' });
  }

  const newUser = db.createUser({ name, email, password, role_id, department });

  db.addAuditLog({
    user_id: req.user.id,
    user_name: req.user.name,
    user_role: req.user.role_name,
    action: 'UTILIZADOR_CRIADO',
    entity: 'Utilizador',
    entity_id: String(newUser.id),
    details: `Novo utilizador '${newUser.name}' (${newUser.email}) criado com perfil ID: ${role_id}.`,
    ip_address: getClientIp(req),
    success: true
  });

  res.json({ success: true, message: 'Utilizador criado com sucesso.', user: newUser });
});

// Atualizar Utilizador
app.put('/api/users/:id', authenticateToken, checkPermission('users:manage'), (req, res) => {
  const { id } = req.params;
  const updated = db.updateUser(id, req.body);

  if (!updated) {
    return res.status(404).json({ success: false, message: 'Utilizador não encontrado.' });
  }

  db.addAuditLog({
    user_id: req.user.id,
    user_name: req.user.name,
    user_role: req.user.role_name,
    action: 'UTILIZADOR_ATUALIZADO',
    entity: 'Utilizador',
    entity_id: String(id),
    details: `Dados do utilizador '${updated.name}' atualizados.`,
    ip_address: getClientIp(req),
    success: true
  });

  res.json({ success: true, message: 'Utilizador atualizado com sucesso.', user: updated });
});

// Listar Perfis e Permissões
app.get('/api/roles', authenticateToken, (req, res) => {
  const roles = db.getRoles();
  const permissions = db.getPermissions();
  res.json({ success: true, roles, permissions });
});

// Atualizar Permissões de um Perfil (RBAC Matrix)
app.put('/api/roles/:id/permissions', authenticateToken, checkPermission('rbac:manage'), (req, res) => {
  const { id } = req.params;
  const { permission_ids } = req.body;

  if (!Array.isArray(permission_ids)) {
    return res.status(400).json({ success: false, message: 'Instrução inválida para permissões.' });
  }

  const role = db.updateRolePermissions(id, permission_ids);

  db.addAuditLog({
    user_id: req.user.id,
    user_name: req.user.name,
    user_role: req.user.role_name,
    action: 'MATRIZ_RBAC_ALTERADA',
    entity: 'Perfil RBAC',
    entity_id: String(id),
    details: `Matriz de permissões do perfil '${role.name}' alterada (${permission_ids.length} permissões).`,
    ip_address: getClientIp(req),
    success: true
  });

  res.json({ success: true, message: 'Matriz de permissões atualizada com sucesso.', role });
});

// ==========================================
// 3. GESTÃO DE EXPEDIENTES
// ==========================================

// Listar Expedientes
app.get('/api/expedientes', authenticateToken, checkPermission('expediente:read'), (req, res) => {
  const list = db.getExpedientes(req.user.role_code, req.user.permissions);
  res.json({ success: true, expedientes: list });
});

// Detalhes de um Expediente
app.get('/api/expedientes/:id', authenticateToken, checkPermission('expediente:read'), (req, res) => {
  const { id } = req.params;
  const expedient = db.getExpedientById(id);

  if (!expedient) {
    return res.status(404).json({ success: false, message: 'Expediente não encontrado.' });
  }

  // Check confidentiality
  if (expedient.confidentiality === 'Confidencial' &&
      req.user.role_code !== 'admin' &&
      req.user.role_code !== 'gestor' &&
      !req.user.permissions.includes('expediente:read_confidential')) {
    return res.status(403).json({ success: false, message: 'Este expediente é confidencial e exige permissão especial.' });
  }

  res.json({ success: true, expedient });
});

// Registar / Criar Novo Expediente
app.post('/api/expedientes', authenticateToken, checkPermission('expediente:create'), (req, res) => {
  const { title, applicant, subject, priority, confidentiality, current_department } = req.body;

  if (!title || !applicant || !subject) {
    return res.status(400).json({ success: false, message: 'Preencha o título, requerente e assunto.' });
  }

  const newExp = db.createExpedient(
    { title, applicant, subject, priority, confidentiality, current_department },
    req.user
  );

  db.addAuditLog({
    user_id: req.user.id,
    user_name: req.user.name,
    user_role: req.user.role_name,
    action: 'EXPEDIENTE_REGISTADO',
    entity: 'Expediente',
    entity_id: newExp.nup,
    details: `Novo expediente registado: '${newExp.nup} - ${newExp.title}' [${newExp.confidentiality}]`,
    ip_address: getClientIp(req),
    success: true
  });

  res.json({ success: true, message: 'Expediente registado com sucesso.', expedient: newExp });
});

// Tramitar / Encaminhar Expediente
app.post('/api/expedientes/:id/tramitar', authenticateToken, checkPermission('expediente:tramitar'), (req, res) => {
  const { id } = req.params;
  const { to_department, opinion } = req.body;

  if (!to_department || !opinion) {
    return res.status(400).json({ success: false, message: 'Selecione o departamento de destino e insira o parecer/instruções.' });
  }

  const exp = db.getExpedientById(id);
  if (!exp) {
    return res.status(404).json({ success: false, message: 'Expediente não encontrado.' });
  }

  if (exp.status === 'Arquivado') {
    return res.status(400).json({ success: false, message: 'Não é possível tramitar um expediente arquivado.' });
  }

  const tram = db.addTramitacao(id, { to_department, opinion }, req.user);

  db.addAuditLog({
    user_id: req.user.id,
    user_name: req.user.name,
    user_role: req.user.role_name,
    action: 'EXPEDIENTE_TRAMITADO',
    entity: 'Expediente',
    entity_id: exp.nup,
    details: `Tramitado de '${exp.current_department}' para '${to_department}'. Parecer: ${opinion}`,
    ip_address: getClientIp(req),
    success: true
  });

  res.json({ success: true, message: 'Expediente tramitado com sucesso.', tramitacao: tram });
});

// Emitir Despacho Decisório
app.post('/api/expedientes/:id/despachar', authenticateToken, checkPermission('expediente:despachar'), (req, res) => {
  const { id } = req.params;
  const { decision, justification } = req.body;

  if (!decision || !justification) {
    return res.status(400).json({ success: false, message: 'Selecione a decisão (Deferido/Indeferido/etc) e a fundamentação.' });
  }

  const exp = db.getExpedientById(id);
  if (!exp) {
    return res.status(404).json({ success: false, message: 'Expediente não encontrado.' });
  }

  if (exp.status === 'Arquivado') {
    return res.status(400).json({ success: false, message: 'Expediente já se encontra arquivado.' });
  }

  const desp = db.addDespacho(id, { decision, justification }, req.user);

  db.addAuditLog({
    user_id: req.user.id,
    user_name: req.user.name,
    user_role: req.user.role_name,
    action: 'DESPACHO_EMITIDO',
    entity: 'Expediente',
    entity_id: exp.nup,
    details: `Despacho emitido: '${decision}'. Fundamentação: ${justification}`,
    ip_address: getClientIp(req),
    success: true
  });

  res.json({ success: true, message: 'Despacho emitido com sucesso.', despacho: desp });
});

// Arquivar Expediente
app.post('/api/expedientes/:id/arquivar', authenticateToken, checkPermission('expediente:arquivar'), (req, res) => {
  const { id } = req.params;
  const { location } = req.body;

  const exp = db.getExpedientById(id);
  if (!exp) {
    return res.status(404).json({ success: false, message: 'Expediente não encontrado.' });
  }

  const updated = db.arquivarExpedient(id, { location }, req.user);

  db.addAuditLog({
    user_id: req.user.id,
    user_name: req.user.name,
    user_role: req.user.role_name,
    action: 'EXPEDIENTE_ARQUIVADO',
    entity: 'Expediente',
    entity_id: exp.nup,
    details: `Expediente arquivado com sucesso na localização: '${updated.archived_location}'`,
    ip_address: getClientIp(req),
    success: true
  });

  res.json({ success: true, message: 'Expediente arquivado com sucesso.', expedient: updated });
});

// ==========================================
// 4. AUDITORIA E RELATÓRIOS
// ==========================================

// Logs de Auditoria
app.get('/api/audit-logs', authenticateToken, checkPermission('audit:view'), (req, res) => {
  const logs = db.getAuditLogs();
  res.json({ success: true, logs });
});

// Limpar Logs de Auditoria
app.delete('/api/audit-logs', authenticateToken, checkPermission('audit:view'), (req, res) => {
  db.clearAuditLogs();
  db.addAuditLog({
    user_id: req.user.id,
    user_name: req.user.name,
    user_role: req.user.role_name,
    action: 'AUDITORIA_LIMPA',
    entity: 'Auditoria',
    entity_id: 'SYSTEM',
    details: 'Todos os registos de auditoria anteriores foram limpos pelo utilizador.',
    ip_address: getClientIp(req),
    success: true
  });
  res.json({ success: true, message: 'Registos de auditoria limpos com sucesso.' });
});

// Dashboard Estatístico
app.get('/api/stats', authenticateToken, (req, res) => {
  const stats = db.getDashboardStats();
  res.json({ success: true, stats });
});

// Reinicializar dados de demonstração (Admin only)
app.post('/api/reset-demo', authenticateToken, (req, res) => {
  if (req.user.role_code !== 'admin') {
    return res.status(403).json({ success: false, message: 'Apenas Administradores podem reinicializar os dados.' });
  }
  db.resetFullDatabase();
  res.json({ success: true, message: 'Dados de demonstração reinicializados com sucesso!' });
});

// Fallback to SPA index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  SGE-RBAC - Sistema de Gestão de Expedientes  `);
  console.log(`  Servidor em execução em: http://localhost:${PORT}  `);
  console.log(`====================================================`);
});
