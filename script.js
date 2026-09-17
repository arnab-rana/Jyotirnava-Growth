// ==========================================
// 1. HIDDEN JYOTIRA AI LINK (Backend config)
// ==========================================
// APNA PURANA GOOGLE APP SCRIPT LINK YAHAN DAAL DE:
const APP_SCRIPT_LINK =
  'https://script.google.com/macros/s/AKfycbwxgRAjBTixfK1fEX9BhbfJ85GWfAbovtmwS32EXn1JJB107c4NMz4rjAAguUlbI_iv2Q/exec';

// ==========================================
// 2. Data Upload & Local Storage Logic
// ==========================================
const dataStatus = document.getElementById('data-status');
const dataPreview = document.getElementById('data-preview');

document.getElementById('file-upload').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  dataStatus.textContent = 'Processing...';
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    localStorage.setItem('jyotirnava_data', JSON.stringify(jsonData));
    updateDataPreview();
  };
  reader.readAsArrayBuffer(file);
});

// ==========================================
// 3. Proper Excel Clone (X-Spreadsheet)
// ==========================================
const manualModal = document.getElementById('manual-modal');
let xs = null;

document.getElementById('open-manual-btn').addEventListener('click', () => {
  manualModal.classList.remove('hidden');

  // Slight delay to ensure the modal is fully visible so the Canvas doesn't break
  if (!xs) {
    setTimeout(() => {
      xs = x_spreadsheet('#spreadsheet', {
        showToolbar: true,
        showGrid: true,
        showContextmenu: true, // Right-click enable ho gaya (Insert Row/Col)
        view: {
          height: () => document.getElementById('spreadsheet').clientHeight,
          width: () => document.getElementById('spreadsheet').clientWidth,
        },
      });
      // Initial data structure setup (Row 1 is headers)
      xs.loadData([
        {
          name: 'Campaigns Data',
          rows: {
            0: {
              cells: {
                0: { text: 'Campaign Name' },
                1: { text: 'Spends' },
                2: { text: 'Clicks' },
              },
            },
          },
        },
      ]);
    }, 50);
  }
});

document.getElementById('close-manual-btn').addEventListener('click', () => {
  manualModal.classList.add('hidden');
});

// Convert Excel tabs data back into flat JSON for AI
document.getElementById('save-manual-btn').addEventListener('click', () => {
  if (xs) {
    const xData = xs.getData();
    let allData = [];

    xData.forEach((sheet) => {
      const rows = sheet.rows;
      if (!rows) return;

      // Assume Row '0' contains Headers
      const headerRow = rows['0'];
      if (!headerRow || !headerRow.cells) return;

      let headers = {};
      for (let colIndex in headerRow.cells) {
        headers[colIndex] = headerRow.cells[colIndex].text;
      }

      const rowKeys = Object.keys(rows).filter((k) => k !== 'len' && k !== '0');
      rowKeys.forEach((rKey) => {
        let rowObj = {};
        let hasData = false;
        const cells = rows[rKey].cells;
        if (cells) {
          for (let cKey in cells) {
            const cellValue = cells[cKey].text;
            if (cellValue) {
              const headerName = headers[cKey] || `Col_${cKey}`;
              rowObj[headerName] = cellValue;
              hasData = true;
            }
          }
        }
        if (hasData) allData.push(rowObj);
      });
    });

    if (allData.length > 0) {
      localStorage.setItem('jyotirnava_data', JSON.stringify(allData));
      updateDataPreview();
      manualModal.classList.add('hidden');
      alert('All Worksheets Saved Locally!');
    } else {
      alert('Sheet is empty. Make sure Row 1 has headers.');
    }
  }
});

// ==========================================
// 4. UI Preview Update
// ==========================================
function updateDataPreview() {
  const savedData = localStorage.getItem('jyotirnava_data');
  if (savedData) {
    const parsedData = JSON.parse(savedData);
    dataStatus.textContent = `Success: ${parsedData.length} Rows Synced`;
    dataStatus.classList.replace('bg-red-100', 'bg-green-100');
    dataStatus.classList.replace('text-red-600', 'text-green-700');
    const previewData = parsedData.slice(0, 4);
    let htmlPreview = `<pre class="whitespace-pre-wrap">${JSON.stringify(
      previewData,
      null,
      2
    )}</pre>`;
    if (parsedData.length > 4)
      htmlPreview += `<div class="mt-3 text-blue-600 border-t pt-2">... and ${
        parsedData.length - 4
      } more rows saved.</div>`;
    dataPreview.innerHTML = htmlPreview;
  }
}
updateDataPreview();

// ==========================================
// 5. Sidebar Navigation (Tabs)
// ==========================================
document.getElementById('nav-data').addEventListener('click', () => {
  document.getElementById('view-data').classList.remove('hidden');
  document.getElementById('view-ai').classList.add('hidden');
});
document.getElementById('nav-ai').addEventListener('click', () => {
  document.getElementById('view-ai').classList.remove('hidden');
  document.getElementById('view-data').classList.add('hidden');
});

// ==========================================
// 6. Jyotira AI API Request Logic
// ==========================================
document.getElementById('run-ai-btn').addEventListener('click', async () => {
  const savedData = localStorage.getItem('jyotirnava_data');

  if (!APP_SCRIPT_LINK.includes('script.google.com')) {
    alert('Bhai, script.js mein line 6 par apna purana AI link daal de!');
    return;
  }
  if (!savedData) {
    alert('Please upload, sync, or manually enter some data first!');
    return;
  }

  document.getElementById('ai-loader').classList.remove('hidden');

  const payload = {
    excelData: JSON.parse(savedData),
    sliders: {
      horizon_months: document.getElementById('horizon-slider').value,
      sentiment_score: document.getElementById('sentiment-slider').value,
    },
    prompt: document.getElementById('ai-prompt').value,
  };

  try {
    const response = await fetch(APP_SCRIPT_LINK, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    document.getElementById('ai-loader').classList.add('hidden');

    let aiMessage =
      result.data || result.reply || result.message || JSON.stringify(result);
    // marked.parse() AI ke raw text ko beautiful Headings aur Bullet points mein badal dega
    document.getElementById(
      'ai-output'
    ).innerHTML = `<div class="ai-prose p-2">${marked.parse(aiMessage)}</div>`;
  } catch (error) {
    document.getElementById('ai-loader').classList.add('hidden');
    document.getElementById(
      'ai-output'
    ).innerHTML = `<div class="text-red-600 bg-red-50 p-4 rounded border">Error: ${error.message}</div>`;
  }
});

// ==========================================
// 7. Google Sheets Data Sync Logic
// ==========================================
document
  .getElementById('sync-gsheet-btn')
  .addEventListener('click', async () => {
    const url = document.getElementById('gsheet-link').value.trim();
    const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!idMatch) return alert('Invalid Google Sheet link.');

    dataStatus.textContent = 'Syncing...';
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv`
      );
      const csvText = await response.text();
      const workbook = XLSX.read(csvText, { type: 'string' });
      const jsonData = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]]
      );
      localStorage.setItem('jyotirnava_data', JSON.stringify(jsonData));
      updateDataPreview();
      alert('Google Sheet Synced!');
    } catch (e) {
      alert('Error syncing sheet.');
    }
  });
