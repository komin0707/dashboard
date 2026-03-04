const STORAGE_KEY = "situation-room-v1";
const todayKey = new Date().toISOString().slice(0, 10);

const defaultState = {
  lastResetDate: todayKey,
  patientsToday: [],
  patientHistory: {},
  schedules: {},
  boardPosts: [],
  selectedDate: todayKey,
  stats: {
    erPatients: "",
    lTube: "",
    ambubagging: "",
    foley: "",
    cpcr: "",
  },
  settings: {
    professorFilter: [],
    macroPath: "",
    papersPath: "",
    sharedPath: "",
    educationPath: "",
    forceStopPath: "",
    kominNuProgramPath: "",
    educationPdfCatalog: [],
    scheduleImages: {
      staff: "",
      intern: "",
      outpatient: "",
      or: "",
    },
  },
};

let state = loadState();
let calendarCursor = new Date(state.selectedDate);
let educationItems = [];
let selectedEducationItemId = "";

function loadState() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  const merged = saved ? { ...defaultState, ...saved } : { ...defaultState };

  if (merged.lastResetDate !== todayKey) {
    merged.patientsToday = [];
    merged.lastResetDate = todayKey;
  }
  return merged;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureEducationCatalog() {
  if (!Array.isArray(state.settings.educationPdfCatalog)) {
    state.settings.educationPdfCatalog = [];
  }
}

function toFileUrl(path) {
  const normalized = String(path || "").trim();
  if (!normalized) return "";
  return normalized.startsWith("file://") ? normalized : `file:///${normalized.replace(/\\/g, "/")}`;
}

const el = {
  body: document.getElementById("patientTableBody"),
  patientDialog: document.getElementById("patientDialog"),
  settingsDialog: document.getElementById("settingsDialog"),
  calculatorDialog: document.getElementById("calculatorDialog"),
  scheduleDialog: document.getElementById("scheduleDialog"),
  educationDialog: document.getElementById("educationDialog"),
  patientId: document.getElementById("patientId"),
  room: document.getElementById("room"),
  regNo: document.getElementById("regNo"),
  name: document.getElementById("name"),
  professor: document.getElementById("professor"),
  background: document.getElementById("background"),
  diagnosis: document.getElementById("diagnosis"),
  note: document.getElementById("note"),
  excelInput: document.getElementById("excelInput"),
  scheduleList: document.getElementById("todayScheduleList"),
  scheduleInput: document.getElementById("todayScheduleInput"),
  schedulePanelTitle: document.getElementById("schedulePanelTitle"),
  calendarLabel: document.getElementById("calendarLabel"),
  calendarWeekdays: document.getElementById("calendarWeekdays"),
  calendarGrid: document.getElementById("calendarGrid"),
  selectedDateLabel: document.getElementById("selectedDateLabel"),
  selectedDateSchedules: document.getElementById("selectedDateSchedules"),
  boardInput: document.getElementById("boardInput"),
  boardList: document.getElementById("boardList"),
  statsContainer: document.getElementById("statsContainer"),
  macroPath: document.getElementById("macroPath"),
  papersPath: document.getElementById("papersPath"),
  sharedPath: document.getElementById("sharedPath"),
  educationPath: document.getElementById("educationPath"),
  educationPdfNameInput: document.getElementById("educationPdfNameInput"),
  educationPdfPathInput: document.getElementById("educationPdfPathInput"),
  addEducationPdfBtn: document.getElementById("addEducationPdfBtn"),
  uploadEducationPdfFileBtn: document.getElementById("uploadEducationPdfFileBtn"),
  educationPdfFileInput: document.getElementById("educationPdfFileInput"),
  educationPdfCatalogList: document.getElementById("educationPdfCatalogList"),
  educationCatalogSelect: document.getElementById("educationCatalogSelect"),
  addEducationItemBtn: document.getElementById("addEducationItemBtn"),
  educationItemList: document.getElementById("educationItemList"),
  educationPdfViewer: document.getElementById("educationPdfViewer"),
  forceStopPath: document.getElementById("forceStopPath"),
  kominNuProgramPath: document.getElementById("kominNuProgramPath"),
  folderPickerInput: document.getElementById("folderPickerInput"),
  filePickerInput: document.getElementById("filePickerInput"),
  scheduleImageInput: document.getElementById("scheduleImageInput"),
  clearScheduleImageBtn: document.getElementById("clearScheduleImageBtn"),
  schedulePreviewImage: document.getElementById("schedulePreviewImage"),
  schedulePreviewEmpty: document.getElementById("schedulePreviewEmpty"),
};

