import React from 'react';
import FilwordGame from './components/FilwordGame'; // Жолду тууралаңыз
import dictionary from './data/words.json';

function App() {
  // Консолдон маалымат келип жатканын текшерүү үчүн:
  console.log("Dictionary data:", dictionary);

  return (
    <div>
      {/* dictionary.кыргыз_сөздүгү бар экенин текшерип, анан жиберебиз */}
      {dictionary && dictionary.кыргыз_сөздүгү ? (
        <FilwordGame wordsData={dictionary.кыргыз_сөздүгү} />
      ) : (
        <div className="text-white bg-red-500 p-4">
          JSON маалыматы табылган жок! "кыргыз_сөздүгү" ачкычын текшериңиз.
        </div>
      )}
    </div>
  );
}

export default App;