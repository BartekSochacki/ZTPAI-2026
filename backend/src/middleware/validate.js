function validate(schemas) {
  return (req, res, next) => {
    req.valid = {
      body: schemas.body ? schemas.body.parse(req.body ?? {}) : req.body,
      query: schemas.query ? schemas.query.parse(req.query) : req.query,
      params: schemas.params ? schemas.params.parse(req.params) : req.params
    };
    next();
  };
}

module.exports = validate;