const weekdayKo = ["일", "월", "화", "수", "목", "금", "토"];

function renderCalendarWeekdays() {
  if (!el.calendarWeekdays) return;
  el.calendarWeekdays.innerHTML = "";
  weekdayKo.forEach((d) => {
    const div = document.createElement("div");
    div.className = "calendar-weekday";
    div.textContent = d;
    el.calendarWeekdays.appendChild(div);
  });
}

function renderBoardPosts() {
  if (!el.boardList) return;
  el.boardList.innerHTML = "";
  (state.boardPosts || []).forEach((post, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `${post} <button>삭제</button>`;
    li.querySelector("button").onclick = () => {
      state.boardPosts.splice(idx, 1);
      saveState();
      renderBoardPosts();
    };
    el.boardList.appendChild(li);
  });
}

function addBoardPost() {
  if (!el.boardInput) return;
  const v = el.boardInput.value.trim();
  if (!v) return;
  state.boardPosts = state.boardPosts || [];
  state.boardPosts.unshift(v);
  el.boardInput.value = "";
  saveState();
  renderBoardPosts();
}

function renderEducationCatalogListInSettings() {
  if (!el.educationPdfCatalogList) return;
  ensureEducationCatalog();
  el.educationPdfCatalogList.innerHTML = "";

  state.settings.educationPdfCatalog.forEach((item, idx) => {
    const li = document.createElement("li");
    const srcText = item.path || (item.dataUrl ? "(직접등록 PDF)" : "");
    li.innerHTML = `<strong>${item.name}</strong> - ${srcText} <button>삭제</button>`;
    li.querySelector("button").onclick = () => {
      state.settings.educationPdfCatalog.splice(idx, 1);
      saveState();
      renderEducationCatalogListInSettings();
      renderEducationCatalogSelect();
    };
    el.educationPdfCatalogList.appendChild(li);
  });
}

function addEducationPdfFromSettings() {
  ensureEducationCatalog();
  const name = (el.educationPdfNameInput?.value || "").trim();
  const path = (el.educationPdfPathInput?.value || "").trim();
  if (!name || !path) {
    alert("교육명과 PDF 경로를 입력해주세요.");
    return;
  }

  state.settings.educationPdfCatalog.push({ name, path });
  if (el.educationPdfNameInput) el.educationPdfNameInput.value = "";
  if (el.educationPdfPathInput) el.educationPdfPathInput.value = "";
  saveState();
  renderEducationCatalogListInSettings();
  renderEducationCatalogSelect();
}

