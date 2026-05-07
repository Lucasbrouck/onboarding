let currentStep = 'step-1';
let selectedPath = null;
let estoqueChoices = { entrada: null, saida: null };
let history = []; // Track step history

const steps = {
  'step-1': { next: 'step-2' },
  'step-2': { 
    next: () => {
      if (selectedPath === 'checklists') return 'step-checklist-1';
      if (selectedPath === 'estoque') return 'step-estoque-1';
      return null;
    }
  },
  'step-checklist-1': { next: 'step-checklist-2' },
  'step-checklist-2': { next: null },
  'step-estoque-1': { next: 'step-estoque-2' },
  'step-estoque-2': { next: 'step-estoque-3' },
  'step-estoque-3': { next: 'step-estoque-final' },
  'step-estoque-final': { next: 'step-estoque-tasks' },
  'step-estoque-tasks': { next: null }
};

function selectPath(path) {
  selectedPath = path;
  nextStep();
}

function selectEstoqueOption(type, value) {
  estoqueChoices[type] = value;
  if (type === 'saida') {
    generateWorkflow();
    generateChecklist();
  }
  nextStep();
}

let currentTasks = [];
let storyIndex = 0;
let storyTimer = null;

function generateWorkflow() {
  const container = document.getElementById('workflow-list');
  let tasks = [];

  // Entrada Tasks
  if (estoqueChoices.entrada === 'assistente') {
    tasks.push('fechar listas de compras com as sugestões da alô');
    tasks.push('receber suas compras com assistente de recebimento');
  } else if (estoqueChoices.entrada === 'whatsapp') {
    tasks.push('dar entrada de produtos direto pelo whatsapp quando eles chegarem');
  } else if (estoqueChoices.entrada === 'plataforma') {
    tasks.push('dar entrada de produtos usando a plataforma web (celular ou computador)');
  }

  // Saida Tasks
  if (estoqueChoices.saida === 'contagem') {
    tasks.push('contar seu estoque periodicamente para dar as saídas do estoque');
  } else if (estoqueChoices.saida === 'whatsapp') {
    tasks.push('dar saída de produtos pelo celular toda vez que o produto sair do estoque');
  } else if (estoqueChoices.saida === 'plataforma') {
    tasks.push('dar saída de produtos pelo celular ou pelo computador');
  }

  currentTasks = tasks; // Store for stories

  container.innerHTML = tasks.map((task, i) => `
    <div class="task-item no-click" style="animation-delay: ${i * 0.1}s">
      <div class="task-info">
        <span class="task-number">${String(i + 1).padStart(2, '0')}</span>
        <span class="task-name">${task}</span>
      </div>
      <span class="task-action">→</span>
    </div>
  `).join('');
}

function generateChecklist() {
  const container = document.getElementById('checklist-tasks');
  let tasks = [
    'cadastrar seus primeiros produtos',
    'cadastrar usuários'
  ];

  // Specific tasks based on workflow
  if (estoqueChoices.entrada === 'assistente') {
    tasks.push('Cadastrar compra recorrente');
    tasks.push('Fechar sua primeira lista');
    tasks.push('Receber sua primeira lista');
  } else if (estoqueChoices.entrada === 'whatsapp' || estoqueChoices.entrada === 'plataforma') {
    tasks.push('Dê sua primeira entrada de mercadoria');
    tasks.push('Dê sua primeira saída de mercadoria');
  }

  if (estoqueChoices.saida === 'contagem') {
    tasks.push('Cadastre sua primeira contagem');
    tasks.push('Cadastre grupos de insumos');
  }

  currentTasks = tasks; // Store for stories

  container.innerHTML = tasks.map((task, i) => `
    <div class="task-item" style="animation-delay: ${i * 0.1}s" onclick="openStories(${i}, event)">
      <div class="task-info">
        <span class="task-number">${String(i + 1).padStart(2, '0')}</span>
        <span class="task-name">${task}</span>
      </div>
      <span class="task-action">assistir</span>
    </div>
  `).join('');
}

let isStoryLongPress = false;
let storyPressTimer = null;
let canStoryNavigate = true;
let lastStoryNavTime = 0; // Debounce for double firing (touch + click)

