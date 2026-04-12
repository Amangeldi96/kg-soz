import React, { useState, useEffect, useCallback, useRef } from 'react';

// Түстөр топтому - табылган сөздөрдү боёо үчүн
const COLORS = ['#26a69a', '#ef5350', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da', '#d4e157'];
const KYRGYZ_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУҮФХЦЧШЩЪЫЬЭЮЯӨҢ";

const FilwordGame = ({ wordsData = [] }) => {
  // Негизги абалдар (States)
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

  // Навигация менюсу
  const navItems = [
    { id: 'menu', icon: 'home-outline', text: 'Башкы' },
    { id: 'calendar', icon: 'calendar-outline', text: 'Күн' },
    { id: 'stats', icon: 'bar-chart-outline', text: 'Рейтинг' },
    { id: 'settings', icon: 'settings-outline', text: 'Профиль' }
  ];

  // Маалыматтарды браузердин эсине (localStorage) сактоо
  useEffect(() => {
    localStorage.setItem('filword_level', currentCatIndex);
    localStorage.setItem('filword_score', score);
    localStorage.setItem('completed_days', JSON.stringify(completedDays));
  }, [currentCatIndex, score, completedDays]);

  // Сөздөрдү торчого жылан сымал жайгаштыруу үчүн DFS издөө
  const findSnakePaths = (startR, startC, len, g) => {
    let results = [];
    const explore = (currR, currC, path, vis) => {
      if (path.length === len) { 
        results.push([...path]); 
        return; 
      }
      if (results.length > 5) return; 

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

          // Backtrack
          filledCount -= word.length;
          finalWords.pop();
          path.forEach(p => tempGrid[p.r][p.c] = null);
        }
      }
      return false;
    };

    solve(0);

    // Эгер бош орун калса, алфавит менен толтурбай, деңгээлди кайра түзүүгө аракет кылат
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

  // Телефондо чийүү (touch) башталганда
  const startSelection = (r, c, e) => {
    if (e.cancelable) e.preventDefault();
    // Табылган сөздү кайра тандатпоо
    if (foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
    
    setIsSelecting(true);
    setSelectedCells([{ r, c }]);
  };

  // Сөөмөйдү жылдырганда тамгаларды кошуу
  const handleMove = (e) => {
    if (!isSelecting) return;
    if (e.cancelable) e.preventDefault();

    const touch = e.touches ? e.touches[0] : e;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (el && el.hasAttribute('data-r')) {
      const r = parseInt(el.getAttribute('data-r'));
      const c = parseInt(el.getAttribute('data-c'));

      // Катмарларды текшерүү
      if (foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
      if (selectedCells.some(s => s.r === r && s.c === c)) return;

      const last = selectedCells[selectedCells.length - 1];
      const isNeighbor = Math.abs(last.r - r) + Math.abs(last.c - c) === 1;

      if (isNeighbor) {
        setSelectedCells(prev => [...prev, { r, c }]);
      }
    }
  };

  // Тандоону токтоткондо (сөздү текшерүү)
  const endSelection = () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    // Чийилген тамгаларды текстке айлантуу
    const selectedText = selectedCells.map(cell => grid[cell.r][cell.c].char).join('');
    // Тескерисинче дагы текшерүү (сөздү аягынан баштап чийген учур үчүн)
    const reversedText = [...selectedText].reverse().join('');

    const match = targetWords.find(t => 
      (t.word === selectedText || t.word === reversedText) && 
      t.word.length === selectedCells.length && 
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
      alert("Упай жетпейт! 20💎 керек.");
      return;
    }
    const notFound = targetWords.filter(t => !foundWords.some(f => f.word === t.word));
    if (notFound.length > 0) {
      setHintCell(notFound[0].path[0]); 
      setScore(prev => prev - 20);
      setTimeout(() => setHintCell(null), 2000);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', inset: 0, 
      background: '#0f172a', color: 'white', 
      fontFamily: 'sans-serif', overflow: 'hidden', 
      touchAction: 'none', userSelect: 'none' 
    }} onPointerUp={endSelection} onTouchEnd={endSelection} onMouseUp={endSelection}>
      
      {/* --- МЕНЮ --- */}
      {view === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '900', color: '#38bdf8', marginBottom: '10px' }}>ФИЛВОРД</h1>
          <p style={{ marginBottom: '40px', opacity: 0.7 }}>Сөздөрдү тап жана упай топто!</p>
          
          <div style={{ background: '#1e293b', padding: '30px', borderRadius: '30px', textAlign: 'center', marginBottom: '30px', width: '80%', maxWidth: '300px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>ДЕҢГЭЭЛ</div>
            <div style={{ fontSize: '4rem', fontWeight: 'bold', margin: '10px 0' }}>{currentCatIndex + 1}</div>
          </div>

          <button onClick={() => generateLevel(currentCatIndex)} style={{ 
            background: '#22c55e', color: 'white', border: 'none', 
            padding: '18px 60px', borderRadius: '40px', fontSize: '1.5rem', 
            fontWeight: 'bold', boxShadow: '0 10px 20px rgba(34, 197, 94, 0.3)',
            cursor: 'pointer'
          }}>
            ОЙНОО
          </button>
        </div>
      )}

      {/* --- ОЮН ЭКРАНЫ --- */}
      {view === 'game' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Хедер */}
          <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b' }}>
            <button onClick={() => setView('menu')} style={{ background: 'none', border: '1px solid #475569', borderRadius: '50%', color: 'white', width: '40px', height: '40px' }}>✕</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>КАТЕГОРИЯ</div>
              <div style={{ fontWeight: 'bold' }}>{categoryName}</div>
            </div>
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '8px 15px', borderRadius: '20px', color: '#38bdf8', fontWeight: 'bold' }}>
              💎 {score}
            </div>
          </div>

          {/* Оюн талаасы (Grid) */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${gridSize}, 1fr)`, 
                gap: '8px', 
                background: '#1e293b', 
                padding: '12px', 
                borderRadius: '16px'
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
                    onMouseDown={(e) => startSelection(r, c, e)}
                    onMouseEnter={(e) => isSelecting && handleMove(e)}
                    style={{
                      width: '13vw', height: '13vw', maxWidth: '55px', maxHeight: '55px',
                      background: fnd ? fnd.color : isSel ? '#3b82f6' : '#334155',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      borderRadius: '10px', fontSize: '1.4rem', fontWeight: '900',
                      transition: 'background 0.2s',
                      border: isHint ? '4px solid #facc15' : 'none'
                    }}
                  >
                    {cell?.char}
                  </div>
                );
              }))}
            </div>
          </div>

          {/* Жардамчы баскыч */}
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <button onClick={useHint} style={{ 
              background: '#eab308', color: '#000', border: 'none', 
              padding: '15px 40px', borderRadius: '30px', fontWeight: 'bold' 
            }}>
              КЕҢЕШ (-20💎)
            </button>
          </div>
        </div>
      )}

      {/* --- ЖЕҢИШ ТЕРЕЗЕСИ --- */}
      {showWinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '40px', borderRadius: '32px', textAlign: 'center', border: '2px solid #22c55e', width: '80%' }}>
            <h2 style={{ color: '#22c55e', fontSize: '2rem' }}>ЖЕҢИШ!</h2>
            <p style={{ margin: '20px 0' }}>Баардык сөздөрдү таптыңыз!</p>
            <button onClick={() => {
              setCurrentCatIndex(prev => prev + 1);
              generateLevel(currentCatIndex + 1);
            }} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '20px', fontWeight: 'bold' }}>
              КИЙИНКИ ТУР
            </button>
          </div>
        </div>
      )}

      {/* --- ТӨМӨНКҮ МЕНЮ --- */}
      {view !== 'game' && (
        <nav style={{ position: 'fixed', bottom: 0, width: '100%', background: '#1e293b', display: 'flex', justifyContent: 'space-around', padding: '15px 0', borderTop: '1px solid #334155' }}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => setView(item.id)} style={{ textAlign: 'center', opacity: view === item.id ? 1 : 0.4 }}>
              <ion-icon name={item.icon} style={{ fontSize: '26px' }}></ion-icon>
              <div style={{ fontSize: '10px' }}>{item.text}</div>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
};

export default FilwordGame;
                       
