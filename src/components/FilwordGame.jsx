import React, { useState, useEffect, useCallback, useRef } from 'react';

// Түстөр топтому
const COLORS = ['#26a69a', '#ef5350', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da', '#d4e157'];
const KYRGYZ_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУҮФХЦЧШЩЪЫЬЭЮЯӨҢ";

const FilwordGame = ({ wordsData = [] }) => {
  // Абалдар (States)
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('filword_user')) || { name: "Оюнчу" });
  const [view, setView] = useState('menu'); 
  const [currentCatIndex, setCurrentCatIndex] = useState(() => parseInt(localStorage.getItem('filword_level')) || 0);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('filword_score')) || 0);
  const [completedDays, setCompletedDays] = useState(() => JSON.parse(localStorage.getItem('completed_days')) || []);
  
  const [grid, setGrid] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [targetWords, setTargetWords] = useState([]);
  const [categoryName, setCategoryName] = useState(""); 
  const [isSelecting, setIsSelecting] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [hintCell, setHintCell] = useState(null);

  const gridSize = 6;
  const totalCellsCount = 36;
  const today = new Date().getDate();

  // Навигация менюсу
  const navItems = [
    { id: 'menu', icon: 'home-outline', text: 'Башкы' },
    { id: 'calendar', icon: 'calendar-outline', text: 'Күн' },
    { id: 'stats', icon: 'bar-chart-outline', text: 'Рейтинг' },
    { id: 'settings', icon: 'settings-outline', text: 'Профиль' }
  ];

  // Маалыматтарды сактоо
  useEffect(() => {
    localStorage.setItem('filword_level', currentCatIndex);
    localStorage.setItem('filword_score', score);
    localStorage.setItem('completed_days', JSON.stringify(completedDays));
  }, [currentCatIndex, score, completedDays]);

  // Сөздөрдү туташ (snake) жайгаштыруу үчүн DFS издөө
  const findSnakePaths = (startR, startC, len, g) => {
    let results = [];
    const explore = (currR, currC, path, vis) => {
      if (path.length === len) { 
        results.push([...path]); 
        return; 
      }
      if (results.length > 5) return; // Издөөнү чектөө (тез иштөө үчүн)

      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]].sort(() => Math.random() - 0.5);
      for (let [dr, dc] of dirs) {
        let nr = currR + dr, nc = currC + dc;
        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && !g[nr][nc] && !vis.has(`${nr},${nc}`)) {
          vis.add(`${nr},${nc}`);
          path.push({ r: nr, c: nc });
          explore(nr, nc, path, vis);
          path.pop();
          vis.delete(`${nr},${nc}`);
        }
      }
    };
    explore(startR, startC, [{ r: startR, c: startC }], new Set([`${startR},${startC}`]));
    return results;
  };

  // Деңгээлди генерациялоо (Backtracking алгоритми)
  const generateLevel = useCallback((index) => {
    const category = wordsData[index % wordsData.length] || { 
      category: "Жалпы", 
      words: ["АЛМА", "КИЛИМ", "ҮКҮ", "АРСТАН", "КАШЫК", "КИТЕП", "ӨРҮК", "ТАШ"] 
    };
    setCategoryName(category.category || category.name);

    let tempGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let finalWords = [];
    let filledCount = 0;

    const wordPool = [...category.words].map(w => w.toUpperCase()).sort((a, b) => b.length - a.length);

    const solve = (cellIdx) => {
      if (filledCount === totalCellsCount) return true;
      if (cellIdx >= totalCellsCount) return filledCount === totalCellsCount;

      let r = Math.floor(cellIdx / gridSize);
      let c = cellIdx % gridSize;

      if (tempGrid[r][c]) return solve(cellIdx + 1);

      for (let word of wordPool) {
        if (finalWords.some(fw => fw.word === word)) continue;
        const paths = findSnakePaths(r, c, word.length, tempGrid);
        
        for (let path of paths) {
          path.forEach((p, i) => tempGrid[p.r][p.c] = { char: word[i], word });
          finalWords.push({ word, path });
          filledCount += word.length;

          if (solve(cellIdx + 1)) return true;

          // Backtrack (Ката болсо артка кайт)
          filledCount -= word.length;
          finalWords.pop();
          path.forEach(p => tempGrid[p.r][p.c] = null);
        }
      }
      return false;
    };

    solve(0);

    // Эгер бош орун калса, алфавит менен толтур
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!tempGrid[r][c]) {
          tempGrid[r][c] = { 
            char: KYRGYZ_ALPHABET[Math.floor(Math.random() * KYRGYZ_ALPHABET.length)], 
            isFiller: true 
          };
        }
      }
    }

    setGrid(tempGrid);
    setTargetWords(finalWords);
    setFoundWords([]);
    setShowWinModal(false);
    setHintCell(null);
    setView('game');
  }, [wordsData]);

  // Телефон үчүн тийүү (touch) функциялары
  const startSelection = (r, c, e) => {
    // Телефондо экран жылбашы үчүн
    if (e.cancelable) e.preventDefault();
    if (foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
    
    setIsSelecting(true);
    setSelectedCells([{ r, c }]);
  };

  const handleMove = (e) => {
    if (!isSelecting) return;
    if (e.cancelable) e.preventDefault();

    // Сөөмөй турган жерди аныктоо
    const touch = e.touches ? e.touches[0] : e;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (el && el.hasAttribute('data-r')) {
      const r = parseInt(el.getAttribute('data-r'));
      const c = parseInt(el.getAttribute('data-c'));

      if (foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
      if (selectedCells.some(s => s.r === r && s.c === c)) return;

      const last = selectedCells[selectedCells.length - 1];
      const isNeighbor = Math.abs(last.r - r) + Math.abs(last.c - c) === 1;

      if (isNeighbor) {
        setSelectedCells(prev => [...prev, { r, c }]);
      }
    }
  };

  const endSelection = () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    const selectedText = selectedCells.map(cell => grid[cell.r][cell.c].char).join('');
    const match = targetWords.find(t => 
      t.word === selectedText && 
      t.path.length === selectedCells.length && 
      !foundWords.some(f => f.word === t.word)
    );

    if (match) {
      const color = COLORS[foundWords.length % COLORS.length];
      const newFound = [...foundWords, { ...match, cells: [...selectedCells], color }];
      setFoundWords(newFound);
      setScore(prev => prev + (match.word.length * 5));

      if (newFound.length === targetWords.length) {
        setTimeout(() => setShowWinModal(true), 500);
      }
    }
    setSelectedCells([]);
  };

  const useHint = () => {
    if (score < 20) {
      alert("Упай жетпейт! Кеминде 20💎 керек.");
      return;
    }
    const notFound = targetWords.filter(t => !foundWords.some(f => f.word === t.word));
    if (notFound.length > 0) {
      setHintCell(notFound[0].path[0]); 
      setScore(prev => prev - 20);
      setTimeout(() => setHintCell(null), 2000);
    }
  };

  // Негизги экрандар
  return (
    <div style={{ 
      position: 'fixed', inset: 0, 
      background: '#0f172a', color: 'white', 
      fontFamily: 'sans-serif', overflow: 'hidden', 
      touchAction: 'none', userSelect: 'none' 
    }} onPointerUp={endSelection} onTouchEnd={endSelection}>
      
      {/* МЕНЮ ЭКРАНЫ */}
      {view === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '900', color: '#38bdf8', marginBottom: '10px' }}>ФИЛВОРД</h1>
          <p style={{ marginBottom: '40px', opacity: 0.7 }}>Кыргыз тилинде сөз тап!</p>
          
          <div style={{ background: '#1e293b', padding: '30px', borderRadius: '30px', textAlign: 'center', marginBottom: '30px', width: '80%', maxWidth: '300px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>УЧУРДАГЫ ТУР</div>
            <div style={{ fontSize: '4rem', fontWeight: 'bold', margin: '10px 0' }}>{currentCatIndex + 1}</div>
            <div style={{ height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${((currentCatIndex % 10) / 10) * 100}%`, height: '100%', background: '#22c55e' }}></div>
            </div>
          </div>

          <button onClick={() => generateLevel(currentCatIndex)} style={{ 
            background: '#22c55e', color: 'white', border: 'none', 
            padding: '18px 60px', borderRadius: '40px', fontSize: '1.5rem', 
            fontWeight: 'bold', boxShadow: '0 10px 20px rgba(34, 197, 94, 0.3)',
            cursor: 'pointer', transition: 'transform 0.2s'
          }}>
            ОЙНОО
          </button>
        </div>
      )}

      {/* ОЮН ЭКРАНЫ */}
      {view === 'game' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b' }}>
            <button onClick={() => setView('menu')} style={{ background: 'none', border: '1px solid #475569', borderRadius: '50%', color: 'white', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ion-icon name="arrow-back-outline" style={{ fontSize: '24px' }}></ion-icon>
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>КАТЕГОРИЯ</div>
              <div style={{ fontWeight: 'bold' }}>{categoryName}</div>
            </div>
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '8px 15px', borderRadius: '20px', border: '1px solid #0ea5e9', color: '#38bdf8', fontWeight: 'bold' }}>
              💎 {score}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${gridSize}, 1fr)`, 
                gap: '8px', 
                background: '#1e293b', 
                padding: '12px', 
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
              onTouchMove={handleMove} 
              onPointerMove={handleMove}
            >
              {grid.map((row, r) => row.map((cell, c) => {
                const isSel = selectedCells.some(s => s.r === r && s.c === c);
                const fnd = foundWords.find(f => f.cells.some(s => s.r === r && s.c === c));
                const isHint = hintCell && hintCell.r === r && hintCell.c === c;

                return (
                  <div key={`${r}-${c}`} data-r={r} data-c={c} 
                    onPointerDown={(e) => startSelection(r, c, e)}
                    onTouchStart={(e) => startSelection(r, c, e)}
                    style={{
                      width: '13vw', height: '13vw', maxWidth: '55px', maxHeight: '55px',
                      background: fnd ? fnd.color : isSel ? '#3b82f6' : '#334155',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      borderRadius: '10px', fontSize: '1.4rem', fontWeight: '900',
                      transition: 'all 0.15s ease',
                      boxShadow: isSel ? '0 0 15px #3b82f6' : 'none',
                      border: isHint ? '4px solid #facc15' : 'none',
                      animation: isHint ? 'pulse 1s infinite' : 'none'
                    }}
                  >
                    {cell?.char}
                  </div>
                );
              }))}
            </div>
          </div>

          <div style={{ padding: '30px', textAlign: 'center' }}>
            <button onClick={useHint} style={{ 
              background: '#eab308', color: '#000', border: 'none', 
              padding: '15px 40px', borderRadius: '30px', fontWeight: 'bold', 
              fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto' 
            }}>
              <ion-icon name="bulb-outline"></ion-icon> КЕҢЕШ (-20💎)
            </button>
          </div>
        </div>
      )}

      {/* ЖЕҢИШ ТЕРЕЗЕСИ */}
      {showWinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zLayer: 1000, padding: '20px' }}>
          <div style={{ background: '#1e293b', padding: '40px', borderRadius: '32px', textAlign: 'center', border: '2px solid #22c55e', width: '100%', maxWidth: '320px' }}>
            <div style={{ fontSize: '5rem', marginBottom: '10px' }}>🎉</div>
            <h2 style={{ color: '#22c55e', fontSize: '2rem', marginBottom: '10px' }}>УРА!</h2>
            <p style={{ marginBottom: '30px', opacity: 0.8 }}>Деңгээл ийгиликтүү аяктады!</p>
            <button onClick={() => {
              const next = currentCatIndex + 1;
              setCurrentCatIndex(next);
              generateLevel(next);
            }} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '20px', fontWeight: 'bold', width: '100%', fontSize: '1.2rem' }}>
              УЛАНТУУ
            </button>
          </div>
        </div>
      )}

      {/* ТӨМӨНКҮ НАВИГАЦИЯ */}
      {view !== 'game' && (
        <nav style={{ position: 'fixed', bottom: 0, width: '100%', background: '#1e293b', display: 'flex', justifyContent: 'space-around', padding: '15px 0', borderTop: '1px solid #334155' }}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => setView(item.id)} style={{ textAlign: 'center', opacity: view === item.id ? 1 : 0.4, transition: '0.3s' }}>
              <ion-icon name={item.icon} style={{ fontSize: '26px' }}></ion-icon>
              <div style={{ fontSize: '10px', marginTop: '4px' }}>{item.text}</div>
            </div>
          ))}
        </nav>
      )}

      {/* CSS Анимация (Inline style үчүн) */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default FilwordGame;
                                                    
