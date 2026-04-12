import React, { useState, useEffect, useCallback, useRef } from 'react';

// Түстөр топтому - табылган сөздөрдү боёо үчүн
const COLORS = ['#26a69a', '#ef5350', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da', '#d4e157'];
const KYRGYZ_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУҮФХЦЧШЩЪЫЬЭЮЯӨҢ";

const FilwordGame = ({ wordsData = [] }) => {
  // --- АБАЛДАР (STATES) ---
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('filword_user')) || { name: "Оюнчу", avatar: "👤" });
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

  // Навигация менюсунун элементтери
  const navItems = [
    { id: 'menu', icon: 'home-outline', text: 'Башкы' },
    { id: 'calendar', icon: 'calendar-outline', text: 'Күн' },
    { id: 'stats', icon: 'bar-chart-outline', text: 'Рейтинг' },
    { id: 'settings', icon: 'settings-outline', text: 'Профиль' }
  ];

  // --- МААЛЫМАТТАРДЫ САКТОО ---
  useEffect(() => {
    localStorage.setItem('filword_level', currentCatIndex);
    localStorage.setItem('filword_score', score);
    localStorage.setItem('completed_days', JSON.stringify(completedDays));
  }, [currentCatIndex, score, completedDays]);

  // --- ГЕНЕРАЦИЯ АЛГОРИТМИ ---
  const findSnakePaths = (startR, startC, len, g) => {
    let results = [];
    const explore = (currR, currC, path, vis) => {
      if (path.length === len) { results.push([...path]); return; }
      if (results.length > 2) return; 

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

    const startTime = Date.now();

    const solve = (cellIdx) => {
      if (Date.now() - startTime > 200) return false; 
      if (filledCount === totalCellsCount || cellIdx >= totalCellsCount) return true;

      let r = Math.floor(cellIdx / gridSize), c = cellIdx % gridSize;
      if (tempGrid[r][c]) return solve(cellIdx + 1);

      for (let word of wordPool) {
        if (finalWords.some(fw => fw.word === word)) continue;
        const paths = findSnakePaths(r, c, word.length, tempGrid);
        for (let path of paths) {
          path.forEach((p, i) => tempGrid[p.r][p.c] = { char: word[i], word });
          finalWords.push({ word, path });
          filledCount += word.length;
          if (solve(cellIdx + 1)) return true;
          filledCount -= word.length;
          finalWords.pop();
          path.forEach(p => tempGrid[p.r][p.c] = null);
        }
      }
      return false;
    };

    solve(0);

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!tempGrid[r][c]) {
          tempGrid[r][c] = { char: KYRGYZ_ALPHABET[Math.floor(Math.random() * KYRGYZ_ALPHABET.length)], isFiller: true };
        }
      }
    }

    setGrid(tempGrid);
    setTargetWords(finalWords);
    setFoundWords([]);
    setShowWinModal(false);
    setView('game');
  }, [wordsData]);

  // --- ОЮН ЛОГИКАСЫ (TOUCH/MOUSE) ---
  const startSelection = (r, c, e) => {
    if (e.cancelable) e.preventDefault();
    if (foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
    setIsSelecting(true);
    setSelectedCells([{ r, c }]);
  };

  const handleMove = (e) => {
    if (!isSelecting) return;
    const touch = e.touches ? e.touches[0] : e;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (el && el.hasAttribute('data-r')) {
      const r = parseInt(el.getAttribute('data-r'));
      const c = parseInt(el.getAttribute('data-c'));
      if (foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
      if (selectedCells.some(s => s.r === r && s.c === c)) return;

      const last = selectedCells[selectedCells.length - 1];
      if (Math.abs(last.r - r) + Math.abs(last.c - c) === 1) {
        setSelectedCells(prev => [...prev, { r, c }]);
      }
    }
  };

  const endSelection = () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    const selectedText = selectedCells.map(cell => grid[cell.r][cell.c].char).join('');
    const reversedText = [...selectedText].reverse().join('');

    const match = targetWords.find(t => 
      (t.word === selectedText || t.word === reversedText) && 
      !foundWords.some(f => f.word === t.word)
    );

    if (match) {
      const color = COLORS[foundWords.length % COLORS.length];
      const newFound = [...foundWords, { ...match, cells: [...selectedCells], color }];
      setFoundWords(newFound);
      setScore(prev => prev + (match.word.length * 5));
      if (newFound.length === targetWords.length) setTimeout(() => setShowWinModal(true), 500);
    }
    setSelectedCells([]);
  };

  // --- ЭКРАНДАР ---
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a', color: 'white', fontFamily: 'sans-serif', overflow: 'hidden', touchAction: 'none', userSelect: 'none' }}
         onPointerUp={endSelection} onTouchEnd={endSelection} onMouseUp={endSelection}>
      
      {/* МЕНЮ ЭКРАНЫ */}
      {view === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: '900', color: '#38bdf8', marginBottom: '10px' }}>ФИЛВОРД</h1>
          <p style={{ opacity: 0.6, marginBottom: '40px' }}>Кыргызча сөз издөө оюну</p>
          <div style={{ background: '#1e293b', padding: '30px', borderRadius: '30px', textAlign: 'center', marginBottom: '30px', width: '220px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>ДЕҢГЭЭЛ</div>
            <div style={{ fontSize: '4rem', fontWeight: 'bold' }}>{currentCatIndex + 1}</div>
          </div>
          <button onClick={() => generateLevel(currentCatIndex)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '18px 60px', borderRadius: '40px', fontSize: '1.5rem', fontWeight: 'bold', boxShadow: '0 10px 20px rgba(34, 197, 94, 0.3)' }}>ОЙНОО</button>
        </div>
      )}

      {/* ОЮН ЭКРАНЫ */}
      {view === 'game' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b' }}>
            <button onClick={() => setView('menu')} style={{ background: 'none', border: '1px solid #475569', borderRadius: '50%', color: 'white', width: '40px', height: '40px' }}>✕</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>КАТЕГОРИЯ</div>
              <div style={{ fontWeight: 'bold' }}>{categoryName}</div>
            </div>
            <div style={{ color: '#38bdf8', fontWeight: 'bold', background: 'rgba(56,189,248,0.1)', padding: '8px 15px', borderRadius: '20px' }}>💎 {score}</div>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', background: '#1e293b', padding: '12px', borderRadius: '16px' }}
                 onTouchMove={handleMove} onPointerMove={handleMove}>
              {grid.map((row, r) => row.map((cell, c) => {
                const isSel = selectedCells.some(s => s.r === r && s.c === c);
                const fnd = foundWords.find(f => f.cells.some(s => s.r === r && s.c === c));
                const isHint = hintCell && hintCell.r === r && hintCell.c === c;
                return (
                  <div key={`${r}-${c}`} data-r={r} data-c={c} 
                    onPointerDown={(e) => startSelection(r, c, e)}
                    onTouchStart={(e) => startSelection(r, c, e)}
                    style={{
                      width: '13vw', height: '13vw', maxWidth: '50px', maxHeight: '50px',
                      background: fnd ? fnd.color : isSel ? '#3b82f6' : '#334155',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      borderRadius: '10px', fontSize: '1.4rem', fontWeight: '900',
                      border: isHint ? '4px solid #facc15' : 'none'
                    }}>{cell?.char}</div>
                );
              }))}
            </div>
          </div>

          <div style={{ padding: '30px', textAlign: 'center' }}>
            <button onClick={() => {
              const notFound = targetWords.filter(t => !foundWords.some(f => f.word === t.word));
              if (score >= 20 && notFound.length > 0) {
                setHintCell(notFound[0].path[0]);
                setScore(s => s - 20);
                setTimeout(() => setHintCell(null), 1500);
              }
            }} style={{ background: '#eab308', border: 'none', padding: '15px 40px', borderRadius: '30px', fontWeight: 'bold', color: '#000' }}>КЕҢЕШ (-20💎)</button>
          </div>
        </div>
      )}

      {/* КАЛЕНДАРЬ ЭКРАНЫ */}
      {view === 'calendar' && (
        <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
          <h2 style={{ textAlign: 'center', color: '#38bdf8' }}>Күнүмдүк тапшырмалар</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginTop: '30px' }}>
            {[...Array(30)].map((_, i) => (
              <div key={i} style={{ height: '45px', background: completedDays.includes(i+1) ? '#22c55e' : '#1e293b', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', opacity: i + 1 > new Date().getDate() ? 0.3 : 1 }}>{i + 1}</div>
            ))}
          </div>
        </div>
      )}

      {/* РЕЙТИНГ ЭКРАНЫ */}
      {view === 'stats' && (
        <div style={{ padding: '20px', height: '100%' }}>
          <h2 style={{ textAlign: 'center', color: '#38bdf8' }}>Лидерлер тактасы</h2>
          <div style={{ marginTop: '20px' }}>
            {[ {n: 'Сиз', s: score, a: '👤'}, {n: 'Айбек', s: 1540, a: '🦊'}, {n: 'Бегимай', s: 1200, a: '🐱'} ].sort((a,b) => b.s - a.s).map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '15px', background: '#1e293b', marginBottom: '10px', borderRadius: '15px', border: u.n === 'Сиз' ? '1px solid #38bdf8' : 'none' }}>
                <div style={{ fontSize: '20px', marginRight: '15px' }}>{i + 1}</div>
                <div style={{ fontSize: '24px', marginRight: '15px' }}>{u.a}</div>
                <div style={{ flex: 1, fontWeight: 'bold' }}>{u.n}</div>
                <div style={{ color: '#38bdf8' }}>{u.s} упай</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ПРОФИЛЬ ЭКРАНЫ */}
      {view === 'settings' && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '5rem', marginTop: '40px' }}>{user.avatar}</div>
          <h2 style={{ margin: '10px 0' }}>{user.name}</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
            <div style={{ background: '#1e293b', padding: '15px', borderRadius: '20px', width: '100px' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>УПАЙ</div>
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{score}</div>
            </div>
            <div style={{ background: '#1e293b', padding: '15px', borderRadius: '20px', width: '100px' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>ТУР</div>
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{currentCatIndex + 1}</div>
            </div>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ marginTop: '50px', background: '#ef5350', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px' }}>Маалыматтарды тазалоо</button>
        </div>
      )}

      {/* ЖЕҢИШ ТЕРЕЗЕСИ */}
      {showWinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '40px', borderRadius: '32px', textAlign: 'center', border: '2px solid #22c55e', width: '80%', maxWidth: '320px' }}>
            <div style={{ fontSize: '5rem' }}>🎉</div>
            <h2 style={{ color: '#22c55e' }}>УРА!</h2>
            <p>Сиз баардык сөздөрдү таптыңыз!</p>
            <button onClick={() => { setCurrentCatIndex(prev => prev + 1); generateLevel(currentCatIndex + 1); }} 
                    style={{ background: '#22c55e', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '20px', fontWeight: 'bold', marginTop: '20px', width: '100%' }}>КИЙИНКИ ТУР</button>
          </div>
        </div>
      )}

      {/* ТӨМӨНКҮ НАВИГАЦИЯ */}
      {view !== 'game' && (
        <nav style={{ position: 'fixed', bottom: 0, width: '100%', background: '#1e293b', display: 'flex', justifyContent: 'space-around', padding: '15px 0', borderTop: '1px solid #334155' }}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => setView(item.id)} style={{ textAlign: 'center', opacity: view === item.id ? 1 : 0.4 }}>
              <div style={{ fontSize: '24px' }}><ion-icon name={item.icon}></ion-icon></div>
              <div style={{ fontSize: '10px', marginTop: '4px' }}>{item.text}</div>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
};

export default FilwordGame;
            
