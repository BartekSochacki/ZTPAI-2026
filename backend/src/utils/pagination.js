function paginated(rows, total, page, limit) {
  return {
    data: rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  };
}

module.exports = { paginated };
