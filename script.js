
"use strict";

// Student Result Analyzer
// Frontend storage: browser localStorage

const STORAGE_KEY = "studentResultAnalyzer_v1";

const subjects = [
  { id: "math", name: "Mathematics" },
  { id: "programming", name: "Programming" },
  { id: "dbms", name: "Database Management" },
  { id: "english", name: "English" },
  { id: "networks", name: "Computer Networks" }
];

let students = loadStudents();
let gradeChart = null;
let subjectChart = null;
let passChart = null;
let toastTimer;

// Load saved records
function loadStudents() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Save records
function saveStudents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    return true;
  } catch (error) {
    console.error("Storage error:", error);
    showToast("Unable to save. Browser storage may be full.");
    return false;
  }
}

// Calculate total, percentage, grade and result
function calculateResult(marks) {
  const values = subjects.map(s => Number(marks[s.id]));
  const total = values.reduce((sum, mark) => sum + mark, 0);
  const percentage = total / subjects.length;
  const passed = values.every(mark => mark >= 35);

  let grade;
  if (!passed) grade = "F";
  else if (percentage >= 90) grade = "A+";
  else if (percentage >= 80) grade = "A";
  else if (percentage >= 70) grade = "B";
  else if (percentage >= 60) grade = "C";
  else if (percentage >= 50) grade = "D";
  else grade = "E";

  return {
    total,
    percentage: Number(percentage.toFixed(2)),
    grade,
    status: passed ? "Pass" : "Fail"
  };
}

// DOM shortcuts
const $ = id => document.getElementById(id);

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function formatPercent(value) {
  return `${Number(value).toFixed(1)}%`;
}

function getResults(student) {
  return calculateResult(student.marks);
}

// Modal management
function openModal(student = null) {
  $("studentForm").reset();
  $("editId").value = student ? student.id : "";
  $("modalTitle").textContent = student ? "Edit Student" : "Add New Student";
  $("saveBtn").textContent = student ? "Update Student" : "Save Student";

  if (student) {
    $("studentName").value = student.name;
    $("rollNumber").value = student.roll;
    $("department").value = student.department;
    subjects.forEach(subject => {
      $(subject.id).value = student.marks[subject.id];
    });
  }

  $("studentModal").classList.add("show");
  $("studentName").focus();
}

function closeModal() {
  $("studentModal").classList.remove("show");
}

$("addStudentTop").addEventListener("click", () => openModal());
$("addStudentBtn").addEventListener("click", () => openModal());
$("closeModal").addEventListener("click", closeModal);
$("cancelModal").addEventListener("click", closeModal);