function openStories(index, event) {
  if (event) event.stopPropagation();
  
  storyIndex = index;
  const overlay = document.getElementById('stories-overlay');
  const progress = document.getElementById('stories-progress');
  
  progress.innerHTML = currentTasks.map((_, i) => `
    <div class="progress-bar ${i < index ? 'completed' : (i === index ? 'active' : '')}">
      <div class="progress-fill"></div>
    </div>
  `).join('');

  overlay.classList.add('active');
  
  // Show finish buttons once at least one story is opened
  const checklistBtn = document.getElementById('btn-checklist-finish');
  const estoqueBtn = document.getElementById('btn-estoque-finish');
  if (checklistBtn) checklistBtn.style.display = 'block';
  if (estoqueBtn) estoqueBtn.style.display = 'block';

  // Lockout navigation for a moment to prevent "click-through"
  canStoryNavigate = false;
  setTimeout(() => { canStoryNavigate = true; }, 300);

  // Clear and re-assign
  overlay.onmousedown = overlay.onmouseup = overlay.onclick = overlay.ontouchstart = overlay.ontouchend = null;

  overlay.onmousedown = (e) => {
    if (e.target.classList.contains('close-stories')) return;
    isStoryLongPress = false;
    pauseStories();
    storyPressTimer = setTimeout(() => {
      isStoryLongPress = true;
    }, 200);
  };

  overlay.onmouseup = (e) => {
    clearTimeout(storyPressTimer);
    resumeStories();
  };

  overlay.onclick = (e) => {
    if (e.target.classList.contains('close-stories')) return;
    if (!canStoryNavigate) return; // Ignore if in lockout
    
    if (!isStoryLongPress) {
      const width = window.innerWidth;
      if (e.clientX > width / 2) {
        goToNextStory();
      } else {
        goToPrevStory();
      }
    }
    isStoryLongPress = false;
  };
  
  // Mobile touch
  overlay.ontouchstart = (e) => {
    isStoryLongPress = false;
    pauseStories();
    storyPressTimer = setTimeout(() => {
      isStoryLongPress = true;
    }, 200);
  };

  overlay.ontouchend = (e) => {
    clearTimeout(storyPressTimer);
    resumeStories();
    if (!canStoryNavigate) return;

    if (!isStoryLongPress) {
      const width = window.innerWidth;
      const touchX = e.changedTouches[0].clientX;
      if (touchX > width / 2) {
        goToNextStory();
      } else {
        goToPrevStory();
      }
    }
    isStoryLongPress = false;
  };

  updateStoryContent();
  startStoryTimer();
}

function updateStoryContent() {
  const title = document.getElementById('story-title');
  const content = document.getElementById('stories-content');
  const task = currentTasks[storyIndex];
  
  title.innerText = task;
  
  const colors = ['#F08056', '#4091FF', '#006622', '#FE87D7', '#FFAC52'];
  content.parentElement.style.backgroundColor = colors[storyIndex % colors.length];
}

function startStoryTimer() {
  clearTimeout(storyTimer);
  storyTimer = setTimeout(() => {
    goToNextStory();
  }, 5000);
}

function goToNextStory() {
  const now = Date.now();
  if (now - lastStoryNavTime < 200) return; // Debounce
  lastStoryNavTime = now;

  if (storyIndex < currentTasks.length - 1) {
    storyIndex++;
    updateBars();
    updateStoryContent();
    startStoryTimer();
  } else {
    closeStories();
  }
}

function goToPrevStory() {
  const now = Date.now();
  if (now - lastStoryNavTime < 200) return; // Debounce
  lastStoryNavTime = now;

  if (storyIndex > 0) {
    storyIndex--;
  }
  updateBars();
  updateStoryContent();
  startStoryTimer();
}

function updateBars() {
  const bars = document.querySelectorAll('.progress-bar');
  bars.forEach((bar, i) => {
    bar.classList.remove('active', 'completed');
    if (i < storyIndex) bar.classList.add('completed');
    if (i === storyIndex) {
      // Force animation restart
      bar.style.display = 'none';
      bar.offsetHeight; // trigger reflow
      bar.style.display = 'block';
      bar.classList.add('active');
    }
  });
}

function pauseStories() {
  clearTimeout(storyTimer);
  const activeFill = document.querySelector('.progress-bar.active .progress-fill');
  if (activeFill) activeFill.style.animationPlayState = 'paused';
}

function resumeStories() {
  // We need to estimate remaining time or just restart timer
  // For simplicity since it's a mock, we'll just restart the 5s timer for the current story
  // but let the animation continue from where it was
  const activeFill = document.querySelector('.progress-bar.active .progress-fill');
  if (activeFill) activeFill.style.animationPlayState = 'running';
  
  startStoryTimer(); 
}

function closeStories() {
  clearTimeout(storyTimer);
  document.getElementById('stories-overlay').classList.remove('active');
}

function nextStep() {
  const currentScreen = document.getElementById(currentStep);
  let nextStepId;

  if (typeof steps[currentStep].next === 'function') {
    nextStepId = steps[currentStep].next();
  } else {
    nextStepId = steps[currentStep].next;
  }

  const nextScreen = document.getElementById(nextStepId);

  if (nextScreen) {
    history.push(currentStep); // Add to history
    updateBackButton();
    performTransition(currentScreen, nextScreen, nextStepId);
  } else if (nextStepId === null && selectedPath) {
    alert('Fim do onboarding!');
  }
}

