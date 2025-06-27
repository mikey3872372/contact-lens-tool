// Quick fix for the MasterAdminPanel handleSubmit function
// Add this before the fetch call in handleSubmit:

const submitData = editingBrand ? 
  { ...formData, id: editingBrand.id } : 
  formData;

console.log('Submitting data:', submitData);
console.log('Editing brand:', editingBrand);

// Then change:
// body: JSON.stringify(formData)
// to:
// body: JSON.stringify(submitData)