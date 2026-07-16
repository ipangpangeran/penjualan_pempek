import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_pempek_gluten_free_key_2026';
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak disediakan.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username }
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token tidak valid atau kedaluwarsa.' });
  }
};
