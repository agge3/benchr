import { Outlet, Link } from 'react-router';

export default function Layout() {
  return (
    <div className="h-screen flex flex-col">
      <nav className="bg-gray-900 text-white p-4">
        <div className="flex gap-6 items-center">
          <Link to="/" className="text-xl font-bold hover:text-blue-400">
            Compiler Bench
          </Link>
          <Link to="/jobs" className="hover:text-blue-400">
            Job History
          </Link>
        </div>
      </nav>
      
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
