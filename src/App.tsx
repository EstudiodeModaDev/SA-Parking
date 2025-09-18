// src/App.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

import Availability from './Components/Reservar/Reservar';
import MisReservas from './Components/Mis-Reservas/mis-reservas';
import AdminCells from './Components/AdminCells/admin-cells';
import AdminSettings from './Components/Admin-Settings/AdminSettings';
import ColaboradoresInscritos from './Components/Colaboradores-Permanentes/Colaboradores';
import { ToastProvider } from './Components/Toast/ToastProvider';
import Reportes from './Components/Reportes/reportes';
import PicoPlacaAdmin from './Components/PicoPlaca/PicoPlaca';

import { useAuth } from './auth/AuthProvider';
import { GraphServicesProvider, useGraphServices } from './graph/GraphServicesContext';
import { UserService } from './Services/User.Service';
import type { Role } from './Services/Shared.service';

const NAVS_ADMIN = [
  { key: 'misreservas', label: 'Reservas' },
  { key: 'celdas', label: 'Celdas' },
  { key: 'admin', label: 'Administración' },
  { key: 'pyp', label: 'Pico y placa' },
  { key: 'colaboradores', label: 'Colaboradores' },
  { key: 'reportes', label: 'Reportes' },
] as const;
type AdminNavKey = typeof NAVS_ADMIN[number]['key'];
type NavKey = AdminNavKey;

type User = {
  displayName?: string;
  mail?: string;
  jobTitle?: string;
} | null;

