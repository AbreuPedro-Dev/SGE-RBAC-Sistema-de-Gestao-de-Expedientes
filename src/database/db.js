const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../data/database.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initial Seeds
function getInitialData() {
  const passwordHashAdmin = bcrypt.hashSync('Admin123!', 10);
  const passwordHashGestor = bcrypt.hashSync('Gestor123!', 10);
  const passwordHashTecnico = bcrypt.hashSync('Tecnico123!', 10);
  const passwordHashLeitor = bcrypt.hashSync('Leitor123!', 10);

  return {
    roles: [
      {
        id: 1,
        code: 'admin',
        name: 'Administrador do Sistema',
        description: 'Acesso total, gestão de utilizadores, RBAC e logs de auditoria',
        color: '#ef4444'
      },
      {
        id: 2,
        code: 'gestor',
        name: 'Chefe de Secretaria / Gestor',
        description: 'Criação de expedientes, emissão de despachos e arquivamento',
        color: '#f59e0b'
      },
      {
        id: 3,
        code: 'tecnico',
        name: 'Técnico Tramitador',
        description: 'Instrução de processos, emissão de pareceres e tramitação',
        color: '#3b82f6'
      },
      {
        id: 4,
        code: 'leitor',
        name: 'Consultor / Leitor',
        description: 'Acesso de leitura para acompanhamento de expedientes públicos',
        color: '#10b981'
      }
    ],
    permissions: [
      { id: 1, code: 'users:manage', name: 'Gerir Utilizadores', category: 'Administração' },
      { id: 2, code: 'rbac:manage', name: 'Gerir Matriz RBAC', category: 'Administração' },
      { id: 3, code: 'audit:view', name: 'Visualizar Auditoria', category: 'Auditoria' },
      { id: 4, code: 'expediente:create', name: 'Registar Expediente', category: 'Expedientes' },
      { id: 5, code: 'expediente:read', name: 'Consultar Expedientes', category: 'Expedientes' },
      { id: 6, code: 'expediente:tramitar', name: 'Tramitar / Encaminhar', category: 'Expedientes' },
      { id: 7, code: 'expediente:despachar', name: 'Emitir Despacho', category: 'Expedientes' },
      { id: 8, code: 'expediente:arquivar', name: 'Arquivar Expediente', category: 'Expedientes' },
      { id: 9, code: 'expediente:read_confidential', name: 'Ver Expedientes Confidenciais', category: 'Expedientes' },
      { id: 10, code: 'reports:export', name: 'Exportar Relatórios', category: 'Relatórios' }
    ],
    role_permissions: [
      // Admin -> All permissions
      { role_id: 1, permission_id: 1 },
      { role_id: 1, permission_id: 2 },
      { role_id: 1, permission_id: 3 },
      { role_id: 1, permission_id: 4 },
      { role_id: 1, permission_id: 5 },
      { role_id: 1, permission_id: 6 },
      { role_id: 1, permission_id: 7 },
      { role_id: 1, permission_id: 8 },
      { role_id: 1, permission_id: 9 },
      { role_id: 1, permission_id: 10 },
      // Gestor -> Expedientes complete, reports, audit, confidential
      { role_id: 2, permission_id: 3 },
      { role_id: 2, permission_id: 4 },
      { role_id: 2, permission_id: 5 },
      { role_id: 2, permission_id: 6 },
      { role_id: 2, permission_id: 7 },
      { role_id: 2, permission_id: 8 },
      { role_id: 2, permission_id: 9 },
      { role_id: 2, permission_id: 10 },
      // Técnico -> Read, Tramitar, Create
      { role_id: 3, permission_id: 4 },
      { role_id: 3, permission_id: 5 },
      { role_id: 3, permission_id: 6 },
      // Leitor -> Read public only
      { role_id: 4, permission_id: 5 }
    ],
    users: [
      {
        id: 1,
        name: 'Eng. Amilcar Silva (Admin)',
        email: 'admin@sge.gov.mz',
        password: passwordHashAdmin,
        role_id: 1,
        department: 'Tecnologias de Informação',
        active: true,
        created_at: '2026-08-13T08:00:00.000Z'
      },
      {
        id: 2,
        name: 'Dra. Maria Abreu (Gestora)',
        email: 'gestor@sge.gov.mz',
        password: passwordHashGestor,
        role_id: 2,
        department: 'Secretaria-Geral',
        active: true,
        created_at: '2026-08-13T09:30:00.000Z'
      },
      {
        id: 3,
        name: 'Dr. Pedro Macamo (Técnico)',
        email: 'tecnico@sge.gov.mz',
        password: passwordHashTecnico,
        role_id: 3,
        department: 'Departamento Jurídico',
        active: true,
        created_at: '2026-08-13T10:15:00.000Z'
      },
      {
        id: 4,
        name: 'Sr. Tomas Sitoe (Leitor)',
        email: 'leitor@sge.gov.mz',
        password: passwordHashLeitor,
        role_id: 4,
        department: 'Atendimento ao Público',
        active: true,
        created_at: '2026-08-13T11:00:00.000Z'
      }
    ],
    expedientes: [
      {
        id: 1,
        nup: 'EXP-2026-0001',
        title: 'Manutenção de Infraestruturas Tecnológicas do Edifício Central',
        applicant: 'Direção de Redes e Sistemas',
        subject: 'Aquisição e reparação de servidores de dados e no-breaks',
        priority: 'Alta',
        confidentiality: 'Público',
        current_department: 'Departamento Jurídico',
        status: 'Em Tramitação',
        created_by: 2,
        created_by_name: 'Dra. Maria Abreu (Gestora)',
        created_at: '2026-08-16T09:00:00.000Z',
        updated_at: '2026-08-17T14:30:00.000Z',
        archived_location: null
      },
      {
        id: 2,
        nup: 'EXP-2026-0002',
        title: 'Solicitação de Aquisição de Equipamento Informático para a Secretaria',
        applicant: 'Secretaria-Geral',
        subject: 'Compra de 5 computadores desktop e 2 impressoras multifuncionais',
        priority: 'Média',
        confidentiality: 'Público',
        current_department: 'Secretaria-Geral',
        status: 'Deferido',
        created_by: 2,
        created_by_name: 'Dra. Maria Abreu (Gestora)',
        created_at: '2026-08-13T10:00:00.000Z',
        updated_at: '2026-08-15T16:00:00.000Z',
        archived_location: null
      },
      {
        id: 3,
        nup: 'EXP-2026-0003',
        title: 'Reestruturação Organizacional e Ajustes Salariais RH 2026',
        applicant: 'Direção de Recursos Humanos',
        subject: 'Proposta de adequação da grelha salarial dos quadros técnicos',
        priority: 'Urgente',
        confidentiality: 'Confidencial',
        current_department: 'Secretaria-Geral',
        status: 'Em Tramitação',
        created_by: 2,
        created_by_name: 'Dra. Maria Abreu (Gestora)',
        created_at: '2026-08-17T11:20:00.000Z',
        updated_at: '2026-08-18T08:45:00.000Z',
        archived_location: null
      },
      {
        id: 4,
        nup: 'EXP-2026-0004',
        title: 'Relatório Final de Auditoria Financeira do Exercício 2025',
        applicant: 'Inspeção Geral de Finanças',
        subject: 'Resultado da verificação de contas e reconciliação bancária',
        priority: 'Alta',
        confidentiality: 'Reservado',
        current_department: 'Arquivo Geral',
        status: 'Arquivado',
        created_by: 1,
        created_by_name: 'Eng. Amilcar Silva (Admin)',
        created_at: '2026-08-13T08:30:00.000Z',
        updated_at: '2026-08-14T17:00:00.000Z',
        archived_location: 'Armário A3, Prateleira 2, Pasta 2025-FIN'
      }
    ],
    tramitacoes: [
      {
        id: 1,
        expedient_id: 1,
        from_department: 'Secretaria-Geral',
        to_department: 'Departamento Jurídico',
        user_id: 2,
        user_name: 'Dra. Maria Abreu (Gestora)',
        user_role: 'Chefe de Secretaria / Gestor',
        opinion: 'Encaminhado para verificação da conformidade com a Lei dos Contratos Públicos.',
        status_transition: 'Entrada -> Em Tramitação',
        created_at: '2026-08-17T14:30:00.000Z'
      },
      {
        id: 2,
        expedient_id: 2,
        from_department: 'Secretaria-Geral',
        to_department: 'Direção de Finanças',
        user_id: 2,
        user_name: 'Dra. Maria Abreu (Gestora)',
        user_role: 'Chefe de Secretaria / Gestor',
        opinion: 'Solicita-se informação sobre disponibilidade orçamentual para aquisição.',
        status_transition: 'Entrada -> Em Tramitação',
        created_at: '2026-08-14T11:00:00.000Z'
      },
      {
        id: 3,
        expedient_id: 2,
        from_department: 'Direção de Finanças',
        to_department: 'Secretaria-Geral',
        user_id: 3,
        user_name: 'Dr. Pedro Macamo (Técnico)',
        user_role: 'Técnico Tramitador',
        opinion: 'Parecer Favorável. Cabimento orçamentual confirmado no Rubro 02.01.04.',
        status_transition: 'Em Tramitação -> Aguardando Despacho',
        created_at: '2026-08-15T09:15:00.000Z'
      }
    ],
    despachos: [
      {
        id: 1,
        expedient_id: 2,
        user_id: 2,
        user_name: 'Dra. Maria Abreu (Gestora)',
        user_role: 'Chefe de Secretaria / Gestor',
        decision: 'Deferido',
        justification: 'Autorizada a aquisição conforme parecer técnico e cabimento financeiro.',
        created_at: '2026-08-15T16:00:00.000Z'
      }
    ],
    audit_logs: [
      {
        id: 1,
        timestamp: '2026-08-13T08:00:00.000Z',
        user_id: 1,
        user_name: 'Eng. Amilcar Silva (Admin)',
        user_role: 'Administrador do Sistema',
        action: 'SISTEMA_INICIALIZADO',
        entity: 'Sistema',
        entity_id: 'SYSTEM',
        details: 'Base de dados inicializada com sucesso com matriz RBAC e utilizadores iniciais.',
        ip_address: '127.0.0.1',
        success: true
      },
      {
        id: 2,
        timestamp: '2026-08-13T08:15:00.000Z',
        user_id: 1,
        user_name: 'Eng. Amilcar Silva (Admin)',
        user_role: 'Administrador do Sistema',
        action: 'LOGIN_SUCESSO',
        entity: 'Autenticação',
        entity_id: '1',
        details: 'Sessão iniciada como Administrador do Sistema.',
        ip_address: '127.0.0.1',
        success: true
      },
      {
        id: 3,
        timestamp: '2026-08-13T09:30:00.000Z',
        user_id: 1,
        user_name: 'Eng. Amilcar Silva (Admin)',
        user_role: 'Administrador do Sistema',
        action: 'UTILIZADOR_CRIADO',
        entity: 'Utilizador',
        entity_id: '2',
        details: 'Registo da conta de Dra. Maria Abreu com o perfil Chefe de Secretaria / Gestor.',
        ip_address: '127.0.0.1',
        success: true
      },
      {
        id: 4,
        timestamp: '2026-08-13T10:00:00.000Z',
        user_id: 2,
        user_name: 'Dra. Maria Abreu (Gestora)',
        user_role: 'Chefe de Secretaria / Gestor',
        action: 'EXPEDIENTE_CRIADO',
        entity: 'Expediente',
        entity_id: 'EXP-2026-0002',
        details: 'Novo expediente registado: Solicitação de Aquisição de Equipamento Informático.',
        ip_address: '192.168.1.45',
        success: true
      },
      {
        id: 5,
        timestamp: '2026-08-14T11:00:00.000Z',
        user_id: 2,
        user_name: 'Dra. Maria Abreu (Gestora)',
        user_role: 'Chefe de Secretaria / Gestor',
        action: 'TRAMITACAO_EMITIDA',
        entity: 'Expediente',
        entity_id: 'EXP-2026-0002',
        details: 'Tramitado de Secretaria-Geral para Direção de Finanças (Cabimento orçamentual).',
        ip_address: '192.168.1.45',
        success: true
      },
      {
        id: 6,
        timestamp: '2026-08-15T09:15:00.000Z',
        user_id: 3,
        user_name: 'Dr. Pedro Macamo (Técnico)',
        user_role: 'Técnico Tramitador',
        action: 'TRAMITACAO_EMITIDA',
        entity: 'Expediente',
        entity_id: 'EXP-2026-0002',
        details: 'Parecer técnico favorável registado no Rubro 02.01.04.',
        ip_address: '192.168.1.50',
        success: true
      },
      {
        id: 7,
        timestamp: '2026-08-15T16:00:00.000Z',
        user_id: 2,
        user_name: 'Dra. Maria Abreu (Gestora)',
        user_role: 'Chefe de Secretaria / Gestor',
        action: 'DESPACHO_EMITIDO',
        entity: 'Expediente',
        entity_id: 'EXP-2026-0002',
        details: 'Emitido Despacho Deferido para a aquisição de computadores e multifuncionais.',
        ip_address: '192.168.1.45',
        success: true
      },
      {
        id: 8,
        timestamp: '2026-08-14T17:00:00.000Z',
        user_id: 1,
        user_name: 'Eng. Amilcar Silva (Admin)',
        user_role: 'Administrador do Sistema',
        action: 'EXPEDIENTE_ARQUIVADO',
        entity: 'Expediente',
        entity_id: 'EXP-2026-0004',
        details: 'Processo arquivado fisicamente em Armário A3, Prateleira 2, Pasta 2025-FIN.',
        ip_address: '127.0.0.1',
        success: true
      },
      {
        id: 9,
        timestamp: '2026-08-16T09:00:00.000Z',
        user_id: 2,
        user_name: 'Dra. Maria Abreu (Gestora)',
        user_role: 'Chefe de Secretaria / Gestor',
        action: 'EXPEDIENTE_CRIADO',
        entity: 'Expediente',
        entity_id: 'EXP-2026-0001',
        details: 'Novo expediente registado: Manutenção de Infraestruturas Tecnológicas.',
        ip_address: '192.168.1.45',
        success: true
      },
      {
        id: 10,
        timestamp: '2026-08-17T14:30:00.000Z',
        user_id: 2,
        user_name: 'Dra. Maria Abreu (Gestora)',
        user_role: 'Chefe de Secretaria / Gestor',
        action: 'TRAMITACAO_EMITIDA',
        entity: 'Expediente',
        entity_id: 'EXP-2026-0001',
        details: 'Encaminhado para o Departamento Jurídico para verificação de conformidade legal.',
        ip_address: '192.168.1.45',
        success: true
      },
      {
        id: 11,
        timestamp: '2026-08-17T11:20:00.000Z',
        user_id: 2,
        user_name: 'Dra. Maria Abreu (Gestora)',
        user_role: 'Chefe de Secretaria / Gestor',
        action: 'EXPEDIENTE_CRIADO',
        entity: 'Expediente',
        entity_id: 'EXP-2026-0003',
        details: 'Novo expediente confidencial registado com prioridade Urgente (RH 2026).',
        ip_address: '192.168.1.45',
        success: true
      },
      {
        id: 12,
        timestamp: '2026-08-18T08:10:00.000Z',
        user_id: 1,
        user_name: 'Eng. Amilcar Silva (Admin)',
        user_role: 'Administrador do Sistema',
        action: 'MATRIZ_RBAC_ATUALIZADA',
        entity: 'Permissão',
        entity_id: 'rbac:manage',
        details: 'Atualizada a matriz de permissões para o perfil Técnico Tramitador.',
        ip_address: '127.0.0.1',
        success: true
      }
    ]
  };
}


