    // app.js integrated
    let quizData = null;

    // Show error message utility
    function showError(msg) {
        const errDiv = document.getElementById('upload-error');
        errDiv.textContent = msg;
        errDiv.classList.remove('hidden');
        setTimeout(() => errDiv.classList.add('hidden'), 6000);
    }

    // Utility: markdown to HTML with robust LaTeX protection
    function renderMarkdown(md) {
      if (typeof marked === 'undefined') return md;
      if (!md) return '';
      
      // Mask $$...$$ and $...$ to prevent marked from stripping backslashes
      const mathBlocks = [];
      
      // Protect Display Math ($$...$$)
      md = md.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
          mathBlocks.push(match);
          return `___MATH_BLOCK_${mathBlocks.length - 1}___`;
      });
      
      // Protect Inline Math ($...$)
      md = md.replace(/\$([\s\S]*?)\$/g, (match) => {
          mathBlocks.push(match);
          return `___MATH_BLOCK_${mathBlocks.length - 1}___`;
      });
      
      let html = marked.parse(md);
      
      // Unmask the Math blocks cleanly back into the HTML
      mathBlocks.forEach((block, i) => {
          html = html.replace(`___MATH_BLOCK_${i}___`, block);
      });
      
      return html;
    }

    // Utility: render LaTeX using KaTeX on DOM Elements
    function renderLatex(container) {
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(container, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ],
          throwOnError: false // prevent the app from breaking if there's a syntax error
        });
      }
    }

    // ---- MATERIALS LOGIC ----
    function renderMaterials() {
      const navContainer = document.getElementById('nav-links');
      const mobileNavContainer = document.getElementById('mobile-nav-links');
      const contentContainer = document.getElementById('material-content');
      
      navContainer.innerHTML = '';
      mobileNavContainer.innerHTML = '';
      
      quizData.materials.forEach((para, idx) => {
        const firstLine = para.split('\n')[0].replace(/^##?\s*/, '').trim();
        
        const btn = document.createElement('button');
        btn.className = 'text-left px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ' + 
                        (idx === 0 ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface');
        btn.textContent = firstLine || `Section ${idx + 1}`;
        
        const mBtn = document.createElement('button');
        mBtn.className = 'whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ' +
                         (idx === 0 ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant');
        mBtn.textContent = firstLine || `Section ${idx + 1}`;

        const updateView = () => {
          Array.from(navContainer.children).forEach(b => {
            b.className = 'text-left px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border-l-4 border-transparent';
          });
          btn.className = 'text-left px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium bg-primary/10 text-primary border-l-4 border-primary';
          
          Array.from(mobileNavContainer.children).forEach(b => {
            b.className = 'whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors bg-surface-container-high text-on-surface-variant';
          });
          mBtn.className = 'whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors bg-primary text-on-primary';
          
          contentContainer.innerHTML = renderMarkdown(para);
          renderLatex(contentContainer);
        };

        btn.onclick = updateView;
        mBtn.onclick = updateView;
        
        navContainer.appendChild(btn);
        mobileNavContainer.appendChild(mBtn);
        
        if (idx === 0) updateView();
      });
    }

    // ---- FLASHCARDS LOGIC ----
    let currentFlashcardIdx = 0;
    function renderFlashcards() {
      const cardElement = document.getElementById('flashcard');
      const frontContent = document.getElementById('fc-front-content');
      const backContent = document.getElementById('fc-back-content');
      const progressText = document.getElementById('fc-progress');
      
      currentFlashcardIdx = 0;
      cardElement.classList.remove('flipped');
      
      function updateCard() {
        const fc = quizData.flashcards[currentFlashcardIdx];
        progressText.textContent = `Card ${currentFlashcardIdx + 1} of ${quizData.flashcards.length}`;
        
        frontContent.innerHTML = renderMarkdown(fc.front);
        backContent.innerHTML = renderMarkdown(fc.back);
        
        renderLatex(frontContent);
        renderLatex(backContent);
      }

      cardElement.onclick = () => cardElement.classList.toggle('flipped');

      document.getElementById('fc-prev').onclick = () => {
        currentFlashcardIdx = (currentFlashcardIdx - 1 + quizData.flashcards.length) % quizData.flashcards.length;
        cardElement.classList.remove('flipped');
        setTimeout(updateCard, 150);
      };
      
      document.getElementById('fc-next').onclick = () => {
        currentFlashcardIdx = (currentFlashcardIdx + 1) % quizData.flashcards.length;
        cardElement.classList.remove('flipped');
        setTimeout(updateCard, 150);
      };

      updateCard();
    }

    // ---- QUIZ LOGIC ----
    function renderQuiz() {
      const container = document.getElementById('quiz-content-area');
      const questions = quizData.questions;
      let qIdx = 0;
      let score = 0;
      let state = { answered: false, selected: null, showHint: false };

      function updateQuestion() {
        container.innerHTML = '';
        const q = questions[qIdx];
        
        // Progress Indicator
        const progressDiv = document.createElement('div');
        progressDiv.className = 'space-y-2 px-2';
        const percent = ((qIdx) / questions.length) * 100;
        progressDiv.innerHTML = `
            <div class="flex justify-between items-center text-on-surface-variant font-label text-xs md:text-sm uppercase tracking-widest">
                <span>Quiz</span>
                <span>Question ${qIdx + 1} of ${questions.length}</span>
            </div>
            <div class="h-2 bg-surface-container-lowest rounded-full overflow-hidden">
                <div class="h-full bg-primary luminous-progress rounded-full transition-all duration-500" style="width: ${percent}%;"></div>
            </div>
        `;
        container.appendChild(progressDiv);

        // Question Card (Compacted Padding & Margins)
        const cardDiv = document.createElement('div');
        cardDiv.className = 'glass-panel rounded-3xl p-6 md:p-8 ambient-shadow w-full';
        
        const qTitle = document.createElement('h1');
        qTitle.className = 'text-xl md:text-2xl font-headline font-bold mb-6 text-on-surface leading-tight';
        qTitle.innerHTML = renderMarkdown(q.text);
        cardDiv.appendChild(qTitle);
        
        const optsDiv = document.createElement('div');
        optsDiv.className = 'space-y-3';
        
        q.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            
            const renderOptionState = () => {
                if (!state.answered) {
                    if (state.selected === i) {
                        btn.className = 'w-full text-left p-4 md:p-5 rounded-2xl bg-primary/10 border border-primary transition-all duration-300 flex items-center gap-4 relative overflow-hidden text-on-surface';
                        btn.innerHTML = `
                            <div class="w-6 h-6 text-sm rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0 transition-colors">
                                ${String.fromCharCode(65 + i)}
                            </div>
                            <span class="text-base md:text-lg flex-1">${renderMarkdown(opt)}</span>
                        `;
                    } else {
                        btn.className = 'w-full text-left p-4 md:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 hover:bg-surface-container-high transition-all duration-300 group flex items-center gap-4 relative overflow-hidden';
                        btn.innerHTML = `
                            <div class="w-6 h-6 text-sm rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant group-hover:border-primary group-hover:text-primary transition-colors shrink-0">
                                ${String.fromCharCode(65 + i)}
                            </div>
                            <span class="text-base md:text-lg text-on-surface-variant group-hover:text-on-surface transition-colors flex-1">${renderMarkdown(opt)}</span>
                        `;
                    }
                } else {
                    // Answered states remain similar but padded smaller
                    if (i === q.correctIndex) {
                        btn.className = 'w-full text-left p-4 md:p-5 rounded-2xl bg-tertiary-container/10 border border-tertiary transition-all duration-300 flex items-center gap-4 relative overflow-hidden';
                        btn.innerHTML = `
                            <div class="w-6 h-6 text-sm rounded-full bg-tertiary flex items-center justify-center text-on-tertiary shrink-0">
                                <span class="material-symbols-outlined text-xs" style="font-variation-settings: 'FILL' 1;">check</span>
                            </div>
                            <span class="text-base md:text-lg text-tertiary-fixed flex-1">${renderMarkdown(opt)}</span>
                            <div class="absolute right-4 opacity-50"><span class="material-symbols-outlined text-tertiary">stars</span></div>
                        `;
                    } else if (state.selected === i) {
                        btn.className = 'w-full text-left p-4 md:p-5 rounded-2xl bg-error-container/10 border border-error transition-all duration-300 flex items-center gap-4 relative overflow-hidden';
                        btn.innerHTML = `
                            <div class="w-6 h-6 text-sm rounded-full bg-error flex items-center justify-center text-on-error shrink-0">
                                <span class="material-symbols-outlined text-xs">close</span>
                            </div>
                            <span class="text-base md:text-lg text-error flex-1">${renderMarkdown(opt)}</span>
                        `;
                    } else {
                        btn.className = 'w-full text-left p-4 md:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 opacity-50 flex items-center gap-4 relative overflow-hidden';
                        btn.innerHTML = `
                            <div class="w-6 h-6 text-sm rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant shrink-0">
                                ${String.fromCharCode(65 + i)}
                            </div>
                            <span class="text-base md:text-lg text-on-surface-variant flex-1">${renderMarkdown(opt)}</span>
                        `;
                    }
                }
                renderLatex(btn);
            };
            
            renderOptionState();
            
            btn.onclick = () => {
                if (state.answered) return;
                state.selected = i;
                Array.from(optsDiv.children).forEach((child) => child.click_render());
                
                // Live Enable Submit Button
                const submitBtn = document.getElementById('quiz-submit-btn');
                if (submitBtn) submitBtn.disabled = false;
            };
            
            btn.click_render = renderOptionState;
            optsDiv.appendChild(btn);
        });
        cardDiv.appendChild(optsDiv);
        
        // Explanation section (compacted)
        if (state.answered || state.showHint) {
            const expDiv = document.createElement('div');
            expDiv.className = 'mt-4 p-4 rounded-2xl bg-surface-container-lowest border-l-2 ' + (state.answered ? 'border-tertiary' : 'border-primary');
            expDiv.innerHTML = `
                <div class="flex items-center gap-2 ${state.answered ? 'text-tertiary' : 'text-primary'} font-bold mb-2 uppercase tracking-wide text-xs md:text-sm">
                    <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">lightbulb</span>
                    ${state.answered ? 'Explanation' : 'Hint'}
                </div>
                <div class="text-on-surface-variant text-sm md:text-base leading-relaxed">
                    ${renderMarkdown(state.answered ? q.explanation || q.hint : q.hint)}
                </div>
            `;
            cardDiv.appendChild(expDiv);
        }
        
        container.appendChild(cardDiv);
        
        // Actions (Submit / Next)
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flex flex-col sm:flex-row justify-between items-center gap-4 px-2';
        
        if (!state.answered) {
            const hintBtn = document.createElement('button');
            hintBtn.className = 'text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 px-4 py-2 font-medium text-sm';
            hintBtn.innerHTML = `<span class="material-symbols-outlined text-base">help_outline</span> ${state.showHint ? 'Hide Hint' : 'Get Hint'}`;
            hintBtn.onclick = () => { state.showHint = !state.showHint; updateQuestion(); };
            
            const submitBtn = document.createElement('button');
            submitBtn.id = 'quiz-submit-btn'; // Assigned ID
            submitBtn.className = 'w-full sm:w-auto bg-gradient-to-br from-primary to-secondary-container text-on-primary px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary-container/20 disabled:opacity-40 disabled:cursor-not-allowed';
            submitBtn.innerHTML = `Submit Answer <span class="material-symbols-outlined text-base">check_circle</span>`;
            submitBtn.disabled = state.selected === null; // Initial state
            submitBtn.onclick = () => {
                state.answered = true;
                if (state.selected === q.correctIndex) score++;
                updateQuestion();
            };
            
            actionsDiv.append(hintBtn, submitBtn);
        } else {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'w-full sm:w-auto bg-gradient-to-br from-primary to-secondary-container text-on-primary px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary-container/20 ml-auto';
            nextBtn.innerHTML = (qIdx === questions.length - 1 ? 'Finish Quiz' : 'Next Question') + ` <span class="material-symbols-outlined text-base">arrow_forward</span>`;
            nextBtn.onclick = () => {
                qIdx++;
                state = { answered: false, selected: null, showHint: false };
                if (qIdx < questions.length) {
                    updateQuestion();
                } else {
                    showResult();
                }
            };
            actionsDiv.appendChild(nextBtn);
        }
        
        container.appendChild(actionsDiv);
        renderLatex(container);
      }

      function showResult() {
        container.innerHTML = `
            <div class="glass-panel rounded-3xl p-8 md:p-12 text-center ambient-shadow w-full">
                <h2 class="text-3xl md:text-4xl font-headline font-bold mb-4 text-on-surface">Quiz Completed!</h2>
                <div class="text-5xl md:text-6xl font-black glow-text mb-6">${score} / ${questions.length}</div>
                <p class="text-lg md:text-xl text-on-surface-variant mb-8">You scored ${Math.round((score/questions.length)*100)}%.</p>
                <button id="restart-quiz" class="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary-container/20">
                    Retake Quiz
                </button>
            </div>
        `;
        document.getElementById('restart-quiz').onclick = () => {
            qIdx = 0; score = 0;
            state = { answered: false, selected: null, showHint: false };
            updateQuestion();
        };
      }

      updateQuestion();
    }

    // ---- TAB MANAGEMENT ----
    const views = ['materials', 'flashcards', 'quiz'];
    function switchTab(target) {
      views.forEach(v => {
        document.getElementById(v + '-view').classList.add('hidden');
        document.querySelector(`[data-tab="${v}"]`)?.classList.remove('active', 'text-primary');
        document.querySelector(`[data-tab="${v}"]`)?.classList.add('text-on-surface-variant');
      });
      
      document.getElementById(target + '-view').classList.remove('hidden');
      if (target === 'materials') document.getElementById('materials-view').classList.add('flex');
      
      document.querySelector(`[data-tab="${target}"]`)?.classList.remove('text-on-surface-variant');
      document.querySelector(`[data-tab="${target}"]`)?.classList.add('active', 'text-primary');
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => switchTab(e.target.getAttribute('data-tab')));
    });

    document.getElementById('reload-btn').addEventListener('click', () => location.reload());

    // ---- INIT APP ----
    function initApp() {
        renderMaterials();
        renderFlashcards();
        renderQuiz();
        document.getElementById('uploader-view').classList.add('hidden');
        document.getElementById('tabs-container').classList.remove('hidden');
        document.getElementById('reload-btn').classList.remove('hidden');
        switchTab('materials');
    }

    // ---- FILE UPLOAD & PASTE ----
    function handleFile(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          quizData = JSON.parse(e.target.result);
          initApp();
        } catch (err) {
          showError('Invalid JSON formatting in file. Please ensure it perfectly matches the schema.');
        }
      };
      reader.readAsText(file);
    }

    // Drag and Drop Logic
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-primary', 'bg-surface-container-high/50');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('border-primary', 'bg-surface-container-high/50');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-primary', 'bg-surface-container-high/50');
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    // Paste Logic
    const loadPasteBtn = document.getElementById('load-paste-btn');
    const pasteArea = document.getElementById('json-paste-area');
    
    loadPasteBtn.addEventListener('click', () => {
        const text = pasteArea.value;
        if (!text.trim()) {
            showError('Please paste some JSON data first.');
            return;
        }
        try {
            quizData = JSON.parse(text);
            initApp();
        } catch (err) {
            showError('Invalid JSON formatting in pasted text. ' + err.message);
        }
    });