function AppInner() {
  const [selected, setSelected] = useState<NavKey>('misreservas');

  const [user, setUser] = useState<User>(null);
  const [userLoading, setUserLoading] = useState(true);

  const [userRole, setUserRole] = useState<Role>('usuario');
  const [canChangeRole, setCanChangeRole] = useState(false);
  const [permLoading, setPermLoading] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  const { graph, shared, settings } = useGraphServices();
  const userSvc = useMemo(() => new UserService(graph), [graph]);
  const { signOut } = useAuth();

  // 1) Cargar perfil con Graph (básico)
  useEffect(() => {
    let cancel = false;
    setUserLoading(true);
    (async () => {
      try {
        const me = await userSvc.getMeBasic(); // { displayName, mail, userPrincipalName, jobTitle }
        if (cancel) return;
        setUser({
          displayName: me.displayName ?? undefined,
          mail: me.mail ?? me.userPrincipalName ?? undefined,
          jobTitle: me.jobTitle ?? undefined,
        });
      } catch (e) {
        if (!cancel) setUser(null);
        console.error(e);
      } finally {
        if (!cancel) setUserLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [userSvc]);

  // 2) Con UNA sola llamada trae permitted + role y setea ambos estados
  useEffect(() => {
    if (userLoading) return;
    const mail = user?.mail;
    if (!mail) { setCanChangeRole(false); setUserRole('usuario'); return; }

    let alive = true;
    setPermLoading(true);
    (async () => {
      try {
        const { permitted, role } = await shared.getUserAccess(mail);
        if (!alive) return;
        setCanChangeRole(permitted);
        setUserRole(role);
        if (role === 'admin') setSelected(prev => prev ?? 'misreservas');
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setCanChangeRole(false);
        setUserRole('usuario');
      } finally {
        if (alive) setPermLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [userLoading, user?.mail, shared]);

  // 3) Toggle rol (usa shared.toggleRole)
  const onChangeRole = useCallback(async () => {
    if (!user?.mail || changingRole) return;
    try {
      setChangingRole(true);
      const { after } = await shared.toggleRole(user.mail);
      setUserRole(after);
    } catch (e) {
      console.error(e);
    } finally {
      setChangingRole(false);
    }
  }, [shared, user?.mail, changingRole]);

  const isAdmin = userRole === 'admin';
  const handleNavClick = (key: NavKey) => setSelected(key);

  if (userLoading) {
    return <div className="center muted" style={{ padding: 24 }}>Cargando usuario…</div>;
  }

  return (
    <ToastProvider>
      <div className="page">
        {/* HEADER */}
        <div className="section userCard">
          <div className="userRow">
            <div className="brand"><h1>PARKING EDM</h1></div>

            <div className="userCluster">
              <div className="avatar">
                {user?.displayName ? user.displayName[0] : <span>?</span>}
              </div>
              <div className="userInfo">
                {user ? (
                  <>
                    <div className="userName">{user.displayName}</div>
                    <div className="userMail">{user.mail}</div>
                    {user.jobTitle && <div className="userTitle">{user.jobTitle}</div>}
                    <div className="userMail">{isAdmin ? 'admin' : 'usuario'}</div>
                  </>
                ) : (
                  <div className="errorText">No se pudo cargar el usuario</div>
                )}
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {canChangeRole && (
                  <button
                    onClick={onChangeRole}
                    disabled={!user?.mail || changingRole || permLoading}
                    className="btn-change-role"
                    aria-busy={changingRole || permLoading || undefined}
                  >
                    {changingRole ? 'Actualizando…' : (permLoading ? 'Verificando…' : 'Cambiar rol')}
                  </button>
                )}
                <button className="btn-change-role" onClick={signOut}>
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* NAV solo admin */}
        {isAdmin && (
          <nav className="nav">
            {NAVS_ADMIN.map((nav) => (
              <button
                key={nav.key}
                onClick={() => handleNavClick(nav.key)}
                className="navBtn"
                style={{
                  background: selected === nav.key ? '#38bdf8' : '#fff',
                  color: selected === nav.key ? '#fff' : '#2563eb',
                  boxShadow: selected === nav.key ? '0 2px 8px #38bdf855' : 'none',
                }}
              >
                {nav.label}
              </button>
            ))}
          </nav>
        )}

        {/* MAIN */}
        <main className="main">
          {!isAdmin && user?.mail && (
            <>
              <div className="center">
                <h2>Reservar Parqueadero</h2>
                <Availability userEmail={user.mail} userName={user.displayName!} />
              </div>
              <MisReservas userMail={user.mail} isAdmin={false} />
            </>
          )}

          {isAdmin && selected === 'misreservas' && user?.mail && (
            <MisReservas userMail={user.mail} isAdmin />
          )}

          {isAdmin && selected === 'celdas' && <AdminCells />}

          {isAdmin && selected === 'admin' && (
            <div className="center">
              <h2>Administración</h2>
              <AdminSettings settingsSvc={settings} />
            </div>
          )}

          {isAdmin && selected === 'colaboradores' && (
            <div className="center">
              <h2>Colaboradores</h2>
              <ColaboradoresInscritos />
            </div>
          )}

          {isAdmin && selected === 'reportes' && <Reportes />}

          {isAdmin && selected === 'pyp' && (
            <div className="center">
              <PicoPlacaAdmin />
            </div>
          )}
        </main>
      </div>
    </ToastProvider>
  );
}

// ------------------ App raíz ------------------
export default function App() {
  const { ready, account, signIn } = useAuth();

  if (!ready) {
    return <div className="center muted" style={{ padding: 24 }}>Conectando…</div>;
  }

  if (!account) {
    return (
      <div className="page">
        <div className="section userCard">
          <div className="userRow">
            <div className="brand"><h1>PARKING EDM</h1></div>
          </div>
        </div>

        <main className="main">
          <div className="center login-hero">
            <h2>Inicia sesión para continuar</h2>
            <p className="login-subtitle">Bienvenido a la aplicación de parqueaderos EDM</p>
            <div className="login-actions">
              <button className="btn-change-role btn-narrow" onClick={signIn}>
                Iniciar sesión
              </button>
            </div>
            <small className="muted">
              Si tu navegador bloquea la ventana emergente, habilítala para este sitio.
            </small>
          </div>
        </main>
      </div>
    );
  }

  return (
    <GraphServicesProvider>
      <AppInner />
    </GraphServicesProvider>
  );
}
