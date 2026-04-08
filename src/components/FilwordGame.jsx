import React, { useState, useEffect, useCallback, useRef } from 'react';

const COLORS = ['#26a69a', '#d4e157', '#ef5350', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da'];

const FilwordGame = ({ wordsData }) => {
  const [grid, setGrid] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [targetWords, setTargetWords] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [hintCount, setHintCount] = useState(1);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [wordsInCurrentInterval, setWordsInCurrentInterval] = useState(0);
  const [hintCell, setHintCell] = useState(null);
  
  const gridSize = 6;
  const gridRef = useRef(null); // Сенсорду көзөмөлдөө үчүн керек

  useEffect(() => {
    const timer = setInterval(() => {
      setTotalSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (totalSeconds > 0 && totalSeconds % 120 === 0) {
      if (wordsInCurrentInterval >= 3) setHintCount(prev => prev + 1);
      setWordsInCurrentInterval(0);
    }
  }, [totalSeconds, wordsInCurrentInterval]);

  const generateLevel = useCallback(() => {
    let newGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let finalWords = [];

    const solve = (r, c) => {
      if (r === gridSize) return true;
      let nextR = c === gridSize - 1 ? r + 1 : r;
      let nextC = c === gridSize - 1 ? 0 : c + 1;
      if (newGrid[r][c]) return solve(nextR, nextC);
      const shuffled = [...wordsData].filter(w => w.word.length >= 3 && w.word.length <= 6).sort(() => 0.5 - Math.random()).slice(0, 50);
      for (let wordObj of shuffled) {
        const word = wordObj.word.toUpperCase().replace(/\s/g, '');
        const paths = findPaths(r, c, word.length, newGrid);
        for (let path of paths) {
          path.forEach((p, i) => newGrid[p.r][p.c] = { char: word[i], word: word });
          if (solve(nextR, nextC)) { finalWords.push({ word, path }); return true; }
          path.forEach(p => newGrid[p.r][p.c] = null);
        }
      }
      return false;
    };

    function findPaths(r, c, len, g) {
      let res = [];
      const explore = (currR, currC, path, vis) => {
        if (path.length === len) { res.push([...path]); return; }
        const neighbors = [[1,0], [-1,0], [0,1], [0,-1]].map(([dr, dc]) => ({ r: currR+dr, c: currC+dc }))
          .filter(n => n.r >= 0 && n.r < gridSize && n.c >= 0 && n.c < gridSize && !g[n.r][n.c] && !vis.has(`${n.r},${n.c}`));
        for (let n of neighbors) {
          vis.add(`${n.r},${n.c}`); path.push(n);
          explore(n.r, n.c, path, vis);
          path.pop(); vis.delete(`${n.r},${n.c}`);
        }
      };
      explore(r, c, [{ r, c }], new Set([`${r},${c}`]));
      return res.sort(() => 0.5 - Math.random()).slice(0, 5);
    }

    if (solve(0, 0)) {
      setGrid([...newGrid]); setTargetWords(finalWords); setFoundWords([]); setHintCell(null);
    } else { generateLevel(); }
  }, [wordsData]);

  useEffect(() => { if (wordsData) generateLevel(); }, [wordsData, level, generateLevel]);

  // Басууну баштоо (Чычкан жана Сенсор үчүн)
  const startSelection = (r, c) => {
    const found = foundWords.some(f => f.cells.some(s => s.r === r && s.c === c));
    if (found) return;
    setIsSelecting(true);
    setSelectedCells([{ r, c }]);
  };

  // Сөөмөй же чычкан үстүнөн өткөндө
  const moveSelection = (r, c) => {
    if (!isSelecting) return;
    const found = foundWords.some(f => f.cells.some(s => s.r === r && s.c === c));
    if (found) return;
    if (selectedCells.some(s => s.r === r && s.c === c)) return;

    const last = selectedCells[selectedCells.length - 1];
    if (Math.abs(last.r - r) <= 1 && Math.abs(last.c - c) <= 1) {
      setSelectedCells(prev => [...prev, { r, c }]);
    }
  };

  // Сенсор кыймылын көзөмөлдөө (Мобилдик үчүн өтө маанилүү)
  const handleTouchMove = (e) => {
    if (!isSelecting) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.getAttribute('data-r')) {
      const r = parseInt(element.getAttribute('data-r'));
      const c = parseInt(element.getAttribute('data-c'));
      moveSelection(r, c);
    }
  };

  const endSelection = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    const selectedText = selectedCells.map(cell => grid[cell.r][cell.c].char).join('');
    const reversedText = selectedText.split('').reverse().join('');
    const match = targetWords.find(t => (t.word === selectedText || t.word === reversedText) && !foundWords.some(f => f.word === t.word));

    if (match) {
      const color = COLORS[foundWords.length % COLORS.length];
      const newFound = [...foundWords, { word: match.word, cells: [...selectedCells], color }];
      setFoundWords(newFound);
      setScore(prev => prev + (match.word.length * 10));
      setWordsInCurrentInterval(prev => prev + 1);
      if (newFound.length === targetWords.length) setTimeout(() => setLevel(l => l + 1), 500);
    }
    setSelectedCells([]);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div 
      onMouseUp={endSelection} 
      onTouchEnd={endSelection}
      style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', userSelect: 'none', touchAction: 'none' }}
    >
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: '#1e293b', padding: '10px', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>УБАКЫТ</div>
          <div>{formatTime(totalSeconds)}</div>
        </div>
        <div style={{ background: '#1e293b', padding: '10px', borderRadius: '10px', border: '1px solid #f59e0b', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>БОНУС: {wordsInCurrentInterval}/3</div>
          <div style={{ color: '#f59e0b' }}>{formatTime(120 - (totalSeconds % 120))}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: '#1e293b', padding: '10px 20px', borderRadius: '15px', border: '2px solid #38bdf8', color: '#38bdf8', fontWeight: 'bold' }}>🏆 {score}</div>
        <button onClick={() => {
            if (hintCount <= 0) return;
            const notFound = targetWords.find(t => !foundWords.some(f => f.word === t.word));
            if (notFound) { setHintCell(notFound.path[0]); setHintCount(prev => prev - 1); setTimeout(() => setHintCell(null), 2000); }
        }} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '15px', cursor: 'pointer' }}>💡 Жардам ({hintCount})</button>
      </div>

      <div 
        ref={gridRef}
        onTouchMove={handleTouchMove}
        style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`, 
          gap: '6px', 
          width: '95vw', 
          maxWidth: '350px',
          background: '#1e293b', 
          padding: '10px', 
          borderRadius: '15px',
          touchAction: 'none' // Телефондо экранды жылдырбайт
        }}
      >
        {grid.map((row, r) => row.map((cell, c) => {
          const isSelected = selectedCells.some(s => s.r === r && s.c === c);
          const found = foundWords.find(f => f.cells.some(s => s.r === r && s.c === c));
          const isHint = hintCell && hintCell.r === r && hintCell.c === c;

          return (
            <div
              key={`${r}-${c}`}
              data-r={r} // TouchMove учурунда кайсы уяча экенин билүү үчүн
              data-c={c}
              onMouseDown={() => startSelection(r, c)}
              onMouseEnter={() => moveSelection(r, c)}
              onTouchStart={(e) => { e.preventDefault(); startSelection(r, c); }}
              style={{
                aspectRatio: '1/1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: isSelected ? '#38bdf8' : found ? found.color : isHint ? '#ec4899' : '#334155',
                borderRadius: '8px', fontSize: '20px', fontWeight: 'bold', transition: '0.1s',
                opacity: found ? 0.6 : 1,
                animation: isHint ? 'hintPulse 0.8s infinite' : 'none'
              }}
            >
              {cell?.char}
            </div>
          );
        }))}
      </div>

      <style>{`
        @keyframes hintPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); background-color: #f472b6; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default FilwordGame;