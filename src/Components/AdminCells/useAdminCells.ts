/*Variables*/
:root{
  --bg:#ffffff; --fg:#111827; --muted:#64748b;
  --border:#cbd5e1; --border-strong:#94a3b8;
  --primary:#2563eb; --primary-600:#1d4ed8;
  --shadow:0 2px 12px rgba(30,41,59,.08);
  --radius:16px; --radius-sm:8px;
}

/* Layout */
.wrapper{ display:flex; flex-direction:column; gap:12px; }
.h3{ font-size:20px; font-weight:700; color:var(--fg); margin:8px 0; }

/* Barra de filtros */
.filtersBar{
  display:flex; justify-content:flex-start; align-items:center;
  gap:6px; flex-wrap:wrap; background:var(--bg);
  border:1px solid var(--border); border-radius:var(--radius);
  padding:8px; box-shadow:var(--shadow);
}
@media (min-width:1024px){ .filtersBar{ flex-wrap:nowrap; } }

.searchBox{ display:flex; flex:0 1 200px; min-width:180px; max-width:220px; gap:6px; }
.searchInput{
  flex:1; padding:6px 10px; border:1px solid var(--border); border-radius:8px; outline:none; font:inherit;
}
.searchInput:focus{ border-color:var(--primary); box-shadow:0 0 0 2px rgba(37,99,235,.15); }
.pageSizeBox{ display:flex; align-items:center; gap:4px; color:var(--fg); flex:0 0 auto; }
.pageSizeSelect{ padding:0 10px; height:36px; border:1px solid var(--border); border-radius:8px; outline:none; font:inherit; }
.pageSizeSelect:focus{ border-color:var(--primary); box-shadow:0 0 0 2px rgba(37,99,235,.15); }

