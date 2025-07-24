import React from 'react';
import './App.css';
import NotebookApp from './components/NotebookApp';

// PUBLIC_INTERFACE
function App() {
  // The root component: renders the NotebookApp UI (which manages theme, accessibility, responsiveness)
  return (
    <div className="App">
      <NotebookApp />
    </div>
  );
}

export default App;
