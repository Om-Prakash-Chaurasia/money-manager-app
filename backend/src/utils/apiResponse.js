/**
 * Standard API Response Builders
 */

export const successResponse = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
  const response = {
    success: true,
    message,
    data
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

export const paginatedResponse = (res, statusCode = 200, message = 'Success', data = [], pagination = {}, meta = null) => {
  const response = {
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total: pagination.total || data.length,
      totalPages: pagination.totalPages || Math.ceil((pagination.total || data.length) / (pagination.limit || 20))
    }
  };

  if (meta) {
    response.meta = meta;
  } else if (pagination.summary) {
    response.meta = { summary: pagination.summary };
  }

  return res.status(statusCode).json(response);
};

export const errorResponse = (res, statusCode = 500, message = 'Internal Server Error', errors = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors]
  });
};