function addEducationPdfByFile(file) {
  const name = (el.educationPdfNameInput?.value || file?.name || "").trim();
  if (!file || !name) {
    alert("교육명과 PDF 파일을 확인해주세요.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    ensureEducationCatalog();
    state.settings.educationPdfCatalog.push({
      name,
      path: "",
      dataUrl: String(reader.result || ""),
    });
    if (el.educationPdfNameInput) el.educationPdfNameInput.value = "";
    saveState();
    renderEducationCatalogListInSettings();
    renderEducationCatalogSelect();
  };
  reader.readAsDataURL(file);
}

function renderEducationCatalogSelect() {
  if (!el.educationCatalogSelect) return;
  ensureEducationCatalog();
  el.educationCatalogSelect.innerHTML = "";

  if (!state.settings.educationPdfCatalog.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "설정에서 PDF를 먼저 추가하세요";
    el.educationCatalogSelect.appendChild(opt);
    return;
  }

  state.settings.educationPdfCatalog.forEach((item, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = item.name;
    el.educationCatalogSelect.appendChild(opt);
  });
}

function renderEducationItems() {
  if (!el.educationItemList) return;
  el.educationItemList.innerHTML = "";

  educationItems.forEach((item, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "education-item";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.name;
    btn.className = item.id === selectedEducationItemId ? "active" : "";
    btn.onclick = () => {
      selectedEducationItemId = item.id;
      renderEducationItems();
      renderEducationViewer();
    };

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "삭제";
    del.onclick = () => {
      const removed = educationItems.splice(idx, 1)[0];
      if (selectedEducationItemId === removed.id) selectedEducationItemId = educationItems[0]?.id || "";
      renderEducationItems();
      renderEducationViewer();
    };

    const openNew = document.createElement("button");
    openNew.type = "button";
    openNew.textContent = "열기";
    openNew.onclick = () => {
      const src = item.dataUrl || toFileUrl(item.path);
      if (!src) return;
      window.open(src, "_blank");
    };

    wrap.appendChild(btn);
    wrap.appendChild(openNew);
    wrap.appendChild(del);
    el.educationItemList.appendChild(wrap);
  });
}

function renderEducationViewer() {
  if (!el.educationPdfViewer) return;
  const selected = educationItems.find((x) => x.id === selectedEducationItemId);
  if (!selected) {
    el.educationPdfViewer.src = "about:blank";
    return;
  }
  const src = selected.dataUrl || toFileUrl(selected.path);
  if (!src) {
    el.educationPdfViewer.src = "about:blank";
    return;
  }

  // Force reload when switching multiple PDFs quickly.
  el.educationPdfViewer.src = "about:blank";
  setTimeout(() => {
    el.educationPdfViewer.src = src;
  }, 0);
}

function openEducationDialog() {
  renderEducationCatalogSelect();
  renderEducationItems();
  renderEducationViewer();
  el.educationDialog?.showModal();
}

let folderTargetInputId = "";

function setupFolderPickerButtons() {
  const buttons = document.querySelectorAll(".pick-folder-btn");
  buttons.forEach((btn) => {
    btn.onclick = () => {
      folderTargetInputId = btn.dataset.target || "";
      if (!el.folderPickerInput) return;
      el.folderPickerInput.click();
    };
  });

  if (!el.folderPickerInput) return;
  el.folderPickerInput.onchange = (e) => {
    const target = document.getElementById(folderTargetInputId);
    if (!target) return;
    const files = e.target.files;
    if (!files || !files.length) return;

    const first = files[0];
    const rel = first.webkitRelativePath || "";
    const topFolder = rel.split("/")[0] || "";
    if (topFolder) target.value = topFolder;

    e.target.value = "";
  };
}


let fileTargetInputId = "";

function setupFilePickerButtons() {
  const buttons = document.querySelectorAll(".pick-file-btn");
  buttons.forEach((btn) => {
    btn.onclick = () => {
      fileTargetInputId = btn.dataset.target || "";
      if (!el.filePickerInput) return;
      el.filePickerInput.click();
    };
  });

  if (!el.filePickerInput) return;
  el.filePickerInput.onchange = (e) => {
    const target = document.getElementById(fileTargetInputId);
    const file = e.target.files?.[0];
    if (!target || !file) return;

    target.value = file.name;
    e.target.value = "";
  };
}

function renderPatients() {
  if (!el.body) return;
  el.body.innerHTML = "";
  for (const p of state.patientsToday) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.room || ""}</td>
      <td>${p.name || ""}</td>
      <td>${p.professor || ""}</td>
      <td><button data-id="${p.id}">자세히 보기</button></td>
    `;
    tr.querySelector("button").onclick = () => openPatientDialog(p.id);
    el.body.appendChild(tr);
  }
}

function openPatientDialog(id) {
  const p = state.patientsToday.find((x) => x.id === id) || {
    id: crypto.randomUUID(),
  };
  el.patientId.value = p.id;
  el.room.value = p.room || "";
  el.regNo.value = p.regNo || "";
  el.name.value = p.name || "";
  el.professor.value = p.professor || "";
  el.background.value = p.background || "";
  el.diagnosis.value = p.diagnosis || "";
  el.note.value = p.note || "";
  el.patientDialog.showModal();
}

function upsertPatientFromDialog() {
  const p = {
    id: el.patientId.value || crypto.randomUUID(),
    room: el.room.value.trim(),
    regNo: el.regNo.value.trim(),
    name: el.name.value.trim(),
    professor: el.professor.value.trim(),
    background: el.background.value.trim(),
    diagnosis: el.diagnosis.value.trim(),
    note: el.note.value.trim(),
  };
  const idx = state.patientsToday.findIndex((x) => x.id === p.id);
  if (idx >= 0) state.patientsToday[idx] = p;
  else state.patientsToday.push(p);

  if (p.regNo && p.name) state.patientHistory[`${p.regNo}::${p.name}`] = p;
  saveState();
  renderPatients();
  el.patientDialog.close();
}

function deletePatientFromDialog() {
  const id = el.patientId.value;
  state.patientsToday = state.patientsToday.filter((x) => x.id !== id);
  saveState();
  renderPatients();
  el.patientDialog.close();
}

function renderTodaySchedule() {
  const scheduleDate = state.selectedDate || todayKey;
  const list = state.schedules[scheduleDate] || [];
  if (el.schedulePanelTitle) el.schedulePanelTitle.textContent = `${scheduleDate} 일정`;
  el.scheduleList.innerHTML = "";
  list.forEach((item, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `${item} <button>삭제</button>`;
    li.querySelector("button").onclick = () => {
      list.splice(idx, 1);
      state.schedules[scheduleDate] = list;
      saveState();
      renderTodaySchedule();
      renderSelectedDateSchedules();
    };
    el.scheduleList.appendChild(li);
  });
}

function addTodaySchedule() {
  const v = el.scheduleInput.value.trim();
  if (!v) return;
  const scheduleDate = state.selectedDate || todayKey;
  const list = state.schedules[scheduleDate] || [];
  list.push(v);
  state.schedules[scheduleDate] = list;
  el.scheduleInput.value = "";
  saveState();
  renderTodaySchedule();
  renderSelectedDateSchedules();
}

function renderCalendar() {
  if (!el.calendarGrid || !el.calendarLabel) return;
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  el.calendarLabel.textContent = `${year}년 ${month + 1}월`;
  el.calendarGrid.innerHTML = "";

  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const firstVisible = new Date(year, month, 1 - startDay);

  for (let offset = 0; offset < 42; offset++) {
    const current = new Date(firstVisible);
    current.setDate(firstVisible.getDate() + offset);
    const y = current.getFullYear();
    const m = current.getMonth();
    const d = current.getDate();
    const dateKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const cell = document.createElement("button");
    cell.className = "calendar-day";
    if (m !== month) cell.classList.add("muted");
    if (dateKey === todayKey) cell.classList.add("today");
    if (dateKey === state.selectedDate) cell.classList.add("selected");
    cell.innerHTML = `<div>${d}</div>${(state.schedules[dateKey] || []).length ? '<div class="dot"></div>' : ""}`;
    cell.onclick = () => {
      state.selectedDate = dateKey;
      calendarCursor = new Date(y, m, 1);
      saveState();
      renderCalendar();
      renderTodaySchedule();
      renderSelectedDateSchedules();
    };
    el.calendarGrid.appendChild(cell);
  }
}

function renderSelectedDateSchedules() {
  if (!el.selectedDateLabel || !el.selectedDateSchedules) return;
  const selected = state.selectedDate;
  const list = state.schedules[selected] || [];
  el.selectedDateLabel.textContent = `선택일: ${selected}`;
  el.selectedDateSchedules.innerHTML = "";

  if (!list.length) {
    const li = document.createElement("li");
    li.textContent = "일정 없음";
    el.selectedDateSchedules.appendChild(li);
    return;
  }

  list.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    el.selectedDateSchedules.appendChild(li);
  });
}

function renderStats() {
  const monthText = `${new Date().getMonth() + 1}월`;
  const entries = [
    ["erPatients", `${monthText} ER 환자수`],
    ["lTube", "L-tube"],
    ["ambubagging", "Ambubagging"],
    ["foley", "Foley"],
    ["cpcr", "CPCR"],
  ];
  el.statsContainer.innerHTML = "";
  for (const [key, label] of entries) {
    const card = document.createElement("div");
    card.className = "stats-card";
    card.innerHTML = `<label>${label}<input data-key="${key}" value="${state.stats[key] || ""}" /></label>`;
    card.querySelector("input").onchange = (e) => {
      state.stats[key] = e.target.value;
      saveState();
    };
    el.statsContainer.appendChild(card);
  }
}

function openPath(path) {
  if (!path) {
    alert("전체 설정에서 폴더 경로를 먼저 지정해주세요.");
    return;
  }

  if (/^https?:\/\//i.test(path.trim())) {
    alert("URL은 사용할 수 없습니다. 폴더 경로만 입력해주세요.");
    return;
  }

  const normalized = path.trim();
  const fileUrl = normalized.startsWith("file://") ? normalized : `file:///${normalized.replace(/\\/g, "/")}`;
  window.open(fileUrl, "_blank");
}


