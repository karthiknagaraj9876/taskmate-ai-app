export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Authentication must happen before authorization.
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required"
      });
    }

    // Check whether the logged-in user's role is permitted.
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action"
      });
    }

    next();
  };
};