// Open Finance Analytics — app.js
// Dados fictícios (mock) para o protótipo
const MOCK = {
  baseClientes: 12840,
  ticket: 142.7,
  aprov: 78.2,
  meses: ["Ago", "Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"],
  series: {
    todos:  [820, 860, 910, 995, 1040, 1120, 1200, 1290, 1380, 1500, 1630, 1760],
    varejo: [540, 560, 590, 650, 680, 730, 790, 850, 905, 980, 1060, 1145],
    pmE:    [200, 220, 240, 260, 280, 310, 340, 370, 410, 460, 510, 560],
    corporate:[80,  85,  90,  85,  100, 110, 120, 125, 130, 140, 150, 155]
  }
};

const fmt = new Intl.NumberFormat('pt-BR');
const pct = new Intl.NumberFormat('pt-BR', { style:'percent', minimumFractionDigits:1, maximumFractionDigits:1 });

// Atualiza KPIs do herói
function updateHero(){
  document.getElementById('kpiClientes').textContent = fmt.format(MOCK.baseClientes);
  document.getElementById('kpiTicket').textContent = 'R$ ' + MOCK.ticket.toFixed(2);
  document.getElementById('kpiAprov').textContent = pct.format(MOCK.aprov/100);
}

// Sparkline simples no herói
function drawSpark(){
  const el = document.getElementById('heroSpark');
  if(!el) return;
  new Chart(el.getContext('2d'), {
    type: 'line',
    data: {
      labels: MOCK.meses.slice(-6),
      datasets: [{
        label: 'Tendência',
        data: MOCK.series.todos.slice(-6),
        fill: true
      }]
    },
    options: {
      plugins:{ legend:{ display:false }},
      elements: { line: { tension: .35 } },
      scales: {
        x: { display:false },
        y: { display:false }
      }
    }
  });
}

// Dashboard
let mainChart;

function computeKPIs(seg = 'todos', periodo = 12){
  const arr = MOCK.series[seg].slice(-periodo);
  const clientesAtivos = arr[arr.length - 1] * 10; // escala fictícia
  const receitaPorCliente = 129 + (seg==='corporate'? 58 : seg==='pmE'? 22 : 0);
  const inad = seg==='varejo' ? 3.1 : seg==='pmE' ? 2.4 : seg==='corporate' ? 1.2 : 2.9;
  const nbo = seg==='varejo' ? 8.4 : seg==='pmE' ? 6.7 : seg==='corporate' ? 4.2 : 7.6;
  return { clientesAtivos, receitaPorCliente, inad, nbo, arr };
}

function updateDashboard(seg='todos', periodo=12){
  const { clientesAtivos, receitaPorCliente, inad, nbo, arr } = computeKPIs(seg, periodo);
  document.getElementById('kpiClientes2').textContent = fmt.format(clientesAtivos);
  document.getElementById('kpiReceita').textContent = 'R$ ' + receitaPorCliente.toFixed(2);
  document.getElementById('kpiInad').textContent = pct.format(inad/100);
  document.getElementById('kpiNbo').textContent = pct.format(nbo/100);

  const labels = MOCK.meses.slice(-arr.length);
  if(!mainChart){
    const ctx = document.getElementById('growthChart').getContext('2d');
    mainChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Crescimento de clientes',
          data: arr,
          fill: true
        }]
      },
      options: {
        elements: { line: { tension:.35 } },
        plugins: { legend: { display: false }},
        scales: {
          x: { grid: { display:false }},
          y: { grid: { color: 'rgba(255,255,255,.12)'}}
        }
      }
    });
  } else {
    mainChart.data.labels = labels;
    mainChart.data.datasets[0].data = arr;
    mainChart.update();
  }
}

function bindFilters(){
  const seg = document.getElementById('filtroSegmento');
  const per = document.getElementById('filtroPeriodo');
  document.getElementById('btnAplicar').addEventListener('click', ()=>{
    updateDashboard(seg.value, parseInt(per.value,10));
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  updateHero();
  drawSpark();
  bindFilters();
  updateDashboard('todos', 12);
});


// ===== NBO Simulator =====
let nboChart;

function nboCompute(){
  const base = parseInt(document.getElementById('nboBase').value || '0', 10);
  const convBase = parseFloat(document.getElementById('nboConvBase').value || '0')/100;
  const uplift = parseFloat(document.getElementById('nboUplift').value || '0')/100;
  const margem = parseFloat(document.getElementById('nboMargem').value || '0');
  const cac = parseFloat(document.getElementById('nboCAC').value || '0');

  const convRate = convBase * (1 + uplift);
  const convs = Math.round(base * convRate);
  const receita = convs * margem;
  const custo = convs * cac;
  const roi = custo === 0 ? 0 : (receita - custo) / custo;

  // Payback: margem mensal ~ 1/12 da margem por conversão
  const margemMensal = margem / 12;
  const payback = margemMensal > 0 ? Math.max(0, (custo / (convs * margemMensal))) : Infinity;

  // Update KPIs
  document.getElementById('nboConvOut').textContent = fmt.format(convs);
  document.getElementById('nboReceitaOut').textContent = 'R$ ' + receita.toFixed(2);
  document.getElementById('nboCacOut').textContent = 'R$ ' + custo.toFixed(2);
  document.getElementById('nboRoiOut').textContent = (roi*100).toFixed(1) + '%';
  document.getElementById('nboPaybackOut').textContent = isFinite(payback) ? payback.toFixed(1) : '—';

  // Bar chart: Conversões / Receita / Custo
  const baseConvs = Math.round(base * convBase);
  const baseReceita = baseConvs * margem;
  const baseCusto = baseConvs * cac;

  const labels = ['Conversões', 'Receita (R$)', 'Custo (R$)'];
  const baseVals = [baseConvs, baseReceita, baseCusto];
  const campVals = [convs, receita, custo];

  const ctx = document.getElementById('nboChart').getContext('2d');
  if(!nboChart){
    nboChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Base', data: baseVals },
          { label: 'Campanha', data: campVals }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: false }
        },
        scales: {
          x: { grid: { display:false } },
          y: { grid: { color: 'rgba(255,255,255,.12)'} }
        }
      }
    });
  } else {
    nboChart.data.datasets[0].data = baseVals;
    nboChart.data.datasets[1].data = campVals;
    nboChart.update();
  }
}

function bindNBO(){
  const btn = document.getElementById('nboRodar');
  if(btn){
    btn.addEventListener('click', nboCompute);
    // run once on load
    nboCompute();
  }
}

document.addEventListener('DOMContentLoaded', bindNBO);
