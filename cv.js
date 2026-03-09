/**
 * CV.js - A modern CV generator from JSON and BibTeX
 */

const formatters = {
    "dollars": new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format
};

function formatText(type, d) {
    if (type in formatters) {
        return formatters[type](d);
    }
    return d;
}

function grabValue(d, key, backup, defaultValue = "") {
    if (key && key in d) {
        return d[key];
    }
    if (backup && backup in d) {
        return grabValue(d, backup, null, defaultValue);
    }
    return defaultValue;
}

function handleEntryObject(d, container) {
    if (typeof d === 'object' && d !== null) {
        const url = grabValue(d, "url");
        if (url) {
            const a = document.createElement("a");
            a.href = url;
            a.classList.add("d-print-none");
            handleEntryObject(grabValue(d, "link-text"), a);
            container.appendChild(a);

            const p = document.createElement("span");
            p.classList.add("d-none", "d-print-inline");
            handleEntryObject(grabValue(d, "print-text", "link-text"), p);
            container.appendChild(p);

            if ("type" in d) {
                itemDecorate(d["type"], a);
                itemDecorate(d["type"], p);
            }
            return;
        }

        const text = formatText(d["format"], grabValue(d, "text"));
        container.appendChild(document.createTextNode(text));

        if ("type" in d) {
            itemDecorate(d["type"], container);
        }

        if ("subtext" in d) {
            container.appendChild(document.createElement("br"));
            const small = document.createElement("small");
            small.classList.add("text-muted");
            handleEntryObject(d["subtext"], small);
            container.appendChild(small);
        }

        if ("altmetric" in d) {
            const div = document.createElement("div");
            div.className = "altmetric-embed d-print-none mt-1";
            div.setAttribute("data-badge-type", "donut");
            div.setAttribute("data-doi", d["altmetric"]);
            div.setAttribute("data-hide-no-mentions", "true");
            container.appendChild(div);
        }

        if ("dimensions" in d) {
            const span = document.createElement("span");
            span.className = "__dimensions_badge_embed__ d-print-none mt-1 d-block";
            span.setAttribute("data-doi", d["dimensions"]);
            span.setAttribute("data-style", "small_circle");
            container.appendChild(span);
        }

        if ("plumx" in d) {
            const a = document.createElement("a");
            a.className = "plumx-plum-print-popup d-print-none mt-1 d-block";
            a.href = `https://plu.mx/plum/a/?doi=${d["plumx"]}`;
            container.appendChild(a);
        }
    } else {
        container.appendChild(document.createTextNode(d || ""));
    }
}

function prependFontAwesome(container, icon) {
    const i = document.createElement("i");
    i.className = `fa-solid ${icon} fa-fw me-1`;
    container.prepend(i);
}

const fontAwesomeDecorators = {
    "phone": "fa-phone",
    "e-mail": "fa-envelope",
    "home": "fa-house",
    "GitHub": "fa-brands fa-github",
    "Twitter": "fa-brands fa-x-twitter",
    "papers": "fa-file-lines"
};

function itemDecorate(type, container) {
    if (type in fontAwesomeDecorators) {
        prependFontAwesome(container, fontAwesomeDecorators[type]);
    } else if (type === "label") {
        const span = document.createElement("span");
        span.className = "badge bg-secondary me-1";
        // Move children to span
        while (container.firstChild) {
            span.appendChild(container.firstChild);
        }
        container.appendChild(span);
    }
}

function populateContact(container, key, data, headerOn) {
    container.innerHTML = "";
    if (headerOn) {
        const h4 = document.createElement("h4");
        h4.textContent = key;
        container.appendChild(h4);
    }
    const address = document.createElement("address");
    address.className = "mb-3";
    
    data.forEach((item, index) => {
        const span = document.createElement("span");
        span.textContent = item.text || "";
        itemDecorate(item["type"], span);
        address.appendChild(span);
        if (index < data.length - 1) {
            address.appendChild(document.createElement("br"));
        }
    });
    container.appendChild(address);
}

function populateList(container, key, data, headerOn) {
    container.innerHTML = "";
    if (headerOn) {
        const h4 = document.createElement("h4");
        h4.textContent = key;
        if ("subtext" in data) {
            h4.appendChild(document.createElement("br"));
            const small = document.createElement("small");
            small.className = "text-muted h6";
            small.textContent = data["subtext"];
            h4.appendChild(small);
        }
        container.appendChild(h4);
    }
    const ul = document.createElement("ul");
    ul.className = "list-unstyled mb-3";
    
    const listItems = Array.isArray(data) ? data : (data.rows || []);
    listItems.forEach(item => {
        const li = document.createElement("li");
        li.className = "mb-1";
        handleEntryObject(item, li);
        ul.appendChild(li);
    });
    container.appendChild(ul);
}


