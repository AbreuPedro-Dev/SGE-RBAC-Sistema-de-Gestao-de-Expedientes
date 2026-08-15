const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'sge-rbac-super-secret-key-2026-mozambique';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Acesso negado. Token de autenticação não fornecido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Sessão inválida ou expirada. Efetue login novamente.' });
    }

    const user = db.getUserById(decoded.id);
    if (!user || !user.active) {
      return res.status(403).json({ success: false, message: 'Utilizador desativado ou não encontrado.' });
    }

    const permissions = db.getUserPermissions(user.role_id);

    req.user = {
      ...user,
      permissions
    };
    next();
  });
}

function checkPermission(requiredPermission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Não autenticado.' });
    }

    // Administrador tem acesso a todas as ações
    if (req.user.role_code === 'admin') {
      return next();
    }

    if (req.user.permissions && req.user.permissions.includes(requiredPermission)) {
      return next();
    }

    // Registar tentativa não autorizada nos logs de auditoria
    db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role_name,
      action: 'ACESSO_NEGADO',
      entity: 'Permissão',
      entity_id: requiredPermission,
      details: `Tentativa não autorizada de executar a ação [${requiredPermission}]`,
      ip_address: req.ip || req.connection.remoteAddress,
      success: false
    });

    return res.status(403).json({
      success: false,
      message: `Acesso Negado (RBAC). O seu perfil [${req.user.role_name}] não possui a permissão '${requiredPermission}'.`
    });
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  checkPermission
};
