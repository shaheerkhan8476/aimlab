import React from 'react';
import CreateUser from './CreateUser';
import SignInUser from './SignInUser';

//Main App entry point
//I am not doing a phony comment commit to cheese contribution score.
//I am testing a legitimate issue with git code ownership.
//The initial_token did indeed get me.
//Pushing again to see if Personal Access TOken fixes.
function App() {
  return (
    <div>
      <CreateUser />
      <SignInUser />
    </div>
  );
}

export default App;
