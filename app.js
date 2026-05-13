/**
 * CV.js - Modern CV Renderer
 */

const CONFIG = {
    dataUrl: 'data/slkp.json',
    pubsUrl: 'data/extracted_pubs.json',
    summariesUrl: 'data/summaries.json',
    highlights: ["Pond S", "Kosakovsky Pond S", "Pond, Sergei L Kosakovsky", "Kosakovsky Pond, Sergei L"]
};

const ROUTES = {
    'publications': { title: 'Publications', desc: 'Peer-reviewed research and AI summaries', dataKey: 'Publications' },
    'grants-and-fellowships': { title: 'Grants and Fellowships', desc: 'Research funding and awards', dataKey: 'Grants and Fellowships' },
    'positions-held': { title: 'Professional Positions', desc: 'Academic and research roles', dataKey: 'Positions Held' },
    'education': { title: 'Education', desc: 'Degrees and academic background', dataKey: 'Education' },
    'awards-and-honors': { title: 'Awards and Honors', desc: 'Distinctions and recognition', dataKey: 'Awards and Honors' },
    'professional-activities': { title: 'Professional Activities', desc: 'Editorial boards and service', dataKey: 'Professional Activities' },
    'courses-taught': { title: 'Courses Taught', desc: 'University teaching and lecturing', dataKey: 'Courses Taught' },
    'workshops': { title: 'Workshops', desc: 'International bioinformatics training', dataKey: 'Workshops' },
    'advising-and-mentoring': { title: 'Advising and Mentoring', desc: 'Student and researcher supervision', dataKey: 'Advising and Mentoring' },
    'software-projects': { title: 'Software Projects', desc: 'Open-source scientific tools', dataKey: 'Software Projects' }
};

class CVApp {
    constructor() {
        this.data = null;
        this.pubs = [];
        this.summaries = {};
        this.filteredPubs = [];
        this.isLoaded = false;
    }

    async init() {
        try {
            console.log("Initializing CV App...");
            const [dataRes, pubsRes, summariesRes] = await Promise.all([
                fetch(CONFIG.dataUrl),
                fetch(CONFIG.pubsUrl),
                fetch(CONFIG.summariesUrl)
            ]);

            if (!dataRes.ok || !pubsRes.ok || !summariesRes.ok) {
                throw new Error("One or more data files failed to load.");
            }

            this.data = await dataRes.json();
            this.pubs = await pubsRes.json();
            this.summaries = await summariesRes.json();
            this.filteredPubs = [...this.pubs];
            this.isLoaded = true;

            this.renderSidebar();
            this.renderDashboard();
            this.setupListeners();
            this.handleRouting();

            window.addEventListener('hashchange', () => this.handleRouting());
            console.log("CV App initialized successfully.");
        } catch (error) {
            console.error("Failed to load CV data:", error);
            document.querySelector('.content').innerHTML = `
                <div style="padding: 2rem; background: #fee2e2; color: #991b1b; border-radius: 8px;">
                    <h3>Error Loading Data</h3>
                    <p>${error.message}</p>
                    <p>Please ensure the data files exist and you are viewing this through a web server.</p>
                </div>
            `;
        }
    }

    handleRouting() {
        if (!this.isLoaded) return;

        const hash = window.location.hash.replace('#/', '') || 'home';
        console.log("Routing to:", hash);

        const dashboard = document.getElementById('home-dashboard');
        const sectionsContainer = document.getElementById('sections-container');
        const sidebarNav = document.querySelector('.sidebar-nav');

        // Hide all first
        if (dashboard) dashboard.classList.add('hidden');
        if (sectionsContainer) sectionsContainer.classList.add('hidden');
        if (sidebarNav) sidebarNav.classList.add('hidden');
        document.querySelectorAll('.cv-section').forEach(s => s.classList.add('hidden'));

        if (hash === 'home') {
            if (dashboard) dashboard.classList.remove('hidden');
        } else if (ROUTES[hash]) {
            if (sectionsContainer) sectionsContainer.classList.remove('hidden');
            if (sidebarNav) sidebarNav.classList.remove('hidden');
            
            const targetSection = document.getElementById(hash);
            if (targetSection) {
                this.renderSection(hash); // Render on demand to be safe
                targetSection.classList.remove('hidden');
            }
        } else {
            location.hash = '#/';
        }
        window.scrollTo(0, 0);
    }