$("studentModal").addEventListener("click", event => {
  if (event.target === $("studentModal")) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

// Add or update a student
$("studentForm").addEventListener("submit", event => {
  event.preventDefault();

  const id = $("editId").value;
  const name = $("studentName").value.trim();
  const roll = $("rollNumber").value.trim();
  const department = $("department").value;

  const marks = {};
  for (const subject of subjects) {
    const input = $(subject.id);
    const value = input.value.trim();
    const number = Number(value);

    if (value === "" || !Number.isInteger(number) ||
        number < 0 || number > 100) {
      showToast(`Enter a valid ${subject.name} mark (0–100).`);
      input.focus();
      return;
    }
    marks[subject.id] = number;
  }

  if (!name || !roll || !department) {
    showToast("Please complete all required fields.");
    return;
  }

  const duplicate = students.some(student =>
    student.roll.toLowerCase() === roll.toLowerCase() &&
    student.id !== id
  );

  if (duplicate) {
    showToast("This roll number already exists.");
    $("rollNumber").focus();
    return;
  }

  const student = {
    id: id || (crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`),
    name,
    roll,
    department,
    marks,
    createdAt: id
      ? students.find(s => s.id === id)?.createdAt || Date.now()
      : Date.now()
  };

  if (id) {
    const index = students.findIndex(s => s.id === id);
    if (index === -1) {
      showToast("Student record not found.");
      return;
    }
    students[index] = student;
  } else {
    students.push(student);
  }

  if (!saveStudents()) return;

  closeModal();
  renderAll();
  showToast(id ? "Student updated successfully!" :
    "Student added successfully!");
});

// Search
$("searchInput").addEventListener("input", renderStudents);

function getFilteredStudents() {
  const query = $("searchInput").value.trim().toLowerCase();

  return students.filter(student =>
    student.name.toLowerCase().includes(query) ||
    student.roll.toLowerCase().includes(query) ||
    student.department.toLowerCase().includes(query)
  );
}

// Student table
function renderStudents() {
  const tbody = $("studentTable");
  const filtered = getFilteredStudents();

  $("tableCount").textContent =
    `Showing ${filtered.length} of ${students.length} students`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8" class="empty-state">
        ${students.length ? "No matching students found." :
          "No student records yet. Click Add Student to begin."}
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(student => {
    const result = getResults(student);
    return `
      <tr>
        <td>${escapeHTML(student.roll)}</td>
        <td class="student-name">${escapeHTML(student.name)}</td>
        <td>${escapeHTML(student.department)}</td>
        <td>${result.total} / 500</td>
        <td>${formatPercent(result.percentage)}</td>
        <td><span class="grade-badge">${result.grade}</span></td>
        <td><span class="status-badge ${
          result.status === "Pass" ? "status-pass" : "status-fail"
        }">${result.status}</span></td>
        <td>
          <div class="action-group">
            <button class="action-btn edit-btn"
              data-action="edit" data-id="${escapeHTML(student.id)}">
              Edit
            </button>
            <button class="action-btn delete-btn"
              data-action="delete" data-id="${escapeHTML(student.id)}">
              Delete
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

// Edit and delete actions using event delegation
$("studentTable").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const student = students.find(s => s.id === button.dataset.id);
  if (!student) return;

  if (button.dataset.action === "edit") {
    openModal(student);
  } else if (button.dataset.action === "delete") {
    const confirmed = confirm(
      `Are you sure you want to delete ${student.name}'s record?`
    );
    if (!confirmed) return;

    students = students.filter(s => s.id !== student.id);
    if (!saveStudents()) return;
    renderAll();
    showToast("Student record deleted.");
  }
});

// Dashboard statistics
function renderDashboard() {
  const count = students.length;
  const results = students.map(student => ({
    student,
    ...getResults(student)
  }));

  const passed = results.filter(r => r.status === "Pass").length;
  const average = count
    ? results.reduce((sum, r) => sum + r.percentage, 0) / count
    : 0;

  const highest = results.length
    ? results.reduce((best, current) =>
        current.percentage > best.percentage ? current : best)
    : null;

  $("totalStudents").textContent = count;
  $("classAverage").textContent = formatPercent(average);
  $("highestScore").textContent = highest
    ? formatPercent(highest.percentage) : "0%";
  $("topStudent").textContent = highest
    ? highest.student.name : "No records yet";
  $("passPercentage").textContent = count
    ? formatPercent(passed / count * 100) : "0%";
  $("passCount").textContent = `${passed} students passed`;

  const recent = [...students]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  $("recentTable").innerHTML = recent.length
    ? recent.map(student => {
        const r = getResults(student);
        return `
          <tr>
            <td class="student-name">${escapeHTML(student.name)}</td>
            <td>${escapeHTML(student.roll)}</td>
            <td>${formatPercent(r.percentage)}</td>
            <td><span class="grade-badge">${r.grade}</span></td>
            <td><span class="status-badge ${
              r.status === "Pass" ? "status-pass" : "status-fail"
            }">${r.status}</span></td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="5" class="empty-state">
        No results available yet.
       </td></tr>`;
}

// Charts
function renderCharts() {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js unavailable. Charts cannot be displayed.");
    return;
  }

  const results = students.map(getResults);
  const gradeOrder = ["A+", "A", "B", "C", "D", "E", "F"];
  const gradeCounts = gradeOrder.map(grade =>
    results.filter(r => r.grade === grade).length
  );

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#73788d",
          font: { family: "Inter", size: 11 },
          usePointStyle: true,
          padding: 15
        }
      }
    }
  };

  if (gradeChart) gradeChart.destroy();
  gradeChart = new Chart($("gradeChart"), {
    type: "doughnut",
    data: {
      labels: gradeOrder,
      datasets: [{
        data: gradeCounts,
        backgroundColor: [
          "#5546e8", "#8b7cf6", "#45a2ec",
          "#27b88b", "#f0b64d", "#ed8b57", "#e05262"
        ],
        borderWidth: 2,
        borderColor: "#ffffff",
        hoverOffset: 5
      }]
    },
    options: {
      ...chartDefaults,
      cutout: "67%",
      plugins: {
        ...chartDefaults.plugins,
        legend: { ...chartDefaults.plugins.legend, position: "bottom" }
      }
    }
  });

  const averages = subjects.map(subject => {
    if (!students.length) return 0;
    return students.reduce((sum, student) =>
      sum + Number(student.marks[subject.id] || 0), 0
    ) / students.length;
  });

  if (subjectChart) subjectChart.destroy();
  subjectChart = new Chart($("subjectChart"), {
    type: "bar",
    data: {
      labels: subjects.map(s => s.name),
      datasets: [{
        label: "Average Marks",
        data: averages.map(v => Number(v.toFixed(1))),
        backgroundColor: "#7062ed",
        borderRadius: 6,
        maxBarThickness: 45
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { stepSize: 20, color: "#85899c" },
          grid: { color: "#f0f1f5" }
        },
        x: {
          ticks: { color: "#85899c", maxRotation: 35, minRotation: 0 },
          grid: { display: false }
        }
      },
      plugins: {
        ...chartDefaults.plugins,
        legend: { display: false }
      }
    }
  });

  const passCount = results.filter(r => r.status === "Pass").length;
  const failCount = results.length - passCount;

  if (passChart) passChart.destroy();
  passChart = new Chart($("passChart"), {
    type: "pie",
    data: {
      labels: ["Pass", "Fail"],
      datasets: [{
        data: [passCount, failCount],
        backgroundColor: ["#20ad7a", "#e05262"],
        borderColor: "#ffffff",
        borderWidth: 3
      }]
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        legend: {
          ...chartDefaults.plugins.legend,
          position: "bottom"
        }
      }
    }
  });
}

