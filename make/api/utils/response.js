export  const response = (res, code, data, type) => {
  return res.status(code).send({
    status: type,
    data: data || null,
  });
};
 
