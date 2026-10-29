(() => {
  "use strict";
  const STORAGE_KEY = "telecom-ticket-workload-v1";
  const defaults = { ticketCount: 500, staffCount: 2, shiftHours: 12, lunchHours: 1, avgMinutes: 30, categories: [], shifts: [500,500,500,500], employees: Array.from({length:8},(_,i)=>({id:i+1,name:"",shift:Math.floor(i/2)+1,tickets:250})), lastResults: null };
  const fields = ["ticketCount", "staffCount", "shiftHours", "lunchHours", "avgMinutes"];
  const $ = (id) => document.getElementById(id);
  const numberFmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
  let data = loadData();
  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") return structuredClone(defaults);
      const hadRoster=Array.isArray(saved.employees) && saved.employees.length>=8;
      const roster=hadRoster?saved.employees.map((p,i)=>({...p,shift:Number(p.shift)||Math.floor(i/2)+1,id:Number(p.id)||i+1})):structuredClone(defaults.employees);
      return { ...structuredClone(defaults), ...saved, staffCount: Number(saved.staffCount)>=2&&Number(saved.staffCount)<=8?Number(saved.staffCount):2, categories: Array.isArray(saved.categories) ? saved.categories : [], shifts: Array.isArray(saved.shifts) && saved.shifts.length===4 ? saved.shifts : [...defaults.shifts], employees: roster };
    } catch { return structuredClone(defaults); }
  }
  function saveData() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); $("saveStatus").textContent = "Данные и результаты сохранены в этом браузере"; }
    catch { $("saveStatus").textContent = "Не удалось сохранить данные в браузере"; }
  }
  function setFields() { fields.forEach((id) => { $(id).value = data[id]; }); }
  function ensureRoster() {
    for(let shiftNo=1;shiftNo<=4;shiftNo++) {
      let members=data.employees.filter(p=>Number(p.shift)===shiftNo);
      while(members.length<data.staffCount) {
        const person={id:Math.max(0,...data.employees.map(p=>Number(p.id)||0))+1,name:"",shift:shiftNo,tickets:0};
        data.employees.push(person);members.push(person);
      }
    }
  }
  function distributeTicketsEvenly() {
    ensureRoster();
    for(let shiftNo=1;shiftNo<=4;shiftNo++) {
      const members=data.employees.filter(p=>Number(p.shift)===shiftNo).sort((a,b)=>a.id-b.id).slice(0,data.staffCount);
      const total=Number(data.shifts[shiftNo-1]);
      const each=Math.floor(total/members.length), remainder=total%members.length;
      members.forEach((person,index)=>{person.tickets=each+(index<remainder?1:0);});
    }
  }
  function renderShifts() {
    const list=$("shiftList"); list.replaceChildren();
    data.shifts.forEach((value,index)=>{
      const label=document.createElement("label"); label.className="field shift-field";
      const title=document.createElement("span"); title.textContent=`Смена ${index+1}`;
      const input=document.createElement("input"); input.type="number"; input.min="400"; input.max="700"; input.step="1"; input.inputMode="numeric"; input.setAttribute("aria-label",`Количество ПБ в смене ${index+1}`); input.value=value;
      input.addEventListener("input",()=>{data.shifts[index]=input.value;update();});
      label.append(title,input); list.append(label);
    });
  }
  function renderEmployees() {
    const body=$("staffList"); body.replaceChildren();
    ensureRoster();
    const active=[];
    for(let shiftNo=1;shiftNo<=4;shiftNo++) active.push(...data.employees.map((person,index)=>({person,index})).filter(x=>Number(x.person.shift)===shiftNo).sort((a,b)=>a.person.id-b.person.id).slice(0,data.staffCount));
    active.forEach(({person,index})=>{
      const row=document.createElement("tr");
      row.dataset.employeeIndex=index;
      const nameCell=document.createElement("th"); nameCell.scope="row"; nameCell.textContent=`Сотрудник ${person.id}`;
      const surnameCell=document.createElement("td"); const surname=document.createElement("input"); surname.type="text"; surname.maxLength=40; surname.placeholder="Введите фамилию"; surname.setAttribute("aria-label",`Фамилия сотрудника ${index+1}`); surname.value=person.name||"";
      const shiftCell=document.createElement("td"); shiftCell.textContent=`Смена ${person.shift}`;
      const ticketCell=document.createElement("td"); const tickets=document.createElement("input"); tickets.type="number"; tickets.min="0"; tickets.step="1"; tickets.inputMode="numeric"; tickets.setAttribute("aria-label",`Билетов в смене сотрудник ${index+1}`); tickets.value=person.tickets??0;
      const loadCell=document.createElement("td"); loadCell.innerHTML=`<strong class="staff-load">—</strong><div class="mini-track"><i></i></div>`;
      surname.addEventListener("input",()=>{data.employees[index].name=surname.value;update();});
      tickets.addEventListener("input",()=>{data.employees[index].tickets=tickets.value;update();});
      surnameCell.append(surname); ticketCell.append(tickets); row.append(nameCell,shiftCell,surnameCell,ticketCell,loadCell); body.append(row);
    });
  }
  function renderCategories() {
    const list = $("categoryList"); list.replaceChildren();
    data.categories.forEach((cat, index) => {
      const row = document.createElement("div"); row.className = "category-row";
      const name = document.createElement("input"); name.className = "cat-name"; name.type = "text"; name.maxLength = 40; name.placeholder = "Например, простые"; name.setAttribute("aria-label", "Название категории"); name.value = cat.name ?? "";
      const count = document.createElement("input"); count.className = "cat-count"; count.type = "number"; count.min = "0"; count.step = "1"; count.inputMode = "numeric"; count.placeholder = "Количество"; count.setAttribute("aria-label", "Количество билетов"); count.value = cat.count ?? "";
      const minutes = document.createElement("input"); minutes.className = "cat-minutes"; minutes.type = "number"; minutes.min = "0"; minutes.step = "0.5"; minutes.inputMode = "decimal"; minutes.placeholder = "Минуты"; minutes.setAttribute("aria-label", "Среднее время обработки в минутах"); minutes.value = cat.minutes ?? "";
      [name, count, minutes].forEach((input, fieldIndex) => input.addEventListener("input", () => { data.categories[index][["name", "count", "minutes"][fieldIndex]] = input.value; update(); }));
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-category"; remove.textContent = "×"; remove.setAttribute("aria-label", `Удалить категорию ${cat.name || index + 1}`);
      remove.addEventListener("click", () => { data.categories.splice(index, 1); renderCategories(); update(); });
      row.append(name, count, minutes, remove); list.append(row);
    });
  }
  function fmtHours(hours) {
    if (!Number.isFinite(hours)) return "—";
    if (hours < 1) return `${numberFmt.format(hours * 60)} мин`;
    const whole = Math.floor(hours); const mins = Math.round((hours - whole) * 60);
    return mins ? `${whole} ч ${mins} мин` : `${whole} ч`;
  }
  function setMetric(id, value) { $(id).textContent = value; }
  function fail(message) { $("validationMessage").textContent = message; $("validationMessage").hidden = false; }
  function update() {
    $("validationMessage").hidden = true; $("warningMessage").hidden = true;
    let invalid = false;
    fields.forEach((id) => {
      const input = $(id); const value = input.value.trim() === "" ? NaN : Number(input.value);
      if (!Number.isFinite(value) || value < 0 || (id === "staffCount" && (!Number.isInteger(value) || value < 2 || value > 8)) || (id === "ticketCount" && !Number.isInteger(value))) invalid = true;
      data[id] = value;
    });
    const shiftNums=data.shifts.map(Number);
    if (invalid) { fail("Проверьте параметры: число сотрудников от 2 до 8, число билетов — целое, остальные значения неотрицательные."); saveData(); return; }
    if(shiftNums.some(n=>!Number.isInteger(n)||n<400||n>700)){fail("Для каждой из четырёх смен укажите целое количество ПБ от 400 до 700.");saveData();return;}
    if (data.lunchHours > data.shiftHours) { fail("Перерыв не может быть длиннее смены."); saveData(); return; }
    let categoryMode = data.categories.length > 0, ticketTotal = 0, workMinutes = 0, catInvalid = false;
    if (categoryMode) {
      for (const cat of data.categories) {
        const count = cat.count === "" || cat.count == null ? NaN : Number(cat.count); const minutes = cat.minutes === "" || cat.minutes == null ? NaN : Number(cat.minutes);
        if (!Number.isInteger(count) || count < 0 || !Number.isFinite(minutes) || minutes < 0 || !String(cat.name || "").trim()) { catInvalid = true; break; }
        ticketTotal += count; workMinutes += count * minutes;
      }
      if (catInvalid) { fail("Заполните название, целое неотрицательное количество и время обработки для каждой категории."); saveData(); return; }
      if (ticketTotal !== data.ticketCount) { $("categorySummary").hidden = false; $("categorySummary").textContent = `В категориях указано ${numberFmt.format(ticketTotal)} билетов из ${numberFmt.format(data.ticketCount)}.`; fail("Сумма билетов по категориям должна совпадать с количеством билетов в расчёте смены."); saveData(); return; }
      $("categorySummary").hidden = false; $("categorySummary").textContent = `Учтено ${numberFmt.format(ticketTotal)} билетов · среднее время ${fmtHours(ticketTotal ? workMinutes / ticketTotal / 60 : data.avgMinutes / 60)} на билет`;
    } else { $("categorySummary").hidden = true; workMinutes = data.ticketCount * data.avgMinutes; }
    const availablePerPerson = data.shiftHours - data.lunchHours;
    const teamAvailable = 4 * data.staffCount * availablePerPerson;
    const averageMinutes = ticketTotal ? workMinutes / ticketTotal : data.avgMinutes;
    const totalTickets=shiftNums.reduce((a,b)=>a+b,0);
    const workHours = totalTickets * averageMinutes / 60;
    setMetric("perEmployeeTime", fmtHours(availablePerPerson)); $("perEmployeeSub").textContent = `${fmtHours(data.shiftHours)} смена минус ${fmtHours(data.lunchHours)} обеда`;
    setMetric("teamTime", fmtHours(teamAvailable)); $("teamTimeSub").textContent = `${data.staffCount} сотрудников × 4 смены · обед вычтен у каждого`;
    setMetric("processingTime", fmtHours(workHours)); $("processingSub").textContent = `${numberFmt.format(totalTickets)} ПБ за 4 смены · ${numberFmt.format(averageMinutes)} мин на билет`;
    setMetric("perEmployeeTickets", numberFmt.format(totalTickets / (data.staffCount * 4))); setMetric("requiredAvg", totalTickets ? `${numberFmt.format(teamAvailable * 60 / totalTickets)} мин` : "—"); setMetric("capacity", averageMinutes > 0 ? numberFmt.format(teamAvailable * 60 / averageMinutes) : "—");
    const teamLoad = teamAvailable > 0 ? workHours / teamAvailable * 100 : workHours === 0 ? 0 : Infinity;
    const employeeLoad = availablePerPerson > 0 ? (workHours / (data.staffCount * 4)) / availablePerPerson * 100 : workHours === 0 ? 0 : Infinity;
    $("teamLoadText").textContent = Number.isFinite(teamLoad) ? `${numberFmt.format(teamLoad)}%` : "∞"; $("employeeLoadText").textContent = Number.isFinite(employeeLoad) ? `${numberFmt.format(employeeLoad)}%` : "∞";
    [["teamProgress",teamLoad],["employeeProgress",employeeLoad]].forEach(([id,value])=>{const bar=$(id);bar.style.width=`${Math.min(Number.isFinite(value)?value:100,100)}%`;bar.classList.toggle("over",value>100);});
    if (workHours > teamAvailable) { $("warningMessage").textContent = `За четыре смены потребуется ${fmtHours(workHours)}, доступно команде ${fmtHours(teamAvailable)}. Не хватает ${fmtHours(workHours-teamAvailable)}.`; $("warningMessage").hidden = false; }

    const activeEmployees=[];
    for(let shiftNo=1;shiftNo<=4;shiftNo++) activeEmployees.push(...data.employees.map((person,index)=>({person,index})).filter(x=>Number(x.person.shift)===shiftNo).sort((a,b)=>a.person.id-b.person.id).slice(0,data.staffCount));
    const assigned=activeEmployees.map(x=>Number(x.person.tickets));
    $("shiftTotal").textContent=`Всего за 4 смены: ${numberFmt.format(totalTickets)} ПБ`;
    const assignedByShift=[0,0,0,0]; let anyBad=false;
    activeEmployees.forEach(({person},i)=>{const n=Number(person.tickets),s=Number(person.shift)-1;if(!Number.isInteger(n)||n<0||s<0||s>3)anyBad=true;else assignedByShift[s]+=n;});
    const tbody=$("staffList");
    [...tbody.rows].forEach((row)=>{
      const empIndex=Number(row.dataset.employeeIndex), count=Number(data.employees[empIndex].tickets), input=row.cells[3].querySelector("input");
      if(!Number.isInteger(count)||count<0){input.setCustomValidity("Введите целое неотрицательное число");anyBad=true;} else input.setCustomValidity("");
      const load=count*averageMinutes/(60*Math.max(availablePerPerson,0.000001))*100;
      row.querySelector(".staff-load").textContent=Number.isFinite(load)?`${numberFmt.format(load)}%`:"—";
      const bar=row.querySelector(".mini-track i");bar.style.width=`${Math.min(Number.isFinite(load)?load:100,100)}%`;bar.classList.toggle("over",load>100);
    });
    const shiftMismatches=shiftNums.map((n,i)=>assignedByShift[i]!==n?`Смена ${i+1}: распределено ${assignedByShift[i]} из ${n}`:null).filter(Boolean);
    const matches=shiftMismatches.length===0&&!anyBad;
    $("staffSummary").textContent=anyBad?"Введите для каждого сотрудника целое неотрицательное количество ПБ.":matches?`Распределение совпадает с объёмом ПБ каждой смены. Загрузка сравнивается с ${fmtHours(availablePerPerson)} доступного времени сотрудника за его смену.`:`Проверьте распределение: ${shiftMismatches.join("; ")}.`;
    $("staffSummary").classList.toggle("summary-error",!matches);
    data.lastResults={totalTickets,assignedByShift,averageMinutes,employeeLoads:activeEmployees.map(({person})=>Number(person.tickets)*averageMinutes/(60*Math.max(availablePerPerson,0.000001))*100),teamLoad};
    saveData();
  }
  fields.filter(id=>id!=="staffCount").forEach((id) => $(id).addEventListener("input", update));
  $("staffCount").addEventListener("change",()=>{data.staffCount=Number($("staffCount").value);ensureRoster();distributeTicketsEvenly();renderEmployees();update();});
  $("addCategoryButton").addEventListener("click", () => { data.categories.push({ name: "", count: "", minutes: "" }); renderCategories(); update(); const inputs = $("categoryList").querySelectorAll(".cat-name"); inputs[inputs.length - 1]?.focus(); });
  $("resetButton").addEventListener("click", () => { localStorage.removeItem(STORAGE_KEY); data = structuredClone(defaults); setFields(); renderCategories(); renderShifts(); renderEmployees(); update(); });
  setFields(); renderCategories(); renderShifts(); renderEmployees(); update();
})();
