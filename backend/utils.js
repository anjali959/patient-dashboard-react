function createSuccess(data) {
  return { status: "success", data };
}

function createError(error) {
  return { status: "error", error };
}

function createResult(error, data) {
  return error ? createError(error) : createSuccess(data);
}

module.exports = { createSuccess, createError, createResult };
