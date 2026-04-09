import React, { useState, useEffect, useCallback } from 'react';

// Иконкалар үчүн өзүнчө кичине компонент (Ionicons колдонуу үчүн)
const IonIcon = ({ name }) => <ion-icon name={name}></ion-icon>;

const COLORS = ['#00f2fe', '#4facfe', '#764ba2', '#667eea', '#f093fb', '#f5576c', '#43e97b'];

const FilwordGame = ({ wordsData }) => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('filword_user')));
  const [view, setView] = useState('menu'); // 'menu', 'profile', 'messages', 'photos', 'settings'
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('filword_score')) || 0);
  const [currentCatIndex, setCurrentCatIndex] = useState(() => parseInt(localStorage.getItem('filword_level')) || 0);

  // Оюндун ички абалы
  const [grid, setGrid] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [targetWords, setTargetWords] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);

  // Меню логикасы үчүн индекстер
  const menuItems = [
    { id: 'menu', icon: 'home-outline', text: 'Башкы' },
    { id: 'profile', icon: 'person-outline', text: 'Профиль' },
    { id: 'messages', icon: 'chatbubble-outline', text: 'Кабарлар' },
    { id: 'photos', icon: 'camera-outline', text: 'Сүрөт' },
    { id: 'settings', icon: 'settings-outline', text: 'Түзөтүү' }
  ];

  const activeIndex = menuItems.findIndex(item => item.id === view);

  // Деңгээл генерациясы (кыскартылган логика)
  const generateLevel = useCallback((index) => {
    const category = wordsData[index % wordsData.length];
    if (!category) return;
    // ... (Генерация логикасы мурункудай калат)
    setView('game');
  }, [wordsData]);

  if (!user) {
    return (
      <div style={styles.fullPage}>
        <div style={styles.glassCard}>
          <h1 style={styles.neonText}>КЫРГЫЗ СӨЗ</h1>
          <button onClick={() => setUser({name: 'Amangeldi'})} style={styles.neonButton}>КИРҮҮ</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.fullPage}>
      
      {/* 1. НЕГИЗГИ КОНТЕНТ БӨЛҮГҮ */}
      <div style={styles.contentArea}>
        {view === 'menu' && (
          <div style={styles.menuInner}>
            <div style={styles.levelCard}>
               <div style={{fontSize: '14px', opacity: 0.7}}>ДЕҢГЭЭЛ</div>
               <div style={{fontSize: '54px', fontWeight: '900', color: '#29fd53'}}>{currentCatIndex + 1}</div>
            </div>
            <button onClick={() => generateLevel(currentCatIndex)} style={styles.playBtnLarge}>ОЙНОО</button>
          </div>
        )}

        {view === 'profile' && <div style={styles.placeholderText}>Бул колдонуучунун профили</div>}
        {view === 'settings' && <div style={styles.placeholderText}>Оюндун жөндөөлөрү</div>}

        {view === 'game' && (
            <div style={styles.gameContainer}>
                <div style={styles.headerRow}>
                    <button onClick={() => setView('menu')} style={styles.backBtn}>🏠</button>
                    <div style={styles.glassBadge}>🏆 {score}</div>
                </div>
                {/* Грид бул жерге келет */}
                <div style={styles.placeholderText}>Оюн талаасы...</div>
            </div>
        )}
      </div>

      {/* 2. MAGIC MENU INDICATOR (Төмөнкү меню) */}
      {view !== 'game' && (
        <div style={styles.navWrapper}>
          <div className="navigation" style={styles.navigation}>
            <ul style={styles.navUl}>
              {menuItems.map((item, index) => (
                <li 
                  key={item.id} 
                  className={`list ${view === item.id ? 'active' : ''}`}
                  style={styles.navLi}
                  onClick={() => setView(item.id)}
                >
                  <a href="#" style={styles.navA}>
                    <span className="icon" style={{
                        ...styles.navIcon,
                        transform: view === item.id ? 'translateY(-32px)' : 'translateY(0)',
                        color: view === item.id ? '#fff' : '#222327'
                    }}>
                      <IonIcon name={item.icon} />
                    </span>
                    <span className="text" style={{
                        ...styles.navText,
                        opacity: view === item.id ? 1 : 0,
                        transform: view === item.id ? 'translateY(10px)' : 'translateY(20px)'
                    }}>
                      {item.text}
                    </span>
                  </a>
                </li>
              ))}
              {/* Индикатордун жылышы */}
              <div className="indicator" style={{
                ...styles.indicator,
                transform: `translateX(calc(70px * ${activeIndex}))`
              }}></div>
            </ul>
          </div>
        </div>
      )}

      {/* Индикатордун четтерин (Before/After) стилдөө үчүн кичинекей CSS-in-JS же глобалдык стиль керек */}
      <style>{`
        .indicator {
          position: absolute;
          top: -50%;
          width: 70px;
          height: 70px;
          background: #29fd53;
          border-radius: 50%;
          border: 6px solid #0f172a; /* Арка түсү менен бирдей болушу керек */
          transition: 0.5s;
        }
        .indicator::before {
          content: '';
          position: absolute;
          top: 50%;
          left: -22px;
          width: 20px;
          height: 20px;
          background: transparent;
          border-top-right-radius: 20px;
          box-shadow: 1px -10px 0 0 #0f172a;
        }
        .indicator::after {
          content: '';
          position: absolute;
          top: 50%;
          right: -22px;
          width: 20px;
          height: 20px;
          background: transparent;
          border-top-left-radius: 20px;
          box-shadow: -1px -10px 0 0 #0f172a;
        }
      `}</style>
    </div>
  );
};

const styles = {
  fullPage: { background: '#0f172a', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'Poppins, sans-serif' },
  contentArea: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' },
  
  // Magic Menu Styles
  navWrapper: { position: 'fixed', bottom: '20px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 1000 },
  navigation: { width: '380px', height: '70px', background: '#fff', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '10px' },
  navUl: { display: 'flex', width: '350px', padding: 0, margin: 0, listStyle: 'none' },
  navLi: { position: 'relative', width: '70px', height: '70px', zIndex: 1, cursor: 'pointer' },
  navA: { position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', width: '100%', textAlign: 'center' },
  navIcon: { position: 'relative', display: 'block', lineHeight: '75px', fontSize: '1.5em', textAlign: 'center', transition: '0.5s' },
  navText: { position: 'absolute', color: '#222327', fontWeight: '400', fontSize: '0.75em', letter-spacing: '0.05em', transition: '0.5s' },
  indicator: { position: 'absolute' },

  // Башка стилдер
  menuInner: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '60px', gap: '40px' },
  levelCard: { background: 'rgba(255,255,255,0.03)', padding: '40px', borderRadius: '40px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' },
  playBtnLarge: { padding: '15px 60px', borderRadius: '30px', background: '#29fd53', border: 'none', color: '#000', fontWeight: 'bold', fontSize: '20px', cursor: 'pointer' },
  glassBadge: { background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '15px' },
  placeholderText: { marginTop: '100px', opacity: 0.5 }
};

export default FilwordGame;