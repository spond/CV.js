/**
 * print.js - Traditional CV Renderer for Print
 */

const CONFIG = {
    dataUrl: 'data/slkp.json',
    pubsUrl: 'data/extracted_pubs.json',
    highlights: ["Pond S", "Kosakovsky Pond S", "Pond, Sergei L Kosakovsky", "Kosakovsky Pond, Sergei L"]
};

const SECTIONS = [
    { title: 'Research Interests', dataKey: 'Research Interests', type: 'list' },
    { title: 'Professional Positions', dataKey: 'Positions Held', type: 'generic' },
    { title: 'Education', dataKey: 'Education', type: 'generic' },
    { title: 'Awards and Honors', dataKey: 'Awards and Honors', type: 'generic' },
    { title: 'Professional Activities', dataKey: 'Professional Activities', type: 'generic' },
    { title: 'Grants and Fellowships', dataKey: 'Grants and Fellowships', type: 'generic' },
    { title: 'Publications', dataKey: 'Publications', type: 'pubs' },
    { title: 'Software Projects', dataKey: 'Software Projects', type: 'software' },
    { title: 'Courses Taught', dataKey: 'Courses Taught', type: 'generic' },
    { title: 'Workshops', dataKey: 'Workshops', type: 'generic' },
    { title: 'Advising and Mentoring', dataKey: 'Advising and Mentoring', type: 'generic' }
];

class PrintApp {
    constructor() {
        this.data = null;
        this.pubs = [];
    }

    async init() {
        try {
            const [dataRes, pubsRes] = await Promise.all([
                fetch(CONFIG.dataUrl),
                fetch(CONFIG.pubsUrl)
            ]);

            this.data = await dataRes.json();
            this.pubs = await pubsRes.json();

            this.renderHeader();
            this.renderAllSections();
        } catch (error) {
            console.error("Failed to load print data:", error);
        }
    }

    renderHeader() {
        const contact = document.getElementById('header-contact');
        const info = this.data['Contact Information'];
        const email = this.data['Links'].find(l => l.type === 'e-mail');
        const web = this.data['Links'].find(l => l.type === 'home');

        let html = info.map(i => `<div>${i.text}</div>`).join('');
        if (email) html += `<div>${email['print-text']}</div>`;
        if (web) html += `<div>${web['print-text']}</div>`;
        
        contact.innerHTML = html;
    }

    renderAllSections() {
        const container = document.getElementById('print-content');
        
        SECTIONS.forEach(section => {
            const sectionEl = document.createElement('section');
            sectionEl.className = 'cv-section';
            sectionEl.innerHTML = `<h2>${section.title}</h2><div class="section-content"></div>`;
            
            const content = sectionEl.querySelector('.section-content');
            
            if (section.type === 'list') {
                this.data[section.dataKey].forEach(item => {
                    const div = document.createElement('div');
                    div.textContent = item.text;
                    div.style.fontWeight = '600';
                    content.appendChild(div);
                });
            } else if (section.type === 'pubs') {
                this.pubs.sort((a,b) => b.year - a.year).forEach(pub => {
                    const div = document.createElement('div');
                    div.className = 'pub-item';
                    div.innerHTML = `
                        <div class="pub-title">${pub.title}</div>
                        <div class="pub-authors">${this.highlightAuthors(pub.author)}</div>
                        <div class="pub-meta">${pub.journal ? pub.journal + ', ' : ''}${pub.year}</div>
                    `;
                    content.appendChild(div);
                });
            } else if (section.type === 'software') {
                this.data['Software Projects'].rows.forEach(row => {
                    const div = document.createElement('div');
                    div.className = 'cv-item';
                    div.innerHTML = `
                        <div class="item-date">${row[0]['link-text'] || row[0].text || ''}</div>
                        <div class="item-details">
                            <h4>${row[1].text}</h4>
                            <p class="subtext">${row[1].subtext}</p>
                        </div>
                    `;
                    content.appendChild(div);
                });
            } else {
                this.renderGeneric(content, section.dataKey);
            }
            
            container.appendChild(sectionEl);
        });
    }

    renderGeneric(container, key) {
        const rows = this.data[key].rows;
        if (!rows) return;

        rows.forEach(row => {
            const item = document.createElement('div');
            item.className = 'cv-item';
            
            const date = document.createElement('div');
            date.className = 'item-date';
            date.textContent = typeof row[0] === 'string' ? row[0] : (row[0].text || '');

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

    formatValue(val) {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'object') {
            if (val.format === 'dollars') {
                const num = parseFloat(val.text);
                return isNaN(num) ? val.text : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
            }
            if (val.type === 'label') return `[${val.text.toUpperCase()}]`;
            if (val.text) {
                const sub = val.subtext ? `<br><small>${this.formatValue(val.subtext)}</small>` : '';
                return `<span>${val.text}</span>${sub}`;
            }
            if (val['link-text']) return val['link-text'].text || val['link-text'];
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
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new PrintApp();
    app.init();
});
