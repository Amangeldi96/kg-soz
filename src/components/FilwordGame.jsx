import React, { useState, useEffect, useCallback } from 'react';

// Түстөр топтому
const COLORS = ['#26a69a', '#ef5350', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da', '#d4e157'];
const KYRGYZ_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУҮФХЦЧШЩЪЫЬЭЮЯӨҢ";

const FilwordGame = ({ wordsData = [] }) => {
  // Абалдар
  const [user] = useState(() => JSON.parse(localStorage.getItem('filword_user')) || { name: "Оюнчу" });
  const [view, setView] = useState('menu'); 
  const [currentCatIndex, setCurrentCatIndex] = useState(() => parseInt(localStorage.getItem('filword_level')) || 0);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('filword_score')) || 0);
  
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

  // Маалыматты сактоо
  useEffect(() => {
    localStorage.setItem('filword_level', currentCatIndex);
    localStorage.setItem('filword_score', score);
  }, [currentCatIndex, score]);

  // Сөздөрдү жайгаштыруу алгоритми (DFS)
  const findSnakePaths = (startR, startC, len, g) => {
    let results = [];
    const explore = (currR, currC, path, vis) => {
      if (path.length === len) { results.push([...path]); return; }
      if (results.length > 2) return; // Издөөнү тездетүү

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

  // Деңгээлди генерациялоо
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
      if (Date.now() - startTime > 150) return false; // 150мс ашса токтот (катып калбаш үчүн)
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

    // Бош калган жерлерди толтуруу
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

  // Touch/Mouse менен тандоо
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a', color: 'white', touchAction: 'none', userSelect: 'none' }}
         onPointerUp={endSelection} onTouchEnd={endSelection} onMouseUp={endSelection}>
      
      {view === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '900', color: '#38bdf8' }}>ФИЛВОРД</h1>
          <div style={{ background: '#1e293b', padding: '30px', borderRadius: '30px', textAlign: 'center', margin: '30px 0', width: '200px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>ТУР</div>
            <div style={{ fontSize: '4rem', fontWeight: 'bold' }}>{currentCatIndex + 1}</div>
          </div>
          <button onClick={() => generateLevel(currentCatIndex)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '15px 60px', borderRadius: '40px', fontSize: '1.5rem', fontWeight: 'bold' }}>ОЙНОО</button>
        </div>
      )}

      {view === 'game' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b' }}>
            <button onClick={() => setView('menu')} style={{ background: 'none', border: '1px solid #475569', borderRadius: '50%', color: 'white', width: '40px', height: '40px' }}>✕</button>
            <div style={{ fontWeight: 'bold' }}>{categoryName}</div>
            <div style={{ color: '#38bdf8', fontWeight: 'bold' }}>💎 {score}</div>
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
                      borderRadius: '8px', fontSize: '1.4rem', fontWeight: '900',
                      border: isHint ? '4px solid #facc15' : 'none'
                    }}>
                    {cell?.char}
                  </div>
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
              } else if (score < 20) { alert("Упай жетпейт!"); }
            }} style={{ background: '#eab308', border: 'none', padding: '12px 30px', borderRadius: '30px', fontWeight: 'bold' }}>КЕҢЕШ (-20💎)</button>
          </div>
        </div>
      )}

      {showWinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '40px', borderRadius: '32px', textAlign: 'center', border: '2px solid #22c55e', width: '80%' }}>
            <h2 style={{ color: '#22c55e', fontSize: '2rem' }}>ЖЕҢИШ!</h2>
            <button onClick={() => { setCurrentCatIndex(prev => prev + 1); generateLevel(currentCatIndex + 1); }} 
                    style={{ background: '#22c55e', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '20px', fontWeight: 'bold', marginTop: '20px', width: '100%' }}>УЛАНТУУ</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilwordGame;
            
