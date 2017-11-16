var money_format = d3.format("$,.0f");

var formatters = {
    "dollars": money_format
};

function format_text(type, d) {
    if (type in formatters) {
        return formatters[type](d);
    }
    return d;
}

function grab_value(d, key, backup, default_value) {
    if (key && key in d) {
        return d[key];
    }
    if (backup && backup in d) {
        return grab_value(d, backup, null, default_value);
    }
    return default_value || "";
}

function handle_entry_object(d, container) {
    var containerd3 = d3.select(container);

    if (_.isObject(d)) {
        var is_url = grab_value(d, "url");
        if (is_url) {
            var a = containerd3.append("a").attr("href", grab_value(d, "url")).classed("hidden-print", true);
            handle_entry_object(grab_value(d, "link-text"), a[0][0]);
            var p = containerd3.append("span").classed("visible-print-inline-block", true);
            handle_entry_object(grab_value(d, "print-text", "link-text"), p[0][0]);
            if ("type" in d) {
                item_decorate(d["type"], a[0][0]);
                item_decorate(d["type"], p[0][0]);
            }

            return;
        }
        containerd3.text(format_text(d["format"], grab_value(d, "text")));

        if ("type" in d) {
            item_decorate(d["type"], container);
        }

        if ("subtext" in d) {
            containerd3.append("br");
            handle_entry_object(d["subtext"], containerd3.append("small")[0][0]);
        }
        
        //<div class='altmetric-embed' data-badge-type='donut' data- doi="10.1038/nature.2012.9872"></div>
        
        if ("altmetric" in d) {
            containerd3.append("div").classed ("altmetric-embed", true).attr ("data-badge-type", "donut").attr ("data-doi", d["altmetric"]).attr ("data-hide-no-mentions", "true");
        }
        
    } else {
        containerd3.text(d || "");
    }
}


function prepend_font_awesome(container, icon) {
    var children = d3.select(container).selectAll("*");
    if (!children.empty()) {
        d3.select(container).insert("i", ":first-child").classed("fa " + icon, true);
    } else {
        d3.select(container).html(function(d) {
            return "<i class = 'fa " + icon + "'></i> " + d3.select(this).text();
        });
    }
}

var font_awesome_decorators = {
    "phone": "fa-phone",
    "e-mail": "fa-envelope",
    "home": "fa-home",
    "GitHub": "fa-github-square",
    "papers": "fa-flask"
};

function item_decorate(type, container) {
    if (type in font_awesome_decorators) {
        prepend_font_awesome(container, font_awesome_decorators[type]);
    } else if (type == "label") {

        var children = d3.select(container).selectAll("*");
        if (!children.empty()) {
            $(container).wrap('<span class="label label-default"></span>');
        } else {
            var current_text = d3.select(container).text();
            d3.select(container).text("").append("span").classed("label label-default", true).text(current_text);
        }
    }

}

function populate_contact(container, key, data) {

    if (container.attr("data-style-header") == "on") {
        container.append("h4").text(key);
    }
    var address_block = container.append("address").classed("list-unstyled", true);
    var address_items = address_block.selectAll("span").data(data);
    address_items.enter().append("span");
    address_items.exit().remove();

    address_items.text(function(d) {
        return d.text || "";
    });
    address_items.each(function(item, index) {
        item_decorate(item["type"], this);
        if (index < data.length - 1) {
            d3.select(this).append("br");
        }
    });
}

function populate_list(container, key, data) {

    if (container.attr("data-style-header") == "on") {
        var header = container.append("h4").text(key);
        if ("subtext" in data) {
            header.append("br");
            header.append("small").text(data["subtext"]);
        }
    }
    var the_list = container.append("ul").classed("list-unstyled", true);
    var list_elements = the_list.selectAll("li").data(data);
    list_elements.enter().append("li");
    list_elements.each(function(d, i) {
        handle_entry_object(d, this);
    });
}

