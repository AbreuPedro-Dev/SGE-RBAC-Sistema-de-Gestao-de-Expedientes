/**
 * @file auth.js
 * @description Middleware de Autenticação e Controlo de Acessos Baseado em Papéis (RBAC).
 * Este módulo lida com a verificação de tokens JWT e controlo fino de permissões para cada rota da API.
 */

const jwt = require('jsonwebtoken');
const baseDados = require('../database/db');

// Chave secreta para assinatura e verificação de tokens JWT (pode ser sobrescrita por variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'sge-rbac-super-secret-key-2026-mozambique';

/**
 * Middleware para autenticar o Token JWT enviado pelo cliente no cabeçalho HTTP.
 * 
 * @param {Object} requisicao - Objeto da requisição HTTP (Express req)
 * @param {Object} resposta - Objeto da resposta HTTP (Express res)
 * @param {Function} proximo - Função para passar o controlo ao próximo middleware/rota
 */
function authenticateToken(requisicao, resposta, proximo) {
  // Obter o valor do cabeçalho de Autorização (Authorization)
  const cabecalhoAutorizacao = requisicao.headers['authorization'];
  // Extrair o token do formato 'Bearer <token>'
  const tokenAutenticacao = cabecalhoAutorizacao && cabecalhoAutorizacao.split(' ')[1];

  // Caso o token não tenha sido fornecido, nega o acesso com código HTTP 401 (Não Autorizado)
  if (!tokenAutenticacao) {
    return resposta.status(401).json({
      success: false,
      message: 'Acesso negado. Token de autenticação não fornecido.'
    });
  }

  // Verificar a validade do token JWT utilizando a chave secreta
  jwt.verify(tokenAutenticacao, JWT_SECRET, (erroValidacao, dadosDecodificados) => {
    // Se o token for inválido ou expirado, nega o acesso com código HTTP 403 (Proibido)
    if (erroValidacao) {
      return resposta.status(403).json({
        success: false,
        message: 'Sessão inválida ou expirada. Efetue login novamente.'
      });
    }

    // Procurar o utilizador correspondente ao ID presente no token decodificado
    const utilizadorEncontrado = baseDados.getUserById(dadosDecodificados.id);
    if (!utilizadorEncontrado || !utilizadorEncontrado.active) {
      return resposta.status(403).json({
        success: false,
        message: 'Utilizador desativado ou não encontrado.'
      });
    }

    // Procurar a lista de códigos de permissão associada ao papel do utilizador
    const listaPermissoes = baseDados.getUserPermissions(utilizadorEncontrado.role_id);

    // Anexar os dados do utilizador e as suas permissões ao objeto da requisição
    requisicao.user = {
      ...utilizadorEncontrado,
      permissions: listaPermissoes
    };

    // Continuar a execução para o próximo middleware ou manipulador de rota
    proximo();
  });
}

/**
 * Middleware de fábrica para verificar se o utilizador autenticado possui a permissão requerida.
 * 
 * @param {string} permissaoRequerida - Código único da permissão necessária (ex: 'expediente:create')
 * @returns {Function} Função middleware do Express
 */
function checkPermission(permissaoRequerida) {
  return (requisicao, resposta, proximo) => {
    // Garantir que a requisição possui os dados do utilizador autenticado
    if (!requisicao.user) {
      return resposta.status(401).json({
        success: false,
        message: 'Não autenticado.'
      });
    }

    // Administrador possui acesso irrestrito a todas as ações do sistema
    if (requisicao.user.role_code === 'admin') {
      return proximo();
    }

    // Verificar se o utilizador possui a permissão requerida na sua lista de permissões
    if (requisicao.user.permissions && requisicao.user.permissions.includes(permissaoRequerida)) {
      return proximo();
    }

    // Caso não tenha permissão, registar a tentativa não autorizada no log de auditoria
    baseDados.addAuditLog({
      user_id: requisicao.user.id,
      user_name: requisicao.user.name,
      user_role: requisicao.user.role_name,
      action: 'ACESSO_NEGADO',
      entity: 'Permissão',
      entity_id: permissaoRequerida,
      details: `Tentativa não autorizada de executar a ação [${permissaoRequerida}]`,
      ip_address: requisicao.ip || (requisicao.connection && requisicao.connection.remoteAddress) || '127.0.0.1',
      success: false
    });

    // Retornar resposta de erro de permissão (HTTP 403)
    return resposta.status(403).json({
      success: false,
      message: `Acesso Negado (RBAC). O seu perfil [${requisicao.user.role_name}] não possui a permissão '${permissaoRequerida}'.`
    });
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  checkPermission
};