    renderSection(id) {
        const route = ROUTES[id];
        if (!route) return;

        if (id === 'publications') {
            this.renderPublications();
        } else if (id === 'software-projects') {
            this.renderSoftwareProjects();
        } else {
            this.renderGenericSection(id, route.dataKey);
        }
    }

    getCount(id) {
        if (id === 'publications') return this.pubs.length;
        const key = ROUTES[id].dataKey;
        const section = this.data[key];
        if (section && section.rows) return section.rows.length;
        return 0;
    }

    getSubtitle(id) {
        if (id === 'grants-and-fellowships') {
            const current = this.data['Grants and Fellowships'].rows.filter(r => r[4] && r[4].text === 'current').length;
            return `${current} active projects`;
        }
        if (id === 'publications') {
            return `Over 44,000 citations`;
        }
        if (id === 'advising-and-mentoring') {
            const current = this.data['Advising and Mentoring'].rows.filter(r => r[4] && r[4].text === 'current').length;
            return `${current} current students`;
        }
        return ROUTES[id].desc;
    }

    renderDashboard() {
        const dashboard = document.getElementById('home-dashboard');
        if (!dashboard) return;
        dashboard.innerHTML = '';

        Object.entries(ROUTES).forEach(([id, info]) => {
            const count = this.getCount(id);
            const subtitle = this.getSubtitle(id);
            const card = document.createElement('a');
            card.className = 'nav-card';
            card.href = `#/${id}`;
            card.innerHTML = `
                <div class="card-count">${count}</div>
                <h3>${info.title}</h3>
                <p>${subtitle}</p>
            `;
            dashboard.appendChild(card);
        });
    }

    // --- Helpers ---

    formatLink(linkObj) {
        if (!linkObj) return '';
        if (typeof linkObj === 'string') return linkObj;
        
        const url = linkObj.url || '#';
        const text = linkObj['link-text'] || linkObj.text || url;
        
        let textContent = '';
        if (typeof text === 'object') {
            textContent = this.formatValue(text);
        } else {
            textContent = text;
        }

        const subtext = linkObj.subtext ? `<br><small class="subtext">${this.formatValue(linkObj.subtext)}</small>` : '';
        
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${textContent}</a>${subtext}`;
    }

    formatValue(val) {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        
        if (typeof val === 'object') {
            if (val.format === 'dollars') {
                const num = parseFloat(val.text);
                const formatted = isNaN(num) ? val.text : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
                return `${formatted} <small class="subtext">${val.subtext || ''}</small>`;
            }
            if (val.type === 'label') {
                return `<span class="badge badge-${val.text}">${val.text}</span>`;
            }
            if (val.url || val['link-text']) {
                return this.formatLink(val);
            }
            if (val.text) {
                const subtext = val.subtext ? `<br><small class="subtext">${this.formatValue(val.subtext)}</small>` : '';
                return `<span>${val.text}</span>${subtext}`;
            }
        }
        return String(val);
    }

    highlightAuthors(authorStr) {
        if (!authorStr) return '';
        let highlighted = authorStr;
        CONFIG.highlights.forEach(name => {
            const regex = new RegExp(`(${name})`, 'gi');
            highlighted = highlighted.replace(regex, '<b>$1</b>');
        });
        return highlighted;
    }

    // --- Rendering ---

    renderSidebar() {
        if (!this.data) return;

        // Contact Info
        const contactContainer = document.querySelector('#contact-info .contact-list');
        if (contactContainer && this.data['Contact Information']) {
            contactContainer.innerHTML = '';
            this.data['Contact Information'].forEach(item => {
                const p = document.createElement('p');
                p.textContent = item.text;
                contactContainer.appendChild(p);
            });
        }

        // Links
        const linksContainer = document.querySelector('#links .links-list');
        if (linksContainer && this.data['Links']) {
            linksContainer.innerHTML = '';
            this.data['Links'].forEach(link => {
                const a = document.createElement('a');
                a.href = link.url;
                a.textContent = link['link-text'];
                a.target = "_blank";
                linksContainer.appendChild(a);
            });
        }

        // Research Interests
        const interestsContainer = document.querySelector('#research-interests .interests-list');
        if (interestsContainer && this.data['Research Interests']) {
            interestsContainer.innerHTML = '';
            this.data['Research Interests'].forEach(interest => {
                const li = document.createElement('li');
                li.textContent = interest.text;
                interestsContainer.appendChild(li);
            });
        }
    }

    renderGenericSection(sectionId, dataKey) {
        const container = document.querySelector(`#${sectionId} .section-content`);
        if (!container || !this.data[dataKey]) return;

        const rows = this.data[dataKey].rows;
        if (!rows) return;

        container.innerHTML = '';
        rows.forEach(row => {
            const item = document.createElement('div');
            item.className = 'cv-item';
            
            const date = document.createElement('div');
            date.className = 'item-date';
            date.textContent = typeof row[0] === 'string' ? row[0] : '';

            const details = document.createElement('div');
            details.className = 'item-details';
            
            const contentParts = row.slice(1).map(part => {
                if (!part) return '';
                return `<div>${this.formatValue(part)}</div>`;
            }).join('');

            details.innerHTML = contentParts;
            
            item.appendChild(date);
            item.appendChild(details);
            container.appendChild(item);
        });
    }