function launchKominNu() {
  const programPath = (state.settings.kominNuProgramPath || "").trim();

  if (!programPath) {
    alert("전체 설정에서 komin nu 프로그램 경로를 입력해주세요.");
    return;
  }

  const fileUrl = programPath.startsWith("file://") ? programPath : `file:///${programPath.replace(/\\/g, "/")}`;
  window.open(fileUrl, "_blank");
}

function launchForceStop() {
  const programPath = (state.settings.forceStopPath || "").trim();
  if (!programPath) {
    alert("전체 설정에서 강제종료 실행 파일 경로를 입력해주세요.");
    return;
  }
  const fileUrl = programPath.startsWith("file://") ? programPath : `file:///${programPath.replace(/\\/g, "/")}`;
  window.open(fileUrl, "_blank");
}


let activeScheduleType = "staff";

function ensureScheduleImagesState() {
  if (!state.settings.scheduleImages) {
    state.settings.scheduleImages = { staff: "", intern: "", outpatient: "", or: "" };
  }
}

function updateScheduleTypeButtons() {
  const buttons = document.querySelectorAll(".schedule-type-btn");
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.scheduleType === activeScheduleType);
  });
}

function renderScheduleImagePreview() {
  ensureScheduleImagesState();
  const src = state.settings.scheduleImages[activeScheduleType] || "";
  if (!src) {
    el.schedulePreviewImage.style.display = "none";
    el.schedulePreviewImage.removeAttribute("src");
    el.schedulePreviewEmpty.style.display = "block";
    return;
  }
  el.schedulePreviewImage.src = src;
  el.schedulePreviewImage.style.display = "block";
  el.schedulePreviewEmpty.style.display = "none";
}

