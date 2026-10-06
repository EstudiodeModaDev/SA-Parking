import { BiCalendar } from "react-icons/bi";
import { IoPersonOutline } from "react-icons/io5";
import { RiParkingBoxLine } from "react-icons/ri";
import { SlSettings } from "react-icons/sl";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/reserva", label: "Reservas", icon: <BiCalendar size={20}/> },
  {to: "/celdas", label:"Celdas", icon:<RiParkingBoxLine size={20}/>},
  { to: "/colaboradores", label:"Colaboradores", icon: <IoPersonOutline size={20}/>},
  {to : "/configuraciones", label:"Configuraciones", icon: <SlSettings size={20}/>}
];

function SideBar() {
  return (
    <aside className=" fixed left-0 top-16 bottom-0 w-20 lg:w-60 bg-white border-r border-gray-300 z-40 flex flex-col justify-between">
      <div className="py-space-lg">
        <nav className="flex flex-col space-y-1 px-space-sm m-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-3 justify-stretch py-2 rounded-lg transition-colors flex gap-4 ${
                  isActive
                    ? "bg-info-bg text-blue-700 font-semibold border-l-[3px] border-blue-600 bg-sky-100"
                    : "text-text hover:bg-bg-subtle"
                }`
              }
            >
              {link.icon}
              <div className="hidden lg:inline-flex">{link.label}</div>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-space-lg border-t border-border bg-bg-app/50">
        <div className="flex items-center gap-space-xs font-caption-default text-caption-default text-text-muted">
        </div>
      </div>
    </aside>
  );
}

export default SideBar;
