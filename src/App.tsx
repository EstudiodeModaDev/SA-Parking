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

import type { GetAllOpts } from './Models/Commons';

import { useAuth } from './auth/AuthProvider';
import { GraphServicesProvider, useGraphServices } from './graph/GraphServicesContext';
import { UserService } from './Services/User.Service';
import { SharedServices } from './Services/Shared.service';

// ------------------ Constantes UI ------------------
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

// ------------------ Header reutilizable ------------------
function HeaderBar(props: {
  user: User;
  role: 'admin' | 'usuario';
  canChangeRole?: boolean;
  changingRole?: boolean;
  permLoading?: boolean;
  onChangeRole?: () => void;
  onPrimaryAction?: { label: string; onClick: () => void } | null; // e.g. Sign In / Sign Out
}) {
  const { user, role, canChangeRole, changingRole, permLoading, onChangeRole, onPrimaryAction } = props;
  const isLogged = Boolean(user);

  return (
    <div className="section userCard">
      <div className="userRow">
        <div className="brand">
          <h1>PARKING EDM</h1>
        </div>

        <div className="userCluster">
          <div className="avatar">
            {/* Si hay usuario, primera letra; si no, '?' */}
            {user?.displayName ? user.displayName[0] : <span>?</span>}
          </div>

          <div className="userInfo">
            {isLogged ? (
              <>
                <div className="userName">{user?.displayName}</div>
                <div className="userMail">{user?.mail}</div>
                {user?.jobTitle && <div className="userTitle">{user.jobTitle}</div>}
                <div className="userMail">{role}</div>
              </>
            ) : (
              // Mismo bloque para mantener layout, sin info sensible
              <>
                <div className="userName">Invitado</div>
                <div className="userMail">–</div>
              </>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {/* Botón cambiar rol solo si hay sesión y está permitido */}
            {isLogged && canChangeRole && (
              <button
                onClick={onChangeRole}
                disabled={changingRole || permLoading}
                className="btn-change-user"
                aria-busy={changingRole || permLoading || undefined}
                aria-label="Cambiar rol de usuario"
                title="Cambiar rol"
              >
                {changingRole ? 'Actualizando…' : (permLoading ? 'Verificando…' : 'Cambiar rol')}
              </button>
            )}

            {/* Acción primaria a la derecha: Sign In (sin sesión) o Sign Out (con sesión) */}
            {onPrimaryAction && (
              <button className="btn-logout" onClick={onPrimaryAction.onClick} aria-label={onPrimaryAction.label} title={onPrimaryAction.label}>
                <span aria-hidden>⎋</span> {onPrimaryAction.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------ Helpers que usan el contexto ------------------
function useRoleHelpers() {
  const { usuariosParking } = useGraphServices();

  const normRows = (res: any): any[] =>
    (res?.data ?? res?.value ?? (Array.isArray(res) ? res : [])) as any[];

  const changeUser = useCallback(async (userEmail: string) => {
    const email = (userEmail ?? '').trim();
    if (!email) throw new Error('userEmail requerido');
    const emailSafe = email.replace(/'/g, "''");

    const opt: GetAllOpts = { filter: `fields/Title eq '${emailSafe.toLowerCase()}'`, top: 1 as any };
    const res = await usuariosParking.getAll(opt);
    const rows = normRows(res);
    const user = rows[0];
    if (!user) throw new Error(`Usuario no encontrado: ${email}`);

    const id = user.ID ?? user.Id ?? user.id;
    if (id == null) throw new Error('El usuario no tiene ID');

    const currentRol = String(user.Rol ?? user.rol ?? '').toLowerCase();
    const nextRol = currentRol === 'admin' ? 'Usuario' : 'admin';

    await usuariosParking.update(String(id), { Rol: nextRol } as any);
    return { ok: true, id, email, before: currentRol, after: nextRol };
  }, [usuariosParking]);

  return { changeUser };
}

// ------------------ App interna (requiere sesión) ------------------
function AppInner() {
  const [selected, setSelected] = useState<NavKey>('misreservas');

  const [user, setUser] = useState<User>(null);
  const [userLoading, setUserLoading] = useState(true);

  const [userRole, setUserRole] = useState<'admin' | 'usuario'>('usuario');
  const [canChangeRole, setCanChangeRole] = useState(false);
  const [permLoading, setPermLoading] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  const { graph, usuariosParking, settings } = useGraphServices();
  const userSvc = useMemo(() => new UserService(graph), [graph]);
  const shared = useMemo(() => new SharedServices(usuariosParking), [usuariosParking]);

  const { signOut } = useAuth();
  const { changeUser } = useRoleHelpers();

  const onChangeRole = useCallback(async () => {
    if (!user?.mail || changingRole) return;
    try {
      setChangingRole(true);
      const { after } = await changeUser(user.mail);
      const next = String(after).toLowerCase() === 'admin' ? 'admin' : 'usuario';
      setUserRole(next);
    } catch (e) {
      console.error(e);
    } finally {
      setChangingRole(false);
    }
  }, [changeUser, user?.mail, changingRole]);

  // 1) Perfil
  useEffect(() => {
    let cancel = false;
    setUserLoading(true);
    (async () => {
      try {
        const me = await userSvc.getMeBasic();
        if (cancel) return;
        setUser({
          displayName: me.displayName ?? undefined,
          mail: (me.mail ?? me.userPrincipalName ?? '').toLowerCase() || undefined,
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

  // 2) Role + permisos
  useEffect(() => {
    if (userLoading) return;
    const mail = user?.mail;
    if (!mail) { setCanChangeRole(false); setUserRole('usuario'); return; }

    let alive = true;
    setPermLoading(true);
    (async () => {
      try {
        let roleRaw;
        let permitted;
        const object = await shared.getRole(user!.mail!);
        if (object) {
          roleRaw = object.Rol ?? 'usuario';
          permitted = object.Permitidos ?? false;
        }
        if (!alive) return;

        const role = String(roleRaw ?? 'usuario').toLowerCase() === 'admin' ? 'admin' : 'usuario';
        setUserRole(role);
        setCanChangeRole(Boolean(permitted));

        if (role === 'admin') setSelected(prev => prev ?? 'misreservas');
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setUserRole('usuario');
        setCanChangeRole(false);
      } finally {
        if (alive) setPermLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [userLoading, user?.mail, shared]);

  const isAdmin = userRole === 'admin';
  const handleNavClick = (key: NavKey) => setSelected(key);

  if (userLoading) {
    return (
      <div className="page">
        <HeaderBar
          user={null}
          role="usuario"
          onPrimaryAction={null}
        />
        <div className="center muted" style={{ padding: 24 }}>
          Cargando usuario…
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="page">
        {/* HEADER (mismo layout) */}
        <HeaderBar
          user={user}
          role={isAdmin ? 'admin' : 'usuario'}
          canChangeRole={canChangeRole}
          changingRole={changingRole}
          permLoading={permLoading}
          onChangeRole={onChangeRole}
          onPrimaryAction={{ label: 'Cerrar sesión', onClick: () => signOut() }}
        />

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
    return (
      <div className="page">
        <HeaderBar user={null} role="usuario" onPrimaryAction={null} />
        <div className="center muted" style={{ padding: 24 }}>
          Conectando…
        </div>
      </div>
    );
  }

  if (!account) {
    // MISMO HEADER, sin datos y con botón “Iniciar sesión” a la derecha
    return (
      <div className="page">
        <HeaderBar
          user={null}
          role="usuario"
          onPrimaryAction={{ label: 'Iniciar sesión', onClick: () => signIn() }}
        />

        <main className="main">
          <div className="center login-hero">
            <h2>Inicia sesión para continuar</h2>
            <p className="login-subtitle">Bienvenido a la aplicación de parqueaderos EDM</p>

            <small className="muted">
              Si tu navegador bloquea la ventana emergente, habilítala para este sitio.
            </small>
          </div>
        </main>
      </div>
    );
  }

  // Con sesión
  return (
    <GraphServicesProvider>
      <AppInner />
    </GraphServicesProvider>
  );
}
