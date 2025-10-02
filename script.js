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

// دالة جديدة لتلوين التعليقات في مربعات الكود
function highlightComments(codeElement) {
    try {
        // Check if highlighting is already applied
        if (codeElement.querySelector('.comment')) {
            // If already highlighted, get the text content and reapply
            const textContent = codeElement.textContent;
            codeElement.innerHTML = textContent;
        }
        
        const codeText = codeElement.textContent;
        // تلوين التعليقات التي تبدأ بـ # في bash
        const highlightedCode = codeText.replace(/(#.*$)/gm, '<span class="comment">$1</span>');
        codeElement.innerHTML = highlightedCode;
    } catch (error) {
        console.error('Error highlighting comments:', error);
    }
}

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

    // ترجمة محتوى مربعات الكود
    const codeBlocks = document.querySelectorAll('.code-block pre code');
    codeBlocks.forEach(codeBlock => {
        const parent = codeBlock.closest('[data-code-ar][data-code-en]');
        if (parent) {
            const codeContent = parent.getAttribute('data-code-' + lang);
            if (codeContent) {
                codeBlock.textContent = codeContent;
                // تلوين التعليقات في الكود بعد تعيين المحتوى
                highlightComments(codeBlock);
            }
        } else {
            // For code blocks without data attributes, just highlight comments
            highlightComments(codeBlock);
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
    
    // تحديث تلوين التعليقات عند تغيير اللغة
    const codeBlocks = document.querySelectorAll('.code-block pre code');
    codeBlocks.forEach(codeBlock => {
        // Remove existing comment highlighting
        if (codeBlock.querySelector('.comment')) {
            codeBlock.innerHTML = codeBlock.textContent;
        }
        // Apply new comment highlighting
        highlightComments(codeBlock);
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
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        // Update URL hash without triggering hashchange event
        history.replaceState(null, null, '#' + pageId);
    }
}

// نسخ الكود
function copyCode(button) {
    try {
        const codeBlock = button.closest('.code-block');
        if (!codeBlock) {
            throw new Error('Code block not found');
        }
        
        const codeElement = codeBlock.querySelector('code');
        if (!codeElement) {
            throw new Error('Code element not found');
        }
        
        // Get the plain text content without HTML tags
        let code = '';
        
        // Check if there are data attributes with the original code
        const parentBlock = codeBlock;
        if (parentBlock && parentBlock.hasAttribute('data-code-ar') && parentBlock.hasAttribute('data-code-en')) {
            // Use the original code from data attributes if available
            const lang = document.documentElement.getAttribute('lang') || 'ar';
            code = parentBlock.getAttribute('data-code-' + lang) || '';
            
            // Debug information
            console.log('Copying from data attributes for language:', lang);
            console.log('Raw data attribute content:', code);
            
            // Properly decode HTML entities
            const textArea = document.createElement('textarea');
            textArea.innerHTML = code;
            code = textArea.value;
            
            console.log('Decoded content:', code);
        } else {
            // For code blocks without data attributes, get text content
            // But first remove any comment highlighting to get original text
            if (codeElement.querySelector('.comment')) {
                // Get plain text by removing HTML tags
                code = codeElement.textContent;
                console.log('Copying from highlighted code element:', code);
            } else {
                code = codeElement.textContent;
                console.log('Copying from plain code element:', code);
            }
        }
        
        const originalText = button.textContent;
        
        // Check if Clipboard API is supported
        if (navigator.clipboard && window.isSecureContext) {
            // Use Clipboard API
            navigator.clipboard.writeText(code).then(() => {
                button.textContent = 'Copied!';
                button.classList.add('copied');
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Clipboard API failed: ', err);
                // Fallback to legacy method
                fallbackCopyTextToClipboard(code, button, originalText);
            });
        } else {
            // Fallback to legacy method for older browsers or insecure contexts
            fallbackCopyTextToClipboard(code, button, originalText);
        }
    } catch (error) {
        console.error('فشل في نسخ الكود: ', error);
        const originalText = button.textContent;
        button.textContent = 'Error!';
        setTimeout(() => {
            button.textContent = originalText || 'Copy';
        }, 2000);
    }
}

// Fallback function for older browsers or insecure contexts
function fallbackCopyTextToClipboard(text, button, originalText) {
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            button.textContent = 'Copied!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
        } else {
            throw new Error('Failed to copy text using execCommand');
        }
    } catch (err) {
        console.error('Fallback copy method failed: ', err);
        button.textContent = 'Error!';
        setTimeout(() => {
            button.textContent = originalText || 'Copy';
        }, 2000);
    }
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
    try {
        const searchTerm = e.target.value.toLowerCase();
        const articles = document.querySelectorAll('#articlesList .article');
        
        if (articles.length === 0) {
            console.warn('No articles found for search');
            return;
        }

        articles.forEach(article => {
            try {
                const span = article.querySelector('span');
                if (!span) {
                    console.warn('Span element not found in article');
                    article.style.display = searchTerm ? 'none' : 'block';
                    return;
                }
                
                const titleText = (span.getAttribute('data-' + currentLanguage) || span.textContent || '').toLowerCase();

                if (titleText.includes(searchTerm)) {
                    article.style.display = 'block';
                } else {
                    article.style.display = searchTerm ? 'none' : 'block';
                }
            } catch (articleError) {
                console.error('Error processing article in search:', articleError);
                article.style.display = searchTerm ? 'none' : 'block';
            }
        });
    } catch (error) {
        console.error('Error in search functionality:', error);
    }
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
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const articles = await response.json();
        const list = document.getElementById('articlesList');
        if (!list) {
            throw new Error('Element with ID "articlesList" not found');
        }
        list.innerHTML = '';

        articles.forEach(article => {
            const li = document.createElement('li');
            li.className = 'article';
            li.setAttribute('data-href', `Articles/${article.file}`);
            li.innerHTML = `
                <span data-ar="${article.title_ar}" data-en="${article.title_en}">
                    ${article.title_ar}
                </span>
            `;
            
            // Make the entire card clickable
            li.style.cursor = 'pointer';
            li.addEventListener('click', function() {
                window.location.href = this.getAttribute('data-href');
            });
            
            list.appendChild(li);
        });

        // تحديث الترجمة إذا تغيرت اللغة
        updateLanguage(currentLanguage);
    } catch (error) {
        console.error('خطأ في تحميل المقالات:', error);
        // Display error message to user
        const list = document.getElementById('articlesList');
        if (list) {
            list.innerHTML = '<li class="article" style="text-align: center; padding: 2rem;">حدث خطأ أثناء تحميل المقالات. يرجى المحاولة لاحقاً.</li>';
        }
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

    // Handle hash navigation (for links like #about, #blog)
    function handleHashNavigation() {
        const hash = window.location.hash.substring(1); // Remove the # symbol
        if (hash && document.getElementById(hash)) {
            showPage(hash);
        } else {
            // Default to blog page if no hash or invalid hash
            showPage('blog');
        }
    }
    
    // Handle hash on initial page load
    handleHashNavigation();
    
    // Handle hash changes (when user clicks back/forward or changes URL)
    window.addEventListener('hashchange', handleHashNavigation);

    // كل مرة يظهر فيها قسم المدونة
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('onclick')?.includes("showPage('blog')")) {
                setTimeout(loadArticles, 100); // إعادة تحميل العناوين
            }
        });
    });
    
});
