import { motion } from "framer-motion";
import { Twitter, Linkedin, Github } from "lucide-react";

export default function Footer() {

  const schedNovaColor = "#FFD166";

  const hoverEffect = {
    scale: 1.2,
    transition: { type: "spring", stiffness: 400, damping: 10 },
  };

  return (
    <footer className="bg-[#5523AB] py-10 text-white">
      <div className="max-w-6xl mx-auto px-6 md:px-12 grid md:grid-cols-3 gap-8 text-center md:text-left">

        <div>
          <h4 className="text-xl font-bold mb-3" style={{ color: schedNovaColor }}>
            SchedNova
          </h4>
          <p className="text-sm opacity-90 text-white/90">
            Intelligent, clash-free timetable scheduling for a smarter university.
          </p>
        </div>

        <div>
          <h5 className="font-semibold mb-3" style={{ color: schedNovaColor }}>
            Quick Links
          </h5>
          <ul className="space-y-2 opacity-90">
            {["Features", "About"].map((link, i) => (
              <li key={i}>
                <a
                  href={`#${link.toLowerCase()}`}
                  className="hover:text-yellow-400 transition-all duration-200 block text-white"
                >
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="font-semibold mb-3" style={{ color: schedNovaColor }}>
            Follow Us
          </h5>
          <div className="flex justify-center md:justify-start gap-4">
            {[Twitter, Linkedin, Github].map((Icon, i) => (
              <motion.a key={i} href="#" whileHover={hoverEffect}>
                <Icon className="w-5 h-5 text-white" />
              </motion.a>
            ))}
          </div>
        </div>

      </div>

      <div className="text-center text-sm mt-8 border-t border-white/30 pt-4 opacity-80">
        © 2025 SchedNova | Built for a Smart University
      </div>
    </footer>
  );
}