class Database {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_PATH)) {
      this.data = getInitialData();
      this.save();
    } else {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.data = JSON.parse(raw);
        const initial = getInitialData();
        let changed = false;

        if (!this.data.roles || !Array.isArray(this.data.roles) || this.data.roles.length === 0) { this.data.roles = initial.roles; changed = true; }
        if (!this.data.permissions || !Array.isArray(this.data.permissions) || this.data.permissions.length === 0) { this.data.permissions = initial.permissions; changed = true; }
        if (!this.data.role_permissions || !Array.isArray(this.data.role_permissions) || this.data.role_permissions.length === 0) { this.data.role_permissions = initial.role_permissions; changed = true; }
        if (!this.data.users || !Array.isArray(this.data.users) || this.data.users.length === 0) { this.data.users = initial.users; changed = true; }
        if (!this.data.expedientes || !Array.isArray(this.data.expedientes) || this.data.expedientes.length === 0) { this.data.expedientes = initial.expedientes; changed = true; }
        if (!this.data.tramitacoes || !Array.isArray(this.data.tramitacoes)) { this.data.tramitacoes = initial.tramitacoes; changed = true; }
        if (!this.data.despachos || !Array.isArray(this.data.despachos)) { this.data.despachos = initial.despachos; changed = true; }
        if (!this.data.audit_logs || !Array.isArray(this.data.audit_logs) || this.data.audit_logs.length === 0) { this.data.audit_logs = initial.audit_logs; changed = true; }

        if (changed) this.save();
      } catch (err) {
        console.error('Erro ao ler base de dados, reinicializando...', err);
        this.data = getInitialData();
        this.save();
      }
    }
  }

  save() {
    fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
  }

  // Users
  getUsers() {
    return this.data.users.map(u => {
      const userWithoutPass = { ...u };
      delete userWithoutPass.password;
      const role = this.data.roles.find(r => r.id === Number(u.role_id));
      return { ...userWithoutPass, role_name: role ? role.name : 'N/A', role_code: role ? role.code : 'N/A' };
    });
  }

  getUserById(id) {
    const userId = Number(id);
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;
    const userWithoutPass = { ...user };
    delete userWithoutPass.password;
    const role = this.data.roles.find(r => r.id === Number(user.role_id));
    return { ...userWithoutPass, role_name: role ? role.name : 'N/A', role_code: role ? role.code : 'N/A' };
  }

  getUserByEmail(email) {
    if (!email) return null;
    return this.data.users.find(u => u.email && u.email.toLowerCase() === String(email).toLowerCase());
  }

  createUser(userData) {
    const id = this.data.users.length ? Math.max(...this.data.users.map(u => u.id)) + 1 : 1;
    const newUser = {
      id,
      name: userData.name,
      email: userData.email,
      password: bcrypt.hashSync(userData.password, 10),
      role_id: Number(userData.role_id),
      department: userData.department || 'Geral',
      active: true,
      created_at: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();
    return this.getUserById(id);
  }

  updateUser(id, userData) {
    const userIndex = this.data.users.findIndex(u => u.id === Number(id));
    if (userIndex === -1) return null;

    if (userData.name) this.data.users[userIndex].name = userData.name;
    if (userData.email) this.data.users[userIndex].email = userData.email;
    if (userData.role_id) this.data.users[userIndex].role_id = Number(userData.role_id);
    if (userData.department) this.data.users[userIndex].department = userData.department;
    if (userData.active !== undefined) this.data.users[userIndex].active = Boolean(userData.active);
    if (userData.password) this.data.users[userIndex].password = bcrypt.hashSync(userData.password, 10);

    this.save();
    return this.getUserById(Number(id));
  }

  // Roles & Permissions
  getRoles() {
    return this.data.roles.map(role => {
      const rolePerms = this.data.role_permissions
        .filter(rp => rp.role_id === role.id)
        .map(rp => this.data.permissions.find(p => p.id === rp.permission_id))
        .filter(Boolean);
      return { ...role, permissions: rolePerms };
    });
  }

  getPermissions() {
    return this.data.permissions;
  }

  getUserPermissions(role_id) {
    const permIds = this.data.role_permissions
      .filter(rp => rp.role_id === Number(role_id))
      .map(rp => rp.permission_id);
    return this.data.permissions.filter(p => permIds.includes(p.id)).map(p => p.code);
  }

  updateRolePermissions(role_id, permission_ids) {
    const roleId = Number(role_id);
    // Filter out existing
    this.data.role_permissions = this.data.role_permissions.filter(rp => rp.role_id !== roleId);
    permission_ids.forEach(pId => {
      this.data.role_permissions.push({ role_id: roleId, permission_id: Number(pId) });
    });
    this.save();
    return this.getRoles().find(r => r.id === roleId);
  }

  // Expedientes
  getExpedientes(userRoleCode, userPerms = []) {
    if (!this.data.expedientes || !Array.isArray(this.data.expedientes) || this.data.expedientes.length === 0) {
      const initial = getInitialData();
      this.data.expedientes = initial.expedientes;
      this.data.tramitacoes = initial.tramitacoes;
      this.data.despachos = initial.despachos;
      this.save();
    }

    let list = [...this.data.expedientes];

    // Filter confidentiality if user lacks permission
    const canViewConfidential = userPerms.includes('expediente:read_confidential') || userRoleCode === 'admin' || userRoleCode === 'gestor';
    if (!canViewConfidential) {
      list = list.filter(exp => exp.confidentiality !== 'Confidencial');
    }

    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  getExpedientById(id) {
    const exp = this.data.expedientes.find(e => e.id === Number(id));
    if (!exp) return null;

    const tramitacoes = this.data.tramitacoes
      .filter(t => t.expedient_id === Number(id))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const despachos = this.data.despachos
      .filter(d => d.expedient_id === Number(id))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return { ...exp, tramitacoes, despachos };
  }

  createExpedient(expData, user) {
    const id = this.data.expedientes.length ? Math.max(...this.data.expedientes.map(e => e.id)) + 1 : 1;
    const year = new Date().getFullYear();
    const sequence = String(id).padStart(4, '0');
    const nup = `EXP-${year}-${sequence}`;

    const newExp = {
      id,
      nup,
      title: expData.title,
      applicant: expData.applicant,
      subject: expData.subject,
      priority: expData.priority || 'Média',
      confidentiality: expData.confidentiality || 'Público',
      current_department: expData.current_department || user.department || 'Secretaria-Geral',
      status: 'Entrada',
      created_by: user.id,
      created_by_name: user.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_location: null
    };

    this.data.expedientes.push(newExp);
    this.save();
    return newExp;
  }

  addTramitacao(expedient_id, tramData, user) {
    const expIndex = this.data.expedientes.findIndex(e => e.id === Number(expedient_id));
    if (expIndex === -1) return null;

    const exp = this.data.expedientes[expIndex];
    const fromDept = exp.current_department;
    const toDept = tramData.to_department;

    const tramId = this.data.tramitacoes.length ? Math.max(...this.data.tramitacoes.map(t => t.id)) + 1 : 1;
    const newTram = {
      id: tramId,
      expedient_id: Number(expedient_id),
      from_department: fromDept,
      to_department: toDept,
      user_id: user.id,
      user_name: user.name,
      user_role: user.role_name,
      opinion: tramData.opinion,
      status_transition: `${exp.status} -> Em Tramitação`,
      created_at: new Date().toISOString()
    };

    this.data.tramitacoes.push(newTram);
    this.data.expedientes[expIndex].current_department = toDept;
    this.data.expedientes[expIndex].status = 'Em Tramitação';
    this.data.expedientes[expIndex].updated_at = new Date().toISOString();

    this.save();
    return newTram;
  }

  addDespacho(expedient_id, despachoData, user) {
    const expIndex = this.data.expedientes.findIndex(e => e.id === Number(expedient_id));
    if (expIndex === -1) return null;

    const despId = this.data.despachos.length ? Math.max(...this.data.despachos.map(d => d.id)) + 1 : 1;
    const newDesp = {
      id: despId,
      expedient_id: Number(expedient_id),
      user_id: user.id,
      user_name: user.name,
      user_role: user.role_name,
      decision: despachoData.decision, // 'Deferido', 'Indeferido', 'Informação Adicional'
      justification: despachoData.justification,
      created_at: new Date().toISOString()
    };

    this.data.despachos.push(newDesp);
    this.data.expedientes[expIndex].status = despachoData.decision;
    this.data.expedientes[expIndex].updated_at = new Date().toISOString();

    this.save();
    return newDesp;
  }

  arquivarExpedient(expedient_id, archiveData, user) {
    const expIndex = this.data.expedientes.findIndex(e => e.id === Number(expedient_id));
    if (expIndex === -1) return null;

    this.data.expedientes[expIndex].status = 'Arquivado';
    this.data.expedientes[expIndex].current_department = 'Arquivo Geral';
    this.data.expedientes[expIndex].archived_location = archiveData.location || 'Arquivo Geral, Categoria Padrão';
    this.data.expedientes[expIndex].updated_at = new Date().toISOString();

    this.save();
    return this.data.expedientes[expIndex];
  }

  // Audit Logs
  addAuditLog({ user_id, user_name, user_role, action, entity, entity_id, details, ip_address = '127.0.0.1', success = true }) {
    const id = this.data.audit_logs.length ? Math.max(...this.data.audit_logs.map(a => a.id)) + 1 : 1;
    const log = {
      id,
      timestamp: new Date().toISOString(),
      user_id: user_id || null,
      user_name: user_name || 'Anónimo / Sistema',
      user_role: user_role || 'N/A',
      action,
      entity,
      entity_id: String(entity_id || 'SYSTEM'),
      details,
      ip_address,
      success: Boolean(success)
    };
    this.data.audit_logs.push(log);
    this.save();
    return log;
  }

  getAuditLogs() {
    if (!this.data.audit_logs || !Array.isArray(this.data.audit_logs) || this.data.audit_logs.length === 0) {
      this.data.audit_logs = getInitialData().audit_logs;
      this.save();
    }
    return [...this.data.audit_logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  clearAuditLogs() {
    this.data.audit_logs = [];
    this.save();
    return true;
  }

  resetSampleAuditLogs() {
    this.data.audit_logs = getInitialData().audit_logs;
    this.save();
    return this.data.audit_logs;
  }

  resetFullDatabase() {
    this.data = getInitialData();
    this.save();
    return this.data;
  }

  // Stats for Dashboard
  getDashboardStats() {
    const totalExpedientes = this.data.expedientes.length;
    const emTramitacao = this.data.expedientes.filter(e => e.status === 'Em Tramitação' || e.status === 'Entrada').length;
    const deferidos = this.data.expedientes.filter(e => e.status === 'Deferido').length;
    const indeferidos = this.data.expedientes.filter(e => e.status === 'Indeferido').length;
    const arquivados = this.data.expedientes.filter(e => e.status === 'Arquivado').length;
    const urgentes = this.data.expedientes.filter(e => e.priority === 'Urgente' || e.priority === 'Alta').length;

    const totalUsers = this.data.users.length;
    const activeUsers = this.data.users.filter(u => u.active).length;

    // Expedientes by status
    const byStatus = {
      'Entrada': this.data.expedientes.filter(e => e.status === 'Entrada').length,
      'Em Tramitação': this.data.expedientes.filter(e => e.status === 'Em Tramitação').length,
      'Deferido': deferidos,
      'Indeferido': indeferidos,
      'Arquivado': arquivados
    };

    // Expedientes by priority
    const byPriority = {
      'Baixa': this.data.expedientes.filter(e => e.priority === 'Baixa').length,
      'Média': this.data.expedientes.filter(e => e.priority === 'Média').length,
      'Alta': this.data.expedientes.filter(e => e.priority === 'Alta').length,
      'Urgente': this.data.expedientes.filter(e => e.priority === 'Urgente').length
    };

    return {
      totalExpedientes,
      emTramitacao,
      deferidos,
      indeferidos,
      arquivados,
      urgentes,
      totalUsers,
      activeUsers,
      byStatus,
      byPriority
    };
  }
}

module.exports = new Database();
