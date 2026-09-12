import { verifyAccessToken } from '../utils/tokenHelper.js';
import { userRepository } from '../repositories/userRepository.js';
import { AppError } from '../utils/appError.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Authentication required. Please provide a valid token.', 401));
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Your access token has expired. Please refresh your token.', 401));
      }
      return next(new AppError('Invalid authentication token.', 401));
    }

    // Check if user still exists and is active
    const user = await userRepository.findById(decoded.id);
    if (!user || !user.isActive) {
      return next(new AppError('The user belonging to this token no longer exists or is inactive.', 401));
    }

    // Attach user to request context (strictly scoped)
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      currency: user.currency,
      timezone: user.timezone,
      dateFormat: user.dateFormat
    };

    next();
  } catch (error) {
    next(error);
  }
};
