/**
 * @file db.js
 * @description Módulo de Persistência em Ficheiro JSON e Camada de Acesso a Dados do SGE-RBAC.
 * Gerencia a leitura, escrita, sementeira (seeds) de dados e operações CRUD para utilizadores, perfis,
 * permissões RBAC, expedientes, tramitações, despachos e logs de auditoria.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Caminho absoluto para o ficheiro de base de dados JSON
const CAMINHO_BASE_DADOS = path.join(__dirname, '../../data/database.json');

// Garantir a existência do diretório 'data' onde a base de dados em ficheiro reside
const diretorioDados = path.join(__dirname, '../../data');
if (!fs.existsSync(diretorioDados)) {
  fs.mkdirSync(diretorioDados, { recursive: true });
}

/**
 * Gera a estrutura e os dados iniciais de demonstração (seeds) do sistema.
 * Cria papéis por defeito, matriz de permissões RBAC, utilizadores padrão com palavras-passe encriptadas,
 * expedientes de exemplo, tramitações, despachos e registos de auditoria iniciais.
 * 
 * @returns {Object} Estrutura completa de dados iniciais do sistema
 */
function getInitialData() {
  // Encriptação das palavras-passe padrão utilizando bcrypt com sal de 10 rondas
  const hashPalavraPasseAdmin = bcrypt.hashSync('Admin123!', 10);
  const hashPalavraPasseGestor = bcrypt.hashSync('Gestor123!', 10);
  const hashPalavraPasseTecnico = bcrypt.hashSync('Tecnico123!', 10);
  const hashPalavraPasseLeitor = bcrypt.hashSync('Leitor123!', 10);

  return {
    // Perfis (Roles) do Sistema com código, nome, descrição e cor identificadora
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
    // Catálogo de Permissões individuais do sistema organizadas por categoria
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
    // Matriz de Associação entre Perfis e Permissões (Role-Permissions)
    role_permissions: [
      // Administrador -> Possui todas as permissões (IDs 1 a 10)
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
      // Gestor -> Gestão completa de expedientes, relatórios, auditoria e confidenciais
      { role_id: 2, permission_id: 3 },
      { role_id: 2, permission_id: 4 },
      { role_id: 2, permission_id: 5 },
      { role_id: 2, permission_id: 6 },
      { role_id: 2, permission_id: 7 },
      { role_id: 2, permission_id: 8 },
      { role_id: 2, permission_id: 9 },
      { role_id: 2, permission_id: 10 },
      // Técnico -> Leitura, Tramitação e Criação de expedientes
      { role_id: 3, permission_id: 4 },
      { role_id: 3, permission_id: 5 },
      { role_id: 3, permission_id: 6 },
      // Leitor -> Acesso exclusivo de leitura para expedientes públicos
      { role_id: 4, permission_id: 5 }
    ],
    // Lista inicial de utilizadores de teste do sistema
    users: [
      {
        id: 1,
        name: 'Eng. Amilcar Silva (Admin)',
        email: 'admin@sge.gov.mz',
        password: hashPalavraPasseAdmin,
        role_id: 1,
        department: 'Tecnologias de Informação',
        active: true,
        created_at: '2026-08-13T08:00:00.000Z'
      },
      {
        id: 2,
        name: 'Dra. Maria Abreu (Gestora)',
        email: 'gestor@sge.gov.mz',
        password: hashPalavraPasseGestor,
        role_id: 2,
        department: 'Secretaria-Geral',
        active: true,
        created_at: '2026-08-13T09:30:00.000Z'
      },
      {
        id: 3,
        name: 'Dr. Pedro Macamo (Técnico)',
        email: 'tecnico@sge.gov.mz',
        password: hashPalavraPasseTecnico,
        role_id: 3,
        department: 'Departamento Jurídico',
        active: true,
        created_at: '2026-08-13T10:15:00.000Z'
      },
      {
        id: 4,
        name: 'Sr. Tomas Sitoe (Leitor)',
        email: 'leitor@sge.gov.mz',
        password: hashPalavraPasseLeitor,
        role_id: 4,
        department: 'Atendimento ao Público',
        active: true,
        created_at: '2026-08-13T11:00:00.000Z'
      }
    ],
    // Lista inicial de expedientes (processos administrativos)
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
    // Histórico de tramitações (encaminhamento entre departamentos)
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
    // Histórico de despachos finais emitidos
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
    // Histórico de registos de auditoria
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

/**
 * Classe principal de gestão de persistência de dados do sistema.
 * Gerencia o estado em memória e sincronização em ficheiro JSON.
 */
class Database {
  constructor() {
    this.init();
  }

  /**
   * Inicializa a base de dados. Se o ficheiro JSON não existir ou estiver corrompido,
   * sementa o ficheiro com os dados iniciais.
   */
  init() {
    if (!fs.existsSync(CAMINHO_BASE_DADOS)) {
      this.data = getInitialData();
      this.save();
    } else {
      try {
        const conteudoBruto = fs.readFileSync(CAMINHO_BASE_DADOS, 'utf8');
        this.data = JSON.parse(conteudoBruto);
        const dadosIniciais = getInitialData();
        let dadosModificados = false;

        // Validação de integridade das coleções de dados no JSON
        if (!this.data.roles || !Array.isArray(this.data.roles) || this.data.roles.length === 0) { this.data.roles = dadosIniciais.roles; dadosModificados = true; }
        if (!this.data.permissions || !Array.isArray(this.data.permissions) || this.data.permissions.length === 0) { this.data.permissions = dadosIniciais.permissions; dadosModificados = true; }
        if (!this.data.role_permissions || !Array.isArray(this.data.role_permissions) || this.data.role_permissions.length === 0) { this.data.role_permissions = dadosIniciais.role_permissions; dadosModificados = true; }
        if (!this.data.users || !Array.isArray(this.data.users) || this.data.users.length === 0) { this.data.users = dadosIniciais.users; dadosModificados = true; }
        if (!this.data.expedientes || !Array.isArray(this.data.expedientes) || this.data.expedientes.length === 0) { this.data.expedientes = dadosIniciais.expedientes; dadosModificados = true; }
        if (!this.data.tramitacoes || !Array.isArray(this.data.tramitacoes)) { this.data.tramitacoes = dadosIniciais.tramitacoes; dadosModificados = true; }
        if (!this.data.despachos || !Array.isArray(this.data.despachos)) { this.data.despachos = dadosIniciais.despachos; dadosModificados = true; }
        if (!this.data.audit_logs || !Array.isArray(this.data.audit_logs) || this.data.audit_logs.length === 0) { this.data.audit_logs = dadosIniciais.audit_logs; dadosModificados = true; }

        if (dadosModificados) this.save();
      } catch (erroLeitura) {
        console.error('Erro ao ler base de dados, reinicializando...', erroLeitura);
        this.data = getInitialData();
        this.save();
      }
    }
  }

  /**
   * Persiste o estado atual dos dados no ficheiro JSON em disco.
   */
  save() {
    fs.writeFileSync(CAMINHO_BASE_DADOS, JSON.stringify(this.data, null, 2), 'utf8');
  }

  // ==========================================
  // GESTÃO DE UTILIZADORES
  // ==========================================

  /**
   * Retorna a lista de todos os utilizadores sem expor a palavra-passe encriptada,
   * incluindo os nomes e códigos dos seus perfis.
   */
  getUsers() {
    return this.data.users.map(utilizador => {
      const utilizadorSemSenha = { ...utilizador };
      delete utilizadorSemSenha.password;
      const perfilUtilizador = this.data.roles.find(perfil => perfil.id === Number(utilizador.role_id));
      return {
        ...utilizadorSemSenha,
        role_name: perfilUtilizador ? perfilUtilizador.name : 'N/A',
        role_code: perfilUtilizador ? perfilUtilizador.code : 'N/A'
      };
    });
  }

  /**
   * Procura e retorna um utilizador pelo seu ID único.
   * 
   * @param {number|string} idUtilizador - ID do utilizador
   */
  getUserById(idUtilizador) {
    const idNumerico = Number(idUtilizador);
    const utilizadorEncontrado = this.data.users.find(u => u.id === idNumerico);
    if (!utilizadorEncontrado) return null;

    const utilizadorSemSenha = { ...utilizadorEncontrado };
    delete utilizadorSemSenha.password;
    const perfilUtilizador = this.data.roles.find(perfil => perfil.id === Number(utilizadorEncontrado.role_id));
    return {
      ...utilizadorSemSenha,
      role_name: perfilUtilizador ? perfilUtilizador.name : 'N/A',
      role_code: perfilUtilizador ? perfilUtilizador.code : 'N/A'
    };
  }

  /**
   * Procura um utilizador pelo seu endereço de e-mail (insensível a maiúsculas/minúsculas).
   * 
   * @param {string} emailUtilizador - E-mail a ser pesquisado
   */
  getUserByEmail(emailUtilizador) {
    if (!emailUtilizador) return null;
    return this.data.users.find(u => u.email && u.email.toLowerCase() === String(emailUtilizador).toLowerCase());
  }

  /**
   * Regista um novo utilizador no sistema com palavra-passe encriptada.
   * 
   * @param {Object} dadosUtilizador - Objeto com nome, email, password, role_id, department
   */
  createUser(dadosUtilizador) {
    const novoId = this.data.users.length ? Math.max(...this.data.users.map(u => u.id)) + 1 : 1;
    const novoUtilizador = {
      id: novoId,
      name: dadosUtilizador.name,
      email: dadosUtilizador.email,
      password: bcrypt.hashSync(dadosUtilizador.password, 10),
      role_id: Number(dadosUtilizador.role_id),
      department: dadosUtilizador.department || 'Geral',
      active: true,
      created_at: new Date().toISOString()
    };
    this.data.users.push(novoUtilizador);
    this.save();
    return this.getUserById(novoId);
  }

  /**
   * Atualiza os dados de um utilizador existente pelo seu ID.
   * 
   * @param {number|string} idUtilizador - ID do utilizador
   * @param {Object} dadosAtualizacao - Campos a serem modificados
   */
  updateUser(idUtilizador, dadosAtualizacao) {
    const indiceUtilizador = this.data.users.findIndex(u => u.id === Number(idUtilizador));
    if (indiceUtilizador === -1) return null;

    if (dadosAtualizacao.name) this.data.users[indiceUtilizador].name = dadosAtualizacao.name;
    if (dadosAtualizacao.email) this.data.users[indiceUtilizador].email = dadosAtualizacao.email;
    if (dadosAtualizacao.role_id) this.data.users[indiceUtilizador].role_id = Number(dadosAtualizacao.role_id);
    if (dadosAtualizacao.department) this.data.users[indiceUtilizador].department = dadosAtualizacao.department;
    if (dadosAtualizacao.active !== undefined) this.data.users[indiceUtilizador].active = Boolean(dadosAtualizacao.active);
    if (dadosAtualizacao.password) this.data.users[indiceUtilizador].password = bcrypt.hashSync(dadosAtualizacao.password, 10);

    this.save();
    return this.getUserById(Number(idUtilizador));
  }

  // ==========================================
  // PERFIS E PERMISSÕES (RBAC)
  // ==========================================

  /**
   * Retorna a lista de perfis do sistema acompanhados das suas respetivas permissões associadas.
   */
  getRoles() {
    return this.data.roles.map(perfil => {
      const permissoesDoPerfil = this.data.role_permissions
        .filter(rp => rp.role_id === perfil.id)
        .map(rp => this.data.permissions.find(p => p.id === rp.permission_id))
        .filter(Boolean);
      return { ...perfil, permissions: permissoesDoPerfil };
    });
  }

  /**
   * Retorna o catálogo completo de permissões registadas no sistema.
   */
  getPermissions() {
    return this.data.permissions;
  }

  /**
   * Retorna a lista de códigos de permissão concedidos a um determinado ID de perfil.
   * 
   * @param {number|string} idPerfil - ID do perfil (role_id)
   */
  getUserPermissions(idPerfil) {
    const idsPermissoes = this.data.role_permissions
      .filter(rp => rp.role_id === Number(idPerfil))
      .map(rp => rp.permission_id);
    return this.data.permissions.filter(p => idsPermissoes.includes(p.id)).map(p => p.code);
  }

  /**
   * Atualiza as permissões atribuídas a um perfil na matriz RBAC.
   * 
   * @param {number|string} idPerfil - ID do perfil a ser atualizado
   * @param {Array<number|string>} idsPermissoes - Lista com os IDs das novas permissões
   */
  updateRolePermissions(idPerfil, idsPermissoes) {
    const perfilIdNumerico = Number(idPerfil);
    // Remover associações antigas deste perfil
    this.data.role_permissions = this.data.role_permissions.filter(rp => rp.role_id !== perfilIdNumerico);
    // Adicionar as novas permissões
    idsPermissoes.forEach(idPermissao => {
      this.data.role_permissions.push({ role_id: perfilIdNumerico, permission_id: Number(idPermissao) });
    });
    this.save();
    return this.getRoles().find(r => r.id === perfilIdNumerico);
  }

  // ==========================================
  // GESTÃO DE EXPEDIENTES (PROCESSOS)
  // ==========================================

  /**
   * Retorna os expedientes ordenados por data de criação descrescente,
   * aplicando filtro de sigilo caso o utilizador não possua permissão para ver confidenciais.
   * 
   * @param {string} codigoPerfilUtilizador - Código do perfil do utilizador (ex: 'tecnico')
   * @param {Array<string>} listaPermissoes - Lista de códigos de permissão do utilizador
   */
  getExpedientes(codigoPerfilUtilizador, listaPermissoes = []) {
    if (!this.data.expedientes || !Array.isArray(this.data.expedientes) || this.data.expedientes.length === 0) {
      const dadosIniciais = getInitialData();
      this.data.expedientes = dadosIniciais.expedientes;
      this.data.tramitacoes = dadosIniciais.tramitacoes;
      this.data.despachos = dadosIniciais.despachos;
      this.save();
    }

    let listaExpedientes = [...this.data.expedientes];

    // Verificar se o utilizador possui privilégio para consultar processos confidenciais
    const podeVerConfidencial = listaPermissoes.includes('expediente:read_confidential') ||
                                codigoPerfilUtilizador === 'admin' ||
                                codigoPerfilUtilizador === 'gestor';

    if (!podeVerConfidencial) {
      listaExpedientes = listaExpedientes.filter(exp => exp.confidentiality !== 'Confidencial');
    }

    return listaExpedientes.sort((itemA, itemB) => new Date(itemB.created_at) - new Date(itemA.created_at));
  }

  /**
   * Retorna os detalhes completos de um expediente (incluindo o seu histórico de tramitações e despachos).
   * 
   * @param {number|string} idExpediente - ID do expediente
   */
  getExpedientById(idExpediente) {
    const expedienteEncontrado = this.data.expedientes.find(e => e.id === Number(idExpediente));
    if (!expedienteEncontrado) return null;

    const historicoTramitacoes = this.data.tramitacoes
      .filter(t => t.expedient_id === Number(idExpediente))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const historicoDespachos = this.data.despachos
      .filter(d => d.expedient_id === Number(idExpediente))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return { ...expedienteEncontrado, tramitacoes: historicoTramitacoes, despachos: historicoDespachos };
  }

  /**
   * Regista um novo expediente no sistema gerando um NUP (Número Único de Processo) sequencial.
   * 
   * @param {Object} dadosExpediente - Título, requerente, assunto, prioridade, confidencialidade, departamento
   * @param {Object} utilizadorCriador - Utilizador que está a registar o processo
   */
  createExpedient(dadosExpediente, utilizadorCriador) {
    const novoId = this.data.expedientes.length ? Math.max(...this.data.expedientes.map(e => e.id)) + 1 : 1;
    const anoAtual = new Date().getFullYear();
    const sequenciaFormatada = String(novoId).padStart(4, '0');
    const nupGerado = `EXP-${anoAtual}-${sequenciaFormatada}`;

    const novoExpediente = {
      id: novoId,
      nup: nupGerado,
      title: dadosExpediente.title,
      applicant: dadosExpediente.applicant,
      subject: dadosExpediente.subject,
      priority: dadosExpediente.priority || 'Média',
      confidentiality: dadosExpediente.confidentiality || 'Público',
      current_department: dadosExpediente.current_department || utilizadorCriador.department || 'Secretaria-Geral',
      status: 'Entrada',
      created_by: utilizadorCriador.id,
      created_by_name: utilizadorCriador.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_location: null
    };

    this.data.expedientes.push(novoExpediente);
    this.save();
    return novoExpediente;
  }

  /**
   * Adiciona um registo de tramitação (encaminhamento) a um expediente e atualiza a sua localização/estado.
   * 
   * @param {number|string} idExpediente - ID do expediente
   * @param {Object} dadosTramitacao - Departamento de destino e parecer/opinião técnica
   * @param {Object} utilizadorTramitador - Utilizador que efetua a tramitação
   */
  addTramitacao(idExpediente, dadosTramitacao, utilizadorTramitador) {
    const indiceExpediente = this.data.expedientes.findIndex(e => e.id === Number(idExpediente));
    if (indiceExpediente === -1) return null;

    const expedienteAtual = this.data.expedientes[indiceExpediente];
    const departamentoOrigem = expedienteAtual.current_department;
    const departamentoDestino = dadosTramitacao.to_department;

    const idTramitacao = this.data.tramitacoes.length ? Math.max(...this.data.tramitacoes.map(t => t.id)) + 1 : 1;
    const novaTramitacao = {
      id: idTramitacao,
      expedient_id: Number(idExpediente),
      from_department: departamentoOrigem,
      to_department: departamentoDestino,
      user_id: utilizadorTramitador.id,
      user_name: utilizadorTramitador.name,
      user_role: utilizadorTramitador.role_name,
      opinion: dadosTramitacao.opinion,
      status_transition: `${expedienteAtual.status} -> Em Tramitação`,
      created_at: new Date().toISOString()
    };

    this.data.tramitacoes.push(novaTramitacao);
    this.data.expedientes[indiceExpediente].current_department = departamentoDestino;
    this.data.expedientes[indiceExpediente].status = 'Em Tramitação';
    this.data.expedientes[indiceExpediente].updated_at = new Date().toISOString();

    this.save();
    return novaTramitacao;
  }

  /**
   * Emite um despacho decisório para um expediente (Deferido, Indeferido, etc.) e atualiza o seu estado final.
   * 
   * @param {number|string} idExpediente - ID do expediente
   * @param {Object} dadosDespacho - Decisão ('Deferido', 'Indeferido', etc.) e fundamentação
   * @param {Object} utilizadorDespachante - Utilizador responsável pelo despacho
   */
  addDespacho(idExpediente, dadosDespacho, utilizadorDespachante) {
    const indiceExpediente = this.data.expedientes.findIndex(e => e.id === Number(idExpediente));
    if (indiceExpediente === -1) return null;

    const idDespacho = this.data.despachos.length ? Math.max(...this.data.despachos.map(d => d.id)) + 1 : 1;
    const novoDespacho = {
      id: idDespacho,
      expedient_id: Number(idExpediente),
      user_id: utilizadorDespachante.id,
      user_name: utilizadorDespachante.name,
      user_role: utilizadorDespachante.role_name,
      decision: dadosDespacho.decision,
      justification: dadosDespacho.justification,
      created_at: new Date().toISOString()
    };

    this.data.despachos.push(novoDespacho);
    this.data.expedientes[indiceExpediente].status = dadosDespacho.decision;
    this.data.expedientes[indiceExpediente].updated_at = new Date().toISOString();

    this.save();
    return novoDespacho;
  }

  /**
   * Arquiva um expediente indicando a sua localização física de arquivo.
   * 
   * @param {number|string} idExpediente - ID do expediente a arquivar
   * @param {Object} dadosArquivamento - Localização física (ex: Armário A, Prateleira 2)
   * @param {Object} utilizadorArquivador - Utilizador que executa o arquivamento
   */
  arquivarExpedient(idExpediente, dadosArquivamento, utilizadorArquivador) {
    const indiceExpediente = this.data.expedientes.findIndex(e => e.id === Number(idExpediente));
    if (indiceExpediente === -1) return null;

    this.data.expedientes[indiceExpediente].status = 'Arquivado';
    this.data.expedientes[indiceExpediente].current_department = 'Arquivo Geral';
    this.data.expedientes[indiceExpediente].archived_location = dadosArquivamento.location || 'Arquivo Geral, Categoria Padrão';
    this.data.expedientes[indiceExpediente].updated_at = new Date().toISOString();

    this.save();
    return this.data.expedientes[indiceExpediente];
  }

  // ==========================================
  // LOGS DE AUDITORIA
  // ==========================================

  /**
   * Regista uma ação realizada no sistema no log de auditoria.
   * 
   * @param {Object} parametroLog - Objeto contendo os detalhes do log
   */
  addAuditLog({ user_id, user_name, user_role, action, entity, entity_id, details, ip_address = '127.0.0.1', success = true }) {
    const novoId = this.data.audit_logs.length ? Math.max(...this.data.audit_logs.map(a => a.id)) + 1 : 1;
    const novoRegistoAudit = {
      id: novoId,
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
    this.data.audit_logs.push(novoRegistoAudit);
    this.save();
    return novoRegistoAudit;
  }

  /**
   * Retorna os registos de auditoria ordenados do mais recente para o mais antigo.
   */
  getAuditLogs() {
    if (!this.data.audit_logs || !Array.isArray(this.data.audit_logs) || this.data.audit_logs.length === 0) {
      this.data.audit_logs = getInitialData().audit_logs;
      this.save();
    }
    return [...this.data.audit_logs].sort((itemA, itemB) => new Date(itemB.timestamp) - new Date(itemA.timestamp));
  }

  /**
   * Limpa todos os registos de auditoria registados no sistema.
   */
  clearAuditLogs() {
    this.data.audit_logs = [];
    this.save();
    return true;
  }

  /**
   * Restaura os registos de auditoria para o estado inicial de demonstração.
   */
  resetSampleAuditLogs() {
    this.data.audit_logs = getInitialData().audit_logs;
    this.save();
    return this.data.audit_logs;
  }

  /**
   * Restaura a base de dados inteira para os dados originais de demonstração.
   */
  resetFullDatabase() {
    this.data = getInitialData();
    this.save();
    return this.data;
  }

  // ==========================================
  // MÉTRICAS E ESTATÍSTICAS DO DASHBOARD
  // ==========================================

  /**
   * Calcula e retorna estatísticas consolidadas dos expedientes e utilizadores para exibição no painel de controlo.
   */
  getDashboardStats() {
    const totalExpedientes = this.data.expedientes.length;
    const emTramitacao = this.data.expedientes.filter(e => e.status === 'Em Tramitação' || e.status === 'Entrada').length;
    const deferidos = this.data.expedientes.filter(e => e.status === 'Deferido').length;
    const indeferidos = this.data.expedientes.filter(e => e.status === 'Indeferido').length;
    const arquivados = this.data.expedientes.filter(e => e.status === 'Arquivado').length;
    const urgentes = this.data.expedientes.filter(e => e.priority === 'Urgente' || e.priority === 'Alta').length;

    const totalUsers = this.data.users.length;
    const activeUsers = this.data.users.filter(u => u.active).length;

    // Distribuição de expedientes por estado
    const porEstado = {
      'Entrada': this.data.expedientes.filter(e => e.status === 'Entrada').length,
      'Em Tramitação': this.data.expedientes.filter(e => e.status === 'Em Tramitação').length,
      'Deferido': deferidos,
      'Indeferido': indeferidos,
      'Arquivado': arquivados
    };

    // Distribuição de expedientes por grau de prioridade
    const porPrioridade = {
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
      byStatus: porEstado,
      byPriority: porPrioridade
    };
  }
}

module.exports = new Database();
