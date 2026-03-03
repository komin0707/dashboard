const STORAGE_KEY = "situation-room-v1";
const todayKey = new Date().toISOString().slice(0, 10);

const defaultState = {
  lastResetDate: todayKey,
  patientsToday: [],
  patientHistory: {},
  schedules: {},
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
    kominNuProgramPath: "",
    kominNuId: "",
    kominNuPassword: "",
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

const el = {
  body: document.getElementById("patientTableBody"),
  patientDialog: document.getElementById("patientDialog"),
  settingsDialog: document.getElementById("settingsDialog"),
  calculatorDialog: document.getElementById("calculatorDialog"),
  scheduleDialog: document.getElementById("scheduleDialog"),
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
  calendarLabel: document.getElementById("calendarLabel"),
  calendarWeekdays: document.getElementById("calendarWeekdays"),
  calendarGrid: document.getElementById("calendarGrid"),
  selectedDateLabel: document.getElementById("selectedDateLabel"),
  selectedDateSchedules: document.getElementById("selectedDateSchedules"),
  statsContainer: document.getElementById("statsContainer"),
  professorFilter: document.getElementById("professorFilter"),
  macroPath: document.getElementById("macroPath"),
  papersPath: document.getElementById("papersPath"),
  sharedPath: document.getElementById("sharedPath"),
  educationPath: document.getElementById("educationPath"),
  kominNuProgramPath: document.getElementById("kominNuProgramPath"),
  kominNuId: document.getElementById("kominNuId"),
  kominNuPassword: document.getElementById("kominNuPassword"),
  folderPickerInput: document.getElementById("folderPickerInput"),
  filePickerInput: document.getElementById("filePickerInput"),
  scheduleImageInput: document.getElementById("scheduleImageInput"),
  clearScheduleImageBtn: document.getElementById("clearScheduleImageBtn"),
  schedulePreviewImage: document.getElementById("schedulePreviewImage"),
  schedulePreviewEmpty: document.getElementById("schedulePreviewEmpty"),
};

const weekdayKo = ["일", "월", "화", "수", "목", "금", "토"];

function renderCalendarWeekdays() {
  el.calendarWeekdays.innerHTML = "";
  weekdayKo.forEach((d) => {
    const div = document.createElement("div");
    div.className = "calendar-weekday";
    div.textContent = d;
    el.calendarWeekdays.appendChild(div);
  });
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
  const list = state.schedules[todayKey] || [];
  el.scheduleList.innerHTML = "";
  list.forEach((item, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `${item} <button>삭제</button>`;
    li.querySelector("button").onclick = () => {
      list.splice(idx, 1);
      state.schedules[todayKey] = list;
      saveState();
      renderTodaySchedule();
      renderCalendar();
    };
    el.scheduleList.appendChild(li);
  });
}

function addTodaySchedule() {
  const v = el.scheduleInput.value.trim();
  if (!v) return;
  const list = state.schedules[todayKey] || [];
  list.push(v);
  state.schedules[todayKey] = list;
  el.scheduleInput.value = "";
  saveState();
  renderTodaySchedule();
  renderCalendar();
}

function renderCalendar() {
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
      renderSelectedDateSchedules();
    };
    el.calendarGrid.appendChild(cell);
  }
}

