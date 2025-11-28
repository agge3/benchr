import { motion } from "motion/react";

export function AnimatedBackground() {
  const snippets = [
    // Right side cluster
    { code: 'elapsed: 0.02s\ncpu: 96%\nmem: 10MB', x: 75, y: 25 },
    { code: 'cache misses: 1.2%\ninstructions: 2.4M', x: 82, y: 65 },
    { code: 'branches: 12.4K\nL1 hits: 98.7%', x: 68, y: 45 },
    
    // Left side cluster
    { code: 'const map = arr => arr.map(x => x * 2);', x: 12, y: 35 },
    { code: 'cycles: 245M\nIPC: 1.8\npage faults: 42', x: 18, y: 72 },
  ];

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-benchr-bg">
      {snippets.map((snippet, i) => (
        <motion.div
          key={i}
          className="absolute font-mono text-xs text-benchr-gold/20 whitespace-pre -rotate-[15deg]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ 
            opacity: [0, 0.5, 0.5, 0.5],
            y: [0, 10, 0, -10, 0],
          }}
		  transition={{
		    duration: 20,
		    delay: i * 0.1,
		    repeat: Infinity,
		    ease: "easeInOut"
		  }}
          style={{
            left: `${snippet.x}%`,
            top: `${snippet.y}%`,
          }}
        >
          {snippet.code}
        </motion.div>
      ))}
    </div>
  );
}
