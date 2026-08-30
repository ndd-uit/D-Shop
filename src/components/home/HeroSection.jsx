import { Link } from "react-router-dom"
import homeHero from "../../assets/home-hero.png"

function HeroSection() {
    return (
        <section className="relative flex min-h-[540px] w-full items-center overflow-hidden sm:min-h-[600px] lg:min-h-[640px]">
            <img
                src={homeHero}
                alt="Người mẫu mặc váy dạ hội và suit của D Shop"
                className="absolute inset-0 h-full w-full object-cover object-[68%_center] sm:object-center"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-brand-bg via-brand-bg/88 to-brand-bg/5 sm:via-brand-bg/65 lg:via-brand-bg/30" />

            <div className="relative mx-auto w-full max-w-[1200px] px-5 pb-20 sm:px-6 lg:pb-24">
                <div className="max-w-[570px] home-reveal">
                    <h1 className="mb-5 font-serif text-4xl leading-[1.08] tracking-[-0.035em] text-brand-text sm:text-5xl lg:text-6xl">
                        Thuê phong cách
                        <br />
                        cho mọi khoảnh khắc
                    </h1>

                    <p className="mb-8 max-w-md text-base leading-relaxed text-[#675b55] sm:text-lg">
                        Chọn trang phục phù hợp cho tiệc, sự kiện và những dịp đặc biệt.
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <Link
                            to="/garments"
                            className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full bg-brand-primary px-7 py-3 text-sm font-semibold text-[#382d29] shadow-[0_10px_24px_rgba(242,163,155,0.28)] transition hover:-translate-y-0.5 hover:bg-[#ee9188] active:translate-y-0"
                        >
                            Thuê ngay
                        </Link>

                        <a
                            href="#featured"
                            className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full border border-brand-text/35 bg-white/85 px-7 py-3 text-sm font-semibold text-brand-text backdrop-blur-sm transition hover:border-brand-primary hover:bg-white active:translate-y-px"
                        >
                            Xem bộ sưu tập
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default HeroSection
