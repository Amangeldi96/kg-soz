import React, { useState, useEffect, useCallback } from 'react';

const COLORS = ['#26a69a', '#d4e157', '#ef5350', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da'];
// Кыргыз алфавити бош орундарды толтуруу үчүн
const KYRGYZ_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУҮФХЦЧШЩЪЫЬЭЮЯӨҢ";

const FilwordGame = ({ wordsData }) => {
  const [currentCatIndex, setCurrentCatIndex] = useState(0);
  const [grid, setGrid] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [targetWords, setTargetWords] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [score, setScore] = useState(0);
  const [hintCount, setHintCount] = useState(3);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [hintCell, setHintCell] = useState(null);
  const [showWinModal, setShowWinModal] = useState(false);

  const gridSize = 6;
  const currentCategory = wordsData[currentCatIndex];

  useEffect(() => {
    const timer = setInterval(() => setTotalSeconds(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const generateLevel = useCallback(() => {
    if (!currentCategory) return;

    let newGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let finalWords = [];
    
    const availableWords = currentCategory.words
      .filter(w => w.length >= 3 && w.length <= 6)
      .map(w => w.toUpperCase());

    const solve = (r, c) => {
      if (r === gridSize) return true;
      let nextR = c === gridSize - 1 ? r + 1 : r;
      let nextC = c === gridSize - 1 ? 0 : c + 1;
      if (newGrid[r][c]) return solve(nextR, nextC);

      const shuffled = [...availableWords].sort(() => Math.random() - 0.5).slice(0, 15);

      for (let word of shuffled) {
        const paths = findPaths(r, c, word.length, newGrid);
        for (let path of paths) {
          path.forEach((p, i) => newGrid[p.r][p.c] = { char: word[i], word: word });
          if (solve(nextR, nextC)) {
            finalWords.push({ word, path });
            return true;
          }
          path.forEach(p => newGrid[p.r][p.c] = null);
        }
      }
      return false;
    };

    function findPaths(r, c, len, g) {
      let res = [];
      const explore = (currR, currC, path, vis) => {
        if (path.length === len) { res.push([...path]); return; }
        // Г-түрүндө же тик/туура гана жүрүү (диагональ жок)
        const neighbors = [[1,0], [-1,0], [0,1], [0,-1]]
          .map(([dr, dc]) => ({ r: currR + dr, c: currC + dc }))
          .filter(n => n.r >= 0 && n.r < gridSize && n.c >= 0 && n.c < gridSize && !g[n.r][n.c] && !vis.has(`${n.r},${n.c}`));
        
        for (let n of neighbors) {
          vis.add(`${n.r},${n.c}`); 
          path.push(n);
          explore(n.r, n.c, path, vis);
          path.pop(); 
          vis.delete(`${n.r},${n.c}`);
        }
      };
      explore(r, c, [{ r, c }], new Set([`${r},${c}`]));
      return res.sort(() => Math.random() - 0.5).slice(0, 3);
    }

    solve(0, 0);

    // КРИТИКАЛЫК ОҢДОО: Бош калган клеткаларды толтуруу
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!newGrid[r][c]) {
          const randomChar = KYRGYZ_ALPHABET[Math.floor(Math.random() * KYRGYZ_ALPHABET.length)];
          newGrid[r][c] = { char: randomChar, word: null, isFiller: true };
        }
      }
    }

    setGrid([...newGrid]);
    setTargetWords(finalWords);
    setFoundWords([]);
    setShowWinModal(false);
  }, [currentCatIndex, wordsData]);

  useEffect(() => {
    generateLevel();
  }, [generateLevel]);

  const startSelection = (r, c) => {
    if (foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
    setIsSelecting(true);
    setSelectedCells([{ r, c }]);
  };

  const moveSelection = (r, c) => {
    if (!isSelecting) return;
    if (selectedCells.some(s => s.r === r && s.c === c)) return;

    const last = selectedCells[selectedCells.length - 1];
    
    // КЫЙГАЧТЫ ӨЧҮРҮҮ: Болгону vertical же horizontal (диагональ эмес)
    const isVertical = last.c === c && Math.abs(last.r - r) === 1;
    const isHorizontal = last.r === r && Math.abs(last.c - c) === 1;

    if (isVertical || isHorizontal) {
      setSelectedCells(prev => [...prev, { r, c }]);
    }
  };

  const handleTouchMove = (e) => {
    if (!isSelecting) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el.getAttribute('data-r')) {
      moveSelection(parseInt(el.getAttribute('data-r')), parseInt(el.getAttribute('data-c')));
    }
  };

  const endSelection = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    const selectedText = selectedCells.map(cell => grid[cell.r][cell.c].char).join('');
    
    // Сөздү текшерүү
    const match = targetWords.find(t => t.word === selectedText && !foundWords.some(f => f.word === t.word));

    if (match) {
      const color = COLORS[foundWords.length % COLORS.length];
      const newFound = [...foundWords, { ...match, cells: [...selectedCells], color }];
      setFoundWords(newFound);
      setScore(prev => prev + (match.word.length * 10));

      if (newFound.length === targetWords.length) {
        setShowWinModal(true);
      }
    }
    setSelectedCells([]);
  };

  const nextLevel = () => {
    if (currentCatIndex < wordsData.length - 1) {
      setCurrentCatIndex(prev => prev + 1);
    } else {
      alert("Оюн бүттү! Сиз мыктысыз!");
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const progress = (foundWords.length / targetWords.length) * 100 || 0;

  return (
    <div onMouseUp={endSelection} onTouchEnd={endSelection} style={styles.container}>
      
      <div style={styles.header}>
        <h2 style={styles.categoryTitle}>{currentCategory?.category.replace(/_/g, ' ')}</h2>
        <div style={styles.statsRow}>
          <span>Деңгээл: {currentCatIndex + 1}</span>
          <span>Убакыт: {formatTime(totalSeconds)}</span>
        </div>
        <div style={styles.progressContainer}>
          <div style={{ ...styles.progressBar, width: `${progress}%` }} />
        </div>
      </div>

      <div style={styles.scoreRow}>
        <div style={styles.scoreBadge}>🏆 {score}</div>
        <button 
          onClick={() => {
            if (hintCount > 0) {
              const next = targetWords.find(t => !foundWords.some(f => f.word === t.word));
              if (next) { 
                setHintCell(next.path[0]); 
                setHintCount(c => c - 1); 
                setTimeout(() => setHintCell(null), 1500); 
              }
            }
          }}
          style={styles.hintBtn}
        >
          💡 Жардам ({hintCount})
        </button>
      </div>

      <div onTouchMove={handleTouchMove} style={styles.grid}>
        {grid.map((row, r) => row.map((cell, c) => {
          const isSel = selectedCells.some(s => s.r === r && s.c === c);
          const fnd = foundWords.find(f => f.cells.some(s => s.r === r && s.c === c));
          const isHnt = hintCell?.r === r && hintCell?.c === c;

          return (
            <div
              key={`${r}-${c}`} data-r={r} data-c={c}
              onMouseDown={() => startSelection(r, c)}
              onMouseEnter={() => moveSelection(r, c)}
              onTouchStart={(e) => { e.preventDefault(); startSelection(r, c); }}
              style={{
                ...styles.cell,
                backgroundColor: isSel ? '#38bdf8' : fnd ? fnd.color : isHnt ? '#ec4899' : '#334155',
                animation: isHnt ? 'hintPulse 0.8s infinite' : 'none',
                color: fnd || isSel || isHnt ? 'white' : '#cbd5e1',
                transform: isSel ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              {cell?.char}
            </div>
          );
        }))}
      </div>

      {showWinModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={{ fontSize: '28px', marginBottom: '10px' }}>Укмуш! 🎉</h2>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Бардык сөздөрдү таптыңыз!</p>
            <button onClick={nextLevel} style={styles.nextBtn}>Кийинки Деңгээл</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes hintPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); background-color: #f472b6; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

// Styles ошол эле бойдон калды...
const styles = {
  container: { backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', userSelect: 'none', touchAction: 'none', fontFamily: 'sans-serif' },
  header: { width: '100%', maxWidth: '400px', marginBottom: '15px' },
  categoryTitle: { textAlign: 'center', color: '#38bdf8', fontSize: '24px', textTransform: 'uppercase', marginBottom: '5px', letterSpacing: '1px' },
  statsRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' },
  progressContainer: { width: '100%', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' },
  progressBar: { height: '100%', background: '#10b981', transition: '0.4s ease-out' },
  scoreRow: { display: 'flex', gap: '15px', marginBottom: '20px' },
  scoreBadge: { background: '#1e293b', padding: '8px 20px', borderRadius: '12px', border: '2px solid #38bdf8', fontSize: '18px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  hintBtn: { background: '#8b5cf6', border: 'none', color: 'white', padding: '8px 15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', width: '95vw', maxWidth: '380px', background: '#1e293b', padding: '12px', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' },
  cell: { aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', fontSize: '22px', fontWeight: 'bold', transition: '0.15s all ease' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' },
  modalContent: { background: '#1e293b', padding: '30px', borderRadius: '24px', textAlign: 'center', border: '2px solid #38bdf8', width: '80%', maxWidth: '300px' },
  nextBtn: { background: '#10b981', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%' }
};

export default FilwordGame;