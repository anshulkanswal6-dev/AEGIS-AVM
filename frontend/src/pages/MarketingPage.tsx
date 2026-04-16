import React from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/Aegis-logo.jpeg";
import uiss from "../assets/uiss.png";

// Inline Button Component
const Button = React.forwardRef(
  ({ variant = "default", size = "default", className = "", children, ...props }: any, ref: any) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variants: any = {
      default: "bg-[#aef98e] text-black hover:bg-[#9ee07e]",
      secondary: "bg-gray-800 text-[#aef98e] hover:bg-gray-700",
      ghost: "hover:bg-gray-800/50 text-[#aef98e]",
      gradient: "bg-gradient-to-b from-[#aef98e] via-[#aef98e]/95 to-[#aef98e]/60 text-black hover:scale-105 active:scale-95"
    };
    
    const sizes: any = {
      default: "h-9 px-4 py-2 text-sm",
      sm: "h-8 px-4 text-xs",
      lg: "h-11 px-6 text-base"
    };
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

// Icons
const ArrowRight = ({ className = "", size = 16 }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
);

const Menu = ({ className = "", size = 24 }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
);

const X = ({ className = "", size = 24 }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);

const Check = ({ className = "", size = 16 }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12" /></svg>
);

const Zap = ({ size = 24 }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);

const Wallet = ({ size = 24 }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
);

const Clock = ({ size = 24 }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

const Database = ({ size = 24 }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
);

const Send = ({ size = 24 }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);

// Background Floating Elements
const BackgroundElements = () => {
  const [scrollPos, setScrollPos] = React.useState(0);
  
  React.useEffect(() => {
    const handleScroll = () => setScrollPos(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Toggle visibility every 400px of scroll
  const isBtcVisible = Math.floor(scrollPos / 400) % 2 === 0;

  return (
    <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden opacity-10">
      {/* Bitcoin Icon */}
      <div 
        className={`absolute top-1/4 left-[15%] transition-all duration-1000 ease-in-out ${isBtcVisible ? "opacity-100 scale-100 blur-none" : "opacity-0 scale-50 blur-xl"}`}
        style={{ animation: "spin 20s linear infinite, float 10s ease-in-out infinite" }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#aef98e" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894c-4.924-.869-6.14-6.025-1.216-6.894m1.216 6.894V22m0-9.805V5.5m0-4v4.5m0 0a6.5 6.5 0 0 1 0 13a6.5 6.5 0 0 1 0-13ZM12 4.5l.5-1.5M12 4.5l-.5-1.5M12 18.5l.5 1.5M12 18.5l-.5 1.5"/>
        </svg>
      </div>

      {/* Dollar Icon */}
      <div 
        className={`absolute bottom-1/4 right-[15%] transition-all duration-1000 ease-in-out ${!isBtcVisible ? "opacity-100 scale-100 blur-none" : "opacity-0 scale-50 blur-xl"}`}
        style={{ animation: "spin-reverse 25s linear infinite, float 12s ease-in-out infinite" }}
      >
        <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#aef98e" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>
    </div>
  );
};

// Reveal Wrapper Component
const Reveal = ({ children }: any) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const ref = React.useRef<any>(null);
  
    React.useEffect(() => {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
        }
      }, { threshold: 0.1 });
  
      if (ref.current) observer.observe(ref.current);
      return () => observer.disconnect();
    }, []);
  
    return (
      <div ref={ref} className={`transition-all duration-1000 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        {children}
      </div>
    );
  };


const Navigation = React.memo(({ onLaunch }: { onLaunch: () => void }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="fixed top-0 w-full z-50 border-b border-gray-800/50 bg-black/80 backdrop-blur-md">
      <nav className="max-w-6xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Aegis Logo" className="h-7 w-auto rounded" />
          </div>
          
          <div className="hidden md:flex items-center justify-center gap-6 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <a href="#features" className="text-xs text-[#aef98e]/60 hover:text-[#aef98e] transition-colors">Features</a>
            <a href="#faq" className="text-xs text-[#aef98e]/60 hover:text-[#aef98e] transition-colors">FAQ</a>
            <Link to="/documentation" className="text-xs text-[#aef98e]/60 hover:text-[#aef98e] transition-colors">Docs</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button type="button" variant="default" size="sm" onClick={onLaunch}>Launch App</Button>
          </div>

          <button
            type="button"
            className="md:hidden text-[#aef98e]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-gray-800/50 animate-[slideDown_0.3s_ease-out]">
          <div className="px-6 py-4 flex flex-col gap-4">
            <a href="#features" className="text-sm text-[#aef98e]/60 hover:text-[#aef98e] transition-colors" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#faq" className="text-sm text-[#aef98e]/60 hover:text-[#aef98e] transition-colors" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <Link to="/documentation" className="text-sm text-[#aef98e]/60 hover:text-[#aef98e] transition-colors" onClick={() => setMobileMenuOpen(false)}>Docs</Link>
            <div className="pt-4 border-t border-gray-800/50">
              <Button type="button" variant="default" size="sm" className="w-full" onClick={onLaunch}>Launch App</Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

// Hero Component
const Hero = React.memo(({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-start px-6 pt-24 pb-32 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-40 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#aef98e]/20 blur-[150px] rounded-full"></div>
      </div>

      <h1 className="text-3xl md:text-6xl font-bold text-center max-w-3xl px-6 leading-[1.05] mb-5 tracking-tight text-[#aef98e]">
        Agentic Execution Layer for On-Chain Jobs
      </h1>

      <p className="text-base md:text-lg text-center max-w-xl px-6 mb-8 text-[#9ca3af]">
        Build onchain AI Agents with simple prompts. <br className="hidden md:block" />
        No smart contract expertise or SDK setup required.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 relative z-10">
        <Button variant="gradient" size="lg" className="px-7 py-5 text-sm shadow-[0_0_30px_-5px_#aef98e55]" onClick={onGetStarted}>Get Started</Button>
        <Button variant="secondary" size="lg" className="px-7 py-5 text-sm" onClick={() => navigate("/documentation")}>Open Docs</Button>
      </div>

      <div className="w-full max-w-4xl relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#aef98e]/0 via-[#aef98e]/20 to-[#aef98e]/0 blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        {/* Hard Orange Glow Effect - Fading Upwards */}
        <div className="absolute -top-24 left-3 right-3 h-24 bg-gradient-to-t from-[#f97316]/40 via-[#f97316]/10 to-transparent z-0 blur-2xl pointer-events-none"></div>
        <div className="absolute top-0 left-3 right-3 h-[2px] bg-orange-500/50 z-0 shadow-[0_0_15px_#f97316]"></div>
        {/* Ambient Glow for bottom/sides */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#f97316]/10 z-0 blur-3xl rounded-3xl pointer-events-none"></div>
        <div className="absolute -inset-2 shadow-[0_0_40px_rgba(249,115,22,0.15)] z-0 rounded-3xl pointer-events-none"></div>
        
        <div className="relative z-10 p-1.5 rounded-xl bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl shadow-2xl overflow-hidden">
             <img src={uiss} alt="Aegis Dashboard" className="w-full h-auto rounded-lg opacity-90 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </section>
  );
});

// Features Component
const Features = React.memo(() => {
  const features = [
    {
      title: "Intent → On-Chain Execution",
      subheading: "Convert natural language into executable blockchain logic",
      content: "Aegis parses user prompts into structured automation specs including trigger conditions (time, event, state), actions (transfer, contract interaction), and execution parameters. No SDKs. No manual contract writing.",
      icon: <Zap />
    },
    {
      title: "Agent Wallet Architecture",
      subheading: "Each automation runs through a dedicated smart contract",
      content: "Aegis deploys an Agent Wallet per user/automation that holds funds securely, executes transactions autonomously, and enforces predefined execution logic. Execution is verifiable and on-chain.",
      icon: <Wallet />
    },
    {
      title: "Continuous Trigger Monitoring",
      subheading: "Automations run without user intervention",
      content: "Aegis continuously evaluates scheduled triggers, price-based conditions, and on-chain events. When conditions are met, execution is triggered automatically.",
      icon: <Clock />
    },
    {
      title: "Telegram- Remote Brain Bot",
      subheading: "Manage agents directly from Telegram via Open Claw",
      content: "Users can deploy automations, monitor execution, receive alerts, and manage agents remotely. Telegram acts as a real-time control interface for Aegis.",
      icon: <Send />
    }
  ];

  return (
    <section id="features" className="py-48 px-6 max-w-6xl mx-auto">
      <div className="mb-24 text-center">
        <h2 className="text-4xl md:text-7xl font-bold mb-8 text-[#aef98e] tracking-tight">Core Capabilities</h2>
        <p className="text-[#9ca3af] text-lg max-w-2xl leading-relaxed mx-auto">Powering the next generation of autonomous blockchain workflows with intent-based execution.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-8">
        {features.map((f, i) => (
          <div key={i} className="flex flex-col items-center text-center p-8 rounded-3xl bg-gray-900/40 border border-gray-800 hover:border-[#aef98e]/40 transition-all duration-500 group w-full md:w-[calc(50%-2rem)] lg:w-[calc(33.33%-2rem)]">
            <div className="w-12 h-12 rounded-xl bg-[#aef98e]/10 flex items-center justify-center text-[#aef98e] mb-8 group-hover:scale-110 group-hover:bg-[#aef98e]/20 transition-all">
              {React.cloneElement(f.icon, { size: 24 })}
            </div>
            <h3 className="text-xl font-bold mb-3 text-[#aef98e]">{f.title}</h3>
            <p className="text-[#aef98e]/60 text-[11px] font-bold mb-6 uppercase tracking-widest">{f.subheading}</p>
            <p className="text-[#9ca3af]/90 leading-relaxed text-sm font-light leading-7">{f.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
});


// FAQ Component
const FAQ = React.memo(() => {
  const faqs = [
    { q: "What is the Aegis Layer?", a: "Aegis is an autonomous execution environment designed to simplify complex on-chain workflows through advanced agentic orchestration." },
    { q: "How do I create an automation?", a: "Simply define your objective in natural language. Aegis interprets your intent and coordinates the necessary logic for consistent, reliable execution." },
    { q: "Is the platform non-custodial?", a: "Yes. Aegis is built on a non-custodial foundation, meaning you always retain full authority over your digital assets and automation parameters." },
    { q: "What can I automate with Aegis?", a: "From sophisticated monitoring to complex asset movements, Aegis can handle almost any repetitive or conditional on-chain task." },
    { q: "How are alerts managed?", a: "Aegis provides integrated real-time monitoring, delivering critical execution status and alerts directly to your preferred control interface." }
  ];

  return (
    <section id="faq" className="py-48 px-6 max-w-4xl mx-auto">
      <h2 className="text-4xl md:text-7xl font-bold mb-20 text-center text-[#aef98e] tracking-tight">Platform FAQ</h2>
      <div className="grid gap-6">
        {faqs.map((faq, i) => (
          <details key={i} className="group p-8 rounded-[32px] bg-gray-900/30 border border-gray-800/50 hover:border-[#aef98e]/20 transition-all">
            <summary className="text-lg md:text-xl font-bold text-[#aef98e] cursor-pointer list-none flex justify-between items-center outline-none">
              {faq.q}
              <span className="group-open:rotate-180 transition-transform text-[#aef98e]/50">
                <ArrowRight size={24} className="rotate-90" />
              </span>
            </summary>
            <p className="mt-6 text-[#9ca3af] text-base md:text-lg leading-relaxed font-light">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
});

// Launch Section
const Launch = React.memo(({ onLaunch }: { onLaunch: () => void }) => {
    return (
        <section id="launch" className="py-32 px-6">
            <div className="max-w-3xl mx-auto p-8 md:p-12 rounded-3xl bg-gradient-to-br from-[#aef98e]/20 to-transparent border border-[#aef98e]/20 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-40 h-40 bg-[#aef98e]/10 blur-[80px] rounded-full"></div>
                
                <h2 className="text-2xl md:text-4xl font-bold text-[#aef98e] mb-8">Deploy Your First Agent</h2>
                
                <div className="relative flex justify-between items-start gap-0 mb-12 px-2 md:px-6">
                    {/* The "Chain" Line */}
                    <div className="absolute top-4 left-[10%] right-[10%] h-[1px] bg-white/10 -z-0 hidden md:block" />
                    
                    {["Connect wallet", "Describe automation", "Review plan", "Deploy wallet", "Run autonomously"].map((step, i) => (
                        <div key={i} className="flex flex-col items-center flex-1 relative z-10">
                            <div className="w-8 h-8 rounded-full bg-[#aef98e] text-black text-[11px] font-bold flex items-center justify-center mb-4 shadow-[0_0_25px_-5px_#aef98e] relative z-20 border-4 border-[#1e3a1a] box-content">
                                {i+1}
                            </div>
                            <span className="text-[#9ca3af] text-[9px] md:text-[10px] font-medium max-w-[80px] text-center leading-tight">
                                {step}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button variant="gradient" size="lg" className="px-8 py-4 text-sm shadow-[0_0_40px_-10px_#aef98e]" onClick={onLaunch}>Launch Aegis</Button>
                    <Button variant="secondary" size="lg" className="px-8 py-4 text-sm" onClick={() => navigate("/documentation")}>View Documentation</Button>
                </div>
            </div>
        </section>
    );
});

const Footer = () => (
  <footer className="pt-32 pb-16 border-t border-gray-900/50 bg-black">
    <div className="max-w-6xl mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-24">
        {/* Brand Section */}
        <div className="md:col-span-5 space-y-8">
          <div className="flex items-center gap-3">
              <img src={logo} alt="Aegis Logo" className="h-10 w-auto rounded-lg shadow-[0_0_20px_rgba(174,249,142,0.1)]" />
              <span className="text-[#aef98e] text-3xl font-black tracking-tighter"></span>
          </div>
          <p className="text-[#9ca3af] text-lg leading-relaxed max-w-sm font-light">
            Enabling the decentralized execution layer for a future powered by autonomous on-chain agents.
          </p>
        </div>

        {/* Links Sections */}
        <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12">
          <div className="space-y-6">
              <h5 className="text-[#aef98e] font-bold uppercase text-[10px] tracking-[4px]">Ecosystem</h5>
              <div className="flex flex-col gap-4">
                  <span className="text-[#9ca3af] text-sm font-medium">Platform</span>
                  <span className="text-[#9ca3af] text-sm font-medium">Architecture</span>
                  <span className="text-[#9ca3af] text-sm font-medium">Nodes</span>
              </div>
          </div>
          <div className="space-y-6">
              <h5 className="text-[#aef98e] font-bold uppercase text-[10px] tracking-[4px]">Resources</h5>
              <div className="flex flex-col gap-4">
                  <span className="text-[#9ca3af] text-sm font-medium">Documentation</span>
                  <span className="text-[#9ca3af] text-sm font-medium">Telegram</span>
                  <span className="text-[#9ca3af] text-sm font-medium">Source</span>
              </div>
          </div>
          <div className="space-y-6">
              <h5 className="text-[#aef98e] font-bold uppercase text-[10px] tracking-[4px]">Legal</h5>
              <div className="flex flex-col gap-4">
                  <span className="text-[#9ca3af] text-sm font-medium">Privacy</span>
                  <span className="text-[#9ca3af] text-sm font-medium">Terms</span>
              </div>
          </div>
        </div>
      </div>

      <div className="pt-12 border-t border-gray-900/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[#9ca3af]/50 text-xs font-medium tracking-wider">
            © 2026 AEGIS. Deployed on ALGORAND
          </p>
          <div className="flex gap-8">
              
          </div>
      </div>
    </div>
  </footer>
);

// Main Component
export default function MarketingPage() {
  const navigate = useNavigate();
  
  const handleStart = () => {
    navigate("/dashboard");
  };

  return (
    <main className="min-h-screen bg-black text-white selection:bg-[#aef98e]/30">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        
        /* Apply font and zoom only to this page */
        .marketing-root { 
          font-family: 'Outfit', sans-serif; 
          zoom: 1.2;
        }
        .marketing-root * { scroll-behavior: smooth; }
        
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        details > summary::-webkit-details-marker { display: none; }
        
        /* Tailored scrollbar for marketing */
        .marketing-root::-webkit-scrollbar { width: 10px; }
        .marketing-root::-webkit-scrollbar-track { background: #000; }
        .marketing-root::-webkit-scrollbar-thumb { background: #111; border-radius: 10px; border: 2px solid #000; }
        .marketing-root::-webkit-scrollbar-thumb:hover { background: #222; }
        
        @keyframes waterRipple {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-30px) rotate(5deg); } }
      `}</style>
      
      <div className="marketing-root">
        <BackgroundElements />
        <Navigation onLaunch={handleStart} />
        <Hero onGetStarted={handleStart} />
        <Reveal><Features /></Reveal>
        <Reveal><FAQ /></Reveal>
        <Reveal><Launch onLaunch={handleStart} /></Reveal>
        <Footer />
      </div>
    </main>
  );
}
