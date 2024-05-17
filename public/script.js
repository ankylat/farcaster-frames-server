const textarea = document.getElementById('textarea');
const resultDiv = document.getElementById('result');
const viewCastBtn = document.getElementById('view-cast');
const deleteCastBtn = document.getElementById('delete-cast');
let sessionStarted = false;
let isTimeOver = false;
let lastKeystroke;
let lifeBarLength = 100;
let intervalId;
let castId;
let sessionId;
let userWriting;
const secondsOfLife = 8;
const apiRoute = 'https://farcaster-frames-server-2.onrender.com'; 
let requestInProgress = false;

// Alternative if `crypto.randomUUID` is not supported:
const generateSessionIdAlternative = () => {
return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});
};

const handleTextChange = () => {
  lastKeystroke = Date.now();
  lifeBarLength = 100;
  document.querySelector('.life-bar').style.width = `${lifeBarLength}%`;
};

const finishWritingSession = async (retryCount = 0) => {
    if (requestInProgress) return; 
    sessionStarted = false;
    isTimeOver = true;
    userWriting = textarea.value;
    textarea.classList.add('timeover');
  
    if (userWriting?.length === 0) {
      resetSession();
      return textarea.classList.remove('timeover');
    }

    setTimeout(() => {
        textarea.classList.add('hidden');
    }, 1000);

    requestInProgress = true;
  
    try {
      const response = await fetch(`${apiRoute}/finish-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userWriting, sessionId })
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const data = await response.json();
      castId = data.castHash;
      setTimeout(() => {
        resultDiv.classList.remove('hidden');
      }, 88);
    } catch (error) {
      console.error('Error saving the session:', error);
  
      if (retryCount < 3) {
        console.log(`Retrying... Attempt ${retryCount + 1}`);
        setTimeout(() => finishWritingSession(retryCount + 1), 1000);
      } else {
        sessionStarted = true;
        textarea.disabled = true; 
        setTimeout(() => {
            textarea.classList.remove('hidden');
          }, 0);
        textarea.classList.remove('timeover');
        alert('Error saving the session on the server. Here is your writing:');   
      }
    }
  };
  

const resetSession = () => {
  resultDiv.classList.add('hidden');
  textarea.classList.remove('hidden');
  textarea.classList.remove('timeover');
  textarea.value = '';
  textarea.disabled = false;
  textarea.focus();
  isTimeOver = false;
  sessionStarted = false;
  lifeBarLength = 100;
  document.querySelector('.life-bar').style.width = `${lifeBarLength}%`;
  lastKeystroke = Date.now();
  sessionId = generateSessionId();
  sessionStarted = true;
  intervalId = setInterval(() => {
    const elapsedTime = Date.now() - lastKeystroke;
    if (elapsedTime > secondsOfLife * 1000) {
      finishWritingSession();
      clearInterval(intervalId);
    } else {
      lifeBarLength = Math.max(100 - (elapsedTime / (10 * secondsOfLife)), 0);
      document.querySelector('.life-bar').style.width = `${lifeBarLength}%`;
    }
  }, 100);
};

textarea.addEventListener('click', () => {
  if (!sessionStarted) {
    sessionStarted = true;
    lastKeystroke = Date.now();
    intervalId = setInterval(() => {
      const elapsedTime = Date.now() - lastKeystroke;
      if (elapsedTime > secondsOfLife * 1000) {
        finishWritingSession();
        clearInterval(intervalId);
      } else {
        lifeBarLength = Math.max(100 - (elapsedTime / (10 * secondsOfLife)), 0);
        document.querySelector('.life-bar').style.width = `${lifeBarLength}%`;
      }
    }, 100);
  } else if (isTimeOver) {
    window.open(`https://warpcast.com/anky/${castId.slice(0, 10)}`, "_blank");
  }
});

textarea.addEventListener('input', handleTextChange);

viewCastBtn.addEventListener('click', () => {
  window.open(`https://warpcast.com/anky/${castId.slice(0, 10)}`, "_blank");
});

deleteCastBtn.addEventListener('click', async () => {
  deleteCastBtn.textContent = 'deleting...';
  deleteCastBtn.classList.add('deleting-animation');
  try {
    await fetch(`${apiRoute}/delete-cast`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ castId })
    });
    deleteCastBtn.textContent = 'delete forever';
    deleteCastBtn.classList.remove('deleting-animation');
    resetSession();
  } catch (error) {
    console.error('Error deleting the cast:', error);
    deleteCastBtn.textContent = 'delete forever';
    deleteCastBtn.classList.remove('deleting-animation');
    alert('Error deleting the cast. Please try again.');
  }
});