/* Tarjetas grid (celdas) */
.cardGrid{
  list-style:none; margin:12px 0 0; padding:0;
  display:grid; grid-template-columns:repeat(auto-fill, minmax(220px,1fr)); gap:12px;
}
.card{
  background:#fff; border:1px solid #e5e7eb; border-radius:12px;
  padding:10px; box-shadow:0 2px 10px rgba(2,6,23,0.04);
  display:flex; flex-direction:column; gap:6px;
}
.cardHeader{
  display:grid !important;
  grid-template-columns:1fr auto;
  grid-template-areas:"title details" "badges badges";
  align-items:start !important; gap:6px 10px !important;
}
.cardCode{ font-weight:600; color:#0f172a; }
.cardBody{ display:grid; gap:6px; }
.metaLabel{ color:#64748b; font-size:12px; }
.btnPrimary{ padding:6px 10px; border-radius:8px; border:none; color:#fff; cursor:pointer; }
.emptyGrid{ margin-top:8px; color:#64748b; font-style:italic; }

/* Badges */
.badgeGroup{
  grid-area:badges; justify-self:start; width:auto !important;
  display:flex !important; flex-direction:column !important; align-items:flex-start !important; gap:6px !important;
}
.badge{
  display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; border:1px solid transparent;
}
.badgeFree{ background:#dcfce7; color:#166534; border-color:#86efac; }
.badgeReserved{ background:#ffedd5; color:#9a3412; border-color:#fdba74; }
.badgeInUse{ background:#fee2e2; color:#991b1b; border-color:#fca5a5; }
.badgeInactive{ background:#e5e7eb; color:#374151; border-color:#d1d5db; }
.celdaTitle{ grid-area:title; width:auto !important; text-align:left !important; }
.cardHeader .btnLink,.cardHeader .btnPrimary{ grid-area:details; justify-self:start; margin-top:2px; }
.badgeLine{ display:inline-block; }
.badgeWho{ color:#64748b; font-size:11px; }

/* Botones genéricos */
.btn{ padding:6px 10px; border-radius:8px; border:none; cursor:pointer; font-weight:600; font-size:14px; transition:background .2s ease, transform .05s ease; }
.btn:disabled{ opacity:.6; cursor:not-allowed; }
.btnPrimary{ background:var(--primary); color:#fff; }
.btnPrimary:hover{ background:var(--primary-600); }
.btnPrimary:active{ transform:translateY(1px); }
.btnLink{
  background:transparent; border:none; color:var(--primary);
  padding:6px 8px; border-radius:6px; cursor:pointer; font-weight:600; font-size:14px;
  appearance:none; -webkit-appearance:none; -moz-appearance:none;
}
.btnLink:hover{ text-decoration:underline; }
.btnLink:active{ transform:translateY(1px); }
.btnLink:disabled{ opacity:.6; cursor:not-allowed; }

/* Paginación */
.paginationBar{ display:flex; justify-content:center; align-items:center; gap:8px; margin-top:8px; }
.pageBtn{ padding:6px 10px; border-radius:8px; background:#fff; border:1px solid var(--border); color:#fg; cursor:pointer; font-weight:600; }
.pageBtn:disabled{ opacity:.6; cursor:not-allowed; }
.pageBtn:hover{ background:#f3f4f6; }
.pageInfo{ font-size:13px; color:var(--muted); }

/* === Tarjetas superiores simétricas (Capacidad izquierda fija, Quick derecha flexible) === */
.twoCards{
  display:grid;
  grid-template-columns: 380px 1fr;  /* ¡aquí se hace la magia! */
  gap:12px;
  align-items:stretch;              /* ambas a la misma altura */
}
@media (max-width:900px){
  .twoCards{ grid-template-columns:1fr; }
}

/* Tarjetas (no tocamos los estilos internos de capacidad) */
.capacityCard,.quickCard{
  background:#fff; border:1px solid var(--border); border-radius:10px;
  padding:16px; box-shadow:0 1px 6px rgba(30,41,59,.05);
  height:100%; display:flex; flex-direction:column; gap:10px;
  min-height:260px;
}
.capacityCard{ max-width:unset; }
.capacityHeader,.quickHeader{ display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
.cardTitle{ font-weight:700; color:#0f172a; }

.turnPill{
  font-size:12px; font-weight:700; background:#eef2ff; color:#3730a3;
  padding:4px 10px; border-radius:9999px;
}

/* Capacidad interior (no se toca el comportamiento original) */
.capacityGrid{ display:flex; justify-content:flex-start; align-items:flex-start; gap:12px; flex-wrap:wrap; }
.capacityItem{ border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; background:#f8fafc; width:140px; }
.capacityLabel{ font-size:12px; color:#475569; margin-bottom:4px; }
.capacityValue{ font-size:18px; font-weight:800; color:#111827; }
.capacityTotal{ font-size:12px; color:#64748b; margin-left:6px; }
@media (max-width:640px){ .capacityGrid{ flex-direction:column; align-items:center; } }

/* Quick ocupa toda la segunda columna y no desborda */
.quickCard{ align-self:stretch; min-width:0; }
.twoCards > :nth-child(2){ min-width:0; }

/* Quick grid: 2 columnas para alinear Fecha+Turno / Vehículo+Colaborador */
.quickGrid{
  display:grid;
  grid-template-columns: 1fr 1fr;  /* 2 columnas iguales */
  gap:10px;
}
@media (max-width:700px){
  .quickGrid{ grid-template-columns: 1fr; }
}

/* Campos y combobox de colaborador */
.field{ display:grid; gap:6px; margin:0; } /* compacta dentro de quick */

.combo{ position:relative; display:flex; align-items:center; }
.clearBtn{
  position:absolute; right:8px; top:50%; transform:translateY(-50%);
  background:transparent; border:none; cursor:pointer; font-size:18px; line-height:1;
  color:#94a3b8; padding:2px;
}
.clearBtn:hover{ color:#64748b; }
.comboList{
  position:absolute; z-index:50; top:100%; left:0; right:0;
  background:#fff; border:1px solid var(--border); border-radius:8px;
  box-shadow:0 8px 24px rgba(2,6,23,.1);
  margin-top:6px; max-height:260px; overflow:auto; padding:6px 0;
}
.comboItem{ padding:6px 10px; display:grid; gap:2px; cursor:pointer; }
.comboItem:hover{ background:#f8fafc; }
.comboItemActive{ background:#eef2ff; }
.comboName{ font-weight:600; color:#0f172a; font-size:14px; }
.comboMail{ color:#64748b; font-size:12px; }
.comboSelected{ color:#64748b; }

/* Acciones quick */
.quickActions{ display:flex; justify-content:flex-end; gap:8px; }

/* Modal */
.modalBackdrop{
  position:fixed; inset:0; background:rgba(0,0,0,.45);
  display:flex; align-items:flex-start; justify-content:center; padding:10vh 16px; z-index:2147483647;
}
.modal{ width:100%; max-width:520px; background:#fff; border-radius:var(--radius); box-shadow:0 10px 40px rgba(0,0,0,.25); padding:16px; }
.modalActions{ display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }
.actionsRight{ margin-left:auto; display:flex; align-items:center; }
.btnGhost{ background:#fff; border:1px solid var(--border); color:#fg; padding:6px 12px; border-radius:8px; cursor:pointer; }
.btnGhost:hover{ background:#f8fafc; }

/* Mensajes */
.error{ background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding:8px 12px; border-radius:8px; }
.ok{ background:#dcfce7; color:#14532d; border:1px solid #bbf7d0; padding:8px 12px; border-radius:8px; }
