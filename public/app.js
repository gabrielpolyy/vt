async function checkStatus() {
  const apiStatus = document.getElementById('api-status');
  const dbStatus = document.getElementById('db-status');

  // Check API health
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      apiStatus.textContent = 'online';
      apiStatus.classList.add('ok');
    } else {
      throw new Error('API error');
    }
  } catch {
    apiStatus.textContent = 'offline';
    apiStatus.classList.add('error');
  }

  // Check DB connection
  try {
    const res = await fetch('/api/db-check');
    const data = await res.json();
    if (data.connected) {
      dbStatus.textContent = 'connected';
      dbStatus.classList.add('ok');
    } else {
      dbStatus.textContent = 'disconnected';
      dbStatus.classList.add('error');
    }
  } catch {
    dbStatus.textContent = 'error';
    dbStatus.classList.add('error');
  }
}

// Run on load
checkStatus();