    renderSoftwareProjects() {
        const container = document.querySelector('#software-projects .section-content');
        if (!container || !this.data['Software Projects']) return;

        container.innerHTML = '';
        this.data['Software Projects'].rows.forEach(row => {
            const item = document.createElement('div');
            item.className = 'cv-item';
            
            const title = document.createElement('div');
            title.className = 'item-date';
            title.innerHTML = this.formatLink(row[0]);

            const details = document.createElement('div');
            details.className = 'item-details';
            details.innerHTML = `<h4>${row[1].text || ''}</h4><p class="subtext">${row[1].subtext || ''}</p>`;

            item.appendChild(title);
            item.appendChild(details);
            container.appendChild(item);
        });
    }

    renderPublications() {
        const container = document.getElementById('publications-list');
        if (!container) return;
        
        const statsEl = document.querySelector('.pub-stats');
        if (statsEl && this.data['Publications']) {
            statsEl.textContent = this.data['Publications'].subtext;
        }

        container.innerHTML = '';
        this.filteredPubs.forEach(pub => {
            const summaryData = this.summaries[pub.id] || null;
            
            const pubEl = document.createElement('div');
            pubEl.className = 'pub-item';
            
            let html = `
                <div class="pub-title">${pub.title}</div>
                <div class="pub-authors">${this.highlightAuthors(pub.author)}</div>
                <div class="pub-meta">${pub.journal ? pub.journal + ', ' : ''}${pub.year}</div>
            `;

            if (summaryData) {
                html += `
                    <div class="pub-summary-box">
                        <div class="pub-summary-text">${summaryData.summary}</div>
                        <div class="pub-keywords">
                            ${summaryData.keywords.map(k => `<span class="keyword-tag">${k}</span>`).join('')}
                        </div>
                    </div>
                `;
            }

            pubEl.innerHTML = html;
            container.appendChild(pubEl);
        });
    }

    setupListeners() {
        const searchInput = document.getElementById('pub-search');
        const sortSelect = document.getElementById('pub-sort');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                this.filteredPubs = this.pubs.filter(pub => 
                    pub.title.toLowerCase().includes(term) || 
                    pub.author.toLowerCase().includes(term) ||
                    (this.summaries[pub.id] && this.summaries[pub.id].summary.toLowerCase().includes(term))
                );
                this.renderPublications();
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'year-desc') {
                    this.filteredPubs.sort((a, b) => b.year - a.year);
                } else {
                    this.filteredPubs.sort((a, b) => a.year - b.year);
                }
                this.renderPublications();
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new CVApp();
    app.init();
});
