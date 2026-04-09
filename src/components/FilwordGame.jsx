import React, { useState, useEffect, useCallback } from 'react';

const COLORS = ['#26a69a', '#d4e157', '#ef5350', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da'];
const KYRGYZ_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУҮФХЦЧШЩЪЫЬЭЮЯӨҢ";

const FilwordGame = ({ wordsData }) => {
  // --- LOCAL STORAGE & STATE ---
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('filword_user')));
  const [view, setView] = useState('calendar'); // 'calendar' же 'game'
  const [completedDays, setCompletedDays] = useState(() => JSON.parse(localStorage.getItem('completed_days')) || []);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('filword_score')) || 0);
  
  // Оюндун ички абалы
  const [grid, setGrid] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [targetWords, setTargetWords] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hintCount, setHintCount] = useState(3);
  const [showWinModal, setShowWinModal] = useState(false);

  const gridSize = 6;
  const today = new Date().getDate(); // Бүгүнкү күн (мисалы: 9)

  // Маалыматты сактоо
  useEffect(() => {
    localStorage.setItem('filword_score', score);
    localStorage.setItem('completed_days', JSON.stringify(completedDays));
  }, [score, completedDays]);

  // Деңгээл генерациясы (Оюн башталганда гана иштейт)
  const generateLevel = useCallback((dayIndex) => {
    // Ар бир күн үчүн ар башка сөздөр (wordsData ичинен рандомдук категория алуу)
    const category = wordsData[dayIndex % wordsData.length];
    let newGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let finalWords = [];
    const availableWords = category.words.filter(w => w.length >= 3 && w.length <= 6).map(w => w.toUpperCase());

    const solve = (r, c) => {
      if (r === gridSize) return true;
      let nextR = c === gridSize - 1 ? r + 1 : r;
      let nextC = c === gridSize - 1 ? 0 : c + 1;
      if (newGrid[r][c]) return solve(nextR, nextC);
      const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
      for (let word of shuffled) {
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
        const neighbors = [[1,0], [-1,0], [0,1], [0,-1]].map(([dr, dc]) => ({ r: currR + dr, c: currC + dc }))
          .filter(n => n.r >= 0 && n.r < gridSize && n.c >= 0 && n.c < gridSize && !g[n.r][n.c] && !vis.has(`${n.r},${n.c}`));
        for (let n of neighbors) {
          vis.add(`${n.r},${n.c}`); path.push(n);
          explore(n.r, n.c, path, vis);
          path.pop(); vis.delete(`${n.r},${n.c}`);
        }
      };
      explore(r, c, [{ r, c }], new Set([`${r},${c}`]));
      return res.sort(() => Math.random() - 0.5).slice(0, 5);
    }

    solve(0, 0);
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!newGrid[r][c]) {
          newGrid[r][c] = { char: KYRGYZ_ALPHABET[Math.floor(Math.random() * KYRGYZ_ALPHABET.length)], isFiller: true };
        }
      }
    }
    setGrid([...newGrid]);
    setTargetWords(finalWords);
    setFoundWords([]);
    setShowWinModal(false);
  }, [wordsData]);

  // Оюнду баштоо
  const startDayGame = (day) => {
    if (day > today) return; // Келечектеги күндү ойноого болбойт
    generateLevel(day);
    setView('game');
  };

  // Тандоо логикасы (Мурунку оңдоолор менен)
  const startSelection = (r, c) => {
    if (foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
    setIsSelecting(true);
    setSelectedCells([{ r, c }]);
  };

  const moveSelection = (r, c) => {
    if (!isSelecting || foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
    if (selectedCells.some(s => s.r === r && s.c === c)) return;
    const last = selectedCells[selectedCells.length - 1];
    if ((last.c === c && Math.abs(last.r - r) === 1) || (last.r === r && Math.abs(last.c - c) === 1)) {
      setSelectedCells(prev => [...prev, { r, c }]);
    }
  };

  const endSelection = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    const selectedText = selectedCells.map(cell => grid[cell.r][cell.c].char).join('');
    const match = targetWords.find(t => t.word === selectedText && !foundWords.some(f => f.word === t.word) && t.word.length === selectedCells.length);
    if (match) {
      const color = COLORS[foundWords.length % COLORS.length];
      const newFound = [...foundWords, { ...match, cells: [...selectedCells], color }];
      setFoundWords(newFound);
      setScore(prev => prev + (match.word.length * 10));
      if (newFound.length === targetWords.length) {
        setCompletedDays(prev => [...new Set([...prev, today])]);
        setTimeout(() => setShowWinModal(true), 500);
      }
    }
    setSelectedCells([]);
  };

  // --- UI КОМПОНЕНТТЕРИ ---

  // 1. Кирүү экраны
  if (!user) {
    return (
      <div style={styles.modalOverlay}>
        <form onSubmit={(e) => {
          e.preventDefault();
          const newUser = { name: e.target.name.value, age: e.target.age.value };
          setUser(newUser);
          localStorage.setItem('filword_user', JSON.stringify(newUser));
        }} style={styles.loginForm}>
          <h2 style={{color: '#38bdf8'}}>Салам! 👋</h2>
          <input name="name" placeholder="Атыңыз" required style={styles.input} />
          <input name="age" type="number" placeholder="Жашыңыз" required style={styles.input} />
          <button type="submit" style={styles.nextBtn}>Кирүү</button>
        </form>
      </div>
    );
  }

  // 2. Календарь экраны
  if (view === 'calendar') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
            <h3 style={{color: '#38bdf8'}}>{user.name}, кош келиңиз!</h3>
            <div style={styles.scoreBadge}>Жалпы упай: {score}</div>
        </div>
        <h2 style={{margin: '20px 0'}}>Апрель Колендары</h2>
        <div style={styles.calendarGrid}>
          {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
            const isCompleted = completedDays.includes(day);
            const isToday = day === today;
            const isLocked = day > today;

            return (
              <div 
                key={day} 
                onClick={() => !isLocked && startDayGame(day)}
                style={{
                  ...styles.calendarDay,
                  backgroundColor: isCompleted ? '#10b981' : isToday ? '#38bdf8' : isLocked ? '#1e293b' : '#334155',
                  opacity: isLocked ? 0.5 : 1,
                  border: isToday ? '2px solid white' : 'none'
                }}
              >
                {day}
                {isCompleted && <span style={{fontSize: '10px', display: 'block'}}>✔</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. Оюн экраны
  return (
    <div onMouseUp={endSelection} onTouchEnd={endSelection} style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => setView('calendar')} style={styles.backBtn}>⬅ Артка</button>
        <div style={styles.scoreBadge}>🏆 {score}</div>
      </div>

      <div onTouchMove={(e) => {
        const touch = e.touches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el && el.getAttribute('data-r')) moveSelection(parseInt(el.getAttribute('data-r')), parseInt(el.getAttribute('data-c')));
      }} style={styles.grid}>
        {grid.map((row, r) => row.map((cell, c) => {
          const isSel = selectedCells.some(s => s.r === r && s.c === c);
          const fnd = foundWords.find(f => f.cells.some(s => s.r === r && s.c === c));
          return (
            <div key={`${r}-${c}`} data-r={r} data-c={c}
              onMouseDown={() => startSelection(r, c)}
              onMouseEnter={() => moveSelection(r, c)}
              onTouchStart={(e) => { e.preventDefault(); startSelection(r, c); }}
              style={{
                ...styles.cell,
                backgroundColor: isSel ? '#38bdf8' : fnd ? fnd.color : '#334155',
                pointerEvents: fnd ? 'none' : 'auto'
              }}
            >{cell?.char}</div>
          );
        }))}
      </div>

      {showWinModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2>Күнүмдүк оюн бүттү! 🎉</h2>
            <p>Бүгүнкү күндү ийгиликтүү жаптыңыз.</p>
            <button onClick={() => setView('calendar')} style={styles.nextBtn}>Календарга кайтуу</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' },
  header: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', width: '100%', maxWidth: '400px' },
  calendarDay: { aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', width: '95vw', maxWidth: '380px', background: '#1e293b', padding: '12px', borderRadius: '20px' },
  cell: { aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: '20px', fontWeight: 'bold' },
  loginForm: { background: '#1e293b', padding: '30px', borderRadius: '20px', textAlign: 'center', width: '85%' },
  input: { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: 'none' },
  nextBtn: { background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', width: '100%', fontWeight: 'bold' },
  scoreBadge: { background: '#1e293b', padding: '8px 15px', borderRadius: '10px', border: '1px solid #38bdf8' },
  backBtn: { background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '16px' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalContent: { background: '#1e293b', padding: '30px', borderRadius: '20px', textAlign: 'center', width: '80%' }
};

export default FilwordGame;