function process_author_line(authors, match) {
    var index = undefined;

    authors = authors.split(" and ").map(function(author, i) {
        author = author.replace("{", "").replace("}", "");
        var parts = author.split(",");

        if (parts.length == 2) {
            author = parts[0] + " " + parts[1].split(" ").map(function(a) {
                return a[0];
            }).join("");
        }

        if (match && author.indexOf (match) == 0 && index === undefined) {
            index = i;
        }

        return author;
    });

    var text,
        tag = index;

    if (authors.length <= 10) {
        text = authors.join(", ");
    } else {
        text = authors.filter(function(d, i) {
            return i < 10;
        }).join(", ") + " and " + (authors.length - 10) + " others";
    }

    if (_.isNumber (tag)) {
        if (tag == 0) {
            tag = "1st";
        } else {
            if (tag == authors.length-1) {
                tag = "Senior";
            } else if (tag == 1) {
                tag = "2nd";
            } else {
                tag = "";
            }
        }
    }

    return {"text": text, "tag" : tag};
}

function extract_bibtex_record(highlight, record) {
    var render_me = [];
    render_me.push(record["YEAR"]);
    var authors = process_author_line(record["AUTHOR"], highlight);
    render_me.push(authors["tag"] ? {"text": authors["tag"], "type": "label"} : "");
    render_me.push({
        "subtext": record["TITLE"],
        "text": authors["text"]
    });
    render_me.push({
        "text": record["JOURNAL"],
        "subtext": (record["VOLUME"] ? record["VOLUME"] : "") + (record["NUMBER"] ? " (" + record["NUMBER"] + ")" : "") + (record["PAGES"] ? " " + record["PAGES"] + " " : "")
    });
    if (record["PMID"]) {
        render_me.push({
            "url": "http://www.ncbi.nlm.nih.gov/pubmed/" + record["PMID"],
            "link-text": {
                "text": "Pubmed",
                "type": "label"
            },
            "print-text": ""
        });
    } else {
        render_me.push("");
    }
    if (record["DOI"]) {
        render_me.push ({"altmetric": record["DOI"]});
    } else {
        render_me.push("");    
    }
    return render_me;
}

function populate_bibtex(container, key, data) {
    d3.text(data["bibtex"], function(error, value) {
        if (value) {
            var localDoParse = _.bind(BibtexParser, new Object);

            var b = new BibtexParser();
            b.setInput(value);
            b.bibtex();


            data["rows"] = _.map(b.entries, _.partial (extract_bibtex_record, data["highlight"])).sort(function(a, b) {
                return b[0] - a[0];
            });
            
             data["subtext"] = data["rows"].length + " publications" + (data["subtext"] ? ", " + data["subtext"] : "");
            populate_table(container, key, data);
        }
    });
}

function populate_table(container, key, data) {

    if (container.attr("data-style-header") == "on") {
        var header = container.append("h4").text(key);
        if ("subtext" in data) {
            header.append("br");
            header.append("small").text(data["subtext"]);
        }
    }
    var the_table = container.append("table").classed("table table-striped table-condensed", true);
    var table_body = the_table.append("tbody").style("font-size", "80%");

    var table_rows = table_body.selectAll("tr").data(data["rows"]);
    table_rows.enter().append("tr");
    var table_cells = table_rows.selectAll("td").data(function(d) {
        return d;
    });
    table_cells.enter().append("td");
    table_cells.each(function(d, i) {
        handle_entry_object(d, this);
    });
}

var data_populator = {
    'list': populate_list,
    'table': populate_table,
    'contact': populate_contact,
    'bibtex': populate_bibtex
};

var load_cv_data = function(url) {
    d3.json(url, function(error, data) {
        if (data) {
            _.each(data, function(value, key) {
                var container = d3.select('[data-receiver-for="' + key + '"]');
                if (container.length == 1) {
                    var pop = data_populator[container.attr("data-style-type") || "list"];
                    if (pop) pop(container, key, value);
                }
            });
        }
    });
};