function setupScheduleDialog() {
  ensureScheduleImagesState();

  document.querySelectorAll(".schedule-type-btn").forEach((btn) => {
    btn.onclick = () => {
      activeScheduleType = btn.dataset.scheduleType || "staff";
      updateScheduleTypeButtons();
      renderScheduleImagePreview();
    };
  });

  el.scheduleImageInput.onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      ensureScheduleImagesState();
      state.settings.scheduleImages[activeScheduleType] = String(reader.result || "");
      saveState();
      renderScheduleImagePreview();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  el.clearScheduleImageBtn.onclick = () => {
    ensureScheduleImagesState();
    state.settings.scheduleImages[activeScheduleType] = "";
    saveState();
    renderScheduleImagePreview();
  };
}

function openScheduleDialog() {
  ensureScheduleImagesState();
  updateScheduleTypeButtons();
  renderScheduleImagePreview();
  el.scheduleDialog.showModal();
}

function initActions() {
  setupFolderPickerButtons();
  setupFilePickerButtons();
  setupScheduleDialog();

  const addPatientBtn = document.getElementById("addPatientBtn");
  const savePatientBtn = document.getElementById("savePatientBtn");
  const deletePatientBtn = document.getElementById("deletePatientBtn");
  const closePatientDialogBtn = document.getElementById("closePatientDialogBtn");
  if (addPatientBtn) addPatientBtn.onclick = () => openPatientDialog();
  if (savePatientBtn) savePatientBtn.onclick = upsertPatientFromDialog;
  if (deletePatientBtn) deletePatientBtn.onclick = deletePatientFromDialog;
  if (closePatientDialogBtn && el.patientDialog) closePatientDialogBtn.onclick = () => el.patientDialog.close();

  document.getElementById("addTodayScheduleBtn").onclick = addTodaySchedule;
  if (el.boardInput && document.getElementById("addBoardBtn")) {
    document.getElementById("addBoardBtn").onclick = addBoardPost;
  }

  const prevMonthBtn = document.getElementById("prevMonthBtn");
  const nextMonthBtn = document.getElementById("nextMonthBtn");
  const goTodayBtn = document.getElementById("goTodayBtn");
  if (prevMonthBtn) prevMonthBtn.onclick = () => {
    calendarCursor.setMonth(calendarCursor.getMonth() - 1);
    renderCalendar();
  };
  if (nextMonthBtn) nextMonthBtn.onclick = () => {
    calendarCursor.setMonth(calendarCursor.getMonth() + 1);
    renderCalendar();
  };
  if (goTodayBtn) goTodayBtn.onclick = () => {
    calendarCursor = new Date();
    state.selectedDate = todayKey;
    saveState();
    renderCalendar();
    renderTodaySchedule();
    renderSelectedDateSchedules();
  };

  document.getElementById("openSettingsBtn").onclick = () => {
    el.macroPath.value = state.settings.macroPath || "";
    el.papersPath.value = state.settings.papersPath || "";
    el.sharedPath.value = state.settings.sharedPath || "";
    el.educationPath.value = state.settings.educationPath || "";
    renderEducationCatalogListInSettings();
    el.forceStopPath.value = state.settings.forceStopPath || "";
    el.kominNuProgramPath.value = state.settings.kominNuProgramPath || "";
    el.settingsDialog.showModal();
  };

  document.getElementById("saveSettingsBtn").onclick = () => {
    state.settings.macroPath = el.macroPath.value.trim();
    state.settings.papersPath = el.papersPath.value.trim();
    state.settings.sharedPath = el.sharedPath.value.trim();
    state.settings.educationPath = el.educationPath.value.trim();
    state.settings.forceStopPath = el.forceStopPath.value.trim();
    state.settings.kominNuProgramPath = el.kominNuProgramPath.value.trim();
    saveState();
    el.settingsDialog.close();
  };
  document.getElementById("closeSettingsBtn").onclick = () => el.settingsDialog.close();

  document.querySelector('[data-action="macro"]').onclick = () => openPath(state.settings.macroPath);
  document.querySelector('[data-action="papers"]').onclick = () => openPath(state.settings.papersPath);
  document.querySelector('[data-action="shared"]').onclick = () => openPath(state.settings.sharedPath);
  document.querySelector('[data-action="education"]').onclick = openEducationDialog;
  document.querySelector('[data-action="calculator"]').onclick = () => el.calculatorDialog.showModal();
  document.querySelector('[data-action="kominNu"]').onclick = launchKominNu;
  document.querySelector('[data-action="forceStop"]').onclick = launchForceStop;
  document.querySelector('[data-action="scheduleHub"]').onclick = openScheduleDialog;

  if (el.addEducationPdfBtn) el.addEducationPdfBtn.onclick = addEducationPdfFromSettings;
  if (el.uploadEducationPdfFileBtn && el.educationPdfFileInput) {
    el.uploadEducationPdfFileBtn.onclick = () => el.educationPdfFileInput.click();
    el.educationPdfFileInput.onchange = (e) => {
      const f = e.target.files?.[0];
      if (f) addEducationPdfByFile(f);
      e.target.value = "";
    };
  }
  if (el.addEducationItemBtn) el.addEducationItemBtn.onclick = () => {
    ensureEducationCatalog();
    const idx = Number(el.educationCatalogSelect?.value || -1);
    const picked = state.settings.educationPdfCatalog[idx];
    if (!picked) {
      alert("추가할 PDF를 선택해주세요.");
      return;
    }
    educationItems.push({
      id: crypto.randomUUID(),
      name: picked.name,
      path: picked.path || "",
      dataUrl: picked.dataUrl || "",
    });
    selectedEducationItemId = educationItems[educationItems.length - 1].id;
    renderEducationItems();
    renderEducationViewer();
  };

  document.getElementById("runEgfrBtn").onclick = () => {
    const age = Number(document.getElementById("age").value || 0);
    const scr = Number(document.getElementById("scr").value || 0);
    const sex = document.getElementById("sex").value;
    if (!age || !scr) return;
    let egfr = 186 * Math.pow(scr, -1.154) * Math.pow(age, -0.203);
    if (sex === "f") egfr *= 0.742;
    document.getElementById("egfrResult").textContent = `예상 eGFR: ${egfr.toFixed(1)}`;
  };

  if (el.excelInput) el.excelInput.onchange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const rows = await parseTabularFile(f);
      const result = importPatientRows(rows);
      saveState();
      renderPatients();
      const recoverMsg = result.autoRecoveredWithoutFilter
        ? "\n※ 교수 필터와 시트 형식이 맞지 않아, 자동으로 필터 없이 다시 불러왔습니다."
        : "";
      alert(
        `환자 목록 불러오기 완료: ${result.importedCount}명 (원본 ${result.sourceCount}행, 필터 제외 ${result.filteredOutCount}행)${recoverMsg}`
      );
    } catch (err) {
      console.error(err);
      alert("파일 불러오기 실패: 형식 또는 라이브러리 확인이 필요합니다.");
    } finally {
      el.excelInput.value = "";
    }
  };
}

