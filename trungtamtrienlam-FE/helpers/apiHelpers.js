const addFileToFormData = async (formDataToSubmit, fieldName, fileValue) => {
  if (!fileValue) return;

  if (Array.isArray(fileValue)) {
    for (let i = 0; i < fileValue.length; i++) {
      formDataToSubmit.append(fieldName, fileValue[i]);
    }
  }
};

export { addFileToFormData };