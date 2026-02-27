export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-[#1a1a2e] text-white p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold">Catalog SaaS</h1>
        </div>
        <nav>
          <ul>
            <li className="mb-4">
              <a href="/dashboard" className="flex items-center py-2 px-4 rounded hover:bg-white hover:text-[#1a1a2e]">
                <span className="material-icons mr-2">dashboard</span>
                Dashboard
              </a>
            </li>
            <li>
              <a href="/catalogue" className="flex items-center py-2 px-4 rounded hover:bg-white hover:text-[#1a1a2e]">
                <span className="material-icons mr-2">store</span>
                Catalogue
              </a>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-8 bg-gray-100">
        {children}
      </main>
    </div>
  );
}