async function parseTabularFile(file) {
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  if (isCsv) {
    const text = await file.text();
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const headers = headerLine.split(",").map((h) => h.trim());
    return lines.map((line) => {
      const cols = line.split(",");
      const obj = Object.fromEntries(headers.map((h, i) => [h, (cols[i] || "").trim()]));
      obj.__colA = (cols[0] || "").trim();
      obj.__colB = (cols[1] || "").trim();
      obj.__colD = (cols[3] || "").trim();
      return obj;
    });
  }

  if (typeof XLSX === "undefined") throw new Error("XLSX 라이브러리 미로드");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  return rows.map((row, idx) => {
    const dataRow = aoa[idx + 1] || [];
    return {
      ...row,
      __colA: String(dataRow[0] || "").trim(),
      __colB: String(dataRow[1] || "").trim(),
      __colD: String(dataRow[3] || "").trim(),
    };
  });
}

function pick(obj, keys) {
  const map = normalizeRowObject(obj);

  for (const key of keys) {
    const raw = obj[key];
    if (raw !== undefined && String(raw).trim() !== "") return String(raw).trim();

    const normalizedKey = normalizeHeaderKey(key);
    if (map[normalizedKey] !== undefined && String(map[normalizedKey]).trim() !== "") {
      return String(map[normalizedKey]).trim();
    }
  }
  return "";
}

