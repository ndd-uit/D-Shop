import logo from "../../assets/logo.png"

function ManagerPageSkeleton() {
    return (
        <div className="min-h-screen bg-[#faf6ef] animate-pulse">
            <div className="mx-auto flex min-h-screen max-w-[1920px]">
                {/* Sidebar skeleton placeholder */}
                <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-[#eadfd6] bg-[#fffdf9] py-8 lg:flex">
                    <div className="mx-6 mb-10 flex items-center gap-3">
                        <img src={logo} alt="D Shop" className="h-9 w-[108px] object-contain opacity-60" />
                    </div>
                    <div className="flex-1 space-y-4 px-4">
                        <div className="h-3 w-16 bg-[#eadfd6]/70 rounded" />
                        <div className="h-10 bg-[#eadfd6]/40 rounded-lg" />
                        <div className="h-3 w-20 bg-[#eadfd6]/70 rounded mt-6" />
                        <div className="h-10 bg-[#eadfd6]/40 rounded-lg" />
                        <div className="h-10 bg-[#eadfd6]/40 rounded-lg" />
                        <div className="h-10 bg-[#eadfd6]/40 rounded-lg" />
                        <div className="h-3 w-16 bg-[#eadfd6]/70 rounded mt-6" />
                        <div className="h-10 bg-[#eadfd6]/40 rounded-lg" />
                        <div className="h-10 bg-[#eadfd6]/40 rounded-lg" />
                    </div>
                </aside>

                {/* Main area skeleton */}
                <div className="min-w-0 flex-1">
                    <header className="sticky top-0 z-30 flex h-24 items-center border-b border-[#eadfd6] bg-[#faf6ef]/95 px-5 backdrop-blur sm:px-8 lg:h-28 lg:px-12 xl:px-16">
                        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between">
                            <div className="space-y-2">
                                <div className="h-8 w-44 bg-[#eadfd6]/70 rounded-lg" />
                                <div className="h-4 w-64 bg-[#eadfd6]/40 rounded" />
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-[#eadfd6]/50 rounded-lg" />
                                <div className="h-12 w-12 bg-[#eadfd6]/50 rounded-full" />
                            </div>
                        </div>
                    </header>
                    <main className="mx-auto max-w-[1440px] space-y-8 px-5 py-8 sm:px-8 lg:px-12 lg:py-12 xl:px-16">
                        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
                            {[1, 2, 3, 4].map((item) => (
                                <div key={item} className="h-40 rounded-xl border border-[#eadfd6] bg-[#fffdf9]" />
                            ))}
                        </div>
                        <div className="h-72 rounded-xl border border-[#eadfd6] bg-[#fffdf9]" />
                    </main>
                </div>
            </div>
        </div>
    )
}

export default ManagerPageSkeleton