function renderSelectedDateSchedules() {
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
  const id = state.settings.kominNuId || "";
  const password = state.settings.kominNuPassword || "";

  if (!programPath) {
    alert("전체 설정에서 komin nu 프로그램 경로를 입력해주세요.");
    return;
  }
  if (!id || !password) {
    alert("전체 설정에서 komin nu ID/비밀번호를 입력해주세요.");
    return;
  }

  const fileUrl = programPath.startsWith("file://") ? programPath : `file:///${programPath.replace(/\\/g, "/")}`;
  window.open(fileUrl, "_blank");

  (async () => {
    try {
      await navigator.clipboard.writeText(`${id}	${password}
`);
      alert("ID/TAB/비밀번호/ENTER 시퀀스를 클립보드에 준비했습니다. 프로그램 창에서 Ctrl+V를 누르면 순서대로 입력됩니다.");
    } catch (e) {
      alert("브라우저 보안으로 자동 키입력이 제한됩니다. ID/TAB/비밀번호/ENTER 순서로 수동 입력해주세요.");
    }
  })();
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

  document.getElementById("addPatientBtn").onclick = () => openPatientDialog();
  document.getElementById("savePatientBtn").onclick = upsertPatientFromDialog;
  document.getElementById("deletePatientBtn").onclick = deletePatientFromDialog;
  document.getElementById("closePatientDialogBtn").onclick = () => el.patientDialog.close();

  document.getElementById("addTodayScheduleBtn").onclick = addTodaySchedule;
  document.getElementById("prevMonthBtn").onclick = () => {
    calendarCursor.setMonth(calendarCursor.getMonth() - 1);
    renderCalendar();
  };
  document.getElementById("nextMonthBtn").onclick = () => {
    calendarCursor.setMonth(calendarCursor.getMonth() + 1);
    renderCalendar();
  };
  document.getElementById("goTodayBtn").onclick = () => {
    calendarCursor = new Date();
    state.selectedDate = todayKey;
    saveState();
    renderCalendar();
    renderSelectedDateSchedules();
  };

  document.getElementById("openSettingsBtn").onclick = () => {
    el.professorFilter.value = (state.settings.professorFilter || []).join(",");
    el.macroPath.value = state.settings.macroPath || "";
    el.papersPath.value = state.settings.papersPath || "";
    el.sharedPath.value = state.settings.sharedPath || "";
    el.educationPath.value = state.settings.educationPath || "";
    el.kominNuProgramPath.value = state.settings.kominNuProgramPath || "";
    el.kominNuId.value = state.settings.kominNuId || "";
    el.kominNuPassword.value = state.settings.kominNuPassword || "";
    el.settingsDialog.showModal();
  };

  document.getElementById("saveSettingsBtn").onclick = () => {
    state.settings.professorFilter = el.professorFilter.value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    state.settings.macroPath = el.macroPath.value.trim();
    state.settings.papersPath = el.papersPath.value.trim();
    state.settings.sharedPath = el.sharedPath.value.trim();
    state.settings.educationPath = el.educationPath.value.trim();
    state.settings.kominNuProgramPath = el.kominNuProgramPath.value.trim();
    state.settings.kominNuId = el.kominNuId.value.trim();
    state.settings.kominNuPassword = el.kominNuPassword.value;
    saveState();
    el.settingsDialog.close();
  };
  document.getElementById("closeSettingsBtn").onclick = () => el.settingsDialog.close();

  document.querySelector('[data-action="macro"]').onclick = () => openPath(state.settings.macroPath);
  document.querySelector('[data-action="papers"]').onclick = () => openPath(state.settings.papersPath);
  document.querySelector('[data-action="shared"]').onclick = () => openPath(state.settings.sharedPath);
  document.querySelector('[data-action="education"]').onclick = () => openPath(state.settings.educationPath);
  document.querySelector('[data-action="calculator"]').onclick = () => el.calculatorDialog.showModal();
  document.querySelector('[data-action="kominNu"]').onclick = launchKominNu;
  document.querySelector('[data-action="scheduleHub"]').onclick = openScheduleDialog;

  document.getElementById("runEgfrBtn").onclick = () => {
    const age = Number(document.getElementById("age").value || 0);
    const scr = Number(document.getElementById("scr").value || 0);
    const sex = document.getElementById("sex").value;
    if (!age || !scr) return;
    let egfr = 186 * Math.pow(scr, -1.154) * Math.pow(age, -0.203);
    if (sex === "f") egfr *= 0.742;
    document.getElementById("egfrResult").textContent = `예상 eGFR: ${egfr.toFixed(1)}`;
  };

  el.excelInput.onchange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const rows = await parseTabularFile(f);
      importPatientRows(rows);
      saveState();
      renderPatients();
      alert("환자 목록 불러오기를 완료했습니다.");
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
      return Object.fromEntries(headers.map((h, i) => [h, (cols[i] || "").trim()]));
    });
  }

  if (typeof XLSX === "undefined") throw new Error("XLSX 라이브러리 미로드");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  return XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
}

function pick(obj, keys) {
  for (const key of keys) {
    if (obj[key] !== undefined && String(obj[key]).trim() !== "") return String(obj[key]).trim();
  }
  return "";
}

function importPatientRows(rows) {
  const filters = state.settings.professorFilter;
  const imported = [];

  rows.forEach((r) => {
    const room = pick(r, ["병실", "room"]);
    const regNo = pick(r, ["등록번호", "regNo", "차트번호"]);
    const name = pick(r, ["환자명", "name"]);
    const professor = pick(r, ["담당교수", "교수", "professor"]);

    if (!name) return;
    if (filters.length && !filters.includes(professor)) return;

    const key = `${regNo}::${name}`;
    const history = state.patientHistory[key] || {};
    imported.push({
      id: crypto.randomUUID(),
      room,
      regNo,
      name,
      professor,
      background: history.background || "",
      diagnosis: history.diagnosis || "",
      note: history.note || "",
    });
  });

  state.patientsToday = imported;
}

initActions();
renderPatients();
renderTodaySchedule();
renderCalendarWeekdays();
renderCalendar();
renderSelectedDateSchedules();
renderStats();