function normalizeHeaderKey(key) {
  return String(key || "")
    .toLowerCase()
    .replace(/[\s_\-\/()\[\].]/g, "");
}

function normalizeRowObject(row) {
  const out = {};
  Object.entries(row || {}).forEach(([k, v]) => {
    out[normalizeHeaderKey(k)] = v;
  });
  return out;
}

function extractNameAndRegNo(row) {
  const patientInfo = pick(row, ["환자정보", "환자 정보", "patientinfo"]);
  if (!patientInfo) return { name: "", regNo: "" };

  const parts = String(patientInfo)
    .split(/\r?\n|\s{2,}/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (!parts.length) return { name: "", regNo: "" };

  const name = parts[0] || "";
  const regNoCandidate = parts.find((x) => /^\d{6,}$/.test(x));
  const regNo = regNoCandidate || parts[1] || "";
  return { name, regNo };
}

function parseProfessorValue(rawProfessor) {
  const chunks = String(rawProfessor || "")
    .split(/\r?\n|\s+|\//)
    .map((x) => x.trim())
    .filter(Boolean);

  return {
    primary: chunks[0] || "",
    all: chunks,
  };
}

function normalizeProfessorText(v) {
  return String(v || "").replace(/\s+/g, "").trim();
}

function importPatientRowsWithFilter(rows, filters) {
  const imported = [];
  let filteredOutCount = 0;

  rows.forEach((r) => {
    const room = pick(r, ["__colA", "병실", "room", "Room"]);
    const merged = extractNameAndRegNo(r);
    const regNo = pick(r, ["등록번호", "regNo", "차트번호", "chartno"]) || merged.regNo;
    const name = pick(r, ["__colB", "환자명", "name", "환자이름"]) || merged.name;
    const professorRaw = pick(r, ["__colD", "담당교수", "교수", "professor", "주치의"]);
    const professorParsed = parseProfessorValue(professorRaw);
    const professor = professorParsed.primary;

    if (!name) return;

    if (filters.length) {
      const professorTokens = professorParsed.all.map(normalizeProfessorText).filter(Boolean);
      const matched = filters.some((f) => {
        const nf = normalizeProfessorText(f);
        return professorTokens.some((p) => p === nf || p.includes(nf) || nf.includes(p));
      });
      if (!matched) {
        filteredOutCount += 1;
        return;
      }
    }

    const key = `${regNo}::${name}`;
    const history = state.patientHistory[key] || {};
    imported.push({
      id: crypto.randomUUID(),
      room,
      regNo,
      name,
      professor: professor || String(professorRaw || "").trim(),
      background: history.background || "",
      diagnosis: history.diagnosis || "",
      note: history.note || "",
    });
  });

  return { imported, filteredOutCount };
}

function importPatientRows(rows) {
  const configuredFilters = (state.settings.professorFilter || []).map((x) => x.trim()).filter(Boolean);
  let { imported, filteredOutCount } = importPatientRowsWithFilter(rows, configuredFilters);

  let autoRecoveredWithoutFilter = false;
  if (!imported.length && configuredFilters.length) {
    ({ imported } = importPatientRowsWithFilter(rows, []));
    filteredOutCount = rows.length;
    autoRecoveredWithoutFilter = true;
  }

  state.patientsToday = imported;
  return {
    sourceCount: rows.length,
    importedCount: imported.length,
    filteredOutCount,
    autoRecoveredWithoutFilter,
  };
}

initActions();
ensureEducationCatalog();
renderPatients();
renderTodaySchedule();
renderBoardPosts();
renderEducationCatalogSelect();
renderCalendarWeekdays();
renderCalendar();
renderSelectedDateSchedules();
renderStats();
