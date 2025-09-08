// Mobile menu functionality
function toggleMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    
    mobileMenuBtn.classList.toggle('active');
    mobileNavOverlay.classList.toggle('active');
    
    // Prevent body scroll when menu is open
    if (mobileNavOverlay.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function closeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    
    mobileMenuBtn.classList.remove('active');
    mobileNavOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Close mobile menu when clicking outside menu content
document.addEventListener('click', function(event) {
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNavContent = document.querySelector('.mobile-nav-content');
    
    if (mobileNavOverlay && mobileNavOverlay.classList.contains('active')) {
        // Don't close if clicking on hamburger button (let it handle toggle) or inside menu content
        if (!mobileMenuBtn.contains(event.target) && mobileNavContent && !mobileNavContent.contains(event.target)) {
            closeMobileMenu();
        }
    }
});

// Close mobile menu on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeMobileMenu();
    }
});

// Update mobile theme button when main theme changes
function updateMobileThemeButton() {
    const mainThemeBtn = document.getElementById('themeBtn');
    const mobileThemeBtn = document.getElementById('mobileThemeBtn');
    
    if (mainThemeBtn && mobileThemeBtn) {
        mobileThemeBtn.textContent = mainThemeBtn.textContent;
    }
}

// إدارة الوضع الليلي/النهاري
function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('themeBtn');
    const mobileThemeBtn = document.getElementById('mobileThemeBtn');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeBtn.textContent = '🌙';
        if (mobileThemeBtn) mobileThemeBtn.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeBtn.textContent = '☀️';
        if (mobileThemeBtn) mobileThemeBtn.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}
// في بداية الملف، قم بتعديل دالة applyTheme لتكون الافتراضية dark
function applyTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark'; // افتراضي ليلي
    const themeBtn = document.getElementById('themeBtn');
    const mobileThemeBtn = document.getElementById('mobileThemeBtn');
    
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeBtn.textContent = '☀️';
        if (mobileThemeBtn) mobileThemeBtn.textContent = '☀️';
    } else {
        document.body.removeAttribute('data-theme');
        themeBtn.textContent = '🌙';
        if (mobileThemeBtn) mobileThemeBtn.textContent = '🌙';
    }
}

// تعديل المتغير currentLanguage ليكون الافتراضي عربي
let currentLanguage = localStorage.getItem('language') || 'ar';

// تعديل دالة changeLanguage لتطبيق RTL/LTR تلقائياً
function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    
    const elements = document.querySelectorAll('[data-ar][data-en]');
    elements.forEach(element => {
        const newText = element.getAttribute('data-' + lang);
        
        if (element.placeholder !== undefined) {
            element.placeholder = newText;
        } else {
            element.textContent = newText;
        }
    });

    // تغيير اتجاه النص تلقائياً
    if (lang === 'ar') {
        document.documentElement.setAttribute('lang', 'ar');
        document.documentElement.setAttribute('dir', 'rtl');
    } else {
        document.documentElement.setAttribute('lang', 'en');
        document.documentElement.setAttribute('dir', 'ltr');
    }

    document.getElementById('languageDropdown').classList.remove('show');
}

function updateLanguage(lang) {
    const elements = document.querySelectorAll('[data-ar][data-en]');
    elements.forEach(element => {
        const value = element.getAttribute('data-' + lang);
        if (element.placeholder !== undefined) {
            element.placeholder = value;
        } else {
            element.textContent = value;
        }
    });
}


function toggleLanguageDropdown() {
    const dropdown = document.getElementById('languageDropdown');
    dropdown.classList.toggle('show');
}

// إدارة الصفحات
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// نسخ الكود
function copyCode(button) {
    const codeBlock = button.closest('.code-block');
    const code = codeBlock.querySelector('code').textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('فشل في نسخ الكود: ', err);
    });
}

// إغلاق القائمة المنسدلة عند النقر خارجها
document.addEventListener('click', function(event) {
    const languageSelector = document.querySelector('.language-selector');
    const dropdown = document.getElementById('languageDropdown');
    
    if (!languageSelector.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

// تأثيرات التمرير والتحميل
function initAdvancedEffects() {
    // إنشاء شريط التقدم
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);

    // إنشاء زر العودة للأعلى
    const backToTop = document.createElement('button');
    backToTop.className = 'back-to-top';
    backToTop.innerHTML='🔝';
    backToTop.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(backToTop);

    // تحديث شريط التقدم
    window.addEventListener('scroll', () => {
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        progressBar.style.width = scrollPercent + '%';

        // إظهار/إخفاء زر العودة للأعلى
        if (window.scrollY > 300) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    });

    // تأثير التمرير السلس للهيدر
    let lastScrollTop = 0;
    const header = document.querySelector('header');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });
}

// تحسين تجربة المستخدم
function enhanceUserExperience() {
    // إضافة البحث في المدونة
    const blogContent = document.querySelector('#blog .blog-content');
    if (blogContent) {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <input type="text" class="search-input" placeholder="ابحث في المقالات..." data-ar="ابحث في المقالات..." data-en="Search articles...">
        `;
        blogContent.insertBefore(searchContainer, blogContent.firstChild.nextSibling);

        const searchInput = searchContainer.querySelector('.search-input');
       searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const articles = document.querySelectorAll('#articlesList .article');

    articles.forEach(article => {
        const span = article.querySelector('span');
        const titleText = (span?.getAttribute('data-' + currentLanguage) || '').toLowerCase();

        if (titleText.includes(searchTerm)) {
            article.style.display = 'block';
        } else {
            article.style.display = searchTerm ? 'none' : 'block';
        }
    });
});

    }
}

// تهيئة التأثيرات الإضافية
function createParticles() {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    particlesContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
    `;

    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: var(--primary-color);
            border-radius: 50%;
            opacity: ${Math.random() * 0.5 + 0.2};
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: sparkle ${Math.random() * 3 + 2}s infinite ease-in-out;
        `;
        particlesContainer.appendChild(particle);
    }

    document.body.appendChild(particlesContainer);
}

// Load articles from articles.json
async function loadArticles() {
    try {
        const response = await fetch('articles.json');
        const articles = await response.json();
        const list = document.getElementById('articlesList');
        list.innerHTML = '';

        articles.forEach(article => {
            const li = document.createElement('li');
            li.className = 'article';
            li.innerHTML = `
                <a href="Articles/${article.file}" target="_blank" >
                    <span data-ar="${article.title_ar}" data-en="${article.title_en}">
                        ${article.title_ar}
                    </span>
                </a>
            `;
            list.appendChild(li);
        });

        // تحديث الترجمة إذا تغيرت اللغة
        updateLanguage(currentLanguage);
    } catch (error) {
        console.error('خطأ في تحميل المقالات:', error);
    }
}

// تشغيل جميع التحسينات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    applyTheme();
    changeLanguage(currentLanguage);
    initAdvancedEffects();
    enhanceUserExperience();
    createParticles();
    updateMobileThemeButton();
    
    // Load articles
    loadArticles();

    // كل مرة يظهر فيها قسم المدونة
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('onclick')?.includes("showPage('blog')")) {
                setTimeout(loadArticles, 100); // إعادة تحميل العناوين
            }
        });
    });
    
});
