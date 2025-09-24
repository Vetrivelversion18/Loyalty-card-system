const adminMessage = document.getElementById('adminMessage');
const customersTableBody = document.querySelector('#customersTable tbody');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const importCsvInput = document.getElementById('importCsvInput');
const logoutBtn = document.getElementById('logoutBtn');

function showMessage(message, isSuccess = false) {
  adminMessage.textContent = message;
  adminMessage.className = isSuccess ? 'result-message success' : 'result-message';
}

function checkAdminLogin() {
  const adminUser = sessionStorage.getItem('adminUser');
  if (!adminUser) {
    alert('You are not logged in as admin. Redirecting to login page.');
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

async function loadCustomers() {
  if (!checkAdminLogin()) return;
  try {
    const res = await fetch('/api/customers');
    const data = await res.json();

    if (res.ok) {
      customersTableBody.innerHTML = '';
      data.customers.forEach((customer) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${customer.customerId}</td>
          <td>${customer.name}</td>
          <td>${customer.mobile}</td>
          <td>${customer.stamps}</td>
          <td><button class="deleteBtn" data-mobile="${customer.mobile}">Delete</button></td>
        `;
        customersTableBody.appendChild(tr);
      });
      attachDeleteListeners();
    } else {
      showMessage(data.message || 'Failed to load customers.');
    }
  } catch (err) {
    showMessage('Error loading customers.');
  }
}

function attachDeleteListeners() {
  const deleteButtons = document.querySelectorAll('.deleteBtn');
  deleteButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this customer?')) return;
      const mobile = btn.getAttribute('data-mobile');
      try {
        const res = await fetch(`/api/customers/${mobile}`, {
          method: 'DELETE',
        });
        const data = await res.json();

        if (res.ok) {
          showMessage('Customer deleted successfully.', true);
          loadCustomers();
        } else {
          showMessage(data.message || 'Failed to delete customer.');
        }
      } catch (err) {
        showMessage('Error deleting customer.');
      }
    });
  });
}

exportCsvBtn.addEventListener('click', async () => {
  if (!checkAdminLogin()) return;
  try {
    const res = await fetch('/api/customers/export');
    if (!res.ok) {
      showMessage('Failed to export CSV.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    showMessage('Error exporting CSV.');
  }
});

importCsvInput.addEventListener('change', async (e) => {
  if (!checkAdminLogin()) return;
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/customers/import', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (res.ok) {
      showMessage('Customers imported successfully.', true);
      loadCustomers();
      importCsvInput.value = '';
    } else {
      showMessage(data.message || 'Failed to import CSV.');
      importCsvInput.value = '';
    }
  } catch (err) {
    showMessage('Error importing CSV.');
    importCsvInput.value = '';
  }
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('adminUser');
  window.location.href = 'login.html';
});

window.addEventListener('load', () => {
  loadCustomers();
});