function processAuthorLine(authors, match) {
    let index = undefined;

    const authorList = authors.split(" and ").map((author, i) => {
        author = author.replace(/{/g, "").replace(/}/g, "");
        const parts = author.split(",");

        if (parts.length === 2) {
            author = parts[0].trim() + " " + parts[1].trim().split(" ").map(a => a[0]).join("");
        }

        if (match && match.some(d => author.indexOf(d) === 0) && index === undefined) {
            index = i;
        }

        return author;
    });

    let text;
    let tag = index;

    if (authorList.length <= 10) {
        text = authorList.join(", ");
    } else {
        text = authorList.slice(0, 10).join(", ") + " and " + (authorList.length - 10) + " others";
    }

    if (typeof tag === 'number') {
        if (tag === 0) {
            tag = "1st";
        } else if (tag === authorList.length - 1) {
            tag = "Senior";
        } else if (tag === 1) {
            tag = "2nd";
        } else {
            tag = "";
        }
    }

    return { "text": text, "tag": tag };
}

function extractBibtexRecord(highlight, record) {
    const renderMe = [];
    renderMe.push(record["YEAR"]);
    const authors = processAuthorLine(record["AUTHOR"], highlight);
    renderMe.push(authors["tag"] ? { "text": authors["tag"], "type": "label" } : "");
    renderMe.push({
        "subtext": record["TITLE"],
        "text": authors["text"]
    });
    renderMe.push({
        "text": record["JOURNAL"],
        "subtext": (record["VOLUME"] ? record["VOLUME"] : "") + (record["NUMBER"] ? " (" + record["NUMBER"] + ")" : "") + (record["PAGES"] ? " " + record["PAGES"] + " " : "")
    });
    if (record["PMID"]) {
        renderMe.push({
            "url": "https://pubmed.ncbi.nlm.nih.gov/" + record["PMID"],
            "link-text": {
                "text": "Pubmed",
                "type": "label"
            },
            "print-text": ""
        });
    } else {
        renderMe.push("");
    }
    if (record["DOI"]) {
        renderMe.push({ "altmetric": record["DOI"], "dimensions": record["DOI"], "plumx": record["DOI"] });
    } else {
        renderMe.push("");
    }
    return renderMe;
}

async function populateBibtex(container, key, data, headerOn) {
    try {
        const response = await fetch(data["bibtex"]);
        const value = await response.text();
        if (value) {
            const b = new BibtexParser();
            b.setInput(value);
            b.bibtex();

            const rows = Object.values(b.entries)
                .map(entry => extractBibtexRecord(data["highlight"], entry))
                .sort((a, b) => b[0] - a[0]);

            data["rows"] = rows;
            data["subtext"] = rows.length + " publications" + (data["subtext"] ? ", " + data["subtext"] : "");
            populateTable(container, key, data, headerOn);
        }
    } catch (error) {
        console.error("Error loading BibTeX:", error);
    }
}

function populateTable(container, key, data, headerOn) {
    container.innerHTML = "";
    if (headerOn) {
        const h4 = document.createElement("h4");
        h4.textContent = key;
        if ("subtext" in data) {
            h4.appendChild(document.createElement("br"));
            const small = document.createElement("small");
            small.className = "text-muted h6";
            small.textContent = data["subtext"];
            h4.appendChild(small);
        }
        container.appendChild(h4);
    }
    
    const tableContainer = document.createElement("div");
    tableContainer.className = "table-responsive";
    
    const table = document.createElement("table");
    table.className = "table table-striped table-sm";
    table.style.fontSize = "90%";
    
    const tbody = document.createElement("tbody");
    
    (data["rows"] || []).forEach(rowData => {
        const tr = document.createElement("tr");
        rowData.forEach(cellData => {
            const td = document.createElement("td");
            handleEntryObject(cellData, td);
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    container.appendChild(tableContainer);
}

const dataPopulators = {
    'list': populateList,
    'table': populateTable,
    'contact': populateContact,
    'bibtex': populateBibtex
};

async function loadCvData(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        for (const [key, value] of Object.entries(data)) {
            const container = document.querySelector(`[data-receiver-for="${key}"]`);
            if (container) {
                const styleType = container.getAttribute("data-style-type") || "list";
                const headerOn = container.getAttribute("data-style-header") === "on";
                const populator = dataPopulators[styleType];
                if (populator) {
                    await populator(container, key, value, headerOn);
                }
            }
        }
        
        // Load external scripts after data is populated
        const altmetricScript = document.createElement("script");
        altmetricScript.src = "https://d1bxh8uas1mnw7.cloudfront.net/assets/embed.js";
        document.body.appendChild(altmetricScript);
        
        const plumxScript = document.createElement("script");
        plumxScript.src = "https://cdn.plu.mx/widget-popup.js";
        document.body.appendChild(plumxScript);

        const dimensionsScript = document.createElement("script");
        dimensionsScript.async = true;
        dimensionsScript.src = "https://badge.dimensions.ai/badge.js";
        document.body.appendChild(dimensionsScript);
        
    } catch (error) {
        console.error("Error loading CV data:", error);
    }
}


document.addEventListener("DOMContentLoaded", () => {
    loadCvData("data/slkp.json");
});
