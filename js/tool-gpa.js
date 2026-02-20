// tools-gpa.js - Algerian scale GPA helper (0-20).
(function () {
  const STORAGE_KEY = 'toolbox_gpa_state_v1';
  const SETUPS_KEY = 'toolbox_gpa_setups_v1';
  const common = window.ToolboxCommon;

  const defaultState = {
    mode: 'semester',
    scalePreset: '20',
    customScale: '20',
    semesterRows: [
      { module: 'Module 1', grade: '', coef: '1' },
      { module: 'Module 2', grade: '', coef: '1' }
    ],
    cumulativeRows: [
      { semester: 'Semester 1', average: '', weight: '30' },
      { semester: 'Semester 2', average: '', weight: '30' }
    ]
  };

  let state = {
    ...structuredClone(defaultState),
    ...common.loadState(STORAGE_KEY, {})
  };
  if (!state || typeof state !== 'object') {
    state = structuredClone(defaultState);
  }
  if (!['20', '4', '100', 'custom'].includes(state.scalePreset)) {
    state.scalePreset = '20';
  }
  if (!Number.isFinite(Number.parseFloat(state.customScale)) || Number.parseFloat(state.customScale) <= 0) {
    state.customScale = '20';
  }

  function persist() {
    common.saveState(STORAGE_KEY, state);
  }

  function formatScaleValue(value) {
    if (!Number.isFinite(value)) return '20';
    const rounded = Number.parseFloat(value.toFixed(2));
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  }

  function resolveScaleMax() {
    if (state.scalePreset === 'custom') {
      const custom = Number.parseFloat(state.customScale);
      return Number.isFinite(custom) && custom > 0 ? custom : 20;
    }

    const preset = Number.parseFloat(state.scalePreset);
    return Number.isFinite(preset) && preset > 0 ? preset : 20;
  }

  function syncScaleUI() {
    const scalePreset = document.getElementById('gpa-scale-preset');
    const scaleCustom = document.getElementById('gpa-scale-custom');
    const scaleMax = resolveScaleMax();

    if (scalePreset) {
      scalePreset.value = state.scalePreset;
    }

    if (scaleCustom) {
      scaleCustom.value = formatScaleValue(Number.parseFloat(state.customScale) || scaleMax);
      scaleCustom.disabled = state.scalePreset !== 'custom';
    }

    const semesterHeader = document.querySelector('#mode-semester thead th:nth-child(2)');
    const cumulativeHeader = document.querySelector('#mode-cumulative thead th:nth-child(2)');
    if (semesterHeader) {
      semesterHeader.textContent = `Grade /${formatScaleValue(scaleMax)}`;
    }
    if (cumulativeHeader) {
      cumulativeHeader.textContent = `Average /${formatScaleValue(scaleMax)}`;
    }
  }

  function createInputCell(value, className, placeholder, ariaLabel) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.className = className;
    input.placeholder = placeholder;
    input.setAttribute('aria-label', ariaLabel);
    return input;
  }

  function createNumberCell(value, className, placeholder, ariaLabel) {
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.min = '0';
    input.value = value || '';
    input.className = className;
    input.placeholder = placeholder;
    input.setAttribute('aria-label', ariaLabel);
    return input;
  }

  function renderSemesterRows() {
    const body = document.getElementById('semester-rows');
    if (!body) return;
    body.innerHTML = '';
    const scaleMax = resolveScaleMax();

    state.semesterRows.forEach((row, index) => {
      const tr = document.createElement('tr');

      const moduleTd = document.createElement('td');
      const moduleInput = createInputCell(row.module, 'semester-module', 'Module name', 'Module name');
      moduleInput.addEventListener('input', () => {
        state.semesterRows[index].module = moduleInput.value;
        persist();
      });
      moduleTd.appendChild(moduleInput);

      const gradeTd = document.createElement('td');
      const gradeInput = createNumberCell(row.grade, 'semester-grade', '0-20', 'Grade out of 20');
      gradeInput.max = String(scaleMax);
      gradeInput.addEventListener('input', () => {
        state.semesterRows[index].grade = gradeInput.value;
        persist();
      });
      gradeTd.appendChild(gradeInput);

      const coefTd = document.createElement('td');
      const coefInput = createNumberCell(row.coef, 'semester-coef', 'Coefficient', 'Module coefficient');
      coefInput.min = '0';
      coefInput.addEventListener('input', () => {
        state.semesterRows[index].coef = coefInput.value;
        persist();
      });
      coefTd.appendChild(coefInput);

      const actionTd = document.createElement('td');
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-ghost';
      remove.textContent = 'Remove';
      remove.disabled = state.semesterRows.length <= 1;
      remove.addEventListener('click', () => {
        state.semesterRows.splice(index, 1);
        persist();
        renderSemesterRows();
      });
      actionTd.appendChild(remove);

      tr.append(moduleTd, gradeTd, coefTd, actionTd);
      body.appendChild(tr);
    });
  }

  function renderCumulativeRows() {
    const body = document.getElementById('cumulative-rows');
    if (!body) return;
    body.innerHTML = '';
    const scaleMax = resolveScaleMax();

    state.cumulativeRows.forEach((row, index) => {
      const tr = document.createElement('tr');

      const semesterTd = document.createElement('td');
      const semesterInput = createInputCell(row.semester, 'cumulative-semester', 'Semester label', 'Semester label');
      semesterInput.addEventListener('input', () => {
        state.cumulativeRows[index].semester = semesterInput.value;
        persist();
      });
      semesterTd.appendChild(semesterInput);

      const averageTd = document.createElement('td');
      const averageInput = createNumberCell(row.average, 'cumulative-average', '0-20', 'Semester average out of 20');
      averageInput.max = String(scaleMax);
      averageInput.addEventListener('input', () => {
        state.cumulativeRows[index].average = averageInput.value;
        persist();
      });
      averageTd.appendChild(averageInput);

      const weightTd = document.createElement('td');
      const weightInput = createNumberCell(row.weight, 'cumulative-weight', 'Credits', 'Semester credits or weight');
      weightInput.min = '0';
      weightInput.addEventListener('input', () => {
        state.cumulativeRows[index].weight = weightInput.value;
        persist();
      });
      weightTd.appendChild(weightInput);

      const actionTd = document.createElement('td');
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-ghost';
      remove.textContent = 'Remove';
      remove.disabled = state.cumulativeRows.length <= 1;
      remove.addEventListener('click', () => {
        state.cumulativeRows.splice(index, 1);
        persist();
        renderCumulativeRows();
      });
      actionTd.appendChild(remove);

      tr.append(semesterTd, averageTd, weightTd, actionTd);
      body.appendChild(tr);
    });
  }

  function syncModeUI() {
    const semester = document.getElementById('mode-semester');
    const cumulative = document.getElementById('mode-cumulative');
    const buttons = document.querySelectorAll('#gpa-mode-toggle button[data-mode]');

    if (semester) semester.classList.toggle('hidden', state.mode !== 'semester');
    if (cumulative) cumulative.classList.toggle('hidden', state.mode !== 'cumulative');

    buttons.forEach((button) => {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setResult(average, details) {
    const resultMain = document.getElementById('gpa-result-main');
    const resultSub = document.getElementById('gpa-result-sub');
    if (!resultMain || !resultSub) return;
    const scaleMax = resolveScaleMax();
    const normalizedTwenty = Number.isFinite(average) ? (average / scaleMax) * 20 : NaN;
    const passThreshold = scaleMax / 2;

    if (!Number.isFinite(average)) {
      resultMain.textContent = `-- / ${formatScaleValue(scaleMax)}`;
      resultSub.textContent = details || 'Enter valid rows to calculate.';
      return;
    }

    const status = average >= passThreshold ? 'Pass' : 'Retake';
    resultMain.textContent = `${average.toFixed(2)} / ${formatScaleValue(scaleMax)}`;
    resultSub.textContent = `${status} · ${details} · ${normalizedTwenty.toFixed(2)} / 20`;
  }

  function calculateSemester() {
    let weighted = 0;
    let totalCoef = 0;
    const scaleMax = resolveScaleMax();

    state.semesterRows.forEach((row) => {
      const grade = Number.parseFloat(row.grade);
      const coef = Number.parseFloat(row.coef);
      if (!Number.isFinite(grade) || !Number.isFinite(coef) || coef <= 0) return;
      const safeGrade = common.clamp(grade, 0, scaleMax);
      weighted += safeGrade * coef;
      totalCoef += coef;
    });

    if (totalCoef <= 0) {
      return { average: NaN, details: 'No weighted coefficients found.' };
    }

    const average = weighted / totalCoef;
    return { average, details: `Weighted by ${totalCoef.toFixed(2)} total coefficients.` };
  }

  function calculateCumulative() {
    let weighted = 0;
    let totalWeight = 0;
    const scaleMax = resolveScaleMax();

    state.cumulativeRows.forEach((row) => {
      const average = Number.parseFloat(row.average);
      const weight = Number.parseFloat(row.weight);
      if (!Number.isFinite(average) || !Number.isFinite(weight) || weight <= 0) return;
      const safeAverage = common.clamp(average, 0, scaleMax);
      weighted += safeAverage * weight;
      totalWeight += weight;
    });

    if (totalWeight <= 0) {
      return { average: NaN, details: 'No valid semester weights found.' };
    }

    const average = weighted / totalWeight;
    return { average, details: `Weighted by ${totalWeight.toFixed(2)} total credits.` };
  }

  function calculate() {
    const result = state.mode === 'semester' ? calculateSemester() : calculateCumulative();
    setResult(result.average, result.details);
    return result;
  }

  function setupSetupsUI() {
    const setupSelect = document.getElementById('gpa-setup-select');
    if (!setupSelect) return;

    const setups = common.loadState(SETUPS_KEY, {});
    setupSelect.innerHTML = '<option value="">Select saved setup</option>';
    Object.keys(setups).sort().forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      setupSelect.appendChild(option);
    });
  }

  function saveSetup() {
    const nameInput = document.getElementById('gpa-setup-name');
    if (!nameInput) return;
    const name = nameInput.value.trim();
    if (!name) {
      common.showToast('Enter a setup name first.');
      return;
    }

    const setups = common.loadState(SETUPS_KEY, {});
    setups[name] = {
      savedAt: new Date().toISOString(),
      state
    };
    common.saveState(SETUPS_KEY, setups);
    setupSetupsUI();
    common.showToast(`Saved setup: ${name}`);
  }

  function loadSetup() {
    const select = document.getElementById('gpa-setup-select');
    if (!select || !select.value) {
      common.showToast('Select a saved setup.');
      return;
    }

    const setups = common.loadState(SETUPS_KEY, {});
    const picked = setups[select.value];
    if (!picked || !picked.state) {
      common.showToast('Saved setup is missing.');
      return;
    }

    state = {
      ...structuredClone(defaultState),
      ...picked.state,
      semesterRows: Array.isArray(picked.state.semesterRows) && picked.state.semesterRows.length
        ? picked.state.semesterRows
        : structuredClone(defaultState.semesterRows),
      cumulativeRows: Array.isArray(picked.state.cumulativeRows) && picked.state.cumulativeRows.length
        ? picked.state.cumulativeRows
        : structuredClone(defaultState.cumulativeRows)
    };

    persist();
    renderAll();
    common.showToast(`Loaded setup: ${select.value}`);
  }

  function deleteSetup() {
    const select = document.getElementById('gpa-setup-select');
    if (!select || !select.value) {
      common.showToast('Select a setup to delete.');
      return;
    }

    const setups = common.loadState(SETUPS_KEY, {});
    delete setups[select.value];
    common.saveState(SETUPS_KEY, setups);
    setupSetupsUI();
    common.showToast('Setup deleted.');
  }

  function exportCsv() {
    const result = calculate();
    const lines = [];

    if (state.mode === 'semester') {
      lines.push('Mode,Semester');
      lines.push('Module,Grade,Coefficient');
      state.semesterRows.forEach((row) => {
        lines.push([
          common.csvEscape(row.module || ''),
          common.csvEscape(row.grade || ''),
          common.csvEscape(row.coef || '')
        ].join(','));
      });
    } else {
      lines.push('Mode,Cumulative');
      lines.push('Semester,Average,Weight');
      state.cumulativeRows.forEach((row) => {
        lines.push([
          common.csvEscape(row.semester || ''),
          common.csvEscape(row.average || ''),
          common.csvEscape(row.weight || '')
        ].join(','));
      });
    }

    lines.push('');
    lines.push(`Result,${Number.isFinite(result.average) ? result.average.toFixed(2) : 'N/A'}`);
    lines.push(`Scale,0-${formatScaleValue(resolveScaleMax())}`);

    const stamp = new Date().toISOString().slice(0, 10);
    common.downloadText(`gpa-${state.mode}-${stamp}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
    common.showToast('CSV exported.');
  }

  function bindEvents() {
    document.querySelectorAll('#gpa-mode-toggle button[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        state.mode = button.dataset.mode;
        persist();
        syncModeUI();
        calculate();
      });
    });

    const scalePreset = document.getElementById('gpa-scale-preset');
    const scaleCustom = document.getElementById('gpa-scale-custom');
    if (scalePreset) {
      scalePreset.addEventListener('change', () => {
        state.scalePreset = scalePreset.value || '20';
        persist();
        syncScaleUI();
        renderSemesterRows();
        renderCumulativeRows();
        calculate();
      });
    }
    if (scaleCustom) {
      scaleCustom.addEventListener('input', () => {
        const value = Number.parseFloat(scaleCustom.value);
        if (!Number.isFinite(value) || value <= 0) return;
        state.customScale = String(value);
        persist();
        syncScaleUI();
        renderSemesterRows();
        renderCumulativeRows();
        calculate();
      });
    }

    const addSemester = document.getElementById('add-semester-row');
    if (addSemester) {
      addSemester.addEventListener('click', () => {
        state.semesterRows.push({ module: '', grade: '', coef: '1' });
        persist();
        renderSemesterRows();
      });
    }

    const addCumulative = document.getElementById('add-cumulative-row');
    if (addCumulative) {
      addCumulative.addEventListener('click', () => {
        state.cumulativeRows.push({ semester: '', average: '', weight: '30' });
        persist();
        renderCumulativeRows();
      });
    }

    const calculateButton = document.getElementById('gpa-calculate');
    if (calculateButton) {
      calculateButton.addEventListener('click', calculate);
    }

    const saveButton = document.getElementById('gpa-save-setup');
    const loadButton = document.getElementById('gpa-load-setup');
    const deleteButton = document.getElementById('gpa-delete-setup');
    const exportButton = document.getElementById('gpa-export');

    if (saveButton) saveButton.addEventListener('click', saveSetup);
    if (loadButton) loadButton.addEventListener('click', loadSetup);
    if (deleteButton) deleteButton.addEventListener('click', deleteSetup);
    if (exportButton) exportButton.addEventListener('click', exportCsv);
  }

  function renderAll() {
    syncScaleUI();
    syncModeUI();
    renderSemesterRows();
    renderCumulativeRows();
    setupSetupsUI();
    calculate();
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    renderAll();
  });
})();

