import { Outlet } from 'react-router-dom'
import AdminAppBar from './adminAppBar'
import SideBar from './sideBar'

function MainLayout() {

    return (
        <div className='min-h-screen bg-bg-app'>
            <AdminAppBar/>
            <SideBar/>
            <main className='pt-16 pl-20 lg:pl-60 bg-[#f6f9fc] min-h-screen'>
                <div className='p-6 '>
                    <Outlet/>
                </div>
            </main>
        </div>
    )
}

export default MainLayout
