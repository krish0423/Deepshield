  // Onboarding/tutorial modal logic
  function showOnboarding() {
    document.getElementById('onboarding-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('onboarding-close').focus();
  }
  function hideOnboarding() {
    document.getElementById('onboarding-modal').style.display = 'none';
    document.body.style.overflow = '';
  }
  // Show onboarding only on first visit
  if (!localStorage.getItem('historyOnboarded')) {
    setTimeout(showOnboarding, 300);
  }
  document.getElementById('onboarding-close').onclick = hideOnboarding;
  document.getElementById('onboarding-close').onkeydown = function(e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') hideOnboarding();
  };
  document.getElementById('onboarding-gotit').onclick = function() {
    localStorage.setItem('historyOnboarded', '1');
    hideOnboarding();
  };
  document.getElementById('onboarding-modal').addEventListener('click', function(e) {
    if (e.target === this) hideOnboarding();
  });

// Modal for detailed history view
function showDetailModal(item) {
  // Remove any existing modal
  const oldModal = document.getElementById('history-detail-modal');
  if (oldModal) oldModal.remove();

  // Build modal HTML
  const modal = document.createElement('div');
  modal.id = 'history-detail-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <button class="modal-close" id="close-detail-modal">&times;</button>
      <h3>Analysis Details</h3>
      ${item.srcUrl || item.imageUrl ? `<img src="${item.srcUrl || item.imageUrl}" class="modal-thumb" alt="Analyzed" />` : ''}
      <div class="modal-meta">
        <div><b>Prediction:</b> ${item.prediction}</div>
        <div><b>Confidence:</b> ${(item.confidence * 100).toFixed(2)}%</div>
        <div><b>Date:</b> ${new Date(item.timestamp).toLocaleString()}</div>
      </div>
      ${item.frameResults && item.frameResults.length ? `
        <div class="modal-frames">
          <h4>Frame-by-Frame</h4>
          ${item.frameResults.map((frame, idx) => `
            <div class="modal-frame">
              <div>Frame ${idx + 1}: ${frame.prediction} (${(frame.confidence * 100).toFixed(2)}%)</div>
              ${frame.original ? `<img src="${frame.original}" class="modal-frame-img" alt="Frame" />` : ''}
              ${frame.heatmap ? `<img src="${frame.heatmap}" class="modal-frame-img" alt="Heatmap" />` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="modal-meta">
        <pre style="font-size:12px;overflow-x:auto;background:#f7f7f7;color:#222;padding:8px;border-radius:6px;">${JSON.stringify(item, null, 2)}</pre>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('close-detail-modal').onclick = () => modal.remove();
  modal.querySelector('.modal-backdrop').onclick = () => modal.remove();
}

document.addEventListener("DOMContentLoaded", () => {
  const historyList = document.getElementById("history-list");
  const clearBtn = document.getElementById("clear-history");


  function renderHistory(history) {
    // Get filter values
    const search = (document.getElementById('search-history')?.value || '').toLowerCase();
    const pred = document.getElementById('filter-prediction')?.value || '';
    const date = document.getElementById('filter-date')?.value || '';

    let filtered = history;
    if (search) {
      filtered = filtered.filter(item =>
        (item.prediction || '').toLowerCase().includes(search) ||
        (item.confidence + '').includes(search) ||
        (item.srcUrl || item.imageUrl || '').toLowerCase().includes(search) ||
        (item.timestamp && new Date(item.timestamp).toLocaleString().toLowerCase().includes(search)) ||
        JSON.stringify(item).toLowerCase().includes(search)
      );
    }
    if (pred) {
      filtered = filtered.filter(item => item.prediction === pred);
    }
    if (date) {
      filtered = filtered.filter(item => {
        const d = new Date(item.timestamp);
        return d.toISOString().slice(0,10) === date;
      });
    }

    if (!filtered || filtered.length === 0) {
      historyList.innerHTML = '<p style="color:#bbb;">No analysis history yet.</p>';
      return;
    }
    historyList.innerHTML = filtered.map((item, idx) => `
      <div class="history-item" data-idx="${idx}">
        ${item.srcUrl || item.imageUrl ? `<img src="${item.srcUrl || item.imageUrl}" class="history-thumb" alt="Analyzed" />` : ''}
        <div class="history-details">
          <div class="prediction">Prediction: ${item.prediction}</div>
          <div class="confidence">Confidence: ${(item.confidence * 100).toFixed(2)}%</div>
          <div class="timestamp">${new Date(item.timestamp).toLocaleString()}</div>
        </div>
      </div>
    `).join('');
    // Add click listeners for detail view
    Array.from(document.getElementsByClassName('history-item')).forEach(el => {
      el.onclick = () => {
        const idx = el.getAttribute('data-idx');
        chrome.storage.local.get(["analysisHistory"], (data) => {
          const item = (data.analysisHistory || [])[idx];
          if (item) showDetailModal(item);
        });
      };
    });
  }


  function refreshHistory() {
    chrome.storage.local.get(["analysisHistory"], (data) => {
      renderHistory(data.analysisHistory || []);
    });
  }
  refreshHistory();

  // Filter/search events
  document.getElementById('search-history').oninput = refreshHistory;
  document.getElementById('filter-prediction').onchange = refreshHistory;
  document.getElementById('filter-date').onchange = refreshHistory;


  // Export JSON
  document.getElementById('export-json').onclick = () => {
    chrome.storage.local.get(["analysisHistory"], (data) => {
      const blob = new Blob([JSON.stringify(data.analysisHistory || [], null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'deepshield-history.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    });
  };

  // Export CSV
  document.getElementById('export-csv').onclick = () => {
    chrome.storage.local.get(["analysisHistory"], (data) => {
      const history = data.analysisHistory || [];
      if (!history.length) return;
      const keys = Object.keys(history[0]);
      const csv = [keys.join(',')].concat(history.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))).join('\r\n');
      const blob = new Blob([csv], {type: 'text/csv'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'deepshield-history.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    });
  };

  // Import
  document.getElementById('import-btn').onclick = () => {
    document.getElementById('import-history').click();
  };
  document.getElementById('import-history').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      let imported = [];
      try {
        if (file.name.endsWith('.json')) {
          imported = JSON.parse(evt.target.result);
        } else if (file.name.endsWith('.csv')) {
          const lines = evt.target.result.split(/\r?\n/);
          const keys = lines[0].split(',');
          imported = lines.slice(1).filter(Boolean).map(line => {
            const vals = line.split(',').map(v => v.replace(/^"|"$/g, ''));
            const obj = {};
            keys.forEach((k, i) => obj[k] = vals[i]);
            return obj;
          });
        }
      } catch (e) { alert('Import failed: ' + e); return; }
      if (Array.isArray(imported)) {
        chrome.storage.local.get(["analysisHistory"], (data) => {
          const merged = (data.analysisHistory || []).concat(imported);
          chrome.storage.local.set({ analysisHistory: merged }, () => {
            renderHistory(merged);
            alert('Import successful!');
          });
        });
      }
    };
    reader.readAsText(file);
  };

  clearBtn.addEventListener("click", () => {
    chrome.storage.local.set({ analysisHistory: [] }, () => {
      renderHistory([]);
    });
  });
});
