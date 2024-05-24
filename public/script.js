const textarea = document.getElementById('textarea');
const resultDiv = document.getElementById('result');
const viewCastBtn = document.getElementById('view-cast');
const deleteCastBtn = document.getElementById('delete-cast');
const learnMoreBtn = document.getElementById('readmore');
const carouselImage = document.getElementById('carouselImage');
const mentorInfo = document.getElementById('mentorInfo');
const mentorDescription = document.getElementById('mentorDescription');
const header = document.querySelector('.header');
let sessionStarted = false;
let isTimeOver = false;
let lastKeystroke;
let intervalId;
let resetIntervalId;
let castId;
let sessionId;
let userWriting;
let mentorData;
const secondsOfLife = 8;
let requestInProgress = false;
const mentorCount = 192; // Adjust this based on the actual number of mentors

const generateSessionId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const getRandomMentorId = () => {
  return Math.floor(Math.random() * mentorCount) + 1;
};

const loadImageAndMetadata = async (index) => {
  try {
    const imageUrl = `https://anky.bot/public/mentors/${index}.png`;
    const metadataUrl = `https://anky.bot/public/mentors/${index}.json`;
    const imageResponse = await fetch(imageUrl);
    const metadataResponse = await fetch(metadataUrl);
    if (imageResponse.ok && metadataResponse.ok) {
      carouselImage.src = imageUrl;
      mentorData = await metadataResponse.json();
      mentorInfo.innerHTML = `<p>${mentorData.description}</p>`;
    }
  } catch (error) {
    console.error('Error loading image or metadata:', error);
  }
};

const handleTextChange = () => {
  lastKeystroke = Date.now();
  if (!sessionStarted) {
    sessionStarted = true;
    startSession();
  }
  resetCarouselOpacity();
};

const startSession = () => {
  clearInterval(intervalId); // Clear any previous interval to avoid multiple intervals running
  intervalId = setInterval(() => {
    const elapsedTime = Date.now() - lastKeystroke;
    if (elapsedTime > secondsOfLife * 1000) {
      finishWritingSession();
      clearInterval(intervalId);
      carouselImage.style.opacity = '1';
      carouselImage.style.filter = 'blur(0px)';
      updateHeaderColor(1);
    } else {
      const progress = elapsedTime / (secondsOfLife * 1000);
      const opacity = Math.min(progress, 1);
      const blur = Math.max(20 - (progress * 20), 0);
      carouselImage.style.opacity = opacity;
      carouselImage.style.filter = `blur(${blur}px)`;
      updateHeaderColor(progress);
    }
  }, 100);
};

const resetCarouselOpacity = () => {
  carouselImage.style.opacity = '0';
  carouselImage.style.filter = 'blur(20px)';
  updateHeaderColor(0);
};

const updateHeaderColor = (progress) => {
  const colors = [
    'red', 
    'orange', 
    'yellow', 
    'green', 
    'blue', 
    'indigo', 
    'violet', 
    'white'
  ];
  const step = 1 / (colors.length - 1);
  const colorIndex = Math.floor(progress / step);
  const color = colors[colorIndex];
  header.style.color = color;
};

const finishWritingSession = async (retryCount = 0) => {
  if (requestInProgress) return;
  sessionStarted = false;
  isTimeOver = true;
  userWriting = textarea.value.trim(); // Trim whitespace
  textarea.classList.add('timeover');

  if (userWriting.length === 0) {
    resetSession();
    return textarea.classList.remove('timeover');
  }

  setTimeout(() => {
    textarea.classList.add('hidden');
  }, 1000);

  requestInProgress = true;

  try {
    const response = await fetch(`https://anky.bot/finish-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: userWriting, sessionId })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    castId = data.castHash;
    requestInProgress = false;
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
  lastKeystroke = Date.now();
  sessionId = generateSessionId();
};

const switchCarouselImage = () => {
  const randomMentorId = getRandomMentorId();
  loadImageAndMetadata(randomMentorId);
  resetCarouselOpacity();
  sessionStarted = false;
  isTimeOver = false;
};

textarea.addEventListener('click', () => {
  if (isTimeOver) {
    switchCarouselImage();
  }
});

textarea.addEventListener('input', handleTextChange);

// Disable pasting text into the textarea
textarea.addEventListener('paste', (e) => {
  e.preventDefault();
});

viewCastBtn.addEventListener('click', () => {
  window.open(`https://warpcast.com/anky/${castId.slice(0, 10)}`, "_blank");
});

deleteCastBtn.addEventListener('click', async () => {
  deleteCastBtn.textContent = 'deleting...';
  deleteCastBtn.classList.add('deleting-animation');
  try {
    await fetch(`https://anky.bot/delete-cast`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ castId })
    });
    deleteCastBtn.textContent = 'delete forever';
    deleteCastBtn.classList.remove('deleting-animation');
    switchCarouselImage();
    resetSession();
    startSession(); // Restart the session handling logic
  } catch (error) {
    console.error('Error deleting the cast:', error);
    deleteCastBtn.textContent = 'delete forever';
    deleteCastBtn.classList.remove('deleting-animation');
    alert('Error deleting the cast. Please try again.');
  }
});

learnMoreBtn.addEventListener('click', () => {
  if (mentorData && mentorData.description) {
    mentorDescription.classList.remove('hidden');
    streamText(mentorData.description, mentorDescription);
    learnMoreBtn.style.visibility = 'hidden';  }
});

const streamText = (text, element) => {
  element.innerHTML = '';
  let index = 0;
  const interval = setInterval(() => {
    if (index < text.length) {
      element.innerHTML += text[index++];
    } else {
      clearInterval(interval);
    }
  }, 16);
};

// Initial load of a random mentor image and metadata, but keep it hidden
const initialMentorId = getRandomMentorId();
loadImageAndMetadata(initialMentorId);
resetCarouselOpacity();
