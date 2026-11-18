function validateFileMetadata(file) {
  const errors = [];
  if (!file.name || typeof file.name !== 'string') errors.push('Missing or invalid file name');
  if (!file.bucket || typeof file.bucket !== 'string') errors.push('Missing or invalid bucket name');
  if (typeof file.size === 'undefined' || isNaN(Number(file.size))) errors.push('Missing or invalid size');
  if (!file.contentType || typeof file.contentType !== 'string') errors.push('Missing or invalid contentType');
  return errors;
}

module.exports = { validateFileMetadata };