// Generate performance insights
function renderInsights() {
  const results = students.map(getResults);
  const count = results.length;

  if (!count) {
    $("insightContent").textContent =
      "Add student results to generate insights.";
    return;
  }

  const passed = results.filter(r => r.status === "Pass").length;
  const average = results.reduce((sum, r) =>
    sum + r.percentage, 0) / count;

  const bestSubject = subjects.map(subject => ({
    name: subject.name,
    average: students.reduce((sum, student) =>
      sum + Number(student.marks[subject.id]), 0) / count
  })).sort((a, b) => b.average - a.average)[0];

  const highest = Math.max(...results.map(r => r.percentage));

  $("insightContent").innerHTML = `
    <div class="insight-list">
      <div class="insight-item">
        <span>Class average</span>
        <strong>${formatPercent(average)}</strong>
      </div>
      <div class="insight-item">
        <span>Students passing</span>
        <strong>${passed} / ${count}</strong>
      </div>
      <div class="insight-item">
        <span>Highest percentage</span>
        <strong>${formatPercent(highest)}</strong>
      </div>
      <div class="insight-item">
        <span>Highest subject average</span>
        <strong>${escapeHTML(bestSubject.name)}</strong>
      </div>
      <div class="insight-item">
        <span>Subject average</span>
        <strong>${formatPercent(bestSubject.average)}</strong>
      </div>
      <div class="insight-item">
        <span>Students needing attention</span>
        <strong>${count - passed}</strong>
      </div>
    </div>`;
}

// Export results as CSV
function exportCSV() {
  if (!students.length) {
    showToast("There are no student records to export.");
    return;
  }

  const headers = [
    "Roll Number", "Student Name", "Department",
    ...subjects.map(s => s.name),
    "Total Marks", "Maximum Marks", "Percentage", "Grade", "Status"
  ];

  const rows = students.map(student => {
    const result = getResults(student);
    return [
      student.roll,
      student.name,
      student.department,
      ...subjects.map(s => student.marks[s.id]),
      result.total,
      subjects.length * 100,
      result.percentage,
      result.grade,
      result.status
    ];
  });

  const csvEscape = value =>
    `"${String(value).replace(/"/g, '""')}"`;

  const csv = [headers, ...rows]
    .map(row => row.map(csvEscape).join(","))
    .join("\r\n");

  // UTF-8 BOM helps spreadsheet applications recognize the encoding.
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "student-results.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showToast("CSV file exported successfully!");
}

$("exportBtn").addEventListener("click", exportCSV);

// Sidebar navigation highlight
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach(item =>
      item.classList.remove("active")
    );
    link.classList.add("active");
  });
});

// Render all components
function renderAll() {
  renderStudents();
  renderDashboard();
  renderCharts();
  renderInsights();
}

// Initial page load
renderAll();