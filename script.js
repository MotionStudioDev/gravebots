// ==========================================================================
// GRAVEBOT — SCRIPT & DYNAMIC ISLAND LOGIC
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

  // 1. SCROLL PROGRESS BAR, BACK TO TOP BUTTON & NAVBAR SCROLL EFFECT
  const scrollProgress = document.getElementById('scrollProgress');
  const backToTop = document.getElementById('backToTop');
  const header = document.querySelector('.header');
  
  // Throttle function for performance optimization
  let ticking = false;
  
  // Combined scroll event listener with throttle for better performance
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        
        // Scroll Progress Bar
        if (scrollProgress) {
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const scrollPercent = (scrollTop / docHeight) * 100;
          scrollProgress.style.width = scrollPercent + '%';
        }
        
        // Back to Top Button
        if (backToTop) {
          if (scrollTop > 500) {
            backToTop.classList.add('visible');
          } else {
            backToTop.classList.remove('visible');
          }
        }
        
        // Navbar Scroll Effect
        if (header) {
          if (scrollTop > 50) {
            header.classList.add('scrolled');
          } else {
            header.classList.remove('scrolled');
          }
        }
        
        ticking = false;
      });
      
      ticking = true;
    }
  }, { passive: true });
  
  // Back to Top Button Click
  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // 2. NAVIGATION SMOOTH SCROLLING
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      
      if (targetSection) {
        const headerOffset = 100;
        const elementPosition = targetSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // 3. DİNAMİK ADA: SADECE 1 KEZ GİRER, GÖRÜNÜR VE ÇIKAR GİDER (TAMAMEN KALKAR)
  const islandViewport = document.getElementById('islandViewport');
  
  if (islandViewport) {
    // Sayfa açıldıktan 0.8 saniye sonra yay efektiyle aşağı iner
    setTimeout(() => {
      islandViewport.classList.add('show');

      // 5.5 saniye ekranda kaldıktan sonra yukarı doğru çekilip tamamen gider
      setTimeout(() => {
        islandViewport.classList.remove('show');
        islandViewport.classList.add('exit');

        // DOM'dan da tamamen kaldırılır
        setTimeout(() => {
          islandViewport.remove();
        }, 800);
      }, 5500);

    }, 800);
  }


  // 4. CANLI PİNG & TERMİNAL LOG AKIŞI
  const livePingEl = document.getElementById('livePing');
  if (livePingEl) {
    setInterval(() => {
      // 11 ile 16 ms arasında hafif doğal dalgalanma
      const randomPing = Math.floor(Math.random() * 6) + 11;
      livePingEl.innerText = `${randomPing} ms`;
    }, 5000); // Increased from 3000ms to 5000ms for better performance
  }

  // 5. İSTATİSTİK SAYAÇLARI
  const counters = document.querySelectorAll('.counter');
  let countersStarted = false;

  function runCounters() {
    counters.forEach(counter => {
      const target = +counter.getAttribute('data-target');
      const duration = 2000; // Increased from 1600ms to 2000ms for smoother animation
      const stepTime = 30; // Increased from 25ms to 30ms for fewer updates
      const steps = duration / stepTime;
      const inc = target / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += inc;
        if (current >= target) {
          if (target >= 1000) {
            // 175K veya 40K görünümü
            const kValue = (target / 1000).toFixed(0) + 'K';
            counter.innerText = kValue;
          } else {
            counter.innerText = target.toString();
          }
          clearInterval(timer);
        } else {
          if (target >= 1000) {
            const tempK = (Math.ceil(current) / 1000).toFixed(0) + 'K';
            counter.innerText = tempK;
          } else {
            counter.innerText = Math.ceil(current).toString();
          }
        }
      }, stepTime);
    });
  }

  const statsArea = document.getElementById('stats');
  if (statsArea) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !countersStarted) {
        countersStarted = true;
        runCounters();
      }
    }, { threshold: 0.3 });

    observer.observe(statsArea);
  }


  // 6. KOMUTLAR FİLTRELEME & KOPYALAMA
  const filterBtns = document.querySelectorAll('.tab-btn');
  const cmdCards = document.querySelectorAll('.cmd-card');

  // Kategori Filtreleme
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      cmdCards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Tıklayınca Panoya Kopyalama
  cmdCards.forEach(card => {
    card.addEventListener('click', () => {
      const textToCopy = card.getAttribute('data-clipboard');
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          const copyBtn = card.querySelector('.cmd-copy-btn');
          if (copyBtn) {
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => {
              copyBtn.classList.remove('copied');
              copyBtn.innerHTML = '<i class="fa-regular fa-clone"></i>';
            }, 1800);
          }
        });
      }
    });
  });

});
