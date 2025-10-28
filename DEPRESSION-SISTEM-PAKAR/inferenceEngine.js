document.addEventListener("DOMContentLoaded", () => {
  // ==================== Fungsi Dasar CF ====================
  function combineCF(cf1, cf2) {
    if (cf1 === 0) return cf2;
    if (cf2 === 0) return cf1;
    if (cf1 > 0 && cf2 > 0) return cf1 + cf2 * (1 - cf1);
    if (cf1 < 0 && cf2 < 0) return cf1 + cf2 * (1 + cf1);
    return (cf1 + cf2) / (1 - Math.min(Math.abs(cf1), Math.abs(cf2)));
  }

  async function loadKB(path = "rules.json") {
    const res = await fetch(path);
    if (!res.ok) throw new Error("Gagal memuat rules.json");
    return await res.json();
  }

  function renderSymptomsList(symptoms, containerId = "symptoms-list") {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    symptoms.forEach(s => {
      const wrapper = document.createElement("div");
      wrapper.className = "symptom-item";
      wrapper.innerHTML = `
        <label>
          <input type="checkbox" class="symptom-checkbox" value="${s.id}">
          ${s.name}
        </label>
      `;
      container.appendChild(wrapper);
    });
  }

  function collectUserFactsSet() {
    const checked = Array.from(document.querySelectorAll(".symptom-checkbox:checked"));
    return new Set(checked.map(c => c.value));
  }

  function runInference(kb, userFactsSet) {
    const expert = {};
    (kb.symptoms || []).forEach(s => (expert[s.id] = s.expert_cf));
    const diagMap = {};
    (kb.rules || []).forEach(rule => {
      const aktif = (rule.if || []).every(a => userFactsSet.has(a));
      if (!aktif) return;
      const cfVals = (rule.if || []).map(a => expert[a]).filter(v => typeof v === "number");
      if (cfVals.length !== rule.if.length) return;
      const cfRule = Math.min(...cfVals);
      if (!diagMap[rule.then]) diagMap[rule.then] = cfRule;
      else diagMap[rule.then] = combineCF(diagMap[rule.then], cfRule);
    });
    return diagMap;
  }

  const diagnosisDescriptions = {
    D1: { idn: "Depresi Vegetatif", desc: "Ditandai gangguan fungsi tubuh seperti perubahan pola tidur, nafsu makan, kelelahan, dan penurunan energi. Sering memengaruhi rutinitas harian serta menurunkan produktivitas." },
    D2: { idn: "Depresi Agitasi", desc: "Menunjukkan kegelisahan dan ketidakmampuan untuk tenang. Penderitanya mudah marah, gelisah, dan cemas berlebihan. Perlu perhatian agar tidak berkembang menjadi perilaku impulsif." },
    D3: { idn: "Depresi Disritmik", desc: "Kondisi depresi kronis yang berlangsung lama dengan gejala ringan namun menetap. Ditandai suasana hati sedih berkepanjangan, kelelahan, dan kehilangan minat dalam aktivitas sehari-hari." },
    D4: { idn: "Depresi Psikotik", desc: "Depresi berat yang disertai gejala psikotik seperti halusinasi atau delusi. Termasuk kondisi serius yang membutuhkan penanganan profesional segera." }
  };

  function renderResultBox(kb, results) {
    const container = document.getElementById("result-area");
    container.innerHTML = "";
    if (!results || Object.keys(results).length === 0) {
      container.innerHTML = `
        <div class="result-box">
          <h3>Hasil Analisis</h3>
          <p><strong>Tidak ditemukan indikasi depresi</strong>.</p>
          <p>Namun, jika kamu merasa cemas atau tidak nyaman, pertimbangkan untuk berbicara dengan tenaga profesional</p>
        </div>`;
      return;
    }
    const entries = Object.entries(results).sort((a, b) => b[1] - a[1]);
    const [topDiag, topCF] = entries[0];
    const detail = diagnosisDescriptions[topDiag] || { idn: topDiag, desc: "" };
    container.innerHTML = `
      <div class="result-box">
        <h3>Hasil Analisis Kondisi Kamu</h3>
        <p><strong>${detail.idn}</strong></p>
        <p><strong>Tingkat keyakinan sistem:</strong> ${(topCF * 100).toFixed(2)}%</p>
        <div>${detail.desc}</div>
        <br>
        <p style="margin-top:10px;font-style:italic;">Catatan: Hasil ini bersifat indikatif awal, bukan diagnosis medis. Jika gejala menetap, sebaiknya konsultasi ke tenaga ahli.</p>
      </div>`;
  }
  
  async function showSymptomsForGender(gender) {
    try {
      const kb = await loadKB();
      const suffix = gender === "men" ? "_m" : "_f";
      const relevantRules = (kb.rules || []).filter(r => r.id.endsWith(suffix));
      const symptomSet = new Set();
      relevantRules.forEach(r => (r.if || []).forEach(sym => symptomSet.add(sym)));
      const symptomsToShow = (kb.symptoms || []).filter(s => symptomSet.has(s.id));

      const genderSection = document.getElementById("genderSection");
      genderSection.classList.add("hidden");

      const main = document.getElementById("mainContent");
      const old = document.getElementById("gejalaSection");
      if (old) old.remove();

      const section = document.createElement("section");
      section.id = "gejalaSection";
      section.innerHTML = `
        <div class="gejala-header">
          <h1>Pilih Gejala yang Kamu Alami</h1>
          <div id="symptoms-list" class="symptom-container"></div>
          <button id="diagnoseBtn" class="diagnose-btn">Lihat Hasil Analisis</button>
          <div id="result-area" class="results-container"></div>
        </div>
       
      `;

      main.appendChild(section);
      renderSymptomsList(symptomsToShow, "symptoms-list");

      document.getElementById("diagnoseBtn").addEventListener("click", async () => {
        const facts = collectUserFactsSet();
        const kb2 = await loadKB();
        const results = runInference(kb2, facts);
        renderResultBox(kb2, results);
});

// ✨ gak perlu scroll otomatis ke bawah
// section.scrollIntoView({ behavior: "smooth", block: "start" });

    } catch (err) {
      console.error(err);
    }
  }

  // Jalankan setelah halaman siap
  const startBtn = document.getElementById("startBtn");
  const hero = document.querySelector(".hero-section");
  const genderSection = document.getElementById("genderSection");

  startBtn.addEventListener("click", () => {
    hero.classList.add("hidden");
    genderSection.classList.remove("hidden");
    homeButton.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.querySelectorAll(".gender-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const gender = btn.getAttribute("data-gender");
      showSymptomsForGender(gender);
    });
  });

  // === Tambahan tombol Home ===
  const homeButton = document.createElement("button");
  homeButton.textContent = "Kembali ke Halaman Awal";
  homeButton.className = "btn-home";
  homeButton.addEventListener("click", () => {
    window.location.href = "ui.html"; 
  });
  const footer = document.querySelector("footer");
  document.body.insertBefore(homeButton, footer);
  homeButton.style.display = "none";

});
