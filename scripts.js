
    // ScrollReveal Initialization
    ScrollReveal().reveal('.reveal', {
      distance: '50px',
      duration: 1000,
      easing: 'ease-in-out',
      origin: 'bottom',
      interval: 200
    });

    // Smooth scroll for navbar links
    $(document).ready(function () {
      $('nav a').on('click', function (e) {
        if (this.hash !== '') {
          e.preventDefault();
          const hash = this.hash;

          $('html, body').animate(
            {
              scrollTop: $(hash).offset().top
            },
            800
          );
        }
      });
    });

    // Scroll to About Section with Button Animation
    window.scrollToAbout = function () {
      const welcomeBtn = document.querySelector('.welcome-btn');
      const aboutSection = document.getElementById("about");

      // Button text & style animation
      if (welcomeBtn) {
        welcomeBtn.innerText = 'Thanks for Visiting! 😊';
        welcomeBtn.style.backgroundColor = '#00bfa6';
        welcomeBtn.style.color = '#fff';
        welcomeBtn.style.transform = 'scale(1.1)';
      }

      // Scroll and highlight
      if (aboutSection) {
        aboutSection.scrollIntoView({ behavior: "smooth" });

        // Add highlight class
        aboutSection.classList.add("highlight-flash");

        setTimeout(() => {
          if (welcomeBtn) {
            welcomeBtn.innerText = 'Welcome to my Portfolio!';
            welcomeBtn.style.backgroundColor = '';
            welcomeBtn.style.color = '';
            welcomeBtn.style.transform = 'scale(1)';
          }

          // Remove highlight
          aboutSection.classList.remove("highlight-flash");
        }, 3000);
      }
    };

    // Skill Bars Animation
    window.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.skill-fill').forEach(bar => {
        const fill = bar.getAttribute('data-fill');
        bar.style.width = fill;
      });
    });

    // AOS Initialization
    $(document).ready(function() {
      AOS.init();
    });

    // Fetch GitHub Repositories
    async function fetchRepos() {
      const username = "Sanskrutin19";
      const response = await fetch(`https://api.github.com/users/${username}/repos`);
      const repos = await response.json();
      const container = document.getElementById('repo-container');
      container.innerHTML = '';

      repos.slice(0, 15).forEach(repo => {
        const card = document.createElement('div');
        card.className = 'repo-card';
        card.innerHTML = `
          <div class="repo-tag">Repo</div>
          <div class="repo-header">
            <img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" alt="GitHub" class="repo-icon" />
            <h3>${repo.name}</h3>
          </div>
          <p>${repo.description || "No description provided."}</p>
          <a href="${repo.html_url}" target="_blank">🔗 View on GitHub</a>
        `;
        container.appendChild(card);
      });
    }

    fetchRepos();

    const projects = ['Project One', 'Project Two', 'Project Three', 'Project Four', 'Project Five', 'Project Six'];
const carousel = document.getElementById('carousel');
const radius = 250;
let currentAngle = 0;

// Create and position items
projects.forEach((name, index) => {
  const item = document.createElement('div');
  item.className = 'carousel__item';
  item.innerText = name;

  const theta = (360 / projects.length) * index;
  const x = radius * Math.sin((theta * Math.PI) / 180);
  const z = radius * Math.cos((theta * Math.PI) / 180);

  item.style.transform = `translateX(${x}px) translateZ(${z}px) rotateY(${theta}deg)`;
  carousel.appendChild(item);
});

// Mouse drag to rotate
let isDragging = false;
let startX = 0;

document.addEventListener('mousedown', (e) => {
  isDragging = true;
  startX = e.clientX;
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const dx = e.clientX - startX;
    currentAngle += dx * 0.1;
    carousel.style.transform = `rotateY(${currentAngle}deg)`;
    startX = e.clientX;
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

// Scroll to rotate
document.addEventListener('wheel', (e) => {
  currentAngle += e.deltaY * 0.1;
  carousel.style.transform = `rotateY(${currentAngle}deg)`;
});
$(function() {
  $(".project-window").draggable().resizable();
});
document.querySelectorAll('.run-btn').forEach(button => {
  button.addEventListener('click', () => {
    const details = button.nextElementSibling;
    details.classList.toggle('hidden');
    details.style.display = details.classList.contains('hidden') ? 'none' : 'block';
  });
});
  document.getElementById("contactForm").addEventListener("submit", function (e) {
    e.preventDefault();

    // Optionally clear form
    this.reset();

    // Show toast
    const toast = document.getElementById("toast");
    toast.classList.add("show");

    // Hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  });
  document.getElementById('contactForm').addEventListener('submit', function (e) {
    e.preventDefault();
    
    const name = this.name.value;
    const email = this.email.value;
    const message = this.message.value;
  
    if (name && email && message) {
      alert(`Hi ${name}! Your message has been received. I'll get back to you soon.`);
      this.reset();
    } else {
      alert('Please fill out all fields.');
    }
  });
  