function prevStep() {
  if (history.length === 0) return;

  const currentScreen = document.getElementById(currentStep);
  const prevStepId = history.pop(); // Get last step
  const prevScreen = document.getElementById(prevStepId);

  if (prevScreen) {
    updateBackButton();
    performTransition(currentScreen, prevScreen, prevStepId);
  }
}

function updateBackButton() {
  const backBtn = document.getElementById('back-btn');
  const screen = document.getElementById(currentStep);
  
  if (history.length > 0 && screen.scrollTop < 50) {
    backBtn.classList.add('visible');
  } else {
    backBtn.classList.remove('visible');
  }
}

// Add scroll listeners to all screens
document.querySelectorAll('.screen').forEach(screen => {
  screen.addEventListener('scroll', () => {
    updateBackButton();
  });
});

function generateChecklistFlowTasks() {
  const container = document.getElementById('checklist-flow-tasks');
  const tasks = [
    'cadastrar responsável',
    'Cadastrar checklist',
    'Baixar Aplicativo'
  ];

  currentTasks = tasks;

  container.innerHTML = tasks.map((task, i) => `
    <div class="task-item" style="animation-delay: ${i * 0.1}s" onclick="openStories(${i}, event)">
      <div class="task-info">
        <span class="task-number">${String(i + 1).padStart(2, '0')}</span>
        <span class="task-name">${task}</span>
      </div>
      <span class="task-action">assistir</span>
    </div>
  `).join('');
}

function performTransition(currentScreen, nextScreen, nextStepId) {
  // Logic from previous nextStep...
  console.log(`Transitioning to ${nextStepId}`);
  
  // Reset scroll position for the next screen
  nextScreen.scrollTop = 0;

  // Generate tasks if going to checklist end
  if (nextStepId === 'step-checklist-2') {
    generateChecklistFlowTasks();
  }
  
  // Assign names based on steps (same as before)
  if (currentStep === 'step-checklist-1') {
    const highlights = currentScreen.querySelectorAll('.highlight-pink');
    if (highlights[0]) highlights[0].style.viewTransitionName = 'h-checklists';
    if (highlights[1]) highlights[1].style.viewTransitionName = 'h-responsavel';
    if (highlights[2]) highlights[2].style.viewTransitionName = 'h-aplicativo';
  }

  if (currentStep === 'step-estoque-1') {
    const highlights = currentScreen.querySelectorAll('.highlight-blue');
    if (highlights[0]) highlights[0].style.viewTransitionName = 'h-entrada';
    if (highlights[1]) highlights[1].style.viewTransitionName = 'h-saida';
  }

  const transition = () => {
    currentScreen.querySelectorAll('[style*="view-transition-name"]').forEach(el => {
      el.style.viewTransitionName = '';
    });

    if (nextStepId === 'step-checklist-2') {
      const tasks = nextScreen.querySelectorAll('.task-item');
      if (tasks[0]) tasks[0].style.viewTransitionName = 'h-responsavel';
      if (tasks[1]) tasks[1].style.viewTransitionName = 'h-checklists';
      if (tasks[2]) tasks[2].style.viewTransitionName = 'h-aplicativo';
    }

    if (nextStepId === 'step-estoque-2') {
      const title = nextScreen.querySelector('.title');
      if (title) title.style.viewTransitionName = 'h-entrada';
    }

    if (nextStepId === 'step-estoque-3') {
      const title = nextScreen.querySelector('.title');
      if (title) title.style.viewTransitionName = 'h-saida';
    }

    currentScreen.classList.remove('active');
    currentStep = nextStepId;
    nextScreen.classList.add('active');
    
    const newBg = nextScreen.getAttribute('data-bg');
    if (newBg) document.body.style.backgroundColor = newBg;
  };

  if (document.startViewTransition) {
    const t = document.startViewTransition(transition);
    t.finished.finally(() => {
      document.querySelectorAll('[style*="view-transition-name"]').forEach(el => {
        el.style.viewTransitionName = '';
      });
    });
  } else {
    transition();
  }
}

function minimizeOnboarding() {
  document.getElementById('quiz-container').classList.add('minimized');
  document.getElementById('onboarding-toggle').classList.add('visible');
  document.getElementById('back-btn').classList.remove('visible'); // Hide back button when hidden
}

function maximizeOnboarding() {
  document.getElementById('quiz-container').classList.remove('minimized');
  document.getElementById('onboarding-toggle').classList.remove('visible');
  updateBackButton(); // Restore back button state
}

function finishQuiz(objective) {
  console.log('User objective:', objective);
  minimizeOnboarding();
}

// Expose to window for inline onclicks
window.nextStep = nextStep;
window.prevStep = prevStep;
window.selectPath = selectPath;
window.selectEstoqueOption = selectEstoqueOption;
window.finishQuiz = finishQuiz;
window.minimizeOnboarding = minimizeOnboarding;
window.maximizeOnboarding = maximizeOnboarding;
window.openStories = openStories;
window.closeStories = closeStories;
